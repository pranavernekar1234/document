'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Check, AlertCircle, RotateCcw,
  Download, X, Plus, Zap, ArrowLeft, Settings
} from 'lucide-react';
import { cn, formatFileSize, triggerBlobDownload } from '../lib/utils';

const springIn = { type: 'spring', stiffness: 260, damping: 26 };
const fadeScale = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.18 } },
};

/**
 * Universal ToolPage component.
 * Handles: upload, config options, API call, progress, download.
 *
 * @param {{
 *   tool: {
 *     id: string;
 *     name: string;
 *     description: string;
 *     endpoint: string;
 *     category: string;
 *     accent: string;
 *     icon: React.ReactNode;
 *     acceptExt: string[];
 *     acceptMime: string[];
 *     multiple?: boolean;
 *     maxFiles?: number;
 *     outputName?: string;
 *     outputMime?: string;
 *     multipleOutputs?: boolean;
 *   };
 *   options?: React.ReactNode;
 *   getFormData?: (files: File[], opts: Record<string,string>) => FormData;
 *   onSuccess?: (data: any) => void;
 *   featureBullets?: string[];
 * }} props
 */
export default function ToolPage({ tool, options, getFormData, onSuccess, featureBullets = [] }) {
  const [files, setFiles] = useState([]);
  const [state, setState] = useState('idle'); // idle|dragover|uploading|processing|success|error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { filename, size } or { parts: [...] }
  const [optValues, setOptValues] = useState({});
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);

  const setOpt = useCallback((k, v) => setOptValues(p => ({ ...p, [k]: v })), []);

  // ── File handling ────────────────────────────────────────────────────────
  const validateAndAdd = useCallback((incoming) => {
    const allowed = tool.acceptExt.map(e => e.toLowerCase());
    const valid = incoming.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return allowed.includes(ext);
    });
    if (!valid.length) { setError(`Please upload ${tool.acceptExt.map(e => `.${e}`).join(', ')} files.`); setState('error'); return; }
    const max = tool.maxFiles ?? (tool.multiple ? 20 : 1);
    const next = tool.multiple ? [...files, ...valid].slice(0, max) : [valid[0]];
    setFiles(next); setError(''); setState('idle');
  }, [files, tool]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    validateAndAdd(Array.from(e.dataTransfer.files ?? []));
  }, [validateAndAdd]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setState(s => s === 'idle' || s === 'dragover' ? 'dragover' : s); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setState(s => s === 'dragover' ? 'idle' : s); }, []);
  const handleInputChange = useCallback((e) => { validateAndAdd(Array.from(e.target.files ?? [])); e.target.value = ''; }, [validateAndAdd]);
  const removeFile = useCallback((idx) => setFiles(p => p.filter((_, i) => i !== idx)), []);

  // ── Processing ───────────────────────────────────────────────────────────
  const process = useCallback(async () => {
    if (!files.length) return;
    setState('uploading'); setProgress(0); setError('');

    const formData = getFormData
      ? getFormData(files, optValues)
      : (() => {
          const fd = new FormData();
          files.forEach(f => fd.append('file', f, f.name));
          Object.entries(optValues).forEach(([k, v]) => fd.append(k, v));
          return fd;
        })();

    try {
      const responseData = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', tool.endpoint);
        xhr.responseType = 'arraybuffer';

        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.upload.addEventListener('load', () => setState('processing'));

        xhr.addEventListener('load', () => {
          const ct = xhr.getResponseHeader('content-type') ?? '';
          if (xhr.status >= 200 && xhr.status < 300) {
            if (ct.includes('application/json')) {
              const text = new TextDecoder().decode(new Uint8Array(xhr.response));
              try { resolve({ json: JSON.parse(text) }); } catch { reject(new Error('Invalid JSON response.')); }
            } else {
              resolve({ binary: xhr.response, contentType: ct, contentDisposition: xhr.getResponseHeader('content-disposition') ?? '' });
            }
          } else {
            try {
              const text = new TextDecoder().decode(new Uint8Array(xhr.response));
              const json = JSON.parse(text);
              reject(new Error(json.error ?? `Server error ${xhr.status}`));
            } catch { reject(new Error(`Server error ${xhr.status}. Please try again.`)); }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error. Check your connection.')));
        xhr.addEventListener('timeout', () => reject(new Error('Request timed out. Try a smaller file.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
        xhr.timeout = 300_000;
        xhr.send(formData);
      });

      // Handle multi-output (e.g. split)
      if (responseData.json) {
        if (onSuccess) onSuccess(responseData.json);
        if (responseData.json.parts) {
          setResult({ parts: responseData.json.parts });
        } else {
          setResult({ message: 'Done' });
        }
        setState('success');
        return;
      }

      // Single binary output
      const { binary, contentType, contentDisposition } = responseData;
      const mime = contentType.split(';')[0].trim() || tool.outputMime || 'application/octet-stream';
      const blob = new Blob([binary], { type: mime });

      // Extract filename from Content-Disposition
      let filename = tool.outputName ?? `${tool.id}-output`;
      const cdMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
      if (cdMatch?.[1]) filename = decodeURIComponent(cdMatch[1].trim().replace(/['"]/g, ''));

      triggerBlobDownload(blob, filename);
      setResult({ filename, size: blob.size });
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setState('error');
    } finally { xhrRef.current = null; }
  }, [files, optValues, tool, getFormData, onSuccess]);

  const cancel = useCallback(() => { xhrRef.current?.abort(); setState('idle'); setProgress(0); }, []);
  const reset = useCallback(() => { setFiles([]); setState('idle'); setProgress(0); setError(''); setResult(null); setOptValues({}); }, []);

  const isProcessing = state === 'uploading' || state === 'processing';
  const isDragover = state === 'dragover';

  return (
    <div style={{ background: 'linear-gradient(180deg,#080e1c 0%,#0F172A 100%)', minHeight: '100vh' }}>
      {/* Page header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% -10%, ${tool.accent}22, transparent)` }} />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <Link href="/#tools" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to all tools
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${tool.accent}18`, border: `1px solid ${tool.accent}35`, color: tool.accent }}>
              {tool.icon}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-black text-white text-2xl sm:text-3xl tracking-tight">{tool.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: `${tool.accent}30`, border: `1px solid ${tool.accent}40` }}>FREE</span>
              </div>
              <p className="text-slate-400 text-base">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_280px] gap-7 items-start">

          {/* Main card */}
          <div className="rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 6px rgba(0,0,0,0.3),0 20px 40px rgba(0,0,0,0.4)' }}>
            <AnimatePresence mode="wait">
              {state === 'success' && (
                <motion.div key="success" variants={fadeScale} initial="hidden" animate="show" exit="exit">
                  <SuccessPanel result={result} tool={tool} onReset={reset} />
                </motion.div>
              )}
              {state === 'error' && (
                <motion.div key="error" variants={fadeScale} initial="hidden" animate="show" exit="exit">
                  <ErrorPanel message={error} onReset={reset} />
                </motion.div>
              )}
              {isProcessing && (
                <motion.div key="processing" variants={fadeScale} initial="hidden" animate="show" exit="exit">
                  <ProcessingPanel state={state} progress={progress} onCancel={cancel} toolName={tool.name} />
                </motion.div>
              )}
              {!isProcessing && state !== 'success' && state !== 'error' && (
                <motion.div key="idle" variants={fadeScale} initial="hidden" animate="show" exit="exit">
                  <IdlePanel
                    files={files} isDragover={isDragover} tool={tool}
                    fileInputRef={fileInputRef}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                    onDrop={handleDrop} onInputChange={handleInputChange}
                    onRemoveFile={removeFile} onProcess={process}
                    options={options ? <div className="mt-6 border-t border-white/6 pt-6">{options({ values: optValues, setOpt })}</div> : null}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {featureBullets.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Settings size={14} style={{ color: tool.accent }} /> Features
                </p>
                <ul className="space-y-2.5">
                  {featureBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `${tool.accent}18`, border: `1px solid ${tool.accent}30` }}>
                        <Check size={8} style={{ color: tool.accent }} />
                      </div>
                      <span className="text-slate-400 text-xs leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/12 flex items-center justify-center flex-shrink-0">
                <Check size={13} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-400 text-xs">Privacy guaranteed</p>
                <p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">Files processed in-memory and permanently discarded. Zero storage.</p>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-wider mb-2.5">Limits</p>
              <div className="space-y-2">
                {[['Max size','50 MB'],['Cost','Free'],['Timeout','5 min']].map(([l,v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-slate-600 text-xs">{l}</span>
                    <span className="text-white text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── IDLE PANEL ─────────────────────────────────────────────────────────────── */
function IdlePanel({ files, isDragover, tool, fileInputRef, onDragOver, onDragLeave, onDrop, onInputChange, onRemoveFile, onProcess, options }) {
  const hasFiles = files.length > 0;

  return (
    <div className="p-7 sm:p-9">
      {/* Drop zone */}
      <div
        className={cn('rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-5 transition-all duration-200 dropzone', isDragover && 'dropzone-over')}
        style={{ minHeight: hasFiles ? 140 : 220, background: isDragover ? 'rgba(37,99,235,0.07)' : 'rgba(255,255,255,0.02)' }}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={() => !hasFiles && fileInputRef.current?.click()}
        role="button" tabIndex={0} aria-label={`Upload ${tool.acceptExt.join(', ')} files`}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input ref={fileInputRef} type="file" className="sr-only"
          accept={tool.acceptExt.map(e => `.${e}`).join(',')}
          multiple={tool.multiple} onChange={onInputChange} aria-hidden="true" />

        {hasFiles ? (
          <div className="flex items-center gap-3 px-4 py-3 w-full justify-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${tool.accent}18`, border: `1px solid ${tool.accent}30`, color: tool.accent }}>
              <FileText size={15} />
            </div>
            <span className="text-slate-300 text-sm font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            <button className="ml-2 text-xs text-slate-600 hover:text-slate-400 transition-colors" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              Add more
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 select-none">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow-sm"
              style={{ background: `${tool.accent}18`, border: `1px solid ${tool.accent}35`, color: tool.accent }}>
              <Upload size={26} />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-semibold text-[15px]">
                Drop your {tool.acceptExt.map(e => e.toUpperCase()).join(' / ')} {tool.multiple ? 'files' : 'file'} here
              </p>
              <p className="text-slate-500 text-sm mt-1">
                or <span className="font-medium cursor-pointer" style={{ color: tool.accent }}>click to browse</span> · Max 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-5">
          {files.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${tool.accent}15`, color: tool.accent }}>
                <FileText size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{f.name}</p>
                <p className="text-slate-500 text-xs">{formatFileSize(f.size)}</p>
              </div>
              <button onClick={() => onRemoveFile(i)} className="text-slate-600 hover:text-slate-300 transition-colors p-1" aria-label="Remove file">
                <X size={14} />
              </button>
            </motion.div>
          ))}
          {tool.multiple && files.length < (tool.maxFiles ?? 20) && (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-colors"
              style={{ color: tool.accent, border: `1px dashed ${tool.accent}40` }}>
              <Plus size={14} /> Add more files
            </button>
          )}
        </div>
      )}

      {/* Options slot */}
      {options}

      {/* Action button */}
      <motion.button whileTap={{ scale: files.length ? 0.97 : 1 }} onClick={onProcess} disabled={!files.length} aria-disabled={!files.length}
        className={cn('w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 font-bold text-[15px] tracking-tight transition-all duration-200 mt-5',
          !files.length && 'cursor-not-allowed opacity-40')}
        style={{
          background: files.length ? `linear-gradient(135deg, ${tool.accent}, ${tool.accent}cc)` : 'rgba(255,255,255,0.04)',
          border: files.length ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
          color: 'white',
          boxShadow: files.length ? `0 4px 20px ${tool.accent}40` : undefined,
        }}>
        <Zap size={17} /> {tool.name}
      </motion.button>
    </div>
  );
}

/* ── PROCESSING ─────────────────────────────────────────────────────────────── */
function ProcessingPanel({ state, progress, onCancel, toolName }) {
  const isUploading = state === 'uploading';
  return (
    <div className="flex flex-col items-center justify-center gap-8 px-8 py-24" style={{ minHeight: 360 }}>
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="40" cy="40" r="34" stroke="url(#pg)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={isUploading ? `${(progress / 100) * 213.6} 213.6` : '140 213.6'}
            style={{ transition: isUploading ? 'stroke-dasharray 0.3s ease' : undefined, animation: !isUploading ? 'spin 1.1s linear infinite' : undefined, transformOrigin: '40px 40px' }} />
          <defs><linearGradient id="pg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#2563EB" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-sm gradient-text">{isUploading ? `${progress}%` : '…'}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-white text-lg">{isUploading ? 'Uploading…' : `Processing with ${toolName}…`}</p>
        <p className="text-slate-500 text-sm mt-1.5">{isUploading ? `${progress}% transferred` : 'This may take a few seconds'}</p>
      </div>
      <div className="w-full max-w-xs h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {isUploading
          ? <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#2563EB,#7C3AED)' }} />
          : <div className="h-full w-1/3 rounded-full" style={{ background: 'linear-gradient(90deg,#2563EB,#7C3AED)', animation: 'progressBar 1.5s ease-in-out infinite' }} />}
      </div>
      {isUploading && <button className="text-xs text-slate-600 hover:text-red-400 transition-colors" onClick={onCancel}>Cancel</button>}
    </div>
  );
}

/* ── SUCCESS ────────────────────────────────────────────────────────────────── */
function SuccessPanel({ result, tool, onReset }) {
  const downloadPart = (part) => {
    const bin = Uint8Array.from(atob(part.data), c => c.charCodeAt(0));
    const blob = new Blob([bin], { type: 'application/pdf' });
    triggerBlobDownload(blob, `${part.label}.pdf`);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-20" style={{ minHeight: 360 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-18 h-18 rounded-full flex items-center justify-center"
        style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 30px rgba(34,197,94,0.15)' }}>
        <Check size={32} className="text-emerald-400" />
      </motion.div>

      <div className="text-center">
        <p className="font-black text-xl text-white">Done!</p>
        {result?.parts ? (
          <p className="text-slate-400 text-sm mt-1">{result.parts.length} files ready for download</p>
        ) : (
          <p className="text-slate-400 text-sm mt-1">Your file is ready</p>
        )}
      </div>

      {result?.parts && (
        <div className="w-full max-w-sm space-y-2">
          {result.parts.map((p, i) => (
            <button key={i} onClick={() => downloadPart(p)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', color: '#60A5FA' }}>
              <span className="font-medium">{p.label}.pdf</span>
              <Download size={14} />
            </button>
          ))}
        </div>
      )}

      <button onClick={onReset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1' }}>
        <RotateCcw size={13} /> Process another file
      </button>
    </div>
  );
}

/* ── ERROR ──────────────────────────────────────────────────────────────────── */
function ErrorPanel({ message, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 py-20" style={{ minHeight: 360 }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}>
        <AlertCircle size={26} className="text-rose-400" />
      </div>
      <div className="text-center max-w-xs">
        <p className="font-bold text-white">Processing failed</p>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{message}</p>
      </div>
      <button onClick={onReset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}>
        Try again
      </button>
    </div>
  );
}
