# DocuForge — Backend Fix Report

This report covers backend/functionality fixes only. **No UI, layout, styling, components, or copy were changed**, with two narrow exceptions made purely to satisfy `npm run lint`/`npm run build` passing cleanly (both are byte-for-byte visually identical in the browser — see "Build-clean fixes" below).

---

## 1. Bugs found and fixed

### 1.1 AI Summarizer & Translate PDF — "Processing failed (ENOENT)"
**Root cause:** `pdf-parse`'s package entry point (`index.js`) contains a "debug mode" block that fires whenever `module.parent` is falsy — which is exactly what happens when it's loaded via `await import('pdf-parse')` inside Next.js. That block synchronously does `fs.readFileSync('./test/data/05-versions-space.pdf')`, a fixture file that only exists inside `pdf-parse`'s own package folder, throwing `ENOENT` in any real deployment.
**Fix:** Replaced `pdf-parse` entirely with a thin wrapper (`lib/pdf-text.js`) built on `pdfjs-dist`, which this app already depends on for the Edit PDF tool. This also fixed a second, deeper problem found while testing: `pdf-parse` vendors a very old (2018) copy of pdf.js that outright fails to parse some valid PDFs — including ones produced by this app's own pdf-lib-based tools (compressed cross-reference streams trip up its parser). `pdfjs-dist` handles these correctly.

### 1.2 Edit PDF — "Cannot use the same canvas during multiple render operations"
**Root cause:** `app/tools/edit-pdf/ToolClient.js` had **two separate `useEffect` hooks**, both calling `page.render({ canvasContext, viewport }).promise` against the *same* `<canvas>`, with overlapping dependency arrays — so both fired on the same render pass and raced each other.
**Fix:** Consolidated into a single render effect with a tracked, cancellable `RenderTask` (cancels any in-flight render before starting a new one), plus a cleanup effect that calls `pdfDoc.destroy()` on unmount/file-change to release pdf.js's internal resources (no memory leaks).

### 1.3 PDF.js worker loaded from a third-party CDN
**Root cause:** `edit-pdf` pointed `GlobalWorkerOptions.workerSrc` at `cdnjs.cloudflare.com`.
**Fix:** Added `scripts/copy-pdf-worker.js`, wired to `npm install`'s `postinstall` step, which copies the exact worker bundle matching the installed `pdfjs-dist` version into `/public/pdf.worker.min.js`. The worker is now served same-origin, with zero version-drift risk, and the copy step re-runs on every fresh `npm install` (including on Netlify).

### 1.4 Unlock PDF — could silently return a still-broken file
**Root cause:** The route called `PDFDocument.load(buf, { password, ignoreEncryption: true })` — but **pdf-lib has no PDF-decryption support at all**; there's no `password` option, and `ignoreEncryption: true` just skips the "this file is encrypted" check without ever decrypting the content streams. For a genuinely encrypted PDF, this could "succeed" (no thrown error) while quietly handing back a corrupted/still-unreadable file, instead of falling through to the real decryption provider.
**Fix:** The pdf-lib step is now used only as a detection probe (does this PDF actually have an `/Encrypt` dictionary?). Non-encrypted PDFs get a fast, free pass-through. Genuinely encrypted PDFs now always go to ConvertAPI, with a clear, honest error if `CONVERTAPI_SECRET` isn't configured (rather than a fake success).

### 1.5 Unlock PDF — calling a ConvertAPI endpoint that doesn't exist
**Root cause:** The route called `https://v2.convertapi.com/convert/pdf/to/decrypt`. I verified against ConvertAPI's published documentation — **there is no `pdf/to/decrypt` endpoint.** The correct, documented endpoint for removing a PDF password is `pdf/to/unprotect`.
**Fix:** Corrected the endpoint URL. (I also found and deleted two related, unused dead-code functions in `lib/conversion-service.js` — `protectPDFFile`/`unlockPDFFile` — that were never imported anywhere but contained *yet another* wrong endpoint spelling (`pdf/to/protected`, `pdf/to/pdf`); left in place, they'd have misled a future maintainer into "fixing" the working route with broken code.)
**Verified correct (left unchanged):** `pdf/to/protect`, `web/to/pdf`, and `pdf/to/pdfa` were checked against ConvertAPI's documentation and are already correct. The remaining office-conversion endpoints (`docx/to/pdf`, `pdf/to/docx`, `pdf/to/jpg`, etc.) follow the same well-established naming convention but weren't individually re-verified against a live API call, since I don't have a `CONVERTAPI_SECRET` to test with in this environment.

### 1.6 Sign PDF — every request was crashing
**Root cause:** The route drew a literal `✓` checkmark glyph via `page.drawText('✓', { font: StandardFonts.HelveticaBold, ... })`. pdf-lib's standard fonts only support **WinAnsi (cp1252)** encoding, which has no checkmark character — `drawText` throws `WinAnsi cannot encode "✓"` for every single request, regardless of the uploaded PDF. I confirmed this by reproducing the crash directly.
**Fix:** Replaced the text glyph with a small vector checkmark (two `drawLine` strokes), which sidesteps font encoding entirely.

### 1.7 Watermark / Page Numbers / Sign — crash on non-Latin1 user input
**Root cause:** Same WinAnsi limitation as above, but reachable through **user-supplied text fields** — a watermark or signature name containing emoji, CJK text, or many common symbols (✓ ★ → …) would crash the request with an unhandled 500.
**Fix:** Added a shared `sanitizeForStandardFont()` helper (`lib/pdf-processor.js`) that strips unencodable characters up front (rather than letting pdf-lib throw), applied to the watermark text, page-number prefix, and signer name. Operations now always complete instead of failing outright. I also found and fixed the identical class of bug in my own new Compare PDF report generator (it draws arbitrary extracted text from user-uploaded PDFs, which very often contains non-Latin1 characters in practice).

### 1.8 Four tools were wired to the wrong backend entirely
Cross-referencing every tool's `endpoint:` against the actual API routes turned up four silent mismatches — each tool "worked" (returned *a* PDF) while doing something completely different from what it claimed:

| Tool | Was calling | Did instead of |
|---|---|---|
| Compare PDF | `/api/pdf/merge` | merged the two files instead of comparing them |
| OCR PDF | `/api/pdf/compress` | just compressed the file — no OCR ran |
| Repair PDF | `/api/pdf/compress` | same compress endpoint, mislabeled |
| Redact PDF | `/api/pdf/protect` | password-encrypted the file instead of redacting content |

**Fix:** Built four real, dedicated implementations and rewired each tool to its own endpoint:
- **Repair PDF** (`lib/pdf-processor.js` → `repairPDF`, new route `/api/pdf/repair`): retries with pdf-lib's lenient parsing options, then rebuilds a fresh document by copying every recoverable page. Runs entirely locally, no external API. *Honest limitation:* this can fix moderate structural corruption (bad/invalid objects) but, like any pdf-lib-based approach, can't reconstruct a PDF whose trailer/xref table is missing or destroyed — that class of damage needs a byte-level forensic scanner (e.g. Ghostscript/qpdf), which isn't feasible to bundle in a serverless function.
- **Compare PDF** (new `lib/pdf-compare.js`, route `/api/pdf/compare`): extracts text from both PDFs, runs a real line-level diff (LCS algorithm), and renders a readable diff-report PDF (similarity %, added/removed lines). Runs entirely locally, no external API.
- **Redact PDF** (new `lib/pdf-redact.js`, route `/api/pdf/redact`): since the Redact PDF page is a plain upload tool with no field for the user to specify what to redact, this automatically scans for common PII patterns (emails, phone numbers, SSNs, credit-card-style numbers) using `pdfjs-dist` for text positions, and draws solid black boxes over matches. Runs entirely locally, no external API. *Honest limitation:* this is **visual** redaction (hidden from view/print) — pdf-lib doesn't expose content-stream-level text deletion, so it doesn't scrub the underlying text bytes the way a forensic redaction tool would. For content that must be unrecoverable, the page should also be flattened to an image afterward.
- **OCR PDF** (new `lib/pdf-ocr.js`, route `/api/pdf/ocr`): if the PDF already has a text layer (the common case), it's returned unchanged — there's nothing to OCR. If it's a scanned/image-only PDF, pages are rasterized via the existing ConvertAPI pipeline, OCR'd with `tesseract.js`, and the recognized words are written back as an invisible, position-matched text layer (PDF text-rendering mode 3) over the page image — producing a genuinely searchable PDF. *Caveats:* requires `CONVERTAPI_SECRET` for the scanned-PDF path; `tesseract.js` downloads its language model from its own CDN on first use per cold start (this is standard practice for OCR tooling — the model is too large to reasonably bundle — unlike the pdf.js worker script, which is small and now self-hosted); and **I could not run an end-to-end network test of this path in my sandbox**, since the language-data CDN isn't reachable from here. The "already has text → pass through" path is fully tested and verified.

### 1.9 Other things fixed along the way
- **MyMemory translation API**: now detects rate-limit/quota warning responses (which come back with HTTP 200 but an embedded warning string) instead of treating them as a successful translation.
- **`next lint` had no config at all** — it was prompting interactively to set one up, which would hang a non-interactive CI/Netlify build. Added `.eslintrc.json` (`next/core-web-vitals`).
- Two real `react-hooks/exhaustive-deps` warnings (stale-closure risk) fixed in `edit-pdf` and `html-to-pdf`, requiring small, safe reordering of `useCallback` declarations (no behavior change).
- **Build-clean fixes** (the two non-functional exceptions mentioned at the top): two `react/no-unescaped-entities` build **errors** (a literal `"` and `'` inside JSX text in `app/page.js` and `html-to-pdf`) were blocking `npm run build` once lint was wired in. Escaped them (`&quot;`/`&apos;`) — renders identically in every browser, zero visual change. Also renamed lucide-react's `Image` icon import to `ImageIcon` in three files to resolve a false-positive `jsx-a11y/alt-text` warning (the rule was flagging the icon *component name* "Image", not an actual `<img>` tag) — again, a pure identifier rename with no visual effect.

---

## 2. Files changed

**New files:**
- `lib/pdf-text.js` — text extraction (replaces `pdf-parse`)
- `lib/pdf-compare.js`, `lib/pdf-redact.js`, `lib/pdf-ocr.js` — real implementations for previously mis-wired tools
- `app/api/pdf/compare/route.js`, `app/api/pdf/redact/route.js`, `app/api/pdf/repair/route.js`, `app/api/pdf/ocr/route.js`
- `scripts/copy-pdf-worker.js`, `public/pdf.worker.min.js` — local pdf.js worker
- `.eslintrc.json`, `netlify.toml`
- `test/helpers.mjs` + `test/*.test.mjs` (5 suites, 56 tests)

**Modified:**
- `app/api/pdf/ai-summarize/route.js`, `app/api/pdf/translate/route.js` — §1.1
- `app/api/pdf/unlock/route.js` — §1.4, §1.5
- `app/api/pdf/sign/route.js` — §1.6, §1.7
- `app/tools/edit-pdf/ToolClient.js` — §1.2, §1.3, lint
- `app/tools/compare-pdf/ToolClient.js`, `ocr-pdf/ToolClient.js`, `redact-pdf/ToolClient.js`, `repair-pdf/ToolClient.js` — §1.8 (endpoint rewiring only)
- `app/tools/html-to-pdf/ToolClient.js`, `app/tools/images-to-pdf/ToolClient.js`, `app/tools/pdf-to-jpg/ToolClient.js`, `app/page.js` — build-clean fixes only (§1.9)
- `lib/pdf-processor.js` — added `repairPDF`, `sanitizeForStandardFont`; applied sanitization to `addWatermark`/`addPageNumbers`
- `lib/conversion-service.js` — removed unused/incorrect dead code
- `next.config.js` — comment accuracy only (no config logic changed)
- `package.json` — see dependencies below

---

## 3. New dependencies

- **Removed:** `pdf-parse` (root cause of §1.1; fully replaced)
- **Added (devDependency):** `@netlify/plugin-nextjs` — required for Next.js App Router API routes to run as Netlify Functions; without it, every `/api/*` route 404s on Netlify
- No other new packages — `pdfjs-dist`, `pdf-lib`, and `tesseract.js` were all already dependencies and are reused for the new functionality

---

## 4. Environment variables required

No new environment variables were introduced. As before:
- `CONVERTAPI_SECRET` — required for: Protect PDF, Unlock PDF (genuinely encrypted files), HTML/URL→PDF, Office conversions (Word/PPTX/XLSX ⇄ PDF), PDF→JPG, and the scanned-PDF path of OCR PDF. **Without it, these tools return a clear "not configured" error rather than failing silently** — this is intentional, since Netlify/Vercel serverless functions can't bundle Ghostscript/LibreOffice/qpdf, so a hosted conversion provider is the only realistic option for these specific operations.
- `CLOUDCONVERT_API_KEY` — alternative provider, same coverage
- See `.env.example` for the full list (unchanged by this work)

---

## 5. Remaining limitations (honest, not hand-waved)

- **TypeScript:** despite `typescript` being a devDependency, this is a **JavaScript** project (`.js` files throughout, no `tsconfig.json`). The brief's "fix every `any`, strict mode must pass" doesn't apply as written — converting ~30 tool pages and API routes to real TypeScript would be a large, separate undertaking with real risk of UI regressions, which I didn't attempt given the explicit "don't touch UI" constraint.
- **`npm audit`** reports 7 high/1 moderate vulnerabilities, all tied to major-version upgrades (Next.js 14→16, `pdfjs-dist` 3.x→6.x, `eslint-config-next`). I deliberately did **not** run `npm audit fix --force` — that would pull in Next 16, a breaking major-version jump with real potential to change routing/rendering behavior and break the approved UI. This should be a separate, deliberate upgrade project. One relevant note: the `pdfjs-dist` advisory concerns malicious-PDF JS execution; this app already sets `isEvalSupported: false` everywhere `pdfjs-dist` parses a PDF, which mitigates the main risk class.
- **Repair PDF** can't recover files with a destroyed trailer/xref table (see §1.8).
- **Redact PDF** is automatic-pattern-based (no UI field exists to specify what to redact) and is visual-only, not forensic (see §1.8).
- **OCR PDF**'s scanned-document path is implemented per tesseract.js's documented API but **untested end-to-end** in this environment (sandbox network egress doesn't reach the language-data CDN). The no-OCR-needed pass-through path (the common case) is fully tested.
- **Automated tests** cover everything that's testable without a live network/API key: all of `lib/pdf-processor.js`, `lib/pdf-text.js`, `lib/pdf-compare.js`, `lib/pdf-redact.js`, and `lib/stream-helpers.js` — 56 tests, run via `npm test`. Routes that depend on ConvertAPI/CloudConvert/tesseract.js's CDN aren't covered by these tests (would need network mocking or a real API key) and weren't part of this pass.
- An unused `sharp` dependency exists in `package.json` (never imported anywhere) — left as-is since removing it carries no functional benefit and wasn't something I want to change without being asked.

---

## 6. Status

✅ **Local development** (`npm run dev`) — boots cleanly ("✓ Ready" with no startup errors) on a verified-clean `npm install`. Note: I wasn't able to curl the running dev server from inside my sandbox to check live HTTP responses (a networking limitation of this environment, not the app) — the build/lint/test results above are the load-bearing verification, plus 56 passing unit tests and direct Node-level smoke tests of every new function.
✅ **Production build** (`npm run build`) — compiles successfully, zero errors
✅ **`npm run lint`** — zero warnings, zero errors
✅ **`npm test`** — 56/56 passing
⚠️ **Netlify deployment** — I added `netlify.toml` + the official `@netlify/plugin-nextjs` plugin (the standard, required setup for Next.js App Router API routes on Netlify) and removed every filesystem/Windows-path dependency, but **I have no way to actually deploy to Netlify from this sandboxed environment** to confirm a live deploy succeeds. Please treat this as "configured correctly per Netlify's documented requirements," not as a verified live deployment.
✅ **No runtime errors / no console errors found** in the routes and flows I tested directly (see bug list above for what was actually broken and fixed)
⚠️ **Tools requiring `CONVERTAPI_SECRET`** — correct by code review and, where I could check, verified against ConvertAPI's published API documentation — but not exercised against the live API, since no key is available in this environment
