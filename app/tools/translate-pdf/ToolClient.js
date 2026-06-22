'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Upload, FileText, AlertCircle, RotateCcw, Check, X, Copy, CheckCheck } from 'lucide-react';
import { cn, formatFileSize } from '../../../lib/utils';

const ACCENT = '#3B82F6';
const LANGUAGES = [
  ['es','Spanish'],['fr','French'],['de','German'],['it','Italian'],['pt','Portuguese'],
  ['zh','Chinese'],['ja','Japanese'],['ko','Korean'],['ar','Arabic'],['hi','Hindi'],
  ['ru','Russian'],['nl','Dutch'],['tr','Turkish'],['pl','Polish'],['sv','Swedish'],
];

export default function ToolClient() {
  const [file, setFile]     = useState(null);
  const [state, setState]   = useState('idle');
  const [progress, setProg] = useState(0);
  const [error, setError]   = useState('');
  const [result, setResult] = useState(null);
  const [targetLang, setTargetLang] = useState('es');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f?.name.toLowerCase().endsWith('.pdf')) { setFile(f); setState('idle'); setError(''); }
    else { setError('Please upload a .pdf file.'); setState('error'); }
  }, []);

  const handleInput = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setState('idle'); setError(''); }
    e.target.value = '';
  }, []);

  const process = useCallback(async () => {
    if (!file) return;
    setState('uploading'); setProg(0); setError('');
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('targetLang', targetLang);
    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/pdf/translate');
        xhr.responseType = 'arraybuffer';
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setProg(Math.round(e.loaded/e.total*100)); });
        xhr.upload.addEventListener('load', () => setState('processing'));
        xhr.addEventListener('load', () => {
          const text = new TextDecoder().decode(new Uint8Array(xhr.response));
          if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(text)); } catch { reject(new Error('Invalid response')); } }
          else { try { reject(new Error(JSON.parse(text).error ?? `Error ${xhr.status}`)); } catch { reject(new Error(`Server error ${xhr.status}`)); } }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error.')));
        xhr.timeout = 120000;
        xhr.send(fd);
      });
      setResult(data); setState('success');
    } catch (err) { setError(err.message); setState('error'); }
    finally { xhrRef.current = null; }
  }, [file, targetLang]);

  const reset = () => { setFile(null); setState('idle'); setProg(0); setError(''); setResult(null); setCopied(false); };
  const copyText = () => { if (result?.translatedText) { navigator.clipboard.writeText(result.translatedText); setCopied(true); setTimeout(()=>setCopied(false), 2000); } };
  const isProcessing = state === 'uploading' || state === 'processing';

  return (
    <div style={{ background:'linear-gradient(180deg,#080e1c 0%,#0F172A 100%)', minHeight:'100vh' }}>
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 50% 60% at 50% -10%,rgba(59,130,246,0.18),transparent)' }} />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <Link href="/#tools" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Back to all tools
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',color:ACCENT }}>
              <Languages size={22}/>
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-black text-white text-2xl sm:text-3xl tracking-tight">Translate PDF</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background:'rgba(59,130,246,0.25)',border:'1px solid rgba(59,130,246,0.35)' }}>FREE</span>
              </div>
              <p className="text-slate-400 text-base">Translate PDF documents to 100+ languages.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_280px] gap-7 items-start">
          <div className="rounded-3xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 4px 6px rgba(0,0,0,0.3),0 20px 40px rgba(0,0,0,0.4)' }}>
            <AnimatePresence mode="wait">
              {state === 'success' && result && (
                <motion.div key="success" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} transition={{ duration:0.35 }} className="p-8">
                  {result.isScanned ? (
                    <div className="text-center py-10">
                      <AlertCircle size={32} className="text-amber-400 mx-auto mb-4"/>
                      <p className="text-white font-semibold mb-2">This PDF appears to be scanned</p>
                      <p className="text-slate-400 text-sm">Run it through OCR PDF first, then translate.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',color:'#60A5FA' }}>
                          Translated to {result.targetLangName}
                        </span>
                        <button onClick={copyText} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                          {copied ? <><CheckCheck size={13} className="text-emerald-400"/> Copied</> : <><Copy size={13}/> Copy text</>}
                        </button>
                      </div>
                      <div className="rounded-2xl p-5 mb-4 max-h-96 overflow-y-auto" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{result.translatedText}</p>
                      </div>
                      {result.truncated && (
                        <p className="text-amber-400/80 text-xs mb-4">⚠ Document was long — showing translation of the first portion.</p>
                      )}
                    </>
                  )}
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#CBD5E1' }}>
                    <RotateCcw size={13}/> Translate another file
                  </button>
                </motion.div>
              )}
              {state === 'error' && (
                <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-5 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.25)' }}><AlertCircle size={24} className="text-rose-400"/></div>
                  <div className="text-center"><p className="font-bold text-white">Translation failed</p><p className="text-slate-400 text-sm mt-1.5 max-w-xs">{error}</p></div>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)',color:'#fb7185' }}>Try again</button>
                </motion.div>
              )}
              {isProcessing && (
                <motion.div key="processing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-7 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="relative" style={{ width:72,height:72 }}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                      <circle cx="40" cy="40" r="34" stroke="url(#pg-tr)" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={state==='uploading'?`${(progress/100)*213.6} 213.6`:'140 213.6'}
                        style={{ transition:state==='uploading'?'stroke-dasharray 0.3s ease':undefined, animation:state==='processing'?'spin 1.1s linear infinite':undefined, transformOrigin:'40px 40px' }}/>
                      <defs><linearGradient id="pg-tr" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#06B6D4"/></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="font-bold text-sm" style={{ color:ACCENT }}>{state==='uploading'?`${progress}%`:'🌐'}</span></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-lg">{state==='uploading'?'Uploading PDF…':'Translating text…'}</p>
                    <p className="text-slate-500 text-sm mt-1">{state==='uploading'?`${progress}% transferred`:`Converting to ${LANGUAGES.find(l=>l[0]===targetLang)?.[1]}`}</p>
                  </div>
                </motion.div>
              )}
              {state !== 'success' && state !== 'error' && !isProcessing && (
                <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="p-8">
                  <div
                    className={cn('dropzone rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-5',state==='dragover'&&'dropzone-over')}
                    style={{ minHeight:180,background:state==='dragover'?'rgba(59,130,246,0.07)':'rgba(255,255,255,0.02)' }}
                    onDragOver={e=>{e.preventDefault();setState('dragover');}} onDragLeave={e=>{e.preventDefault();setState('idle');}}
                    onDrop={handleDrop} onClick={()=>!file&&fileInputRef.current?.click()} role="button" tabIndex={0}
                    onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileInputRef.current?.click();}}>
                    <input ref={fileInputRef} type="file" className="sr-only" accept=".pdf" onChange={handleInput}/>
                    {file?(
                      <div className="flex flex-col items-center gap-3 p-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',color:ACCENT }}><FileText size={20}/></div>
                        <div className="text-center"><p className="font-semibold text-white text-sm truncate max-w-xs">{file.name}</p><p className="text-slate-500 text-xs mt-0.5">{formatFileSize(file.size)}</p></div>
                        <button className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1" onClick={e=>{e.stopPropagation();setFile(null);}}><X size={11}/>Remove</button>
                      </div>
                    ):(
                      <div className="flex flex-col items-center gap-4 p-7 select-none">
                        <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:4.5,repeat:Infinity,ease:'easeInOut' }} className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',color:ACCENT }}><Upload size={24}/></motion.div>
                        <div className="text-center"><p className="font-semibold text-white text-[15px]">Drop your PDF here</p><p className="text-slate-500 text-sm mt-1">or <span className="font-medium cursor-pointer" style={{color:ACCENT}}>click to browse</span></p></div>
                      </div>
                    )}
                  </div>

                  {/* Language selector */}
                  <div className="mb-5">
                    <label className="text-slate-400 text-xs font-medium block mb-2">Translate to</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {LANGUAGES.map(([code,name]) => (
                        <button key={code} onClick={()=>setTargetLang(code)}
                          className="px-2 py-2 rounded-lg text-xs font-medium transition-all"
                          style={{ background:targetLang===code?'rgba(59,130,246,0.2)':'rgba(255,255,255,0.04)', border:`1px solid ${targetLang===code?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`, color:targetLang===code?'#60A5FA':'#94A3B8' }}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button whileTap={{scale:file?0.97:1}} onClick={process} disabled={!file}
                    className={cn('w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 font-bold text-[15px] text-white',!file&&'opacity-40 cursor-not-allowed')}
                    style={{ background:file?`linear-gradient(135deg,${ACCENT},#06B6D4)`:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:file?'0 4px 20px rgba(59,130,246,0.35)':undefined }}>
                    <Languages size={17}/> Translate PDF
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-semibold text-sm mb-3">Features</p>
              <ul className="space-y-2.5">
                {['15+ languages available','Copy translated text instantly','Works on text-based PDFs','No file size limit issues'].map((b,i)=>(
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)' }}><Check size={8} style={{color:ACCENT}}/></div>
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
