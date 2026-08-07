import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sliders, Check, Sparkles } from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImageVector: (svgContent: string, name: string) => void;
}

const SAMPLE_PRESETS = [
  {
    name: 'Royal Crown Motif',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M15 70 L25 35 L40 50 L50 25 L60 50 L75 35 L85 70 Z M20 75 L80 75 A5 5 0 0 1 80 82 L20 82 A5 5 0 0 1 20 75 Z" fill="#121214" stroke="#121214" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  },
  {
    name: 'Infinity Knot Symbol',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M30 50 C15 30 15 70 30 50 C45 30 55 70 70 50 C85 30 85 70 70 50 C55 30 45 70 30 50 Z" fill="none" stroke="#121214" stroke-width="6" stroke-linecap="round"/></svg>`
  },
  {
    name: 'Minimalist Heart Silhouette',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M50 82 C50 82 18 58 18 36 C18 22 28 16 38 20 C45 23 50 30 50 30 C50 30 55 23 62 20 C72 16 82 22 82 36 C82 58 50 82 50 82 Z" fill="#121214" stroke="#121214" stroke-width="2" stroke-linejoin="round"/></svg>`
  },
  {
    name: 'Lotus Flower Emblem',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="M50 20 C40 40 30 65 50 80 C70 65 60 40 50 20 Z M50 80 C25 65 10 50 20 35 C35 35 45 55 50 80 Z M50 80 C75 65 90 50 80 35 C65 35 55 55 50 80 Z" fill="#121214"/></svg>`
  }
];

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onAddImageVector,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<string | null>(null);
  const [vectorName, setVectorName] = useState<string>('Uploaded Vector Motif');
  const [threshold, setThreshold] = useState<number>(128);
  const [detailLevel, setDetailLevel] = useState<number>(500);
  const [invert, setInvert] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewSrc(null);
      setProcessedSvg(null);
      setThreshold(128);
      setDetailLevel(500);
      setInvert(false);
      setVectorName('Uploaded Vector Motif');
    }
  }, [isOpen]);

  const processImageToVector = (imgUrl: string, thresh: number, inv: boolean, detailRes: number = 400) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxDim = detailRes; // High definition vector precision grid (up to 400px)
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let pathSegments: string[] = [];

      // High precision row-by-row horizontal run-length encoding for smooth vector lines
      for (let y = 0; y < h; y++) {
        let x = 0;
        while (x < w) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];

          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const isDark = brightness < thresh;
          const shouldKeep = inv ? !isDark : isDark;

          if (alpha > 30 && shouldKeep) {
            let runStart = x;
            while (x < w) {
              const nextIdx = (y * w + x) * 4;
              const nr = data[nextIdx];
              const ng = data[nextIdx + 1];
              const nb = data[nextIdx + 2];
              const na = data[nextIdx + 3];
              const nBrightness = 0.299 * nr + 0.587 * ng + 0.114 * nb;
              const nIsDark = nBrightness < thresh;
              const nShouldKeep = inv ? !nIsDark : nIsDark;

              if (na > 30 && nShouldKeep) {
                x++;
              } else {
                break;
              }
            }
            const runLen = x - runStart;
            pathSegments.push(`M${runStart},${y}h${runLen}v1h-${runLen}z`);
          } else {
            x++;
          }
        }
      }

      const combinedPath = pathSegments.length > 0 ? pathSegments.join(' ') : 'M10,10h10v10h-10z';
      const svgCode = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <path d="${combinedPath}" fill="#121214" />
      </svg>`;

      setProcessedSvg(svgCode);
      setIsProcessing(false);
    };

    img.onerror = () => {
      setIsProcessing(false);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setVectorName(cleanName);

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        let text = (event.target?.result as string) || '';
        if (!text.includes('width=')) {
          text = text.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');
        }
        setProcessedSvg(text);
        setPreviewSrc(URL.createObjectURL(file));
      };
      reader.readAsText(file);
    } else {
      const url = URL.createObjectURL(file);
      setPreviewSrc(url);
      processImageToVector(url, threshold, invert, detailLevel);
    }
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedFile(null);
    setVectorName(preset.name);
    setProcessedSvg(preset.svg);
    setPreviewSrc('preset');
  };

  useEffect(() => {
    if (previewSrc && previewSrc !== 'preset' && selectedFile && selectedFile.type !== 'image/svg+xml') {
      processImageToVector(previewSrc, threshold, invert, detailLevel);
    }
  }, [threshold, invert, detailLevel]);

  const handleInsert = () => {
    if (!processedSvg) return;
    onAddImageVector(processedSvg, vectorName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl max-w-lg w-full p-6 text-[#121214] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#C5A059] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#121214]">Upload Image to Vector</h2>
              <p className="text-[#6E6A63] text-xs">Convert artwork into precision laser engraving vectors</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] flex items-center justify-center font-bold text-xs transition-colors font-mono"
          >
            ✕
          </button>
        </div>

        {/* Upload Drop Area */}
        {!previewSrc ? (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#C5A059]/40 hover:border-[#C5A059] bg-[#FAF8F5] hover:bg-[#FBF8F1] transition-all rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D5] flex items-center justify-center text-[#C5A059] shadow-2xs">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#121214]">Click to upload or drag image file</p>
                <p className="text-xs text-[#6E6A63] mt-0.5">Supports PNG, JPG, WebP, SVG (Auto Vectorization)</p>
              </div>
              <span className="px-5 py-2 bg-[#121214] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xs hover:bg-[#C5A059] transition-colors">
                Browse Files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono font-bold uppercase text-[#8A857C] tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#C5A059]" />
                <span>Or select a sample motif vector:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3 bg-[#FAF8F5] hover:bg-[#FBF8F1] border border-[#E8E2D5] hover:border-[#C5A059] rounded-xl flex items-center space-x-2 text-xs text-left transition-all"
                  >
                    <div
                      className="w-8 h-8 bg-white rounded border border-[#E8E2D5] p-1 flex-shrink-0 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: preset.svg }}
                    />
                    <span className="font-bold text-[#121214] text-[11px] truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vector Live Preview */}
            <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-widest">
                Laser Engraving Vector Output
              </span>
              <div
                className="w-48 h-48 bg-white border border-[#E8E2D5] rounded-xl p-3 flex items-center justify-center shadow-inner overflow-hidden [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: processedSvg || '<p className="text-xs text-[#8A857C]">Processing vector...</p>' }}
              />
            </div>

            {/* Adjustment Controls (Threshold/Detail/Invert) */}
            {selectedFile && selectedFile.type !== 'image/svg+xml' && (
              <div className="space-y-3.5 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E2D5] text-xs">
                {/* Detail Level Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#121214] flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span className="uppercase text-[10px] tracking-wider">Vector Detail Precision</span>
                    </span>
                    <span className="font-mono text-[#C5A059] font-bold text-[10px]">
                      {detailLevel >= 500 ? 'Ultra Fine (500px)' : detailLevel >= 320 ? 'High Detail (320px)' : 'Medium (200px)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-[#E8E2D5]">
                    {[
                      { label: 'Medium', val: 200 },
                      { label: 'High', val: 320 },
                      { label: 'Ultra Fine', val: 500 },
                    ].map((mode) => (
                      <button
                        key={mode.val}
                        onClick={() => setDetailLevel(mode.val)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          detailLevel === mode.val
                            ? 'bg-[#121214] text-white shadow-2xs'
                            : 'text-[#6E6A63] hover:text-[#121214]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Threshold slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#121214] flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span className="uppercase text-[10px] tracking-wider">Engraving Contrast Threshold</span>
                    </span>
                    <span className="font-mono text-[#C5A059] font-bold">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-[#C5A059] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#E8E2D5]">
                  <label className="text-xs font-medium text-[#121214] flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(e) => setInvert(e.target.checked)}
                      className="accent-[#C5A059] rounded"
                    />
                    <span>Invert Light & Dark</span>
                  </label>

                  <button
                    onClick={() => {
                      setPreviewSrc(null);
                      setSelectedFile(null);
                    }}
                    className="text-[10px] uppercase tracking-wider text-[#C5A059] font-bold hover:underline"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-full border border-[#E8E2D5] bg-white text-[#121214] font-bold text-xs uppercase tracking-wider hover:bg-[#FAF8F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!processedSvg || isProcessing}
            className="flex-1 py-3 px-4 rounded-full bg-[#121214] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#C5A059] transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4 text-[#C5A059]" />
            <span>Add to Canvas</span>
          </button>
        </div>

      </div>
    </div>
  );
};


