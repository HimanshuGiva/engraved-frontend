import { MessageContentType } from '../types';

export const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/quicktime'] as const;

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface UploadConstraints {
  max_bytes: number;
  content_types: string[];
}

export function defaultUploadConstraints(): UploadConstraints {
  return {
    max_bytes: DEFAULT_MAX_BYTES,
    content_types: DEFAULT_PHOTO_TYPES,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function photoAcceptString(contentTypes: string[]): string {
  return contentTypes.join(',');
}

export function videoAcceptString(): string {
  return VIDEO_CONTENT_TYPES.join(',');
}

export function allowedTypesLabel(contentType: MessageContentType, photoTypes: string[]): string {
  if (contentType === 'photo') {
    return photoTypes.map((t) => t.replace('image/', '').toUpperCase()).join(', ');
  }
  if (contentType === 'video') {
    return 'MP4, MOV';
  }
  return '';
}

export function validateMessageUpload(
  file: File,
  contentType: 'photo' | 'video',
  constraints: UploadConstraints
): string | null {
  const allowed =
    contentType === 'photo'
      ? constraints.content_types
      : [...VIDEO_CONTENT_TYPES];

  const normalizedType = file.type.toLowerCase();
  const typeOk = allowed.some((t) => t.toLowerCase() === normalizedType);
  if (!typeOk) {
    return `File type not allowed. Use ${allowedTypesLabel(contentType, constraints.content_types)}.`;
  }

  if (file.size > constraints.max_bytes) {
    return `File is too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(constraints.max_bytes)}.`;
  }

  return null;
}
