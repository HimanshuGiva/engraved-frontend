import React, { useEffect, useRef, useState } from 'react';
import { CanvasElement, CanvasRegion, JewelryItem, isErasableLayer } from '../types';
import { ToolMode } from './Toolbar';
import { pointsToSvgPath, buildEraserMaskDataUri, buildFreehandSessionData, eraserStrokesFromElements, EraserStroke, canvasPointsToLocalSubpaths, subpathsToSvgPath } from '../utils/svgUtils';
import { normalizeCanvasRegion } from '../utils/canvasCapture';
import { Sparkles, Pencil, Upload } from 'lucide-react';

interface CanvasWorkspaceProps {
  jewelry: JewelryItem;
  elements: CanvasElement[];
  selectedElementId: string | null;
  selectedRegion: CanvasRegion | null;
  activeTool: ToolMode;
  onSelectElement: (id: string | null) => void;
  onRegionSelect: (region: CanvasRegion | null) => void;
  onUpdateElement: (updated: CanvasElement, select?: boolean, recordHistory?: boolean) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onAddElement: (element: CanvasElement, select?: boolean) => void;
  onAddElements: (elements: CanvasElement[], select?: boolean) => void;
  onSelectTool?: (tool: ToolMode) => void;
  onOpenAiModal: () => void;
  onOpenUploadModal: () => void;
  eraserSize?: number;
}

/**
 * Converts a point in canvas-percent space (0-100 across the whole
 * engraving surface) into the target element's own LOCAL 0-100 box space
 * (where local (50, 50) is always that element's visual center), inverting
 * exactly the translate/rotate transform the element's wrapper div uses to
 * place itself on the canvas. This lets an eraser stroke be recorded once,
 * in the target's own coordinate space, so the resulting mask stays
 * perfectly aligned even if the target is later moved, scaled, or rotated.
 */
function toLocalPercent(px: number, py: number, el: CanvasElement): { x: number; y: number } {
  const rad = (-el.rotation * Math.PI) / 180;
  const dx = px - el.x;
  const dy = py - el.y;
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  const safeW = Math.max(el.width, 0.0001);
  const safeH = Math.max(el.height, 0.0001);
  return {
    x: 50 + (rx / safeW) * 100,
    y: 50 + (ry / safeH) * 100,
  };
}

const ERASER_CURSOR =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#121214" stroke="#C5A059" stroke-width="1.2" d="M15.5 2.5l6 6-8.5 8.5H8v-5.5z"/><rect x="6" y="17" width="12" height="3" rx="1" fill="#C5A059"/></svg>'
  ) +
  '") 5 19, crosshair';

/** Inline SVG mask: white = visible, black strokes = punched-out holes. */
function EraserMaskDef({ maskId, strokes }: { maskId: string; strokes: EraserStroke[] }) {
  return (
    <mask id={maskId} maskContentUnits="userSpaceOnUse">
      <rect x="0" y="0" width="100" height="100" fill="white" />
      {strokes.map((stroke, i) => (
        <path
          key={i}
          d={stroke.content}
          fill="none"
          stroke="black"
          strokeWidth={stroke.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </mask>
  );
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  jewelry,
  elements,
  selectedElementId,
  selectedRegion,
  activeTool,
  onSelectElement,
  onRegionSelect,
  onUpdateElement,
  onMoveElement,
  onAddElement,
  onAddElements,
  onSelectTool,
  onOpenAiModal,
  onOpenUploadModal,
  eraserSize = 6,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const drawRafRef = useRef<number | null>(null);
  const drawingSelectionTimeoutRef = useRef<number | null>(null);
  const pendingSelectionIdRef = useRef<string | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Freehand drawing SESSION tracking — a session is every stroke drawn
  // between picking up the pencil and an explicit "I'm done" signal
  // (switching tools). Lifting the pencil mid-word/mid-sketch and drawing
  // again continues the SAME layer instead of fragmenting it into a new
  // one, which is what made multi-stroke handwriting/sketches impossible
  // to move or resize as a single object.
  const [drawSessionElementId, setDrawSessionElementId] = useState<string | null>(null);
  const [drawSessionStrokes, setDrawSessionStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [pendingDrawSelectionId, setPendingDrawSelectionId] = useState<string | null>(null);
  // Tracks the content we last wrote to the session element, so we can tell
  // if something else (undo/redo/clear) touched it out from under us — in
  // that case we end the session rather than silently overwrite/redo it.
  const lastCommittedSessionContentRef = useRef<string | null>(null);

  const endDrawSession = () => {
    setDrawSessionElementId(null);
    setDrawSessionStrokes([]);
    lastCommittedSessionContentRef.current = null;
  };

  // Leaving the Draw tool is the explicit "I'm done with this drawing"
  // signal — the next time Draw is selected, a fresh stroke starts a brand
  // new layer rather than resuming the old one.
  const clearPendingDrawSelection = () => {
    if (drawingSelectionTimeoutRef.current !== null) {
      window.clearTimeout(drawingSelectionTimeoutRef.current);
      drawingSelectionTimeoutRef.current = null;
    }
    pendingSelectionIdRef.current = null;
    setPendingDrawSelectionId(null);
  };

  const scheduleSelectDrawElement = (id: string) => {
    clearPendingDrawSelection();
    pendingSelectionIdRef.current = id;
    setPendingDrawSelectionId(id);
    drawingSelectionTimeoutRef.current = window.setTimeout(() => {
      onSelectElement(id);
      drawingSelectionTimeoutRef.current = null;
      pendingSelectionIdRef.current = null;
      setPendingDrawSelectionId(null);
    }, 3000);
  };

  useEffect(() => {
    if (activeTool !== 'draw') {
      clearPendingDrawSelection();
      endDrawSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // If the session's element was changed out from under us (an Undo/Redo
  // reverted its content, or Clear Canvas removed it), stop trying to
  // append to it — starting a fresh layer on the next stroke is the least
  // surprising outcome and avoids corrupting the undo stack.
  useEffect(() => {
    if (!drawSessionElementId) return;
    const el = elements.find((e) => e.id === drawSessionElementId);
    if (!el || el.content !== lastCommittedSessionContentRef.current) {
      endDrawSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, drawSessionElementId]);

  useEffect(() => {
    if (activeTool === 'erase') {
      onSelectElement(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Eraser records one canvas-space stroke and slices it into every layer the
  // stroke actually crosses so a single drag can erase across overlapping art.
  const [isErasing, setIsErasing] = useState(false);
  const [eraseCanvasPoints, setEraseCanvasPoints] = useState<{ x: number; y: number }[]>([]);

  // Region marquee selection
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [regionAnchor, setRegionAnchor] = useState<{ x: number; y: number } | null>(null);
  const [regionCursor, setRegionCursor] = useState<{ x: number; y: number } | null>(null);

  const pointerToCanvasPercent = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const liveRegion =
    isSelectingRegion && regionAnchor && regionCursor
      ? normalizeCanvasRegion(regionAnchor.x, regionAnchor.y, regionCursor.x, regionCursor.y)
      : null;
  const displayedRegion = liveRegion ?? selectedRegion;

  useEffect(() => {
    if (activeTool !== 'select') {
      setIsSelectingRegion(false);
      setRegionAnchor(null);
      setRegionCursor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Dragging & Transform state — position preview stays local until
  // pointer-up so one undo step covers the whole move, not every pixel.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const pointInElementBounds = (px: number, py: number, el: CanvasElement) => {
    const local = toLocalPercent(px, py, el);
    return local.x >= 0 && local.x <= 100 && local.y >= 0 && local.y <= 100;
  };

  const beginEraseStroke = (clientX: number, clientY: number, pointerId: number) => {
    try {
      containerRef.current?.setPointerCapture(pointerId);
    } catch {}

    const point = pointerToCanvasPercent(clientX, clientY);
    if (!point) return;

    onSelectElement(null);
    setIsErasing(true);
    setEraseCanvasPoints([point]);
  };

  const commitEraseStroke = () => {
    if (!isErasing || eraseCanvasPoints.length < 2) return;

    const stamp = Date.now();
    const baseZ = elements.length;
    const newErasers: CanvasElement[] = [];

    elements
      .filter((el) => isErasableLayer(el.type))
      .forEach((target, index) => {
        const subpaths = canvasPointsToLocalSubpaths(
          eraseCanvasPoints,
          target,
          pointInElementBounds,
          toLocalPercent
        );
        const pathD = subpathsToSvgPath(subpaths);
        if (!pathD) return;

        newErasers.push({
          id: `erase-${stamp}-${target.id}`,
          type: 'eraser',
          name: `Eraser Layer (on ${target.name})`,
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          rotation: target.rotation,
          zIndex: baseZ + 1 + index,
          content: pathD,
          strokeWidth: eraserSize,
          targetElementId: target.id,
        });
      });

    if (newErasers.length) {
      onAddElements(newErasers);
    }
  };

  const endEraseStroke = () => {
    setIsErasing(false);
    setEraseCanvasPoints([]);
  };

  const commitDrag = () => {
    if (!draggingId || !dragPosition || !dragStartPosRef.current) return;
    const { x: startX, y: startY } = dragStartPosRef.current;
    if (dragPosition.x !== startX || dragPosition.y !== startY) {
      onMoveElement(draggingId, dragPosition.x, dragPosition.y);
    }
    dragStartPosRef.current = null;
    setDragPosition(null);
  };

  const cancelDrag = () => {
    dragStartPosRef.current = null;
    setDragPosition(null);
    setDraggingId(null);
  };

  // Get SVG clip path shape style for the selected SKU - Large immersive dimensions
  const getShapeStyle = () => {
    switch (jewelry.constraints.shape) {
      case 'circle':
        return 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-full';
      case 'squircle':
        return 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-[28%]';
      case 'bar':
        return 'w-40 h-80 sm:w-52 sm:h-[460px] rounded-2xl';
      case 'heart':
        return 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-[30%]';
      case 'oval':
        return 'w-64 h-80 sm:w-72 sm:h-[440px] rounded-[50%]';
      case 'rectangle':
      default:
        return 'w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-2xl';
    }
  };

  // Freehand Drawing pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select' && e.target === containerRef.current) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (!point) return;

      onSelectElement(null);
      setIsSelectingRegion(true);
      setRegionAnchor(point);
      setRegionCursor(point);
      return;
    }

    if (activeTool === 'draw') {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      if (selectedElementId) {
        onSelectElement(null);
      }
      if (drawingSelectionTimeoutRef.current !== null) {
        clearPendingDrawSelection();
      }
      setPendingDrawSelectionId(null);
      activePointerIdRef.current = e.pointerId;
      drawPointsRef.current = [{ x: xPct, y: yPct }];
      if (drawRafRef.current !== null) {
        window.cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
      }
      setIsDrawingFreehand(true);
      setCurrentDrawPoints([{ x: xPct, y: yPct }]);
    } else if (activeTool === 'erase') {
      beginEraseStroke(e.clientX, e.clientY, e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select' && isSelectingRegion) {
      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (point) setRegionCursor(point);
      return;
    }

    if (activeTool === 'draw' && isDrawingFreehand) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      drawPointsRef.current.push({ x: xPct, y: yPct });
      if (drawRafRef.current === null) {
        drawRafRef.current = window.requestAnimationFrame(() => {
          setCurrentDrawPoints([...drawPointsRef.current]);
          drawRafRef.current = null;
        });
      }
    } else if (activeTool === 'erase' && isErasing) {
      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (point) setEraseCanvasPoints((prev) => [...prev, point]);
    } else if (draggingId) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const xPct = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;

      setDragPosition({
        x: Math.max(0, Math.min(100, xPct)),
        y: Math.max(0, Math.min(100, yPct)),
      });
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      activePointerIdRef.current = null;
    } else if (activePointerIdRef.current !== null && containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(activePointerIdRef.current);
      } catch {}
      activePointerIdRef.current = null;
    }

    if (drawRafRef.current !== null) {
      window.cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
      setCurrentDrawPoints([...drawPointsRef.current]);
    }

    if (activeTool === 'select' && isSelectingRegion && regionAnchor && regionCursor) {
      const region = normalizeCanvasRegion(
        regionAnchor.x,
        regionAnchor.y,
        regionCursor.x,
        regionCursor.y
      );
      onRegionSelect(region);
      setIsSelectingRegion(false);
      setRegionAnchor(null);
      setRegionCursor(null);
    } else if (activeTool === 'draw' && isDrawingFreehand) {
      setIsDrawingFreehand(false);
      if (currentDrawPoints.length > 1) {
        // Add this stroke to the current session (all strokes drawn since
        // the pencil was first picked up, across however many lifts) and
        // recompute one merged bounding box + path covering all of them.
        const sessionStrokes = [...drawSessionStrokes, currentDrawPoints];
        const merged = buildFreehandSessionData(sessionStrokes);

        if (merged) {
          if (drawSessionElementId) {
            // Continuing the session: update the SAME element in place so
            // the whole drawing stays one movable/rotatable/resizable
            // layer, instead of adding a new fragment for this stroke.
            const existing = elements.find((el) => el.id === drawSessionElementId);
            if (existing) {
              const updatedElement: CanvasElement = {
                ...existing,
                content: merged.content,
                x: merged.x,
                y: merged.y,
                width: merged.width,
                height: merged.height,
              };
              lastCommittedSessionContentRef.current = merged.content;
              onUpdateElement(updatedElement, false);
              scheduleSelectDrawElement(updatedElement.id);
              setDrawSessionStrokes(sessionStrokes);
            } else {
              // Session element vanished (e.g. deleted from the Layers
              // panel) — start a brand new layer for this stroke instead.
              endDrawSession();
            }
          } else {
            // First stroke of a new session — create its layer.
            const newDrawElement: CanvasElement = {
              id: `draw-${Date.now()}`,
              type: 'freehand_draw',
              name: 'Hand Drawn Sketch',
              x: merged.x,
              y: merged.y,
              width: merged.width,
              height: merged.height,
              rotation: 0,
              zIndex: elements.length + 1,
              content: merged.content,
              strokeWidth: 1,
            };
            lastCommittedSessionContentRef.current = merged.content;
            setDrawSessionElementId(newDrawElement.id);
            setDrawSessionStrokes(sessionStrokes);
            onAddElement(newDrawElement, false);
            scheduleSelectDrawElement(newDrawElement.id);
          }
        }
      }
      setCurrentDrawPoints([]);
      drawPointsRef.current = [];
    } else if (activeTool === 'erase' && isErasing) {
      commitEraseStroke();
      endEraseStroke();
    }

    if (draggingId) {
      commitDrag();
    }
    setDraggingId(null);
  };

  const handlePointerCancel = () => {
    if (isSelectingRegion) {
      setIsSelectingRegion(false);
      setRegionAnchor(null);
      setRegionCursor(null);
      return;
    }
    if (draggingId) {
      cancelDrag();
      return;
    }
    if (activeTool === 'draw' || activeTool === 'erase') {
      handlePointerUp();
    }
  };

  const handleLostPointerCapture = () => {
    if (isSelectingRegion) {
      handlePointerUp();
      return;
    }
    if (draggingId) {
      commitDrag();
      setDraggingId(null);
      return;
    }
    if (activeTool === 'draw' || activeTool === 'erase') {
      handlePointerUp();
    }
  };

  const startDragging = (e: React.PointerEvent | React.MouseEvent, el: CanvasElement) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    onRegionSelect(null);
    onSelectElement(el.id);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;

    setDraggingId(el.id);
    dragStartPosRef.current = { x: el.x, y: el.y };
    setDragPosition({ x: el.x, y: el.y });
    setDragOffset({
      x: mouseXPct - el.x,
      y: mouseYPct - el.y,
    });
  };

  const getFontClass = (fontId?: string) => {
    switch (fontId) {
      case 'sans': return 'font-sans';
      case 'script': return 'font-serif italic';
      case 'mono': return 'font-mono';
      case 'serif':
      default: return 'font-serif';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      
      {/* Canvas Frame Container - Expanded Large Viewport */}
      <div className="relative w-full max-w-2xl min-h-[460px] sm:min-h-[520px] flex items-center justify-center p-2 sm:p-4">
        
        {/* Physical Jewelry Bezel Representation */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(null);
            }
          }}
          className="relative w-full h-full bg-white p-6 sm:p-10 rounded-3xl border border-[#E8E2D5] shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center justify-center"
        >
          
          {/* Pendant Chain Loop / Bail */}
          <div className="w-6 h-8 -mb-1 rounded-t-full border-2 border-[#C5A059] bg-gradient-to-b from-[#FBF8F1] to-white z-10 shadow-2xs flex-shrink-0" />

          {/* Real Engraving Area Surface */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
            className={`relative bg-[#FAF8F5] border-2 border-[#E8E2D5] shadow-inner overflow-hidden select-none touch-none transition-all flex-shrink-0 ${
              activeTool === 'draw' ? 'cursor-crosshair' : activeTool === 'erase' ? '' : 'cursor-default'
            } ${getShapeStyle()}`}
            style={activeTool === 'erase' ? { cursor: ERASER_CURSOR } : undefined}
          >


            {/* Empty Canvas Starter Screen */}
            {elements.length === 0 && currentDrawPoints.length === 0 && activeTool !== 'draw' && activeTool !== 'erase' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 space-y-5 bg-white/95 backdrop-blur-xs">
                <div className="text-[#121214] font-serif font-bold text-xl sm:text-2xl">
                  What would you like to personalize?
                </div>

                <div className="grid grid-cols-3 gap-2.5 w-full max-w-md text-xs">
                  <button
                    onClick={onOpenAiModal}
                    className="p-3.5 bg-[#121214] text-[#C5A059] border border-[#C5A059]/40 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex flex-col items-center space-y-1.5 shadow-2xs hover:bg-[#C5A059] hover:text-white transition-all hover:scale-102"
                  >
                    <Sparkles className="w-5 h-5 text-[#C5A059] group-hover:text-white" />
                    <span>Create AI</span>
                  </button>

                  <button
                    onClick={() => onSelectTool?.('draw')}
                    className="p-3.5 bg-white text-[#121214] border border-[#E8E2D5] rounded-2xl font-bold text-[10px] uppercase tracking-widest flex flex-col items-center space-y-1.5 shadow-2xs hover:bg-[#FAF8F5] hover:border-[#C5A059] transition-all hover:scale-102"
                  >
                    <Pencil className="w-5 h-5 text-[#C5A059]" />
                    <span>Draw</span>
                  </button>

                  <button
                    onClick={onOpenUploadModal}
                    className="p-3.5 bg-white text-[#121214] border border-[#E8E2D5] rounded-2xl font-bold text-[10px] uppercase tracking-widest flex flex-col items-center space-y-1.5 shadow-2xs hover:bg-[#FAF8F5] hover:border-[#C5A059] transition-all hover:scale-102"
                  >
                    <Upload className="w-5 h-5 text-[#C5A059]" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rendered Elements Layer — eraser elements never get their own
               box here; they only ever appear as a mask applied to the
               element they target (see relatedErasers below), which is what
               keeps erasing fully non-destructive and independently
               undoable/deletable as its own layer. */}
            {elements
              .filter((el) => el.type !== 'eraser')
              .map((el) => {
              const isSelected =
                activeTool !== 'erase' &&
                selectedElementId === el.id &&
                !isDrawingFreehand &&
                pendingDrawSelectionId !== el.id;

              // Any eraser layers currently masking this element. Applied as
              // a CSS mask on a wrapper div so the element's own `content`
              // is never modified — deleting the eraser layer (from the
              // Layers panel) instantly restores the original artwork.
              const isErasable = isErasableLayer(el.type);
              const relatedErasers = isErasable
                ? elements.filter((e) => e.type === 'eraser' && e.targetElementId === el.id)
                : [];

              const liveErasing =
                isErasable && activeTool === 'erase' && isErasing && eraseCanvasPoints.length > 1;
              const eraseStrokes: EraserStroke[] = eraserStrokesFromElements(relatedErasers);
              if (liveErasing) {
                const subpaths = canvasPointsToLocalSubpaths(
                  eraseCanvasPoints,
                  el,
                  pointInElementBounds,
                  toLocalPercent
                );
                const livePath = subpathsToSvgPath(subpaths);
                if (livePath) {
                  eraseStrokes.push({
                    content: livePath,
                    strokeWidth: eraserSize,
                  });
                }
              }
              const hasEraseMask = eraseStrokes.length > 0;
              const inlineMaskId = `erase-mask-${el.id}`;
              const inlineMaskRef = hasEraseMask ? `url(#${inlineMaskId})` : undefined;

              const liveStrokeForCss = (() => {
                if (!liveErasing) return undefined;
                const subpaths = canvasPointsToLocalSubpaths(
                  eraseCanvasPoints,
                  el,
                  pointInElementBounds,
                  toLocalPercent
                );
                const livePath = subpathsToSvgPath(subpaths);
                return livePath ? { content: livePath, strokeWidth: eraserSize } : undefined;
              })();
              const maskUrl =
                el.type === 'svg_ai' || el.type === 'uploaded_image'
                  ? buildEraserMaskDataUri(relatedErasers, liveStrokeForCss)
                  : null;
              const contentStyle: React.CSSProperties = maskUrl
                ? ({
                    WebkitMaskImage: `url("${maskUrl}")`,
                    maskImage: `url("${maskUrl}")`,
                    WebkitMaskSize: '100% 100%',
                    maskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  } as React.CSSProperties)
                : {};

              const wrapperRingClass = isSelected
                ? 'ring-2 ring-[#C5A059] rounded'
                : activeTool !== 'draw' && activeTool !== 'erase'
                ? 'hover:ring-1 hover:ring-[#C5A059]/50'
                : '';

              const isDragging = draggingId === el.id;
              const displayX = isDragging && dragPosition ? dragPosition.x : el.x;
              const displayY = isDragging && dragPosition ? dragPosition.y : el.y;

              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => startDragging(e, el)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDrawingFreehand || activeTool === 'erase') return;
                    onSelectElement(el.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${displayX}%`,
                    top: `${displayY}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                    zIndex: el.zIndex,
                    pointerEvents: activeTool === 'draw' || activeTool === 'erase' ? 'none' : undefined,
                    cursor: activeTool === 'erase' ? ERASER_CURSOR : undefined,
                  }}
                  className={`group absolute transition-shadow ${
                    activeTool === 'select'
                      ? 'cursor-grab active:cursor-grabbing'
                      : ''
                  } ${wrapperRingClass}`}
                >
                  {/* Element Content Render — eraser strokes punch holes via SVG/CSS mask */}
                  <div className="w-full h-full" style={contentStyle}>
                    {el.type === 'svg_ai' && (
                      <div
                        className="w-full h-full text-[#121214] flex items-center justify-center pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                        dangerouslySetInnerHTML={{ __html: el.content }}
                      />
                    )}

                    {el.type === 'uploaded_image' && (
                      <div
                        className="w-full h-full text-[#121214] flex items-center justify-center pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                        dangerouslySetInnerHTML={{ __html: el.content }}
                      />
                    )}

                    {(el.type === 'freehand_draw' || el.type === 'handwriting' || el.type === 'shape') && (
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none overflow-visible">
                        {hasEraseMask && (
                          <defs>
                            <EraserMaskDef maskId={inlineMaskId} strokes={eraseStrokes} />
                          </defs>
                        )}
                        <path
                          d={el.content}
                          fill="none"
                          stroke="#121214"
                          strokeWidth={el.strokeWidth ?? 1}
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          mask={inlineMaskRef}
                        />
                      </svg>
                    )}

                    {el.type === 'text' && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
                        className="w-full h-full pointer-events-none select-none overflow-visible"
                      >
                        <text
                          x="50"
                          y="52"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={Math.min(32, 160 / Math.max(el.content.length, 1))}
                          className={`fill-[#121214] font-bold ${getFontClass(el.color)}`}
                        >
                          {el.content}
                        </text>
                      </svg>
                    )}
                  </div>

                  {/* Selection Bounding Box Controls */}
                  {isSelected && (
                    <div className="absolute inset-0 border border-[#C5A059] pointer-events-none">
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Region selection overlay */}
            {displayedRegion && (
              <div
                className="absolute z-40 pointer-events-none border-2 border-[#C5A059] bg-[#C5A059]/10"
                style={{
                  left: `${displayedRegion.left}%`,
                  top: `${displayedRegion.top}%`,
                  width: `${displayedRegion.width}%`,
                  height: `${displayedRegion.height}%`,
                }}
              >
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#C5A059] rounded-full" />
              </div>
            )}

            {/* Live Freehand Drawing Overlay */}
            {isDrawingFreehand && currentDrawPoints.length > 1 && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <path
                  d={pointsToSvgPath(currentDrawPoints)}
                  fill="none"
                  stroke="#121214"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};


