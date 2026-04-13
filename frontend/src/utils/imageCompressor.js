/**
 * imageCompressor.js
 * Client-side image compression before upload.
 * Reduces file size 70–90% while maintaining good visual quality.
 *
 * Usage:
 *   import { compressImages } from "../utils/imageCompressor";
 *   const compressed = await compressImages(fileList);
 *   // compressed is an array of File objects (JPEG, compressed)
 */

/**
 * Compress a single File/Blob image.
 * @param {File} file              - Original image file
 * @param {Object} opts
 * @param {number} opts.maxWidth   - Max width in px  (default 1280)
 * @param {number} opts.maxHeight  - Max height in px (default 1280)
 * @param {number} opts.quality    - JPEG quality 0–1  (default 0.82)
 * @returns {Promise<File>}        - Compressed File object
 */
export async function compressImage(file, {
  maxWidth  = 1280,
  maxHeight = 1280,
  quality   = 0.82,
} = {}) {
  // If file is already very small (< 200 KB) skip compression
  if (file.size < 200 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Image load error"));
      img.onload = () => {
        // ── Calculate new dimensions (keep aspect ratio) ──────────
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        // ── Draw onto canvas ──────────────────────────────────────
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // White background (handles transparent PNGs converted to JPEG)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // ── Export as JPEG blob ───────────────────────────────────
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas toBlob failed"));
            // Wrap blob back into a File with the original name (renamed .jpg)
            const baseName = file.name.replace(/\.[^.]+$/, "");
            const compressed = new File([blob], `${baseName}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple files.
 * Non-image files are passed through unchanged.
 * @param {FileList | File[]} files
 * @param {Object} opts  - same as compressImage opts
 * @returns {Promise<File[]>}
 */
export async function compressImages(files, opts = {}) {
  const arr = Array.from(files);
  return Promise.all(
    arr.map((f) =>
      f.type.startsWith("image/")
        ? compressImage(f, opts).catch(() => f) // fall back to original on error
        : Promise.resolve(f),
    ),
  );
}

/**
 * Returns a human-readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
