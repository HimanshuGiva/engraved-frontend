import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CanvasElement, CanvasRegion, JewelryItem, isErasableLayer } from '../../types';
import { ENGRAVING_SURFACE_CLASS } from '../../constants/engravingSurface';
import { getFontClass } from '../../constants/fonts';
import { pointsToSvgPath, buildEraserMaskDataUri, buildFreehandSessionData, eraserStrokesFromElements, EraserStroke, canvasPointsToLocalSubpaths, subpathsToSvgPath } from '../../utils/svgUtils';
import { normalizeCanvasRegion } from '../../utils/canvasCapture';
import { SHAPE_PRESETS, SHAPE_LABELS } from '../../constants/shapes';
import { ToolMode } from '../../constants/tools';

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
  placingShapeKind?: string | null;
  drawSize?: number;
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

/** Inline SVG mask: white = visible, black strokes/fills = punched-out holes. */
function EraserMaskDef({ maskId, strokes }: { maskId: string; strokes: EraserStroke[] }) {
  return (
    <mask id={maskId} maskContentUnits="userSpaceOnUse">
      <rect x="0" y="0" width="100" height="100" fill="white" />
      {strokes.map((stroke, i) =>
        stroke.filled ? (
          <path key={i} d={stroke.content} fill="black" stroke="none" />
        ) : (
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
        )
      )}
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
  eraserSize = 20,
  placingShapeKind = null,
  drawSize = 2,
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

  // A drawing session merges multiple strokes into one SVG path, which can
  // only have a single strokeWidth. End the session when the brush size
  // changes so new strokes start a fresh layer instead of retagging every
  // prior stroke in the merged path with the new width.
  const endDrawSessionIfSizeChanged = () => {
    if (!drawSessionElementId) return;
    const sessionEl = elements.find((el) => el.id === drawSessionElementId);
    if (sessionEl && (sessionEl.strokeWidth ?? drawSize) !== drawSize) {
      endDrawSession();
    }
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
  }, [activeTool]);

  const prevDrawSizeRef = useRef(drawSize);
  useLayoutEffect(() => {
    if (
      activeTool === 'draw' &&
      drawSessionElementId !== null &&
      prevDrawSizeRef.current !== drawSize
    ) {
      endDrawSession();
    }
    prevDrawSizeRef.current = drawSize;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawSize, activeTool, drawSessionElementId]);

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

  const [isErasing, setIsErasing] = useState(false);
  const [eraseCanvasPoints, setEraseCanvasPoints] = useState<{ x: number; y: number }[]>([]);

  // Region marquee selection
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [regionAnchor, setRegionAnchor] = useState<{ x: number; y: number } | null>(null);
  const [regionCursor, setRegionCursor] = useState<{ x: number; y: number } | null>(null);

  // Shape placement (click -> drag to size)
  const [isPlacingShape, setIsPlacingShape] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<{ x: number; y: number } | null>(null);
  const [shapeCursor, setShapeCursor] = useState<{ x: number; y: number } | null>(null);

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
  const liveShapeRegion =
    isPlacingShape && shapeAnchor && shapeCursor
      ? normalizeCanvasRegion(shapeAnchor.x, shapeAnchor.y, shapeCursor.x, shapeCursor.y)
      : null;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const SELECT_DRAG_THRESHOLD_PX = 4;
  const selectGestureRef = useRef<{
    mode: 'pending' | 'region' | 'move';
    startClientX: number;
    startClientY: number;
    hitElementId: string | null;
  } | null>(null);

  const pointInElementBounds = (px: number, py: number, el: CanvasElement) => {
    const local = toLocalPercent(px, py, el);
    return local.x >= 0 && local.x <= 100 && local.y >= 0 && local.y <= 100;
  };

  const hitTestElement = (px: number, py: number): CanvasElement | null => {
    const candidates = elements
      .filter((el) => el.type !== 'eraser')
      .sort((a, b) => b.zIndex - a.zIndex);
    return candidates.find((el) => pointInElementBounds(px, py, el)) ?? null;
  };

  const beginElementDrag = (el: CanvasElement, clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseXPct = ((clientX - rect.left) / rect.width) * 100;
    const mouseYPct = ((clientY - rect.top) / rect.height) * 100;

    setDraggingId(el.id);
    dragStartPosRef.current = { x: el.x, y: el.y };
    setDragPosition({ x: el.x, y: el.y });
    setDragOffset({
      x: mouseXPct - el.x,
      y: mouseYPct - el.y,
    });
  };

  const clearSelectGesture = () => {
    selectGestureRef.current = null;
    setIsSelectingRegion(false);
    setRegionAnchor(null);
    setRegionCursor(null);
  };

  useEffect(() => {
    if (activeTool !== 'select') {
      clearSelectGesture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

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

  // Engraving surface dimensions — shared with preview so layout matches 1:1
  const getShapeStyle = () => ENGRAVING_SURFACE_CLASS[jewelry.constraints.shape];

  // Freehand Drawing pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Shape placement start
    if (activeTool === 'shape' && placingShapeKind !== null) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (!point) return;

      onSelectElement(null);
      setIsPlacingShape(true);
      setShapeAnchor(point);
      setShapeCursor(point);
      return;
    }
    if (activeTool === 'select') {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (!point) return;

      const hit = hitTestElement(point.x, point.y);
      selectGestureRef.current = {
        mode: 'pending',
        startClientX: e.clientX,
        startClientY: e.clientY,
        hitElementId: hit?.id ?? null,
      };
      setRegionAnchor(point);
      setRegionCursor(point);
      return;
    }

    if (activeTool === 'draw') {
      endDrawSessionIfSizeChanged();

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
    if (activeTool === 'shape' && isPlacingShape) {
      const point = pointerToCanvasPercent(e.clientX, e.clientY);
      if (point) setShapeCursor(point);
      return;
    }

    if (activeTool === 'select' && selectGestureRef.current) {
      const gesture = selectGestureRef.current;

      if (gesture.mode === 'pending') {
        const dx = e.clientX - gesture.startClientX;
        const dy = e.clientY - gesture.startClientY;
        if (Math.hypot(dx, dy) >= SELECT_DRAG_THRESHOLD_PX) {
          const movingSelected =
            gesture.hitElementId !== null && gesture.hitElementId === selectedElementId;
          if (movingSelected) {
            gesture.mode = 'move';
            const el = elements.find((item) => item.id === gesture.hitElementId);
            if (el) {
              onRegionSelect(null);
              beginElementDrag(el, e.clientX, e.clientY);
            }
          } else {
            gesture.mode = 'region';
            onSelectElement(null);
            onRegionSelect(null);
            setIsSelectingRegion(true);
          }
        }
      }

      if (gesture.mode === 'region' || isSelectingRegion) {
        const point = pointerToCanvasPercent(e.clientX, e.clientY);
        if (point) setRegionCursor(point);
        return;
      }

      if (gesture.mode === 'pending') {
        return;
      }
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

    // Finish placing shape
    if (activeTool === 'shape' && isPlacingShape && shapeAnchor && shapeCursor) {
      const region = normalizeCanvasRegion(shapeAnchor.x, shapeAnchor.y, shapeCursor.x, shapeCursor.y);
      // Require a minimal size to commit
      if (region && region.width > 0.5 && region.height > 0.5 && placingShapeKind) {
        const centerX = region.left + region.width / 2;
        const centerY = region.top + region.height / 2;
        const newEl = {
          id: `shape-${Date.now()}`,
          type: 'shape' as const,
          name: SHAPE_LABELS[placingShapeKind] || 'Shape',
          x: centerX,
          y: centerY,
          width: region.width,
          height: region.height,
          rotation: 0,
          zIndex: elements.length + 1,
          content: SHAPE_PRESETS[placingShapeKind],
          strokeWidth: 2,
        };
        onAddElement(newEl, true);
      }
      setIsPlacingShape(false);
      setShapeAnchor(null);
      setShapeCursor(null);
      try {
        if (e) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      // switch back to select
      onSelectTool?.('select');
    }

    if (activeTool === 'select' && selectGestureRef.current) {
      const gesture = selectGestureRef.current;

      if (gesture.mode === 'region' && regionAnchor && regionCursor) {
        const region = normalizeCanvasRegion(
          regionAnchor.x,
          regionAnchor.y,
          regionCursor.x,
          regionCursor.y
        );
        onRegionSelect(region);
      } else if (gesture.mode === 'move') {
        if (draggingId) {
          commitDrag();
          setDraggingId(null);
        }
      } else if (gesture.mode === 'pending') {
        if (gesture.hitElementId) {
          onRegionSelect(null);
          onSelectElement(gesture.hitElementId);
        } else {
          onSelectElement(null);
          onRegionSelect(null);
        }
      }

      clearSelectGesture();
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
                strokeWidth: existing.strokeWidth ?? drawSize,
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
              strokeWidth: drawSize,
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

    if (draggingId && activeTool !== 'select') {
      commitDrag();
    }
    setDraggingId(null);
  };

  const handlePointerCancel = () => {
    if (selectGestureRef.current) {
      if (draggingId) {
        cancelDrag();
      }
      clearSelectGesture();
      return;
    }
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
    if (selectGestureRef.current) {
      handlePointerUp();
      return;
    }
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
            data-canvas-surface
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
            className={`relative bg-[#FAF8F5] border-2 border-[#E8E2D5] shadow-inner overflow-hidden select-none touch-none transition-all flex-shrink-0 ${
              activeTool === 'draw' || activeTool === 'shape' || activeTool === 'select'
                ? 'cursor-crosshair'
                : activeTool === 'erase'
                ? ''
                : 'cursor-default'
            } ${getShapeStyle()}`}
            style={activeTool === 'erase' ? { cursor: ERASER_CURSOR } : undefined}
          >
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
                  data-canvas-element
                  style={{
                    position: 'absolute',
                    left: `${displayX}%`,
                    top: `${displayY}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                    zIndex: el.zIndex,
                    pointerEvents:
                      activeTool === 'draw' ||
                      activeTool === 'erase' ||
                      activeTool === 'shape' ||
                      activeTool === 'select'
                        ? 'none'
                        : undefined,
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

            {/* Live Shape Placement Preview */}
            {liveShapeRegion && placingShapeKind && (
              <div
                className="absolute z-40 pointer-events-none border-2 border-[#C5A059] bg-[#C5A059]/10"
                style={{
                  left: `${liveShapeRegion.left}%`,
                  top: `${liveShapeRegion.top}%`,
                  width: `${liveShapeRegion.width}%`,
                  height: `${liveShapeRegion.height}%`,
                }}
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pointer-events-none">
                  <path d={SHAPE_PRESETS[placingShapeKind]} fill="none" stroke="#121214" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {/* Live Freehand Drawing Overlay */}
            {isDrawingFreehand && currentDrawPoints.length > 1 && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <path
                  d={pointsToSvgPath(currentDrawPoints)}
                  fill="none"
                  stroke="#121214"
                  strokeWidth={drawSize}
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


