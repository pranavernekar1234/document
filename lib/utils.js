import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Composable Tailwind className helper.
 * Merges clsx conditional logic with tailwind-merge deduplication.
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a file size in bytes to a human-readable string.
 * @param {number} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Trigger a browser file download from a Blob.
 * @param {Blob} blob - The binary blob to download.
 * @param {string} filename - The suggested filename.
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up the object URL after a tick to allow the download to start
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}

/**
 * Derive the output filename from an input filename, swapping extensions.
 * @param {string} filename
 * @param {string} toExtension - e.g. 'pdf' or 'docx'
 * @returns {string}
 */
export function deriveOutputFilename(filename, toExtension) {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  return `${base}.${toExtension}`;
}

/**
 * Validate that a File object matches an expected MIME type or extension list.
 * @param {File} file
 * @param {string[]} allowedMimeTypes
 * @param {string[]} allowedExtensions
 * @returns {{ valid: boolean; reason?: string }}
 */
export function validateFile(file, allowedMimeTypes, allowedExtensions) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeOk = allowedMimeTypes.some((m) => file.type === m);
  const extOk = allowedExtensions.includes(ext);

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      reason: `Invalid file type. Expected: ${allowedExtensions.join(', ').toUpperCase()}`,
    };
  }

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      reason: `File too large. Maximum size is 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Sleep for a given number of milliseconds (useful for retry delays).
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
