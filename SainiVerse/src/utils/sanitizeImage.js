/**
 * EXIF & Geolocation Metadata Stripper via HTML5 Canvas
 *
 * This utility completely strips all camera, phone, GPS coordinates,
 * timestamps, and EXIF metadata tags by re-rasterizing the image onto
 * an offscreen canvas and exporting pure JPEG pixel data.
 *
 * It also automatically generates a cryptographically random UUID filename.
 *
 * @param {File | Blob} file - The original user image
 * @param {Object} options
 * @param {number} [options.maxWidth=2880] - Maximum width for optimization
 * @param {number} [options.maxHeight=2880] - Maximum height for optimization
 * @param {number} [options.quality=0.92] - JPEG export quality (0-1)
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   uuid: string,
 *   fileName: string,
 *   width: number,
 *   height: number,
 *   originalSize: number,
 *   sanitizedSize: number
 * }>}
 */
export async function sanitizeImage(file, options = {}) {
  const { maxWidth = 2880, maxHeight = 2880, quality = 0.92 } = options;

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPEG, PNG, HEIC, WebP).');
  }

  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Release temporary preview URL immediately
      URL.revokeObjectURL(tempUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio constraints if image exceeds maximum dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create offscreen canvas for metadata stripping
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to acquire 2D canvas context.'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Re-draw pure pixel data onto canvas (discarding all EXIF/GPS segments)
        ctx.drawImage(img, 0, 0, width, height);

        // Export pure JPEG pixel data
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create sanitized image blob.'));
              return;
            }

            // Generate cryptographically secure UUID for filename obfuscation
            const uuid =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'vault_' + Math.random().toString(36).substring(2) + '_' + Date.now();

            const fileName = `${uuid}.jpg`;

            // Wrap into a sanitized File object
            const sanitizedFile = new File([blob], fileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve({
              file: sanitizedFile,
              blob,
              uuid,
              fileName,
              width,
              height,
              originalSize: file.size,
              sanitizedSize: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(new Error(`Failed to sanitize image: ${err.message}`));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Could not decode the selected image file.'));
    };

    img.src = tempUrl;
  });
}
