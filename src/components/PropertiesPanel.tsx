import React, { useState, useEffect } from 'react';
import { CanvasElement, CanvasRegion, visibleLayers } from '../types';
import {
  Sparkles,
  RotateCw,
  Maximize2,
  Layers,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  AlignCenter,
  Sliders,
  Wand2,
  Scan,
  Plus,
} from 'lucide-react';
import { isEnhanceableElement } from '../utils/canvasCapture';

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null;
  selectedRegion: CanvasRegion | null;
  elements: CanvasElement[];
  onSelectElement: (id: string | null) => void;
  onClearRegion: () => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'front' | 'back') => void;
  onOpenAiRefine: (element: CanvasElement) => void;
  onOpenAiEnhance: (element: CanvasElement) => void;
  onEnhanceRegion: (region: CanvasRegion) => void;
  onExtractRegion: (region: CanvasRegion) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  selectedRegion,
  elements,
  onSelectElement,
  onClearRegion,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  onOpenAiRefine,
  onOpenAiEnhance,
  onEnhanceRegion,
  onExtractRegion,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');
  const layers = visibleLayers(elements);

  useEffect(() => {
    if (selectedElement) {
      setActiveTab('properties');
    }
  }, [selectedElement?.id]);

  useEffect(() => {
    if (selectedRegion) {
      setActiveTab('properties');
    }
  }, [selectedRegion]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E8E2D5] text-[#121214] space-y-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      
      {/* Panel Tab Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E2D5] pb-3.5">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'properties'
                ? 'bg-[#121214] text-[#C5A059] shadow-2xs'
                : 'bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
              activeTab === 'layers'
                ? 'bg-[#121214] text-[#C5A059] shadow-2xs'
                : 'bg-[#FAF8F5] text-[#6E6A63] hover:text-[#121214]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Layers ({layers.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {selectedElement?.isAiGenerated && activeTab === 'properties' && (
            <button
              onClick={() => onOpenAiRefine(selectedElement)}
              className="px-3 py-1 rounded-full bg-[#FBF8F1] text-[#C5A059] border border-[#E6C687]/50 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1 hover:bg-[#F7F4EE] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[#C5A059]" />
              <span>Refine AI</span>
            </button>
          )}
          {selectedElement && isEnhanceableElement(selectedElement) && activeTab === 'properties' && (
            <button
              onClick={() => onOpenAiEnhance(selectedElement)}
              className="px-3 py-1 rounded-full bg-[#121214] text-[#C5A059] border border-[#C5A059]/40 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1 hover:bg-[#C5A059] hover:text-white transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              <span>Enhance</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Canvas Layers List */}
      {activeTab === 'layers' && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A857C]">All Canvas Layers</h4>
          {layers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6E6A63] space-y-2">
              <p>Your canvas is currently empty.</p>
              <p className="text-[#121214]">Tap <strong className="text-[#C5A059]">"Create with AI"</strong> or start drawing to add an element.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {layers.map((el, i) => {
                const isSelected = selectedElement?.id === el.id;
                return (
                  <div
                    key={el.id}
                    onClick={() => {
                      onSelectElement(el.id);
                      setActiveTab('properties');
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FBF8F1] border-[#C5A059] shadow-2xs'
                        : 'bg-[#FAF8F5] border-[#E8E2D5] hover:border-[#C5A059]/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                        isSelected ? 'bg-[#C5A059] text-white' : 'bg-[#E8E2D5] text-[#121214]'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="truncate font-bold text-[#121214]">{el.name}</span>
                    </div>

                    <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onReorderElement(el.id, 'front')}
                        className="p-1 rounded hover:bg-white text-[#6E6A63] hover:text-[#C5A059]"
                        title="Bring Front"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onReorderElement(el.id, 'back')}
                        className="p-1 rounded hover:bg-white text-[#6E6A63] hover:text-[#C5A059]"
                        title="Send Back"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteElement(el.id)}
                        className="p-1 rounded hover:bg-rose-50 text-[#9F1239]"
                        title="Delete Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Empty State when No Layer Selected under Properties Tab */}
      {activeTab === 'properties' && !selectedElement && !selectedRegion && (
        <div className="py-12 text-center text-xs text-[#8A857C] space-y-2.5 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D5] p-6">
          <div className="w-10 h-10 rounded-full bg-white border border-[#E8E2D5] flex items-center justify-center mx-auto text-[#C5A059] shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-[#121214] text-sm">No Layer Selected</p>
            <p className="text-[#6E6A63] text-xs mt-1">
              Click a layer to edit it, or drag on empty canvas to select a portion.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content: Canvas region selection */}
      {activeTab === 'properties' && selectedRegion && !selectedElement && (
        <div className="space-y-4 text-xs">
          <div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Scan className="w-3.5 h-3.5" />
              Canvas Region
            </span>
            <h3 className="font-serif font-bold text-lg text-[#121214] mt-1">Selected portion</h3>
            <p className="text-[#6E6A63] text-[11px] mt-1 leading-relaxed">
              {Math.round(selectedRegion.width)}% × {Math.round(selectedRegion.height)}% of the engraving area
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={() => onEnhanceRegion(selectedRegion)}
              className="w-full py-3 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 transition-colors"
            >
              <Wand2 className="w-4 h-4 text-[#C5A059]" />
              <span>Enhance this region</span>
            </button>

            <button
              onClick={() => onExtractRegion(selectedRegion)}
              className="w-full py-3 rounded-full bg-[#FAF8F5] text-[#121214] border border-[#E8E2D5] hover:border-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>Add as new layer</span>
            </button>

            <button
              onClick={onClearRegion}
              className="w-full py-3 rounded-full bg-white text-[#6E6A63] border border-[#E8E2D5] hover:border-[#C5A059] font-bold uppercase tracking-widest text-[10px] transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: Element Properties Controls */}
      {activeTab === 'properties' && selectedElement && (
        <div className="space-y-5 text-xs">
          {/* Layer Name */}
          <div className="pb-3 border-b border-[#E8E2D5]">
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest font-bold">
              {selectedElement.isAiGenerated
                ? '✨ AI Generated Vector'
                : selectedElement.isCustomerHandwriting
                ? '✍️ Personal Handwriting'
                : selectedElement.type === 'text'
                ? '🔤 Text Engraving'
                : selectedElement.type === 'shape'
                ? '◆ Shape'
                : 'Layer Selected'}
            </span>
            <h3 className="font-serif font-bold text-lg text-[#121214] truncate mt-0.5">{selectedElement.name}</h3>
          </div>

          {/* Text Editor Input for Text Type */}
          {selectedElement.type === 'text' && (
            <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E2D5]">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C]">Text Content</label>
                <input
                  type="text"
                  value={selectedElement.content}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      content: e.target.value,
                      name: `Text "${e.target.value}"`,
                    })
                  }
                  className="w-full bg-white border border-[#E8E2D5] focus:border-[#C5A059] focus:outline-none rounded-xl px-3 py-2 text-xs text-[#121214] font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A857C]">Font Style</label>
                <select
                  value={selectedElement.color || 'serif'}
                  onChange={(e) => onUpdateElement({ ...selectedElement, color: e.target.value })}
                  className="w-full bg-white border border-[#E8E2D5] focus:border-[#C5A059] focus:outline-none rounded-xl px-3 py-2 text-xs text-[#121214] font-medium"
                >
                  <option value="serif">Playfair (Classy Serif)</option>
                  <option value="sans">Jakarta (Modern Sans)</option>
                  <option value="script">Script (Romantic Cursive)</option>
                  <option value="mono">Monospace (Tech Precision)</option>
                </select>
              </div>
            </div>
          )}

          {/* Size Slider */}
          <div className="space-y-1.5">
              <div className="flex justify-between text-[#6E6A63] font-medium">
                <span className="flex items-center space-x-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="uppercase text-[10px] tracking-wider font-bold">Scale Size</span>
                </span>
                <span className="font-mono text-[#C5A059] font-bold">{Math.round(selectedElement.width)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={selectedElement.width}
                onChange={(e) => {
                  const newW = parseFloat(e.target.value);
                  onUpdateElement({ ...selectedElement, width: newW, height: newW });
                }}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          {/* Rotation Slider */}
          <div className="space-y-1.5">
              <div className="flex justify-between text-[#6E6A63] font-medium">
                <span className="flex items-center space-x-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="uppercase text-[10px] tracking-wider font-bold">Rotation</span>
                </span>
                <span className="font-mono text-[#C5A059] font-bold">{Math.round(selectedElement.rotation)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedElement.rotation}
                onChange={(e) => onUpdateElement({ ...selectedElement, rotation: parseFloat(e.target.value) })}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          {/* Stroke Width Slider — line thickness for hand-drawn/shape strokes */}
          {(selectedElement.type === 'freehand_draw' ||
            selectedElement.type === 'handwriting' ||
            selectedElement.type === 'shape') && (
            <div className="space-y-2">
              <div className="flex justify-between text-[#6E6A63] font-medium">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="uppercase text-[10px] tracking-wider font-bold">
                    Line Engraving Thickness
                  </span>
                </span>
                <span className="font-mono text-[#C5A059] font-bold">{selectedElement.strokeWidth ?? 1}px</span>
              </div>
              <input
                type="range"
                min="0.5"
                max={6}
                step="0.5"
                value={selectedElement.strokeWidth ?? 1}
                onChange={(e) => onUpdateElement({ ...selectedElement, strokeWidth: parseFloat(e.target.value) })}
                className="w-full accent-[#C5A059] cursor-pointer"
              />
              <div className="flex items-center space-x-1.5 pt-1">
                {[0.5, 1, 2, 3, 4, 6].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onUpdateElement({ ...selectedElement, strokeWidth: w })}
                    className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                      (selectedElement.strokeWidth ?? 1) === w
                        ? 'bg-[#121214] text-white border-[#121214]'
                        : 'bg-white text-[#6E6A63] border-[#E8E2D5] hover:border-[#C5A059]'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Center Alignment Button */}
          <button
              onClick={() => onUpdateElement({ ...selectedElement, x: 50, y: 50 })}
              className="w-full py-3 bg-[#FAF8F5] hover:bg-[#FBF8F1] text-[#121214] rounded-full border border-[#E8E2D5] hover:border-[#C5A059] flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs"
            >
              <AlignCenter className="w-4 h-4 text-[#C5A059]" />
            <span>Center on Canvas</span>
          </button>

          {/* Layer Actions */}
          <div className="pt-3 border-t border-[#E8E2D5] grid grid-cols-2 gap-2">
            <button
              onClick={() => onDuplicateElement(selectedElement.id)}
              className="py-3 bg-[#FAF8F5] hover:bg-[#FBF8F1] rounded-2xl border border-[#E8E2D5] hover:border-[#C5A059] flex items-center justify-center gap-2 text-[10px] text-[#121214] font-bold tracking-wider uppercase transition-colors"
              title="Duplicate Element"
            >
              <Copy className="w-4 h-4 text-[#C5A059]" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              className="py-3 bg-rose-50 hover:bg-rose-100 rounded-2xl border border-rose-200 flex items-center justify-center gap-2 text-[10px] text-[#9F1239] font-bold tracking-wider uppercase transition-colors"
              title="Delete Element"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

