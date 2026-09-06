const CDN_ORIGIN = (
  process.env.NEXT_PUBLIC_CDN_URL ?? "https://galaxium-cdn.troojin.com"
).replace(/\/+$/, "");

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "ico", "bmp", "tiff", "tif",
]);

export function isImageSrc(src: string): boolean {
  try {
    const pathname = src.startsWith("http") ? new URL(src).pathname : src.split("?")[0];
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

export function cdnImageUrl(src: string): string {
  if (!src) return src;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (!isImageSrc(src)) return src;

  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  return `${CDN_ORIGIN}${cleanSrc}`;
}

export function cdnAsset(src: string): string {
  if (!src) return src;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  return `${CDN_ORIGIN}${cleanSrc}`;
}

export default function cdnLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  const q = quality ?? 75;
  return `${CDN_ORIGIN}${cleanSrc}?w=${width}&q=${q}`;
}