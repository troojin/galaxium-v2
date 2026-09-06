const CDN_ORIGIN = "https://galaxium-cdn.troojin.com";

const cdnOrigin = (process.env.NEXT_PUBLIC_CDN_URL ?? CDN_ORIGIN).replace(/\/+$/, "");

/** Returns a URL for an asset deployed from the public directory. */
export function cdnAsset(path: string): string {
  return `${cdnOrigin}/${path.replace(/^\/+/, "")}`;
}
