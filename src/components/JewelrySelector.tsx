import React, { useState } from 'react';
import { JewelryItem, JewelryMaterial } from '../types';
import { JEWELRY_CATALOG } from '../data/jewelryCatalog';
import { Sparkles, Ruler, ArrowRight } from 'lucide-react';

interface JewelrySelectorProps {
  onSelectJewelry: (item: JewelryItem) => void;
}

export const JewelrySelector: React.FC<JewelrySelectorProps> = ({
  onSelectJewelry,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const filteredItems = JEWELRY_CATALOG.filter((item) => {
    if (selectedTypeFilter === 'all') return true;
    return item.constraints.shape === selectedTypeFilter;
  });

  const getMaterialBadge = (mat: JewelryMaterial) => {
    switch (mat) {
      case '18k_gold':
        return (
          <span className="bg-white/95 text-[#B8860B] border border-[#E6C687] px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase shadow-sm">
            18K Gold
          </span>
        );
      case 'silver':
        return (
          <span className="bg-white/95 text-[#475569] border border-[#CBD5E1] px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase shadow-sm">
            Silver
          </span>
        );
      case 'rose_gold':
        return (
          <span className="bg-white/95 text-[#9D174D] border border-[#FBCFE8] px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase shadow-sm">
            Rose Gold
          </span>
        );
      case 'platinum':
        return (
          <span className="bg-white/95 text-[#334155] border border-[#E2E8F0] px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase shadow-sm">
            Platinum
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 1 of 4</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121214] leading-tight">
          Choose Your Jewelry
        </h1>
        <p className="text-[#6E6A63] text-sm leading-relaxed">
          Pick a solid GIVA piece to personalize. You'll design and preview your engraving in the next step.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'bar', label: 'Silver Bar' },
          { id: 'circle', label: 'Gold Circular' },
          { id: 'squircle', label: 'Squircle' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTypeFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTypeFilter === tab.id
                ? 'bg-[#121214] text-white'
                : 'bg-white text-[#6E6A63] border border-[#E8E2D5] hover:border-[#C5A059]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
              {/* Image */}
              <div className="relative h-56 bg-[#F7F4EE]">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
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

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-serif text-lg font-bold text-[#121214] leading-snug">{item.name}</h3>
                  <div className="flex items-center space-x-1.5 text-[#8A857C] text-xs">
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{item.engravingAreaLabel}</span>
                  </div>
                  {item.popularSuggestion && (
                    <p className="text-xs text-[#8A857C]">
                      Popular: <span className="text-[#6E6A63] font-medium">{item.popularSuggestion}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E8E2D5] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-serif font-bold text-[#121214] leading-none">
                      ₹{item.priceInr.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-[#8A857C] mt-1">+ ₹{item.engravingFeeInr} engraving</div>
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

    </div>
  );
};
