import React, { useState } from 'react';
import {
  MousePointer,
  Pencil,
  Type,
  Sparkles,
  Undo2,
  Redo2,
  Trash2,
  Image as ImageIcon,
  Eraser,
  QrCode,
  Shapes,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Heart,
} from 'lucide-react';

export type ToolMode = 'select' | 'draw' | 'text' | 'shape' | 'erase';

const SHAPE_OPTIONS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'rectangle', label: 'Rectangle', icon: Square },
  { key: 'circle', label: 'Circle', icon: Circle },
  { key: 'triangle', label: 'Triangle', icon: Triangle },
  { key: 'diamond', label: 'Diamond', icon: Diamond },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'heart', label: 'Heart', icon: Heart },
];

interface ToolbarProps {
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  onOpenAiModal: () => void;
  onOpenUploadModal: () => void;
  onOpenGiftQrModal: () => void;
  onAddText: () => void;
  onAddShape: (shapeType: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  eraserSize?: number;
  onEraserSizeChange?: (size: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  onOpenAiModal,
  onOpenUploadModal,
  onOpenGiftQrModal,
  onAddText,
  onAddShape,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  eraserSize = 6,
  onEraserSizeChange,
}) => {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  return (
    <div className="bg-white text-[#121214] p-4 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-[#E8E2D5] w-full max-w-[260px] flex flex-col gap-4">
      <button
        onClick={onOpenAiModal}
        className="w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-[#121214] text-[#C5A059] border border-[#C5A059]/40 font-bold uppercase text-[11px] tracking-widest py-3 shadow-2xs hover:bg-[#C5A059] hover:text-white hover:border-[#C5A059] transition-all"
      >
        <Sparkles className="w-4 h-4 text-[#C5A059]" />
        <span>Create AI</span>
      </button>

      <div className="grid gap-2">
        <button
          onClick={() => onSelectTool('select')}
          className={`w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider transition-all ${
            activeTool === 'select'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Click layers to select; drag on empty canvas to select a region"
        >
          <MousePointer className="w-5 h-5 text-[#C5A059]" />
          <span>Select</span>
        </button>

        <button
          onClick={() => onSelectTool('draw')}
          className={`w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider transition-all ${
            activeTool === 'draw'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Draw Freehand Directly on Shape"
        >
          <Pencil className="w-5 h-5 text-[#C5A059]" />
          <span>Draw Yourself</span>
        </button>

        <button
          onClick={() => {
            setIsShapeMenuOpen(false);
            onSelectTool('erase');
          }}
          className={`w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider transition-all ${
            activeTool === 'erase'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Erase Part of an Image or Shape (adds a non-destructive layer, fully undoable)"
        >
          <Eraser className="w-5 h-5 text-[#C5A059]" />
          <span>Erase</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsShapeMenuOpen((v) => !v)}
            className={`w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider transition-all ${
              activeTool === 'shape' || isShapeMenuOpen
                ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
                : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
            }`}
            title="Add a Shape"
          >
            <Shapes className="w-5 h-5 text-[#C5A059]" />
            <span>Shapes</span>
          </button>

          {isShapeMenuOpen && (
            <div className="absolute left-0 top-full mt-2 z-30 bg-white border border-[#E8E2D5] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-3 grid grid-cols-2 gap-2 w-56">
              {SHAPE_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setIsShapeMenuOpen(false);
                    onSelectTool('shape');
                    onAddShape(key);
                  }}
                  title={label}
                  className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#FBF8F1] border border-[#E8E2D5] hover:border-[#C5A059] flex flex-col items-center space-y-1 transition-all"
                >
                  <Icon className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#6E6A63]">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onAddText}
          className="w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider hover:bg-[#FBF8F1] text-[#6E6A63] hover:text-[#C5A059] transition-all"
          title="Add Custom Text"
        >
          <Type className="w-5 h-5 text-[#C5A059]" />
          <span>Text</span>
        </button>

        <button
          onClick={onOpenUploadModal}
          className="w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider hover:bg-[#FBF8F1] text-[#6E6A63] hover:text-[#C5A059] transition-all"
          title="Convert Image to Engraving Vector"
        >
          <ImageIcon className="w-5 h-5 text-[#C5A059]" />
          <span>Upload</span>
        </button>

        {/* Gift Message QR */}
        <button
          onClick={onOpenGiftQrModal}
          className="w-full inline-flex flex-col items-center justify-center gap-1 rounded-3xl py-3 text-[10px] uppercase tracking-wider hover:bg-[#FBF8F1] text-[#6E6A63] hover:text-[#C5A059] transition-all"
          title="Upload gift media and add QR code"
        >
          <QrCode className="w-5 h-5 text-[#C5A059]" />
          <span>Gift QR</span>
        </button>
      </div>

      {activeTool === 'erase' && onEraserSizeChange && (
        <div className="flex flex-col gap-3 rounded-3xl border border-[#E8E2D5] bg-[#FAF8F5] p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#6E6A63]">
            <span>Eraser Size</span>
            <span className="font-mono text-[#121214] font-bold">{eraserSize}px</span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={eraserSize}
            onChange={(e) => onEraserSizeChange(Number(e.target.value))}
            className="w-full accent-[#C5A059] cursor-pointer"
            title="Eraser Brush Size"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`py-3 rounded-3xl text-[#8A857C] hover:bg-[#FAF8F5] hover:text-[#121214] transition-all ${
            !canUndo && 'opacity-30 cursor-not-allowed'
          }`}
          title="Undo"
        >
          <Undo2 className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`py-3 rounded-3xl text-[#8A857C] hover:bg-[#FAF8F5] hover:text-[#121214] transition-all ${
            !canRedo && 'opacity-30 cursor-not-allowed'
          }`}
          title="Redo"
        >
          <Redo2 className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={onClear}
          className="py-3 rounded-3xl text-[#9F1239] hover:bg-[#FFF1F2] transition-all"
          title="Clear Entire Canvas"
        >
          <Trash2 className="w-4 h-4 mx-auto" />
        </button>
      </div>
    </div>
  );
};

