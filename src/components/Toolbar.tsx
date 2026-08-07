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
    <div className="bg-white text-[#121214] p-2.5 rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-[#E8E2D5] flex flex-wrap items-center justify-between gap-2">
      
      {/* Primary Creation Tools */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        
        {/* Prominent Golden AI Button */}
        <button
          onClick={onOpenAiModal}
          className="px-4 py-2 rounded-full bg-[#121214] text-[#C5A059] border border-[#C5A059]/40 font-bold uppercase text-[11px] tracking-widest flex items-center space-x-2 shadow-2xs hover:bg-[#C5A059] hover:text-white hover:border-[#C5A059] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059] group-hover:text-white" />
          <span>Create with AI</span>
        </button>

        <div className="w-px h-5 bg-[#E8E2D5] mx-1" />

        {/* Select Pointer */}
        <button
          onClick={() => onSelectTool('select')}
          className={`px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 transition-all ${
            activeTool === 'select'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Select & Transform"
        >
          <MousePointer className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="hidden md:inline font-semibold uppercase text-[10px] tracking-wider">Select</span>
        </button>

        {/* Freehand Draw */}
        <button
          onClick={() => onSelectTool('draw')}
          className={`px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 transition-all ${
            activeTool === 'draw'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Draw Freehand Directly on Shape"
        >
          <Pencil className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="hidden md:inline font-semibold uppercase text-[10px] tracking-wider">Draw Yourself</span>
        </button>

        {/* Erase — non-destructive: adds an independent, deletable mask layer instead of touching the artwork underneath */}
        <button
          onClick={() => {
            setIsShapeMenuOpen(false);
            onSelectTool('erase');
          }}
          className={`px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 transition-all ${
            activeTool === 'erase'
              ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
              : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
          }`}
          title="Erase Part of an Image or Shape (adds a non-destructive layer, fully undoable)"
        >
          <Eraser className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="hidden md:inline font-semibold uppercase text-[10px] tracking-wider">Erase</span>
        </button>

        {/* Shapes — opens a small flyout of preset geometric shapes */}
        <div className="relative">
          <button
            onClick={() => setIsShapeMenuOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 transition-all ${
              activeTool === 'shape' || isShapeMenuOpen
                ? 'bg-[#FBF8F1] text-[#C5A059] font-bold border border-[#E6C687]'
                : 'hover:bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
            }`}
            title="Add a Shape"
          >
            <Shapes className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden md:inline font-semibold uppercase text-[10px] tracking-wider">Shapes</span>
          </button>

          {isShapeMenuOpen && (
            <div className="absolute left-0 top-full mt-2 z-30 bg-white border border-[#E8E2D5] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-2.5 grid grid-cols-3 gap-1.5 w-44">
              {SHAPE_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setIsShapeMenuOpen(false);
                    onSelectTool('shape');
                    onAddShape(key);
                  }}
                  title={label}
                  className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FBF8F1] border border-[#E8E2D5] hover:border-[#C5A059] flex flex-col items-center space-y-1 transition-all"
                >
                  <Icon className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#6E6A63]">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text */}
        <button
          onClick={onAddText}
          className="px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 hover:bg-[#FBF8F1] text-[#6E6A63] hover:text-[#C5A059] transition-all"
          title="Add Custom Text"
        >
          <Type className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="hidden md:inline font-semibold uppercase text-[10px] tracking-wider">Text</span>
        </button>

        {/* Upload Image */}
        <button
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 hover:bg-[#FBF8F1] text-[#6E6A63] hover:text-[#C5A059] transition-all"
          title="Convert Image to Engraving Vector"
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="hidden lg:inline font-semibold uppercase text-[10px] tracking-wider">Upload</span>
        </button>

        {/* Eraser Brush Size — only shown while the Erase tool is active */}
        {activeTool === 'erase' && onEraserSizeChange && (
          <div className="flex items-center space-x-2 pl-2 ml-1 border-l border-[#E8E2D5]">
            <Eraser className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={eraserSize}
              onChange={(e) => onEraserSizeChange(Number(e.target.value))}
              className="w-20 accent-[#C5A059] cursor-pointer"
              title="Eraser Brush Size"
            />
            <span className="font-mono text-[10px] text-[#C5A059] font-bold w-6 text-right">{eraserSize}px</span>
          </div>
        )}
      </div>

      {/* History & Actions */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-full text-[#8A857C] hover:bg-[#FAF8F5] hover:text-[#121214] transition-all ${
            !canUndo && 'opacity-30 cursor-not-allowed'
          }`}
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-full text-[#8A857C] hover:bg-[#FAF8F5] hover:text-[#121214] transition-all ${
            !canRedo && 'opacity-30 cursor-not-allowed'
          }`}
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-[#E8E2D5] mx-1" />

        <button
          onClick={onClear}
          className="p-2 rounded-full text-[#9F1239] hover:bg-[#FFF1F2] transition-all"
          title="Clear Entire Canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

