import { GiftMessage, MessageContentType } from '../types';
import { svgToDataUrl } from '../utils/svg/dataUrl';
import { apiFetch, apiFetchHeaders, apiFetchText, ApiError } from './apiClient';

const ACCESS_TOKEN = (import.meta.env.VITE_ACCESS_TOKEN as string | undefined) ?? '';

interface PresignResponse {
  upload_url: string;
  key: string;
  public_url: string;
}

export async function presignMessageUpload(contentType: string): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      content_type: contentType,
      purpose: 'message_media',
    }),
  });
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string
): Promise<void> {
  const isApiProxy = uploadUrl.includes('/v1/uploads/object');
  const headers = apiFetchHeaders({ 'Content-Type': contentType }, uploadUrl);
  if (isApiProxy && ACCESS_TOKEN) {
    headers.set('xaccesstoken', ACCESS_TOKEN);
  }

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!res.ok) {
    let message = `Media upload failed (${res.status})`;
    try {
      const errBody = await res.json();
      message = errBody?.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }
}

/** Public viewer — GET /v1/messages/{short_id} (no auth required). */
export async function fetchPublicMessage(shortId: string): Promise<GiftMessage> {
  return apiFetch<GiftMessage>(`/v1/messages/${encodeURIComponent(shortId)}`);
}

export async function createGiftMessage(input: {
  content_type: MessageContentType;
  content?: string;
  media_url?: string;
}): Promise<GiftMessage> {
  return apiFetch<GiftMessage>('/v1/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Backend may return inline SVG or a proxied API path/URL to the SVG asset. */
export async function resolveQrSvgContent(qrSvgUrl: string): Promise<string> {
  const trimmed = qrSvgUrl.trim();
  if (trimmed.startsWith('<svg')) {
    return trimmed;
  }

  try {
    return await apiFetchText(trimmed);
  } catch (e) {
    if (e instanceof ApiError) {
      throw new ApiError('Failed to load QR SVG from backend', e.status, e.code);
    }
    throw e;
  }
}

/** Build a PNG/SVG data URL for reliable `<img>` previews in modals. */
export function qrSvgToPreviewUrl(svgContent: string): string {
  const dataMatch = svgContent.match(/href="(data:[^"]+)"/);
  if (dataMatch?.[1]) {
    return dataMatch[1];
  }
  return svgToDataUrl(svgContent);
}

export async function createGiftMessageWithMedia(
  contentType: 'photo' | 'video',
  file: File,
  caption: string
): Promise<GiftMessage> {
  const presign = await presignMessageUpload(file.type);
  await uploadToPresignedUrl(presign.upload_url, file, file.type);
  return createGiftMessage({
    content_type: contentType,
    content: caption.trim(),
    media_url: presign.public_url,
  });
}
