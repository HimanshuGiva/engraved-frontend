import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Upload, ArrowRight, RefreshCw, Type, Image as ImageIcon, Video } from 'lucide-react';
import { MessageContentType } from '../../types';
import { getUploadConstraints } from '../../services/catalogService';
import {
  createGiftMessage,
  createGiftMessageWithMedia,
  qrSvgToPreviewUrl,
  resolveQrSvgContent,
} from '../../services/messageService';
import {
  allowedTypesLabel,
  defaultUploadConstraints,
  formatFileSize,
  photoAcceptString,
  UploadConstraints,
  validateMessageUpload,
  videoAcceptString,
} from '../../utils/uploadConstraints';

interface GiftQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQrToCanvas: (svgContent: string, messageId: string, label: string) => void;
}

type TabId = MessageContentType;

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'photo', label: 'Photo', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
];

export const GiftQrModal: React.FC<GiftQrModalProps> = ({
  isOpen,
  onClose,
  onAddQrToCanvas,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('text');
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [qrSvgContent, setQrSvgContent] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [uploadConstraints, setUploadConstraints] = useState<UploadConstraints>(defaultUploadConstraints());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    getUploadConstraints()
      .then(setUploadConstraints)
      .catch(() => setUploadConstraints(defaultUploadConstraints()));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('text');
    setTextContent('');
    setCaption('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsLoading(false);
    setErrorMessage(null);
    setQrPreviewUrl(null);
    setQrSvgContent(null);
    setMessageId(null);
    setViewUrl(null);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (filePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    if (file && activeTab !== 'text') {
      const validationError = validateMessageUpload(file, activeTab, uploadConstraints);
      if (validationError) {
        setErrorMessage(validationError);
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setQrPreviewUrl(null);
        setQrSvgContent(null);
        setMessageId(null);
        setViewUrl(null);
        return;
      }
    }

    setSelectedFile(file);
    setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
    setQrPreviewUrl(null);
    setQrSvgContent(null);
    setMessageId(null);
    setViewUrl(null);
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setQrPreviewUrl(null);
    setQrSvgContent(null);
    setMessageId(null);
    setViewUrl(null);

    try {
      let message;

      if (activeTab === 'text') {
        if (!textContent.trim()) {
          throw new Error('Enter a gift message');
        }
        message = await createGiftMessage({
          content_type: 'text',
          content: textContent.trim(),
        });
      } else {
        if (!selectedFile) {
          throw new Error(`Choose a ${activeTab} file to upload`);
        }
        const validationError = validateMessageUpload(selectedFile, activeTab, uploadConstraints);
        if (validationError) {
          throw new Error(validationError);
        }
        message = await createGiftMessageWithMedia(activeTab, selectedFile, caption);
      }

      if (!message.qr_svg_url) {
        throw new Error('Backend did not return a QR code');
      }

      const svgContent = await resolveQrSvgContent(message.qr_svg_url);
      setQrSvgContent(svgContent);
      setQrPreviewUrl(qrSvgToPreviewUrl(svgContent));
      setMessageId(message.id);
      setViewUrl(message.view_url);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to create gift QR');
    } finally {
      setIsLoading(false);
    }
  };

  const accept =
    activeTab === 'photo'
      ? photoAcceptString(uploadConstraints.content_types)
      : activeTab === 'video'
        ? videoAcceptString()
        : undefined;

  const uploadHint =
    activeTab === 'photo'
      ? `${allowedTypesLabel('photo', uploadConstraints.content_types)} · max ${formatFileSize(uploadConstraints.max_bytes)}`
      : activeTab === 'video'
        ? `${allowedTypesLabel('video', uploadConstraints.content_types)} · max ${formatFileSize(uploadConstraints.max_bytes)}`
        : '';

  return (
    <div className="fixed inset-0 z-50 bg-[#121214]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E8E2D5] text-[#121214] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">

        <div className="flex items-start justify-between border-b border-[#E8E2D5] pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs text-[#C5A059] font-bold uppercase tracking-[0.2em] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D5] mb-2">
              <QrCode className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Gift Message QR</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#121214]">
              Add a scannable gift link
            </h2>
            <p className="text-[#6E6A63] text-xs mt-1">
              Upload a photo or video, or write a message. The backend generates a QR code to engrave on the piece.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] hover:bg-[#121214] hover:text-[#C5A059] hover:border-[#121214] text-[#121214] flex items-center justify-center transition-colors font-mono"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                handleFileChange(null);
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === id
                  ? 'bg-[#121214] text-[#C5A059] border-[#121214]'
                  : 'bg-white text-[#6E6A63] border-[#E8E2D5] hover:border-[#C5A059]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'text' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">
              Gift message
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
              placeholder="Happy birthday! Scan this QR to read your personal note..."
              className="w-full bg-[#FAF8F5] border border-[#E8E2D5] focus:border-[#C5A059] rounded-xl py-3 px-4 text-sm text-[#121214] placeholder-[#A39E93] focus:outline-none focus:ring-1 focus:ring-[#C5A059] resize-none"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#E8E2D5] hover:border-[#C5A059] rounded-2xl p-6 flex flex-col items-center space-y-2 bg-[#FAF8F5] transition-colors"
            >
              <Upload className="w-6 h-6 text-[#C5A059]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]">
                {selectedFile ? selectedFile.name : `Upload ${activeTab}`}
              </span>
              <span className="text-[10px] text-[#8A857C]">{uploadHint}</span>
            </button>

            {filePreviewUrl && activeTab === 'photo' && (
              <img
                src={filePreviewUrl}
                alt="Upload preview"
                className="w-full max-h-36 object-contain rounded-xl border border-[#E8E2D5] bg-white"
              />
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">
                Optional caption
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="A note shown with the media..."
                className="w-full bg-[#FAF8F5] border border-[#E8E2D5] focus:border-[#C5A059] rounded-xl py-3 px-4 text-sm text-[#121214] placeholder-[#A39E93] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A857C]">QR preview</span>
          <div className="h-44 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] flex items-center justify-center overflow-hidden">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            ) : qrPreviewUrl ? (
              <img src={qrPreviewUrl} alt="Gift QR code" className="max-w-full max-h-full object-contain p-4" />
            ) : (
              <span className="text-[10px] text-[#8A857C] px-4 text-center">
                Generate to preview the QR returned by the backend
              </span>
            )}
          </div>
          {viewUrl && (
            <p className="text-[10px] text-[#8A857C] truncate">
              Scans to: <span className="font-mono text-[#6E6A63]">{viewUrl}</span>
            </p>
          )}
        </div>

        {errorMessage && (
          <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {!qrSvgContent ? (
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 py-3.5 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 disabled:opacity-40 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating QR...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-[#C5A059]" />
                  <span>Generate QR</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="py-3.5 px-4 rounded-full bg-[#FAF8F5] text-[#121214] border border-[#E8E2D5] hover:border-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Regenerate</span>
              </button>
              <button
                onClick={() => {
                  if (qrSvgContent && messageId) {
                    onAddQrToCanvas(qrSvgContent, messageId, 'Gift Message QR');
                    onClose();
                  }
                }}
                className="flex-1 py-3.5 rounded-full bg-[#121214] text-white hover:bg-[#C5A059] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Add to canvas</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
