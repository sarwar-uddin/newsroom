/**
 * Identifies image formats from their magic bytes. The client-supplied MIME type and filename
 * are never trusted: the stored extension and served Content-Type come from this function.
 * SVG is deliberately unsupported because it can carry script.
 */
export type ImageType = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  ext: string;
};

export function sniffImage(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: 'image/jpeg', ext: 'jpg' };
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (
    b.length >= 6 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) &&
    b[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  return null;
}

/** Reads pixel dimensions from PNG, GIF, JPEG and WebP headers; null if not determinable. */
export function imageDimensions(
  b: Uint8Array,
  type: ImageType,
): { width: number; height: number } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (type.mime === 'image/png') return { width: view.getUint32(16), height: view.getUint32(20) };
    if (type.mime === 'image/gif')
      return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    if (type.mime === 'image/webp') {
      const chunk = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);
      if (chunk === 'VP8X') {
        const w = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
        const h = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
        return { width: w, height: h };
      }
      if (chunk === 'VP8 ')
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      if (chunk === 'VP8L') {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    // JPEG: walk segments to the first SOFn marker.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1]!;
      const len = view.getUint16(i + 2);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      }
      i += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
}
