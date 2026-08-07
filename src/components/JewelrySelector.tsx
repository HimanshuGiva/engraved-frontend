import React, { useState } from 'react';
import { JewelryItem, JewelryMaterial } from '../types';
import { JEWELRY_CATALOG } from '../data/jewelryCatalog';
import { Sparkles, Ruler, ArrowRight, Info } from 'lucide-react';

interface JewelrySelectorProps {
  onSelectJewelry: (item: JewelryItem) => void;
}

export const JewelrySelector: React.FC<JewelrySelectorProps> = ({
  onSelectJewelry,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<JewelryItem | null>(null);

  const filteredItems = JEWELRY_CATALOG.filter((item) => {
    if (selectedTypeFilter === 'all') return true;
    return item.constraints.shape === selectedTypeFilter;
  });

  const getMaterialBadge = (mat: JewelryMaterial) => {
    switch (mat) {
      case '18k_gold':
        return (
          <span className="bg-[#FDFBF7] text-[#B8860B] border border-[#E6C687] px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
            18K Gold Plated
          </span>
        );
      case 'silver':
        return (
          <span className="bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
            925 Sterling Silver
          </span>
        );
      case 'rose_gold':
        return (
          <span className="bg-[#FDF2F4] text-[#9D174D] border border-[#FBCFE8] px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
            Rose Gold
          </span>
        );
      case 'platinum':
        return (
          <span className="bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase shadow-2xs">
            Platinum
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Atelier Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-white p-8 md:p-12 text-[#121214] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-[#E8E2D5]">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center space-x-2 bg-[#FBF8F1] text-[#C5A059] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] border border-[#E6C687]/50">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>In-Store Personalization Experience</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#121214] leading-[1.15]">
            AI gives you a starting point.<br />
            <span className="text-[#C5A059] italic font-serif">Your story makes it timeless.</span>
          </h1>

          <p className="text-[#6E6A63] text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
            Choose a piece of solid GIVA physical jewelry below. Combine AI-generated artwork, your own hand-drawn sketches, and personal handwriting into a precision laser-engraved masterpiece.
          </p>

          <div className="pt-3 flex flex-wrap gap-6 text-xs text-[#121214] font-medium">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
              <span className="uppercase tracking-wider text-[11px] font-semibold text-[#6E6A63]">3 Solid Pendant Canvases</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
              <span className="uppercase tracking-wider text-[11px] font-semibold text-[#6E6A63]">Direct Freehand Handwriting</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
              <span className="uppercase tracking-wider text-[11px] font-semibold text-[#6E6A63]">Image Vector Conversion</span>
            </div>
          </div>
        </div>

        {/* Ambient background subtle golden silk gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#FBF8F1] to-transparent pointer-events-none rounded-l-full opacity-70" />
      </div>

      {/* Catalog Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#E8E2D5] pb-5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-[0.2em]">STEP 1 OF 4</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#121214] mt-0.5">Select Physical Jewelry Canvas</h2>
          <p className="text-[#6E6A63] text-xs sm:text-sm mt-0.5">Select the solid GIVA piece you would like to personalize and engrave in-store.</p>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: 'all', label: 'All Canvases' },
            { id: 'bar', label: 'Silver Bar' },
            { id: 'circle', label: 'Gold Circular' },
            { id: 'squircle', label: 'Squircle' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                selectedTypeFilter === tab.id
                  ? 'bg-[#121214] text-white shadow-2xs border border-[#121214]'
                  : 'bg-white text-[#6E6A63] border border-[#E8E2D5] hover:border-[#C5A059] hover:bg-[#FAF8F5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectJewelry(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectJewelry(item);
                }
              }}
              className="group relative rounded-3xl bg-white border border-[#E8E2D5] hover:border-[#C5A059]/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/50"
            >
              {/* Image Container */}
              <div className="relative h-72 bg-[#F7F4EE] overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-4 left-4">
                  {getMaterialBadge(item.material)}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModalItem(item);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#E8E2D5] text-[#121214] flex items-center justify-center hover:bg-white hover:border-[#C5A059] shadow-2xs transition-colors"
                  title="View Engraving Specs"
                >
                  <Info className="w-4 h-4 text-[#C5A059]" />
                </button>

                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md text-[#121214] border border-[#E8E2D5] px-3.5 py-1 rounded-full text-xs font-mono flex items-center space-x-1.5 shadow-2xs">
                  <Ruler className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="text-[11px] font-medium">{item.engravingAreaLabel}</span>
                </div>
              </div>

              {/* Product Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[#8A857C] uppercase tracking-[0.2em] font-bold">{item.sku}</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059] bg-[#FBF8F1] px-2.5 py-0.5 rounded-full border border-[#E6C687]/40">
                      Laser Precision Ready
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-[#121214] line-clamp-1">{item.name}</h3>
                  <p className="text-[#6E6A63] text-xs mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                {item.popularSuggestion && (
                  <div className="bg-[#FAF8F5] border border-[#E8E2D5] p-3 rounded-2xl text-xs text-[#121214] flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
                    <span className="truncate text-xs font-medium text-[#6E6A63]">Popular: <strong className="text-[#121214] font-semibold">{item.popularSuggestion}</strong></span>
                  </div>
                )}

                <div className="pt-4 border-t border-[#E8E2D5] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#8A857C] font-bold">Base Price</div>
                    <div className="text-2xl font-serif font-bold text-[#121214]">
                      ₹{item.priceInr.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-[#8A857C] mt-0.5">+ ₹{item.engravingFeeInr} Live Laser Fee</div>
                  </div>

                  <span
                    className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest flex items-center space-x-2 transition-all shadow-2xs bg-[#121214] text-white group-hover:bg-[#C5A059]"
                  >
                    <span>Personalize</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
        ))}
      </div>

      {/* Engraving Specs Detail Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#E8E2D5] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div>
                <span className="text-xs font-mono text-[#C5A059] font-bold">{activeModalItem.sku}</span>
                <h3 className="font-serif text-2xl font-bold text-[#121214]">{activeModalItem.name}</h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#121214] flex items-center justify-center hover:bg-[#F7F4EE]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#6E6A63]">
              <div className="bg-[#FAF8F5] p-4 rounded-2xl space-y-2 border border-[#E8E2D5]">
                <div className="flex justify-between font-medium text-[#121214]">
                  <span>Safe Engraving Zone:</span>
                  <span className="font-mono text-[#C5A059] font-bold">{activeModalItem.constraints.safeWidthMm}mm × {activeModalItem.constraints.safeHeightMm}mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Surface Geometry:</span>
                  <span className="capitalize font-semibold text-[#121214]">{activeModalItem.constraints.shape}</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Line Thickness:</span>
                  <span className="font-semibold text-[#121214]">{activeModalItem.constraints.minStrokeWidthMm}mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Characters (Text):</span>
                  <span className="font-semibold text-[#121214]">{activeModalItem.constraints.maxCharacters} characters</span>
                </div>
              </div>

              <p className="text-[#6E6A63] leading-relaxed">
                {activeModalItem.description}
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#6E6A63] hover:bg-[#FAF8F5]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectJewelry(activeModalItem);
                  setActiveModalItem(null);
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#121214] text-[#C5A059] hover:bg-[#C5A059] hover:text-white transition-colors"
              >
                Personalize SKU
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

