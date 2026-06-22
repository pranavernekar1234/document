/**
 * @file scripts/copy-pdf-worker.js
 *
 * Copies the pdf.js worker bundle from the installed `pdfjs-dist` package
 * into /public so it can be served locally (same-origin) instead of from a
 * third-party CDN. Runs automatically via the `postinstall` npm script, so
 * the worker file always matches whatever `pdfjs-dist` version is actually
 * installed — including on fresh CI/Netlify builds where node_modules is
 * reinstalled from scratch.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const destDir = path.join(__dirname, '..', 'public');
const dest = path.join(destDir, 'pdf.worker.min.js');

try {
  if (!fs.existsSync(src)) {
    console.warn('[copy-pdf-worker] pdfjs-dist worker not found at', src, '— skipping.');
    process.exit(0);
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[copy-pdf-worker] Copied pdf.worker.min.js to /public for local (non-CDN) serving.');
} catch (err) {
  // Never fail the install/build over this — fall back to whatever is
  // already in /public (committed copy) if the copy step has a problem.
  console.warn('[copy-pdf-worker] Failed to copy pdf.js worker:', err.message);
}
