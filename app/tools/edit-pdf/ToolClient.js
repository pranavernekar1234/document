'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Upload, FileText, AlertCircle, RotateCcw, ArrowLeft, Check, X,
  Highlighter, Square, Type, ChevronLeft, ChevronRight, Trash2, Download,
} from 'lucide-react';
import { cn, formatFileSize, triggerBlobDownload } from '../../../lib/utils';

const ACCENT = '#000000';
const RENDER_SCALE = 1.4; // canvas render scale relative to PDF points

export default function ToolClient() {
  const [file, setFile]           = useState(null);
  const [state, setState]         = useState('idle'); // idle|loading|editing|uploading|processing|success|error
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null);
  const [pdfDoc, setPdfDoc]       = useState(null);   // pdfjs document proxy
  const [pageNum, setPageNum]     = useState(1);
  const [numPages, setNumPages]   = useState(0);
  const [tool, setTool]           = useState('highlight'); // highlight|redact|text
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [annotations, setAnnotations] = useState([]); // { page, type, x, y, width, height, text?, color? }
  const [drawing, setDrawing]     = useState(null);    // { startX, startY }
  const [textInput, setTextInput] = useState(null);    // { x, y } pending text placement
  const [textValue, setTextValue] = useState('');
  const [progress, setProgress]   = useState(0);

  const fileInputRef = useRef(null);
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const pdfjsRef       = useRef(null); // pdfjs-dist module cache
  const xhrRef         = useRef(null);

  // Lazy-load pdfjs-dist only in the browser
  const loadPdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import('pdfjs-dist');
    // Served locally from /public (no third-party CDN dependency) — kept in
    // sync with the installed pdfjs-dist version via scripts/copy-pdf-worker.js.
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  // ── File handling ────────────────────────────────────────────────────────
  const acceptFile = useCallback(async (f) => {
    setFile(f); setError(''); setState('loading'); setAnnotations([]); setPageNum(1);
    try {
      const pdfjs = await loadPdfjs();
      const arrayBuffer = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setState('editing');
    } catch (err) {
      setError('Failed to load PDF for preview. ' + (err?.message ?? ''));
      setState('error');
    }
  }, [loadPdfjs]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f?.name.toLowerCase().endsWith('.pdf')) acceptFile(f);
    else { setError('Please upload a .pdf file.'); setState('error'); }
  }, [acceptFile]);

  const handleInput = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = '';
  }, [acceptFile]);

  // ── Render current page (+ annotation overlay) to canvas ────────────────
  // A SINGLE render effect is used intentionally. Two separate effects that
  // each call `page.render()` on the same <canvas> fire concurrently and
  // pdf.js throws "Cannot use the same canvas during multiple render
  // operations." Any in-flight render task is explicitly cancelled before a
  // new one starts, and the effect cleanup cancels pending renders on
  // page-change/unmount so nothing leaks.
  const renderTaskRef = useRef(null); // in-flight pdf.js RenderTask

  useEffect(() => {
    if (!pdfDoc || state !== 'editing') return;
    let cancelled = false;

    (async () => {
      // Cancel any render still in flight before starting a new one.
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* already finished */ }
        renderTaskRef.current = null;
      }

      let page;
      try {
        page = await pdfDoc.getPage(pageNum);
      } catch {
        return; // document may have been torn down mid-flight
      }
      if (cancelled) return;

      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (err) {
        // Expected whenever a newer render cancels this one — not a real error.
        if (err?.name === 'RenderingCancelledException') return;
        if (!cancelled) console.error('PDF page render failed:', err);
        return;
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }
      if (cancelled) return;

      // Draw the annotation overlay in canvas pixel space (top-left origin).
      const pageAnns = annotations.filter(a => a.page === pageNum - 1);
      for (const a of pageAnns) {
        const cx = a.canvasX, cy = a.canvasY, cw = a.canvasW, ch = a.canvasH;
        if (a.type === 'redact') {
          ctx.fillStyle = 'rgba(0,0,0,1)';
          ctx.fillRect(cx, cy, cw, ch);
        } else if (a.type === 'highlight') {
          const colorMap = { yellow:'rgba(255,235,80,0.45)', green:'rgba(110,255,110,0.4)', blue:'rgba(110,180,255,0.4)', pink:'rgba(255,150,200,0.4)' };
          ctx.fillStyle = colorMap[a.color] ?? colorMap.yellow;
          ctx.fillRect(cx, cy, cw, ch);
        } else if (a.type === 'text') {
          ctx.fillStyle = '#1a1a2e';
          ctx.font = '14px sans-serif';
          ctx.fillText(a.text ?? '', cx, cy + 14);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* no-op */ }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, state, annotations]);

  // Release the loaded pdf.js document's worker/page resources when the
  // editor unmounts or a new file replaces it, to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try { pdfDoc.destroy(); } catch { /* already destroyed */ }
      }
    };
  }, [pdfDoc]);

  // ── Mouse interactions for drawing boxes ────────────────────────────────
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e) => {
    if (tool === 'text') {
      const { x, y } = getCanvasPos(e);
      setTextInput({ x, y });
      setTextValue('');
      return;
    }
    const { x, y } = getCanvasPos(e);
    setDrawing({ startX: x, startY: y });
  };

  const onMouseMove = (e) => {
    if (!drawing) return;
    // Visual feedback handled on mouseup for simplicity (avoids excessive re-renders)
  };

  const onMouseUp = (e) => {
    if (!drawing) return;
    const { x: endX, y: endY } = getCanvasPos(e);
    const x = Math.min(drawing.startX, endX);
    const y = Math.min(drawing.startY, endY);
    const w = Math.abs(endX - drawing.startX);
    const h = Math.abs(endY - drawing.startY);
    setDrawing(null);
    if (w < 6 || h < 6) return; // ignore tiny accidental clicks

    const canvas = canvasRef.current;
    // Convert canvas pixel coords -> PDF point coords (origin bottom-left)
    const pdfX = x / RENDER_SCALE;
    const pdfY = (canvas.height - (y + h)) / RENDER_SCALE;
    const pdfW = w / RENDER_SCALE;
    const pdfH = h / RENDER_SCALE;

    setAnnotations(prev => [...prev, {
      page: pageNum - 1, type: tool,
      x: pdfX, y: pdfY, width: pdfW, height: pdfH,
      canvasX: x, canvasY: y, canvasW: w, canvasH: h,
      color: tool === 'highlight' ? highlightColor : undefined,
    }]);
  };

  const confirmText = () => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    const canvas = canvasRef.current;
    const pdfX = textInput.x / RENDER_SCALE;
    const pdfY = (canvas.height - textInput.y - 16) / RENDER_SCALE;
    setAnnotations(prev => [...prev, {
      page: pageNum - 1, type: 'text', text: textValue.trim(),
      x: pdfX, y: pdfY, width: 200, height: 16,
      canvasX: textInput.x, canvasY: textInput.y - 14, canvasW: 200, canvasH: 16,
      fontSize: 12,
    }]);
    setTextInput(null); setTextValue('');
  };

  const undoLast = () => setAnnotations(prev => prev.slice(0, -1));
  const clearPage = () => setAnnotations(prev => prev.filter(a => a.page !== pageNum - 1));

  // ── Submit edits ─────────────────────────────────────────────────────────
  const applyEdits = useCallback(async () => {
    if (!file || annotations.length === 0) return;
    setState('uploading'); setProgress(0); setError('');
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('annotations', JSON.stringify(annotations.map(({ canvasX, canvasY, canvasW, canvasH, ...rest }) => rest)));

    try {
      const buf = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/pdf/edit-pdf');
        xhr.responseType = 'arraybuffer';
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100)); });
        xhr.upload.addEventListener('load', () => setState('processing'));
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else { try { reject(new Error(JSON.parse(new TextDecoder().decode(new Uint8Array(xhr.response))).error ?? `Error ${xhr.status}`)); } catch { reject(new Error(`Server error ${xhr.status}`)); } }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error.')));
        xhr.timeout = 90000;
        xhr.send(fd);
      });
      const blob = new Blob([buf], { type: 'application/pdf' });
      triggerBlobDownload(blob, 'edited.pdf');
      setResult({ filename: 'edited.pdf', size: blob.size });
      setState('success');
    } catch (err) { setError(err.message); setState('error'); }
    finally { xhrRef.current = null; }
  }, [file, annotations]);

  const reset = () => {
    setFile(null); setPdfDoc(null); setNumPages(0); setPageNum(1);
    setAnnotations([]); setError(''); setResult(null); setState('idle');
  };

  const isBusy = state === 'loading' || state === 'uploading' || state === 'processing';

  return (
    <div className="bg-[#F5F5F5]" style={{ minHeight:'100vh' }}>
      <div className="relative overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black_50%,transparent_100%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-10">
          <Link href="/#tools" className="inline-flex items-center gap-2 text-black/40 hover:text-black/70 text-sm mb-6 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to all tools
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:`${ACCENT}14`, color:ACCENT }}>
              <Edit3 size={22}/>
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-semibold text-black text-2xl sm:text-3xl tracking-tight">Edit PDF</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-black">FREE</span>
              </div>
              <p className="text-black/55 text-base">Annotate, highlight, redact, and add text directly on your PDF pages.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* SUCCESS */}
          {state === 'success' && result && (
            <motion.div key="success" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
              className="rounded-3xl flex flex-col items-center justify-center gap-6 px-8 py-20 bg-white border border-black/5 shadow-soft-md"
              style={{ minHeight:400 }}>
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring',stiffness:260,damping:20,delay:0.1 }}
                className="rounded-full flex items-center justify-center bg-emerald-50" style={{ width:72,height:72 }}>
                <Check size={32} className="text-emerald-600"/>
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-xl text-black">Edits applied!</p>
                <p className="text-black/50 text-sm mt-1">{result.filename} · {formatFileSize(result.size)} · downloaded automatically</p>
              </div>
              <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-black/10 text-black hover:bg-black/[0.03] transition-colors">
                <RotateCcw size={13}/> Edit another file
              </button>
            </motion.div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="rounded-3xl flex flex-col items-center justify-center gap-5 px-8 py-20 bg-white border border-black/5 shadow-soft-md"
              style={{ minHeight:360 }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-50">
                <AlertCircle size={24} className="text-rose-600"/>
              </div>
              <div className="text-center max-w-sm"><p className="font-semibold text-black">Something went wrong</p><p className="text-black/50 text-sm mt-1.5">{error}</p></div>
              <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors">Try again</button>
            </motion.div>
          )}

          {/* UPLOAD/IDLE */}
          {state === 'idle' && (
            <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="rounded-3xl p-8 bg-white border border-black/5 shadow-soft-md">
              <div
                className="dropzone rounded-2xl flex flex-col items-center justify-center cursor-pointer"
                style={{ minHeight:280, background:'#FAFAFA' }}
                onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
                onClick={()=>fileInputRef.current?.click()} role="button" tabIndex={0}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileInputRef.current?.click();}}>
                <input ref={fileInputRef} type="file" className="sr-only" accept=".pdf" onChange={handleInput}/>
                <div className="flex flex-col items-center gap-4 p-8 select-none">
                  <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:4.5,repeat:Infinity,ease:'easeInOut' }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:`${ACCENT}14`, color:ACCENT }}>
                    <Upload size={26}/>
                  </motion.div>
                  <div className="text-center">
                    <p className="font-semibold text-black text-[16px]">Drop your PDF to start editing</p>
                    <p className="text-black/45 text-sm mt-1.5">or <span className="font-medium cursor-pointer text-black">click to browse</span> · Max 50 MB</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* LOADING PREVIEW */}
          {state === 'loading' && (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="rounded-3xl flex flex-col items-center justify-center gap-5 px-8 py-24 bg-white border border-black/5 shadow-soft-md"
              style={{ minHeight:400 }}>
              <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center" style={{ borderColor:'rgba(0,0,0,0.07)', borderTopColor: ACCENT, animation:'spin 1s linear infinite' }} />
              <p className="text-black font-semibold">Loading PDF preview…</p>
            </motion.div>
          )}

          {(state === 'uploading' || state === 'processing') && (
            <motion.div key="processing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="rounded-3xl flex flex-col items-center justify-center gap-7 px-8 py-24 bg-white border border-black/5 shadow-soft-md"
              style={{ minHeight:400 }}>
              <div className="relative" style={{ width:72,height:72 }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="34" stroke="rgba(0,0,0,0.07)" strokeWidth="5"/>
                  <circle cx="40" cy="40" r="34" stroke="#000" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={state==='uploading'?`${(progress/100)*213.6} 213.6`:'140 213.6'}
                    style={{ transition:state==='uploading'?'stroke-dasharray 0.3s ease':undefined, animation:state==='processing'?'spin 1.1s linear infinite':undefined, transformOrigin:'40px 40px' }}/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="font-semibold text-sm text-black">{state==='uploading'?`${progress}%`:'…'}</span></div>
              </div>
              <p className="text-black font-semibold text-lg">{state==='uploading'?'Uploading…':'Applying your edits…'}</p>
            </motion.div>
          )}

          {/* EDITING — canvas workspace */}
          {state === 'editing' && (
            <motion.div key="editing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              <div className="grid lg:grid-cols-[1fr_240px] gap-5">
                {/* Toolbar + canvas */}
                <div className="rounded-3xl overflow-hidden bg-white border border-black/5 shadow-soft-md">
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 p-4 border-b border-black/5 flex-wrap">
                    {[['highlight','Highlight', <Highlighter size={14} key="h"/>],['redact','Redact', <Square size={14} key="r"/>],['text','Text', <Type size={14} key="t"/>]].map(([v,l,ic]) => (
                      <button key={v} onClick={()=>setTool(v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{ background:tool===v?`${ACCENT}14`:'#FAFAFA', border:`1px solid ${tool===v?`${ACCENT}40`:'rgba(0,0,0,0.08)'}`, color:tool===v?'#000':'rgba(0,0,0,0.5)' }}>
                        {ic} {l}
                      </button>
                    ))}
                    {tool === 'highlight' && (
                      <div className="flex items-center gap-1.5 ml-1">
                        {['yellow','green','blue','pink'].map(c => (
                          <button key={c} onClick={()=>setHighlightColor(c)}
                            className={cn('w-6 h-6 rounded-full transition-transform', highlightColor===c && 'scale-110 ring-2 ring-black/20')}
                            style={{ background: { yellow:'#FDE047', green:'#86EFAC', blue:'#93C5FD', pink:'#F9A8D4' }[c] }} />
                        ))}
                      </div>
                    )}
                    <div className="flex-1" />
                    <button onClick={undoLast} disabled={!annotations.length} className="p-2 rounded-lg text-black/40 hover:text-black hover:bg-black/[0.04] disabled:opacity-30 transition-colors" aria-label="Undo last">
                      <RotateCcw size={15}/>
                    </button>
                    <button onClick={clearPage} disabled={!annotations.filter(a=>a.page===pageNum-1).length} className="p-2 rounded-lg text-black/40 hover:text-rose-600 hover:bg-black/[0.04] disabled:opacity-30 transition-colors" aria-label="Clear page">
                      <Trash2 size={15}/>
                    </button>
                  </div>

                  {/* Canvas area */}
                  <div className="p-5 flex flex-col items-center gap-4 overflow-auto bg-[#FAFAFA]" style={{ maxHeight: 640 }} ref={containerRef}>
                    <div className="relative inline-block" style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }}>
                      <canvas
                        ref={canvasRef}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        className="rounded-lg shadow-soft-lg"
                        style={{ background: 'white', maxWidth: '100%', display: 'block' }}
                      />
                      {textInput && (
                        <div
                          className="absolute flex items-center gap-1"
                          style={{ left: textInput.x, top: textInput.y - 4 }}
                        >
                          <input
                            autoFocus
                            value={textValue}
                            onChange={e=>setTextValue(e.target.value)}
                            onKeyDown={e=>{ if(e.key==='Enter') confirmText(); if(e.key==='Escape') setTextInput(null); }}
                            placeholder="Type text…"
                            className="px-2 py-1 rounded text-sm text-black"
                            style={{ minWidth: 140, border: `2px solid ${ACCENT}` }}
                          />
                          <button onClick={confirmText} className="p-1 rounded bg-emerald-600 text-white"><Check size={12}/></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Page navigation */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
                    <button onClick={()=>setPageNum(p=>Math.max(1,p-1))} disabled={pageNum<=1}
                      className="p-2 rounded-lg text-black/40 hover:text-black hover:bg-black/[0.04] disabled:opacity-30 transition-colors"><ChevronLeft size={16}/></button>
                    <span className="text-black/45 text-sm">Page {pageNum} of {numPages}</span>
                    <button onClick={()=>setPageNum(p=>Math.min(numPages,p+1))} disabled={pageNum>=numPages}
                      className="p-2 rounded-lg text-black/40 hover:text-black hover:bg-black/[0.04] disabled:opacity-30 transition-colors"><ChevronRight size={16}/></button>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="rounded-2xl p-5 bg-white border border-black/5 shadow-soft">
                    <p className="text-black font-semibold text-sm mb-3">{file?.name}</p>
                    <p className="text-black/40 text-xs mb-4">{numPages} page{numPages!==1?'s':''} · {annotations.length} annotation{annotations.length!==1?'s':''}</p>
                    <motion.button whileTap={{ scale: annotations.length ? 0.97 : 1 }} onClick={applyEdits} disabled={!annotations.length}
                      className={cn('w-full flex items-center justify-center gap-2 rounded-full px-4 py-3 font-medium text-sm transition-all duration-200',
                        annotations.length ? 'bg-black text-white hover:bg-[#222]' : 'bg-black/5 text-black/30 cursor-not-allowed')}>
                      <Download size={15}/> Apply &amp; Download
                    </motion.button>
                  </div>
                  <div className="rounded-2xl p-4 bg-[#FAFAFA] border border-black/5">
                    <p className="text-black/45 text-xs leading-relaxed">
                      <strong className="text-black/70">Highlight:</strong> drag to mark text.<br/>
                      <strong className="text-black/70">Redact:</strong> drag to permanently black-out content.<br/>
                      <strong className="text-black/70">Text:</strong> click and type to add a label.
                    </p>
                  </div>
                  <button onClick={reset} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border border-black/10 text-black/60 hover:bg-black/[0.03] hover:text-black transition-all">
                    <X size={12}/> Cancel and upload different file
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
