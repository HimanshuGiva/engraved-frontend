/** Matches gift viewer routes: /m/{short_id} (see PUBLIC_MESSAGE_BASE_URL in backend). */
export function parseGiftMessageShortId(pathname: string): string | null {
  const match = pathname.match(/^\/m\/([a-zA-Z0-9]+)\/?$/);
  return match?.[1] ?? null;
}

/** Matches associate terminal route: /associate */
export function isAssociateTerminalPath(pathname: string): boolean {
  return /^\/associate\/?$/.test(pathname);
}

/** Reads ?order= from associate terminal query string. */
export function parseAssociateOrderId(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const orderId = params.get('order')?.trim();
  return orderId || null;
}
