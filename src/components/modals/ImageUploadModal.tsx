import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Check, Loader2, Sparkles } from 'lucide-react';
import { SAMPLE_MOTIFS } from '../../data/sampleMotifs';
import { fetchAiEnhance, fetchVectorize } from '../../services/aiService';
import { readFileAsDataUrl } from '../../utils/canvasCapture';
import {
  engravingImageAcceptString,
  engravingImageTypesLabel,
  validateEngravingImageUpload,
} from '../../utils/uploadConstraints';

const UPLOAD_ENHANCE_OPTIONS = ['photo_lineart', 'stylize'] as const;

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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [rasterDataUrl, setRasterDataUrl] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewSrc(null);
      setProcessedSvg(null);
      setVectorName('Uploaded Vector Motif');
      setIsEnhancing(false);
      setRasterDataUrl(null);
      setProcessError(null);
    }
  }, [isOpen]);

  const processRasterFile = async (file: File) => {
    setIsProcessing(true);
    setProcessError(null);
    setProcessedSvg(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRasterDataUrl(dataUrl);
      const result = await fetchVectorize(dataUrl);
      setProcessedSvg(result.svgCode);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhanceWithAi = async () => {
    if (!rasterDataUrl) return;
    setIsEnhancing(true);
    setProcessError(null);

    try {
      const result = await fetchAiEnhance(rasterDataUrl, [...UPLOAD_ENHANCE_OPTIONS], '');
      setProcessedSvg(result.svgCode);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : 'AI enhance failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file after a rejected attempt.
    e.target.value = '';
    if (!file) return;

    const validationError = validateEngravingImageUpload(file);
    if (validationError) {
      setProcessError(validationError);
      setSelectedFile(null);
      setPreviewSrc(null);
      setProcessedSvg(null);
      setRasterDataUrl(null);
      return;
    }

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setVectorName(cleanName);
    setProcessError(null);

    const isSvg =
      file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

    if (isSvg) {
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
              <p className="text-[#6E6A63] text-xs">Images are traced to SVG on the server. Use AI enhance for photos.</p>
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
                <p className="text-xs text-[#6E6A63] mt-0.5">Supports {engravingImageTypesLabel()}</p>
              </div>
              <span className="px-5 py-2 bg-[#121214] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xs hover:bg-[#C5A059] transition-colors">
                Browse Files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={engravingImageAcceptString()}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono font-bold uppercase text-[#8A857C] tracking-wider">
                Or select a sample motif vector:
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

            {processError && (
              <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {processError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[#C5A059] tracking-widest">
                Laser Engraving Vector Output
              </span>
              <div className="w-48 h-48 bg-white border border-[#E8E2D5] rounded-xl p-3 flex items-center justify-center shadow-inner overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                {isProcessing || isEnhancing ? (
                  <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                ) : processedSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: processedSvg }} className="w-full h-full" />
                ) : (
                  <p className="text-xs text-[#8A857C]">Processing on server...</p>
                )}
              </div>
            </div>

            {selectedFile && selectedFile.type !== 'image/svg+xml' && !selectedFile.name.toLowerCase().endsWith('.svg') && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleEnhanceWithAi}
                  disabled={!rasterDataUrl || isProcessing || isEnhancing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-[#C5A059]/40 bg-[#FBF8F1] text-[#C5A059] text-[10px] font-bold uppercase tracking-wider hover:border-[#C5A059] hover:bg-[#FAF3E4] transition-colors disabled:opacity-50"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Enhance with AI</span>
                </button>
                <button
                  onClick={() => {
                    setPreviewSrc(null);
                    setSelectedFile(null);
                    setProcessedSvg(null);
                    setRasterDataUrl(null);
                  }}
                  className="text-[10px] uppercase tracking-wider text-[#C5A059] font-bold hover:underline"
                >
                  Change Image
                </button>
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
            disabled={!processedSvg || isProcessing || isEnhancing}
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
