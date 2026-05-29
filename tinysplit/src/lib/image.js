// image.js — Canvas-based image compression.
//
// Compresses receipt photos to max 1280px on the longest side at JPEG q=0.75.
// Typical iPhone photo (~3 MB) becomes ~150 KB, well under storage limits.
// Falls back to raw data URL if canvas decoding fails (e.g. unsupported format).

export async function compressImage(file, maxDim = 1280, quality = 0.75) {
  try {
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      const t = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('image load timeout'));
      }, 12000);

      img.onload = () => {
        clearTimeout(t);
        URL.revokeObjectURL(url);
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const s = maxDim / Math.max(width, height);
            width = Math.round(width * s);
            height = Math.round(height * s);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        clearTimeout(t);
        URL.revokeObjectURL(url);
        reject(new Error('image load failed'));
      };

      img.src = url;
    });
  } catch {
    // Fallback: raw data URL of original file
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
}

export function dataUrlToParts(dataUrl) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Invalid data URL');
  return { mediaType: m[1], data: m[2] };
}
