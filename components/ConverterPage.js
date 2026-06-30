/**
 * @file components/ConverterPage.js
 * Premium SaaS converter UI — all original API logic and states preserved.
 * States: idle → dragover → uploading → converting → downloading → success | error
 */
'use client';
import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Upload, FileText, FileCheck, X, RotateCcw, Check, AlertCircle, Zap, ArrowRight, Shield, Clock, HardDrive } from 'lucide-react';
import { cn, formatFileSize, validateFile, triggerBlobDownload, deriveOutputFilename } from '../lib/utils';

const spring = { type:'spring', stiffness:280, damping:28 };
const fadeScale = {
  hidden: { opacity:0, scale:0.96, y:8 },
  show:   { opacity:1, scale:1, y:0, transition:{ duration:0.4, ease:[0.16,1,0.3,1] } },
  exit:   { opacity:0, scale:0.97, y:-4, transition:{ duration:0.2, ease:'easeIn' } },
};

export default function ConverterPage({ config }) {
  const { title, subtitle, apiEndpoint, acceptMime, acceptExt, outputExt, inputLabel, outputLabel, inputIcon, outputIcon, featureBullets } = config;

  const [state, setState]               = useState('idle');
  const [file, setFile]                 = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [outputFilename, setOutputFilename] = useState('');
  const [resultSize, setResultSize]     = useState(0);
  const fileInputRef = useRef(null);
  const xhrRef       = useRef(null);

  const acceptFile = useCallback((candidate) => {
    const { valid, reason } = validateFile(candidate, acceptMime, acceptExt);
    if (!valid) { setErrorMessage(reason ?? 'Invalid file.'); setState('error'); return; }
    setFile(candidate); setErrorMessage(''); setState('idle');
  }, [acceptMime, acceptExt]);

  const handleDragOver  = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setState('dragover'); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setState(prev => prev === 'dragover' ? 'idle' : prev); }, []);
  const handleDrop      = useCallback((e) => { e.preventDefault(); e.stopPropagation(); const d = e.dataTransfer.files?.[0]; if (d) acceptFile(d); else setState('idle'); }, [acceptFile]);
  const handleInputChange = useCallback((e) => { const p = e.target.files?.[0]; if (p) acceptFile(p); e.target.value = ''; }, [acceptFile]);

  const startConversion = useCallback(async () => {
    if (!file) return;
    const outName = deriveOutputFilename(file.name, outputExt);
    setOutputFilename(outName); setUploadProgress(0); setState('uploading');
    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
      const buffer = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', apiEndpoint);
        xhr.responseType = 'arraybuffer';
        xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded/e.total)*100)); });
        xhr.upload.addEventListener('load', () => setState('converting'));
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) { resolve(xhr.response); return; }
          try {
            const text = new TextDecoder().decode(new Uint8Array(xhr.response));
            const json = JSON.parse(text);
            reject(new Error(json.error ?? `Server error ${xhr.status}`));
          } catch { reject(new Error(`Server returned HTTP ${xhr.status}. Please try again.`)); }
        });
        xhr.addEventListener('error',   () => reject(new Error('Network error. Please check your connection and try again.')));
        xhr.addEventListener('timeout', () => reject(new Error('The request timed out. Your file may be too large or the server is busy.')));
        xhr.addEventListener('abort',   () => reject(new Error('Conversion was cancelled.')));
        xhr.timeout = 180_000;
        xhr.send(formData);
      });

      setState('downloading');
      const mimeType = outputExt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([buffer], { type: mimeType });
      setResultSize(blob.size);
      triggerBlobDownload(blob, outName);
      await new Promise(r => setTimeout(r, 600));
      setState('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setState('error');
    } finally { xhrRef.current = null; }
  }, [file, outputExt, apiEndpoint]);

  const cancelUpload = useCallback(() => { xhrRef.current?.abort(); setState('idle'); setUploadProgress(0); }, []);
  const reset = useCallback(() => { setState('idle'); setFile(null); setUploadProgress(0); setErrorMessage(''); setOutputFilename(''); setResultSize(0); }, []);

  const isProcessing = state==='uploading'||state==='converting'||state==='downloading';
  const isDragover   = state==='dragover';
  const isSuccess    = state==='success';
  const isError      = state==='error';

  return (
    <div className="bg-[#F5F5F5]" style={{ minHeight:'100vh' }}>
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="relative max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10 pt-14 pb-12">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}
            className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/8 bg-white text-black/60 text-xs font-semibold tracking-widest uppercase mb-5 shadow-soft">
              <span>{inputLabel} → {outputLabel}</span>
            </div>
            <h1 className="font-semibold tracking-tight text-black mb-4" style={{ fontSize:'clamp(2rem,4vw,3.25rem)', lineHeight:1.08 }}>
              {title}
            </h1>
            <p className="text-black/55 text-lg leading-relaxed">{subtitle}</p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10 py-12">
        <div className="grid lg:grid-cols-[1fr_300px] gap-7 items-start">

          {/* Converter card */}
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.1, ease:[0.16,1,0.3,1] }}
            className="rounded-3xl overflow-hidden bg-white border border-black/5 shadow-soft-md">
            <AnimatePresence mode="wait">
              {isSuccess    && <motion.div key="success"    variants={fadeScale} initial="hidden" animate="show" exit="exit"><SuccessPanel    outputFilename={outputFilename} resultSize={resultSize} inputLabel={inputLabel} outputLabel={outputLabel} onReset={reset} /></motion.div>}
              {isError      && <motion.div key="error"      variants={fadeScale} initial="hidden" animate="show" exit="exit"><ErrorPanel      message={errorMessage} onReset={reset} /></motion.div>}
              {isProcessing && <motion.div key="processing" variants={fadeScale} initial="hidden" animate="show" exit="exit"><ProcessingPanel state={state} uploadProgress={uploadProgress} filename={file?.name??''} outputLabel={outputLabel} onCancel={cancelUpload} /></motion.div>}
              {!isProcessing&&!isSuccess&&!isError && (
                <motion.div key="idle" variants={fadeScale} initial="hidden" animate="show" exit="exit">
                  <IdlePanel
                    file={file} isDragover={isDragover} acceptExt={acceptExt}
                    inputLabel={inputLabel} outputLabel={outputLabel}
                    inputIcon={inputIcon} outputIcon={outputIcon}
                    fileInputRef={fileInputRef}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                    onDrop={handleDrop} onInputChange={handleInputChange}
                    onConvert={startConversion} onClear={() => { setFile(null); setState('idle'); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sidebar */}
          <motion.aside initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.6, delay:0.2, ease:[0.16,1,0.3,1] }} className="space-y-4">
            <FeaturePanel inputLabel={inputLabel} outputLabel={outputLabel} featureBullets={featureBullets} />
            <PrivacyBadge />
            <StatsBadge />
          </motion.aside>
        </div>
      </div>
    </div>
  );
}

/* ── IDLE PANEL ─────────────────────────────────────────────────────────────── */
function IdlePanel({ file, isDragover, acceptExt, inputLabel, outputLabel, inputIcon, outputIcon, fileInputRef, onDragOver, onDragLeave, onDrop, onInputChange, onConvert, onClear }) {
  return (
    <div className="p-8 sm:p-10 relative">
      {/* Drop zone */}
      <div
        className={cn('dropzone rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-6', isDragover && 'dropzone-over')}
        style={{ minHeight:260, background:isDragover?'rgba(0,0,0,0.035)':'#FAFAFA' }}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        role="button" tabIndex={0} aria-label={`Drop your ${inputLabel} file or click to browse`}
        onKeyDown={e => { if(e.key==='Enter'||e.key===' ') fileInputRef.current?.click(); }}
      >
        <input ref={fileInputRef} type="file" className="sr-only" accept={acceptExt.map(e=>`.${e}`).join(',')} onChange={onInputChange} aria-hidden="true" />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.3, ease:[0.16,1,0.3,1] }} className="flex flex-col items-center gap-4 p-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-black/5 border border-black/8 flex items-center justify-center text-black">
                  {inputIcon}
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-black text-[15px] truncate max-w-[260px]">{file.name}</p>
                <p className="text-black/45 text-sm mt-0.5">{formatFileSize(file.size)} · {inputLabel}</p>
              </div>
              <button className="text-xs text-black/40 hover:text-black/65 transition-colors flex items-center gap-1"
                onClick={e => { e.stopPropagation(); onClear(); }}>
                <X size={12} /> Remove file
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="flex flex-col items-center gap-5 p-10 select-none">
              <div className="flex items-center gap-4">
                <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:4.5, repeat:Infinity, ease:'easeInOut' }}
                  className="w-16 h-16 rounded-2xl bg-black/5 border border-black/8 flex items-center justify-center text-black">
                  {inputIcon}
                </motion.div>
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                  <ArrowRight size={16} className="text-white" />
                </div>
                <motion.div animate={{ y:[0,10,0] }} transition={{ duration:4.5, repeat:Infinity, ease:'easeInOut', delay:0.6 }}
                  className="w-14 h-14 rounded-2xl bg-white border border-black/8 flex items-center justify-center text-black/60 shadow-soft">
                  {outputIcon}
                </motion.div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-black text-[15px]">
                  Drop your <span className="text-black">{inputLabel}</span> file here
                </p>
                <p className="text-black/45 text-sm mt-1">
                  or <span className="text-black font-medium cursor-pointer">click to browse</span>
                  {' '}· Max 10 MB
                </p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-black/5 shadow-soft">
                <div className="flex -space-x-1">
                  {['#000000','#525252','#A3A3A3'].map((c,i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{ background:c }} />
                  ))}
                </div>
                <span className="text-black/45 text-xs">Supports {acceptExt.map(e=>`.${e}`).join(', ')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Convert button */}
      <motion.button whileTap={{ scale:file?0.97:1 }} whileHover={{ scale: file ? 1.01 : 1 }}
        className={cn('w-full flex items-center justify-center gap-2.5 rounded-full px-6 py-4 font-medium text-[15px] tracking-tight transition-all duration-200',
          file ? 'bg-black text-white hover:bg-[#222]' : 'bg-black/5 text-black/30 cursor-not-allowed')}
        disabled={!file} onClick={onConvert} aria-disabled={!file}>
        <Zap size={17} />
        Convert to {outputLabel}
      </motion.button>
      <p className="text-center text-black/35 text-xs mt-3">
        Accepts <span className="text-black/50 font-medium">.{acceptExt.join(', .')}</span> files up to 10 MB · Free
      </p>
    </div>
  );
}

/* ── PROCESSING PANEL ───────────────────────────────────────────────────────── */
function ProcessingPanel({ state, uploadProgress, filename, outputLabel, onCancel }) {
  const isUploading   = state==='uploading';
  const isConverting  = state==='converting';
  const isDownloading = state==='downloading';

  const statusText = isUploading?'Uploading your file…':isConverting?'Converting — preserving layout…':'Preparing download…';
  const statusSub  = isUploading?`${uploadProgress}% transferred`:isConverting?'This usually takes 5–30 seconds':'Writing file to disk…';

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-8 py-24" style={{ minHeight:400 }}>
      {/* Animated spinner */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="34" stroke="rgba(0,0,0,0.07)" strokeWidth="5"/>
          <circle cx="40" cy="40" r="34" stroke="#000" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${isUploading?(uploadProgress/100)*214:160} 214`}
            style={{ transition:isUploading?'stroke-dasharray 0.3s ease':undefined,
                     animation:!isUploading?'spin 1.2s linear infinite':undefined, transformOrigin:'40px 40px' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-semibold text-sm text-black">{isUploading?`${uploadProgress}%`:'…'}</span>
        </div>
      </div>

      <div className="text-center">
        <p className="font-semibold text-black text-lg">{statusText}</p>
        <p className="text-black/45 text-sm mt-1.5">{statusSub}</p>
        {filename && (
          <p className="text-xs text-black/40 mt-3 font-mono truncate max-w-[260px] mx-auto px-3 py-1.5 rounded-lg bg-black/[0.03] border border-black/5">
            {filename}
          </p>
        )}
      </div>

      {/* Progress track */}
      <div className="w-full max-w-xs h-1 rounded-full overflow-hidden bg-black/[0.06]">
        {isUploading ? (
          <div className="h-full rounded-full bg-black transition-all duration-300" style={{ width:`${uploadProgress}%` }} />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-black" style={{ animation:'progressBar 1.5s ease-in-out infinite' }} />
        )}
      </div>

      {isUploading && (
        <button className="text-xs text-black/35 hover:text-rose-600 transition-colors" onClick={onCancel}>
          Cancel upload
        </button>
      )}
    </div>
  );
}

/* ── SUCCESS PANEL ──────────────────────────────────────────────────────────── */
function SuccessPanel({ outputFilename, resultSize, inputLabel, outputLabel, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center gap-7 px-8 py-24" style={{ minHeight:400 }}>
      <motion.div initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ type:'spring', stiffness:280, damping:20, delay:0.1 }}
        className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-50">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="Success">
          <path d="M8 18L15 25L28 11" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="30" strokeDashoffset="0" style={{ animation:'checkDraw 0.5s ease 0.3s both' }} />
        </svg>
      </motion.div>

      <div className="text-center">
        <p className="font-semibold text-xl text-black">Conversion complete!</p>
        <p className="text-black/50 text-sm mt-2">Your {outputLabel} file has been downloaded.</p>
        {outputFilename && (
          <p className="mt-3 text-xs font-mono text-black/45 truncate max-w-[280px] mx-auto px-4 py-2 rounded-xl bg-[#FAFAFA] border border-black/5">
            {outputFilename}
          </p>
        )}
        {resultSize>0 && <p className="text-xs text-black/35 mt-2">{formatFileSize(resultSize)}</p>}
      </div>

      <motion.button whileTap={{ scale:0.97 }} onClick={onReset}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-150 border border-black/10 text-black hover:bg-black/[0.03]">
        <RotateCcw size={14} /> Convert another {inputLabel}
      </motion.button>
    </div>
  );
}

/* ── ERROR PANEL ────────────────────────────────────────────────────────────── */
function ErrorPanel({ message, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-24" style={{ minHeight:400 }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-rose-50">
        <AlertCircle size={28} className="text-rose-600" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-semibold text-black text-lg">Conversion failed</p>
        <p className="text-black/50 text-sm mt-2 leading-relaxed">{message}</p>
      </div>
      <motion.button whileTap={{ scale:0.97 }} onClick={onReset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100">
        Try again
      </motion.button>
    </div>
  );
}

/* ── SIDEBAR PANELS ─────────────────────────────────────────────────────────── */
function FeaturePanel({ inputLabel, outputLabel, featureBullets }) {
  return (
    <div className="rounded-2xl p-6 bg-white border border-black/5 shadow-soft">
      <p className="font-semibold text-black text-sm mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-black/5 flex items-center justify-center">
          <Check size={10} className="text-black" />
        </span>
        {inputLabel} → {outputLabel} Features
      </p>
      <ul className="space-y-3">
        {featureBullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center"
              style={{ minWidth:16, minHeight:16 }}>
              <Check size={8} className="text-emerald-600" />
            </div>
            <span className="text-black/55 text-[13px] leading-relaxed">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrivacyBadge() {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-3 bg-emerald-50 border border-emerald-600/15">
      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-white flex items-center justify-center">
        <Shield size={16} className="text-emerald-600" />
      </div>
      <div>
        <p className="font-semibold text-emerald-700 text-[13px]">Privacy guaranteed</p>
        <p className="text-emerald-700/70 text-xs mt-0.5 leading-relaxed">
          Files processed in-memory, permanently discarded after conversion. Zero storage.
        </p>
      </div>
    </div>
  );
}

function StatsBadge() {
  const stats = [
    { icon:<Clock size={13}/>,    label:'Timeout',    value:'3 minutes' },
    { icon:<HardDrive size={13}/>, label:'Max size',   value:'10 MB' },
    { icon:<Zap size={13}/>,      label:'Cost',        value:'Free' },
  ];
  return (
    <div className="rounded-2xl p-5 bg-[#FAFAFA] border border-black/5">
      <p className="text-black/35 text-[11px] font-semibold uppercase tracking-wider mb-3">Session limits</p>
      <div className="space-y-2.5">
        {stats.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-black/45 text-xs">{icon}{label}</div>
            <span className="text-black text-xs font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
