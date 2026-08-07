import { GiftMessage, MessageContentType } from '../types';
import { apiFetch, ApiError } from './apiClient';
import { svgToDataUrl } from './aiService';

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
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!res.ok) {
    throw new ApiError(`Media upload failed (${res.status})`, res.status);
  }
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

/** Backend may return inline SVG or a public URL to the SVG asset. */
export async function resolveQrSvgContent(qrSvgUrl: string): Promise<string> {
  const trimmed = qrSvgUrl.trim();
  if (trimmed.startsWith('<svg')) {
    return trimmed;
  }

  const res = await fetch(trimmed);
  if (!res.ok) {
    throw new ApiError('Failed to load QR SVG from backend', res.status);
  }
  return res.text();
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
