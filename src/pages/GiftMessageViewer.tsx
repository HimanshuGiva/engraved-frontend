import { useEffect, useState } from 'react';
import { Gift, Heart, Loader2, AlertCircle } from 'lucide-react';
import { fetchPublicMessage } from '../services/messageService';
import { ApiError } from '../services/apiClient';
import { GiftMessage } from '../types';

interface GiftMessageViewerProps {
  shortId: string;
}

export function GiftMessageViewer({ shortId }: GiftMessageViewerProps) {
  const [message, setMessage] = useState<GiftMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      try {
        const data = await fetchPublicMessage(shortId);
        if (!cancelled) setMessage(data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof ApiError
              ? e.status === 404
                ? 'This gift message could not be found.'
                : e.message
              : 'Failed to load gift message.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [shortId]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] font-sans flex flex-col">
      <header className="border-b border-[#E8E2D5] bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#E8E2D5] flex items-center justify-center">
              <Gift className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <p className="font-serif font-bold text-[#121214] text-sm">GIVA Gift Message</p>
              <p className="text-[10px] text-[#8A857C] uppercase tracking-wider font-mono">A message for you</p>
            </div>
          </div>
          <Heart className="w-4 h-4 text-[#C5A059]" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {isLoading ? (
            <div className="bg-white border border-[#E8E2D5] rounded-3xl p-12 flex flex-col items-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
              <p className="text-xs text-[#6E6A63] font-medium">Opening your gift message...</p>
            </div>
          ) : error ? (
            <div className="bg-white border border-red-100 rounded-3xl p-8 flex flex-col items-center text-center space-y-3 shadow-sm">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          ) : message ? (
            <div className="bg-white border border-[#E8E2D5] rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
              <div className="px-6 py-5 border-b border-[#E8E2D5] bg-[#FAF8F5]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C5A059]">
                  {message.content_type === 'text'
                    ? 'Personal note'
                    : message.content_type === 'photo'
                      ? 'Photo message'
                      : 'Video message'}
                </span>
                {message.created_at && (
                  <p className="text-[11px] text-[#8A857C] mt-1">
                    {new Date(message.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>

              <div className="p-6 space-y-4">
                {message.content_type === 'text' && (
                  <p className="font-serif text-lg leading-relaxed text-[#121214] whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}

                {message.content_type === 'photo' && message.media_url && (
                  <div className="space-y-3">
                    <img
                      src={message.media_url}
                      alt="Gift photo"
                      className="w-full rounded-2xl border border-[#E8E2D5] object-contain max-h-[28rem] bg-[#FAF8F5]"
                    />
                    {message.content.trim() && (
                      <p className="text-sm text-[#6E6A63] leading-relaxed">{message.content}</p>
                    )}
                  </div>
                )}

                {message.content_type === 'video' && message.media_url && (
                  <div className="space-y-3">
                    <video
                      src={message.media_url}
                      controls
                      playsInline
                      className="w-full rounded-2xl border border-[#E8E2D5] bg-black max-h-[28rem]"
                    />
                    {message.content.trim() && (
                      <p className="text-sm text-[#6E6A63] leading-relaxed">{message.content}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="py-6 text-center text-[10px] text-[#8A857C] uppercase tracking-widest font-mono">
        GIVA · Engraved with love
      </footer>
    </div>
  );
}
