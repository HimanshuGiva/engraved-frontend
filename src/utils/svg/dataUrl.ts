/** Encode inline SVG as a data URL for `<img>` previews. */
export function svgToDataUrl(svgCode: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgCode)}`;
}
