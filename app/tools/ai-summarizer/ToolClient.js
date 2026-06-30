'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, FileText, AlertCircle, RotateCcw, ArrowLeft, Check, X, BookOpen, List } from 'lucide-react';
import { cn, formatFileSize } from '../../../lib/utils';

const ACCENT = '#000000';

export default function ToolClient() {
  const [file, setFile]       = useState(null);
  const [state, setState]     = useState('idle');
  const [progress, setProg]   = useState(0);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);
  const [mode, setMode]       = useState('summary');
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
    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/pdf/ai-summarize');
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
  }, [file]);

  const reset = () => { setFile(null); setState('idle'); setProg(0); setError(''); setResult(null); };
  const isProcessing = state === 'uploading' || state === 'processing';

  return (
    <div className="bg-[#F5F5F5]" style={{ minHeight:'100vh' }}>
      <div className="relative overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <Link href="/#tools" className="inline-flex items-center gap-2 text-black/40 hover:text-black/70 text-sm mb-6 transition-colors group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Back to all tools
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:`${ACCENT}14`, color:ACCENT }}>
              <Sparkles size={22}/>
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-semibold text-black text-2xl sm:text-3xl tracking-tight">AI Summarizer</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-black">FREE</span>
              </div>
              <p className="text-black/55 text-base">Generate instant AI-powered summaries of any PDF document.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_280px] gap-7 items-start">
          <div className="rounded-3xl overflow-hidden bg-white border border-black/5 shadow-soft-md">
            <AnimatePresence mode="wait">
              {state === 'success' && result && (
                <motion.div key="success" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} transition={{ duration:0.35 }} className="p-8">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {[['Pages',result.pageCount],['Words',result.wordCount?.toLocaleString()??'—'],['Status',result.isScanned?'Scanned':'Text OK']].map(([l,v])=>(
                      <div key={l} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background:`${ACCENT}0D`, border:`1px solid ${ACCENT}25` }}>
                        <span className="text-black/45 text-xs">{l}:</span><span className="text-black text-xs font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-5">
                    {[['summary','Summary'],['keypoints','Key Points']].map(([v,l])=>(
                      <button key={v} onClick={()=>setMode(v)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background:mode===v?`${ACCENT}14`:'#FAFAFA', border:`1px solid ${mode===v?`${ACCENT}40`:'rgba(0,0,0,0.08)'}`, color:mode===v?'#000':'rgba(0,0,0,0.5)' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl p-5 mb-6 min-h-40 bg-[#FAFAFA] border border-black/5">
                    {mode==='summary' ? (
                      <p className="text-black/70 text-sm leading-relaxed">{result.summary||'No summary could be extracted.'}</p>
                    ) : (
                      <ul className="space-y-3">
                        {(result.keyPoints??[]).map((pt,i)=>(
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[10px] font-bold" style={{ background:`${ACCENT}14`, color:ACCENT }}>{i+1}</div>
                            <p className="text-black/70 text-sm leading-relaxed">{pt}</p>
                          </li>
                        ))}
                        {!result.keyPoints?.length && <p className="text-black/45 text-sm">No distinct key points identified.</p>}
                      </ul>
                    )}
                  </div>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-black/10 text-black hover:bg-black/[0.03] transition-colors">
                    <RotateCcw size={13}/> Summarize another file
                  </button>
                </motion.div>
              )}
              {state === 'error' && (
                <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-5 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-50"><AlertCircle size={24} className="text-rose-600"/></div>
                  <div className="text-center"><p className="font-semibold text-black">Processing failed</p><p className="text-black/50 text-sm mt-1.5 max-w-xs">{error}</p></div>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors">Try again</button>
                </motion.div>
              )}
              {isProcessing && (
                <motion.div key="processing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center gap-7 px-8 py-20" style={{ minHeight:320 }}>
                  <div className="relative" style={{ width:72,height:72 }}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="34" stroke="rgba(0,0,0,0.07)" strokeWidth="5"/>
                      <circle cx="40" cy="40" r="34" stroke="#000" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={state==='uploading'?`${(progress/100)*213.6} 213.6`:'140 213.6'}
                        style={{ transition:state==='uploading'?'stroke-dasharray 0.3s ease':undefined, animation:state==='processing'?'spin 1.1s linear infinite':undefined, transformOrigin:'40px 40px' }}/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="font-semibold text-sm text-black">{state==='uploading'?`${progress}%`:'AI'}</span></div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-black text-lg">{state==='uploading'?'Uploading PDF…':'Analyzing text…'}</p>
                    <p className="text-black/45 text-sm mt-1">{state==='uploading'?`${progress}% transferred`:'Extracting key points'}</p>
                  </div>
                </motion.div>
              )}
              {state !== 'success' && state !== 'error' && !isProcessing && (
                <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="p-8">
                  <div
                    className={cn('dropzone rounded-2xl flex flex-col items-center justify-center cursor-pointer mb-5',state==='dragover'&&'dropzone-over')}
                    style={{ minHeight:200,background:state==='dragover'?'rgba(0,0,0,0.035)':'#FAFAFA' }}
                    onDragOver={e=>{e.preventDefault();setState('dragover');}} onDragLeave={e=>{e.preventDefault();setState('idle');}}
                    onDrop={handleDrop} onClick={()=>!file&&fileInputRef.current?.click()} role="button" tabIndex={0}
                    onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileInputRef.current?.click();}}>
                    <input ref={fileInputRef} type="file" className="sr-only" accept=".pdf" onChange={handleInput}/>
                    {file?(
                      <div className="flex flex-col items-center gap-3 p-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:`${ACCENT}14`, color:ACCENT }}><FileText size={20}/></div>
                        <div className="text-center"><p className="font-semibold text-black text-sm truncate max-w-xs">{file.name}</p><p className="text-black/40 text-xs mt-0.5">{formatFileSize(file.size)}</p></div>
                        <button className="text-xs text-black/35 hover:text-black/60 flex items-center gap-1" onClick={e=>{e.stopPropagation();setFile(null);}}><X size={11}/>Remove</button>
                      </div>
                    ):(
                      <div className="flex flex-col items-center gap-4 p-8 select-none">
                        <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:4.5,repeat:Infinity,ease:'easeInOut' }} className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:`${ACCENT}14`, color:ACCENT }}><Upload size={24}/></motion.div>
                        <div className="text-center"><p className="font-semibold text-black text-[15px]">Drop your PDF here</p><p className="text-black/45 text-sm mt-1">or <span className="font-medium cursor-pointer text-black">click to browse</span></p></div>
                      </div>
                    )}
                  </div>
                  <motion.button whileTap={{scale:file?0.97:1}} whileHover={{ scale: file ? 1.01 : 1 }} onClick={process} disabled={!file}
                    className={cn('w-full flex items-center justify-center gap-2.5 rounded-full px-6 py-4 font-medium text-[15px] transition-all duration-200',
                      file ? 'bg-black text-white hover:bg-[#222]' : 'bg-black/5 text-black/30 cursor-not-allowed')}>
                    <Sparkles size={17}/> Generate Summary
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-5 bg-white border border-black/5 shadow-soft">
              <p className="text-black font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles size={14} style={{ color: ACCENT }} /> Features</p>
              <ul className="space-y-2.5">
                {['Instant key point extraction','Executive summary mode','Multi-page support','Works without an API key'].map((b,i)=>(
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-50"><Check size={8} className="text-emerald-600"/></div>
                    <span className="text-black/55 text-xs leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-4 flex items-start gap-3 bg-emerald-50 border border-emerald-600/15">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0"><Check size={13} className="text-emerald-600"/></div>
              <div><p className="font-semibold text-emerald-700 text-xs">Privacy guaranteed</p><p className="text-emerald-700/70 text-[11px] mt-0.5 leading-relaxed">Files processed in-memory. Zero storage.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
