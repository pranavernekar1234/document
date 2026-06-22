'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Upload, FileText, AlertCircle, RotateCcw, ArrowLeft, Check, X, Link2 } from 'lucide-react';
import { cn, formatFileSize, triggerBlobDownload } from '../../../lib/utils';

const ACCENT = '#06B6D4';

export default function ToolClient() {
  const [mode, setMode]     = useState('file'); // 'file' | 'url'
  const [file, setFile]     = useState(null);
  const [url, setUrl]       = useState('');
  const [state, setState]   = useState('idle');
  const [progress, setProg] = useState(0);
  const [error, setError]   = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f && /\.(html?|htm)$/i.test(f.name)) { setFile(f); setState('idle'); setError(''); }
    else { setError('Please upload a .html or .htm file.'); setState('error'); }
  }, []);

  const handleInput = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setState('idle'); setError(''); }
    e.target.value = '';
  }, []);

  const runRequest = useCallback(async (endpoint, formData) => {
    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', endpoint);
        xhr.responseType = 'arraybuffer';
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setProg(Math.round(e.loaded/e.total*100)); });
        xhr.upload.addEventListener('load', () => setState('processing'));
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const cd = xhr.getResponseHeader('content-disposition') ?? '';
            const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
            const filename = match?.[1] ? decodeURIComponent(match[1].replace(/['"]/g, '')) : 'page.pdf';
            resolve({ buf: xhr.response, filename });
          } else {
            try { const t = JSON.parse(new TextDecoder().decode(new Uint8Array(xhr.response))); reject(new Error(t.error ?? `Error ${xhr.status}`)); }
            catch { reject(new Error(`Server error ${xhr.status}`)); }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error.')));
        xhr.timeout = 120000;
        xhr.send(formData);
      });
      const blob = new Blob([data.buf], { type: 'application/pdf' });
      triggerBlobDownload(blob, data.filename);
      setResult({ filename: data.filename, size: blob.size });
      setState('success');
    } catch (err) { setError(err.message); setState('error'); }
    finally { xhrRef.current = null; }
  }, []);

  const processFile = useCallback(async () => {
    if (!file) return;
    setState('uploading'); setProg(0); setError('');
    const fd = new FormData();
    fd.append('file', file, file.name);
    await runRequest('/api/pdf/html-to-pdf', fd, true);
  }, [file, runRequest]);

  const processUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL.'); setState('error'); return; }
    setState('processing'); setProg(0); setError('');
    try {
      const res = await fetch('/api/pdf/url-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
      const filename = match?.[1] ? decodeURIComponent(match[1].replace(/['"]/g, '')) : 'page.pdf';
      const blob = new Blob([buf], { type: 'application/pdf' });
      triggerBlobDownload(blob, filename);
      setResult({ filename, size: blob.size });
      setState('success');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }, [url]);

  const reset = () => { setFile(null); setUrl(''); setState('idle'); setProg(0); setError(''); setResult(null); };
  const isProcessing = state === 'uploading' || state === 'processing';

  return (
    <div style={{ background:'linear-gradient(180deg,#080e1c 0%,#0F172A 100%)', minHeight:'100vh' }}>
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 50% 60% at 50% -10%,rgba(6,182,212,0.18),transparent)' }} />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <Link href="/#tools" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to all tools
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',color:ACCENT }}>
              <Globe size={22}/>
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-black text-white text-2xl sm:text-3xl tracking-tight">HTML to PDF</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background:'rgba(6,182,212,0.25)',border:'1px solid rgba(6,182,212,0.35)' }}>FREE</span>
              </div>
              <p className="text-slate-400 text-base">Convert HTML files or live web pages to PDF with styling preserved.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_280px] gap-7 items-start">
          <div className="rounded-3xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 4px 6px rgba(0,0,0,0.3),0 20px 40px rgba(0,0,0,0.4)' }}>
            <AnimatePresence mode="wait">

              {state === 'success' && result && (
                <motion.div key="success" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-6 px-8 py-20" style={{ minHeight:360 }}>
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring',stiffness:260,damping:20,delay:0.1 }}
                    className="rounded-full flex items-center justify-center" style={{ width:72,height:72,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)' }}>
                    <Check size={32} className="text-emerald-400"/>
                  </motion.div>
                  <div className="text-center">
                    <p className="font-black text-xl text-white">Done!</p>
                    <p className="text-slate-400 text-sm mt-1">{result.filename} · {formatFileSize(result.size)}</p>
                  </div>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#CBD5E1' }}>
                    <RotateCcw size={13}/> Convert another
                  </button>
                </motion.div>
              )}

              {state === 'error' && (
                <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-5 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.25)' }}><AlertCircle size={24} className="text-rose-400"/></div>
                  <div className="text-center max-w-sm"><p className="font-bold text-white">Conversion failed</p><p className="text-slate-400 text-sm mt-1.5">{error}</p></div>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)',color:'#fb7185' }}>Try again</button>
                </motion.div>
              )}

              {isProcessing && (
                <motion.div key="processing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-7 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="relative" style={{ width:72,height:72 }}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                      <circle cx="40" cy="40" r="34" stroke="url(#pg-html)" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={state==='uploading'?`${(progress/100)*213.6} 213.6`:'140 213.6'}
                        style={{ transition:state==='uploading'?'stroke-dasharray 0.3s ease':undefined, animation:state==='processing'?'spin 1.1s linear infinite':undefined, transformOrigin:'40px 40px' }}/>
                      <defs><linearGradient id="pg-html" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#06B6D4"/><stop offset="1" stopColor="#2563EB"/></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="font-bold text-sm" style={{ color:ACCENT }}>{state==='uploading'?`${progress}%`:'…'}</span></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-lg">{mode==='url'?'Fetching and rendering page…':state==='uploading'?'Uploading…':'Converting to PDF…'}</p>
                    <p className="text-slate-500 text-sm mt-1">This usually takes a few seconds</p>
                  </div>
                </motion.div>
              )}

              {state !== 'success' && state !== 'error' && !isProcessing && (
                <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="p-8">
                  {/* Mode switch */}
                  <div className="flex gap-2 mb-6">
                    {[['file','Upload HTML File', <FileText size={14} key="f"/>],['url','Convert from URL', <Link2 size={14} key="u"/>]].map(([v,l,ic]) => (
                      <button key={v} onClick={()=>{setMode(v);setError('');}}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center"
                        style={{ background:mode===v?'rgba(6,182,212,0.18)':'rgba(255,255,255,0.04)', border:`1px solid ${mode===v?'rgba(6,182,212,0.4)':'rgba(255,255,255,0.08)'}`, color:mode===v?'#22D3EE':'#94A3B8' }}>
                        {ic} {l}
                      </button>
                    ))}
                  </div>

                  {mode === 'file' ? (
                    <>
                      <div
                        className={cn('dropzone rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-5',state==='dragover'&&'dropzone-over')}
                        style={{ minHeight:200,background:state==='dragover'?'rgba(6,182,212,0.07)':'rgba(255,255,255,0.02)' }}
                        onDragOver={e=>{e.preventDefault();setState('dragover');}} onDragLeave={e=>{e.preventDefault();setState('idle');}}
                        onDrop={handleDrop} onClick={()=>!file&&fileInputRef.current?.click()} role="button" tabIndex={0}
                        onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileInputRef.current?.click();}}>
                        <input ref={fileInputRef} type="file" className="sr-only" accept=".html,.htm" onChange={handleInput}/>
                        {file?(
                          <div className="flex flex-col items-center gap-3 p-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',color:ACCENT }}><FileText size={20}/></div>
                            <div className="text-center"><p className="font-semibold text-white text-sm truncate max-w-xs">{file.name}</p><p className="text-slate-500 text-xs mt-0.5">{formatFileSize(file.size)}</p></div>
                            <button className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1" onClick={e=>{e.stopPropagation();setFile(null);}}><X size={11}/>Remove</button>
                          </div>
                        ):(
                          <div className="flex flex-col items-center gap-4 p-8 select-none">
                            <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:4.5,repeat:Infinity,ease:'easeInOut' }} className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',color:ACCENT }}><Upload size={24}/></motion.div>
                            <div className="text-center"><p className="font-semibold text-white text-[15px]">Drop your HTML file here</p><p className="text-slate-500 text-sm mt-1">or <span className="font-medium cursor-pointer" style={{color:ACCENT}}>click to browse</span></p></div>
                          </div>
                        )}
                      </div>
                      <motion.button whileTap={{scale:file?0.97:1}} onClick={processFile} disabled={!file}
                        className={cn('w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 font-bold text-[15px] text-white',!file&&'opacity-40 cursor-not-allowed')}
                        style={{ background:file?`linear-gradient(135deg,${ACCENT},#2563EB)`:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:file?'0 4px 20px rgba(6,182,212,0.35)':undefined }}>
                        <Globe size={17}/> Convert to PDF
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <div className="mb-5">
                        <label className="text-slate-400 text-xs font-medium block mb-1.5">Web page URL</label>
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)' }}>
                          <Link2 size={15} className="text-slate-500 flex-shrink-0"/>
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={e=>setUrl(e.target.value)}
                            onKeyDown={e=>{if(e.key==='Enter')processUrl();}}
                            className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm focus:outline-none"
                          />
                        </div>
                        <p className="text-slate-600 text-xs mt-1.5">We&apos;ll fetch the live page and preserve its CSS layout.</p>
                      </div>
                      <motion.button whileTap={{scale:url.trim()?0.97:1}} onClick={processUrl} disabled={!url.trim()}
                        className={cn('w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 font-bold text-[15px] text-white',!url.trim()&&'opacity-40 cursor-not-allowed')}
                        style={{ background:url.trim()?`linear-gradient(135deg,${ACCENT},#2563EB)`:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:url.trim()?'0 4px 20px rgba(6,182,212,0.35)':undefined }}>
                        <Link2 size={17}/> Convert URL to PDF
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-semibold text-sm mb-3">Features</p>
              <ul className="space-y-2.5">
                {['Upload HTML files with inline CSS','Convert any live URL to PDF','Images and external stylesheets render','Responsive layouts preserved'].map((b,i)=>(
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)' }}><Check size={8} style={{color:ACCENT}}/></div>
                    <span className="text-slate-400 text-xs leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.15)' }}>
              <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0"/>
              <div><p className="font-semibold text-emerald-400 text-xs">Privacy guaranteed</p><p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">Files processed in-memory. Zero storage.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
