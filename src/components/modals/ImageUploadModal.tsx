import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Check, Sparkles, Loader2 } from 'lucide-react';
import { SAMPLE_MOTIFS } from '../../data/sampleMotifs';
import { fetchAiEnhance, EnhanceMode } from '../../services/aiService';
import { readFileAsDataUrl } from '../../utils/canvasCapture';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImageVector: (svgContent: string, name: string) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onAddImageVector,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<string | null>(null);
  const [vectorName, setVectorName] = useState<string>('Uploaded Vector Motif');
  const [enhanceMode, setEnhanceMode] = useState<EnhanceMode>('ai_generated');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewSrc(null);
      setProcessedSvg(null);
      setEnhanceMode('ai_generated');
      setVectorName('Uploaded Vector Motif');
      setProcessError(null);
    }
  }, [isOpen]);

  const processRasterFile = async (file: File, mode: EnhanceMode = enhanceMode) => {
    setIsProcessing(true);
    setProcessError(null);
    setProcessedSvg(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await fetchAiEnhance(dataUrl, mode, '');
      setProcessedSvg(result.svgCode);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setVectorName(cleanName);
    setProcessError(null);

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
      setPreviewSrc(URL.createObjectURL(file));
      void processRasterFile(file);
    }
  };

  const handleSelectPreset = (preset: (typeof SAMPLE_MOTIFS)[0]) => {
    setSelectedFile(null);
    setVectorName(preset.name);
    setProcessedSvg(preset.svg);
    setPreviewSrc('preset');
    setProcessError(null);
  };

  const applyEnhanceMode = (mode: EnhanceMode) => {
    setEnhanceMode(mode);
    if (selectedFile && selectedFile.type !== 'image/svg+xml') {
      void processRasterFile(selectedFile, mode);
    }
  };

  const handleInsert = () => {
    if (!processedSvg) return;
    onAddImageVector(processedSvg, vectorName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl max-w-lg w-full p-6 text-[#121214] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] text-[#C5A059] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#121214]">Upload Image</h2>
              <p className="text-[#6E6A63] text-xs">Raster files are enhanced and converted to SVG on the server</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] text-[#121214] flex items-center justify-center font-bold text-xs transition-colors font-mono"
          >
            ✕
          </button>
        </div>

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
                <p className="text-xs text-[#6E6A63] mt-0.5">Supports PNG, JPG, WebP, SVG</p>
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

            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono font-bold uppercase text-[#8A857C] tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#C5A059]" />
                <span>Or select a sample motif vector:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_MOTIFS.map((preset) => (
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
            <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-widest">
                Laser Engraving Vector Output
              </span>
              <div className="w-48 h-48 bg-white border border-[#E8E2D5] rounded-xl p-3 flex items-center justify-center shadow-inner overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                ) : processedSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: processedSvg }} className="w-full h-full" />
                ) : (
                  <p className="text-xs text-[#8A857C]">Processing on server...</p>
                )}
              </div>
            </div>

            {selectedFile && selectedFile.type !== 'image/svg+xml' && (
              <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E2D5] text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-[#121214] uppercase text-[10px] tracking-wider">Enhance style</span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-[#E8E2D5]">
                    <button
                      type="button"
                      onClick={() => applyEnhanceMode('ai_generated')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        enhanceMode === 'ai_generated'
                          ? 'bg-[#121214] text-white shadow-2xs'
                          : 'text-[#6E6A63] hover:text-[#121214]'
                      }`}
                    >
                      Clean line art
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEnhanceMode('manual')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        enhanceMode === 'manual'
                          ? 'bg-[#121214] text-white shadow-2xs'
                          : 'text-[#6E6A63] hover:text-[#121214]'
                      }`}
                    >
                      Hand-drawn
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1 border-t border-[#E8E2D5]">
                  <button
                    onClick={() => {
                      setPreviewSrc(null);
                      setSelectedFile(null);
                      setProcessedSvg(null);
                    }}
                    className="text-[10px] uppercase tracking-wider text-[#C5A059] font-bold hover:underline"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            )}

            {processError && (
              <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {processError}
              </p>
            )}
          </div>
        )}

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
