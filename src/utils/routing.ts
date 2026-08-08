/** Matches gift viewer routes: /m/{short_id} (see PUBLIC_MESSAGE_BASE_URL in backend). */
export function parseGiftMessageShortId(pathname: string): string | null {
  const match = pathname.match(/^\/m\/([a-zA-Z0-9]+)\/?$/);
  return match?.[1] ?? null;
}
