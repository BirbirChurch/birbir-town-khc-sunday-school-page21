export interface ProcessedProfilePhoto {
  thumbnailDataUrl: string;
  fullDataUrl: string;
  fileName: string;
}

const MAX_PHOTO_FILE_BYTES = 12 * 1024 * 1024; // 12MB

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const resizeDataUrl = (
  dataUrl: string,
  maxDimension: number,
  quality: number
): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // White backdrop for transparent PNGs converted to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed && compressed.startsWith('data:image/') ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

export const isValidProfilePhotoFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || '');
};

export const processProfilePhotoFile = async (
  file: File
): Promise<{ ok: true; data: ProcessedProfilePhoto } | { ok: false; reason: 'invalid_type' | 'too_large' | 'read_failed' }> => {
  if (!isValidProfilePhotoFile(file)) {
    return { ok: false, reason: 'invalid_type' };
  }
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    return { ok: false, reason: 'too_large' };
  }
  try {
    const rawDataUrl = await readFileAsDataUrl(file);
    const [thumbnailDataUrl, fullDataUrl] = await Promise.all([
      resizeDataUrl(rawDataUrl, 180, 0.78),
      resizeDataUrl(rawDataUrl, 960, 0.86)
    ]);
    return {
      ok: true,
      data: {
        thumbnailDataUrl,
        fullDataUrl,
        fileName: file.name || 'profile-photo.jpg'
      }
    };
  } catch {
    return { ok: false, reason: 'read_failed' };
  }
};
