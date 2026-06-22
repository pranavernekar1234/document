'use client';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  FileText, FileMinus, FileCheck, FileSearch, Merge, Scissors, Layers, ScanLine,
  Minimize2, Wrench, Eye, TableProperties, Globe, Image as ImageIcon, Presentation, BarChart2,
  Shield, Lock, Unlock, PenTool, EyeOff, GitCompare, Sparkles, Languages,
  Hash, Droplets, Crop, Edit3, ChevronDown, ChevronRight, ArrowRight,
  Star, Check, Zap, RotateCcw
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const spring = { type: 'spring', stiffness: 280, damping: 28 };

const CATEGORIES = [
  {
    id: 'organize', label: 'Organize PDF', accent: '#3B82F6',
    pillBg: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    icon: <Layers size={18} />,
    tools: [
      { name: 'Merge PDF',     desc: 'Combine multiple PDFs into one',          icon: <Merge size={20} />,       href: '/tools/merge-pdf',     badge: 'Popular' },
      { name: 'Split PDF',     desc: 'Separate PDF into multiple files',         icon: <Scissors size={20} />,    href: '/tools/split-pdf' },
      { name: 'Remove Pages',  desc: 'Delete specific pages from a PDF',         icon: <FileMinus size={20} />,   href: '/tools/remove-pages' },
      { name: 'Extract Pages', desc: 'Pull out pages into a new PDF',            icon: <FileSearch size={20} />,  href: '/tools/extract-pages' },
      { name: 'Organize PDF',  desc: 'Rearrange pages in any order',             icon: <Layers size={20} />,      href: '/tools/organize-pdf' },
      { name: 'Scan to PDF',   desc: 'Convert scanned images to PDF',            icon: <ScanLine size={20} />,    href: '/tools/scan-to-pdf',   badge: 'New' },
    ],
  },
  {
    id: 'optimize', label: 'Optimize PDF', accent: '#8B5CF6',
    pillBg: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    icon: <Minimize2 size={18} />,
    tools: [
      { name: 'Compress PDF',  desc: 'Reduce file size without quality loss',    icon: <Minimize2 size={20} />,   href: '/tools/compress-pdf',  badge: 'Popular' },
      { name: 'Repair PDF',    desc: 'Fix corrupted or broken PDF files',        icon: <Wrench size={20} />,      href: '/tools/repair-pdf' },
      { name: 'OCR PDF',       desc: 'Make scanned PDFs searchable',             icon: <Eye size={20} />,         href: '/tools/ocr-pdf',       badge: 'AI' },
    ],
  },
  {
    id: 'convert-to', label: 'Convert to PDF', accent: '#06B6D4',
    pillBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    icon: <FileText size={18} />,
    tools: [
      { name: 'Word to PDF',       desc: 'Convert DOCX to PDF perfectly',       icon: <FileText size={20} />,        href: '/word-to-pdf',         badge: 'Live' },
      { name: 'JPG to PDF',        desc: 'Convert images to PDF',               icon: <ImageIcon size={20} />,       href: '/tools/images-to-pdf' },
      { name: 'PowerPoint to PDF', desc: 'Convert PPTX presentations',          icon: <Presentation size={20} />,    href: '/tools/pptx-to-pdf' },
      { name: 'Excel to PDF',      desc: 'Convert XLSX spreadsheets',           icon: <TableProperties size={20} />, href: '/tools/xlsx-to-pdf' },
      { name: 'HTML to PDF',       desc: 'Convert HTML pages to PDF',           icon: <Globe size={20} />,           href: '/tools/html-to-pdf' },
    ],
  },
  {
    id: 'convert-from', label: 'Convert from PDF', accent: '#A78BFA',
    pillBg: 'bg-purple-400/15 text-purple-300 border-purple-400/25',
    icon: <FileCheck size={18} />,
    tools: [
      { name: 'PDF to Word',       desc: 'Convert PDF to editable DOCX',        icon: <FileText size={20} />,        href: '/pdf-to-word',         badge: 'Live' },
      { name: 'PDF to JPG',        desc: 'Export pages as JPG images',          icon: <ImageIcon size={20} />,       href: '/tools/pdf-to-jpg' },
      { name: 'PDF to PowerPoint', desc: 'Convert PDF to editable PPTX',       icon: <Presentation size={20} />,    href: '/tools/pdf-to-pptx' },
      { name: 'PDF to Excel',      desc: 'Extract tables into XLSX',            icon: <BarChart2 size={20} />,        href: '/tools/pdf-to-xlsx' },
      { name: 'PDF to PDF/A',      desc: 'Convert to archival format',          icon: <FileCheck size={20} />,        href: '/tools/pdf-to-pdfa' },
    ],
  },
  {
    id: 'edit', label: 'Edit PDF', accent: '#F59E0B',
    pillBg: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    icon: <Edit3 size={18} />,
    tools: [
      { name: 'Rotate PDF',       desc: 'Rotate pages to correct orientation',  icon: <RotateCcw size={20} />,   href: '/tools/rotate-pdf' },
      { name: 'Add Page Numbers', desc: 'Insert page numbers anywhere',         icon: <Hash size={20} />,        href: '/tools/add-page-numbers' },
      { name: 'Add Watermark',    desc: 'Stamp text watermarks on pages',       icon: <Droplets size={20} />,    href: '/tools/watermark-pdf' },
      { name: 'Crop PDF',         desc: 'Crop pages to a custom size',          icon: <Crop size={20} />,        href: '/tools/crop-pdf' },
      { name: 'Edit PDF',         desc: 'Annotate, highlight, and redact',      icon: <Edit3 size={20} />,       href: '/tools/edit-pdf', badge: 'New' },
    ],
  },
  {
    id: 'security', label: 'PDF Security', accent: '#22C55E',
    pillBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    icon: <Shield size={18} />,
    tools: [
      { name: 'Unlock PDF',  desc: 'Remove password protection',               icon: <Unlock size={20} />,     href: '/tools/unlock-pdf' },
      { name: 'Protect PDF', desc: 'Add password encryption',                  icon: <Lock size={20} />,       href: '/tools/protect-pdf' },
      { name: 'Sign PDF',    desc: 'Add digital signatures',                   icon: <PenTool size={20} />,    href: '/tools/sign-pdf',    badge: 'Popular' },
      { name: 'Redact PDF',  desc: 'Permanently remove sensitive content',     icon: <EyeOff size={20} />,     href: '/tools/redact-pdf' },
      { name: 'Compare PDF', desc: 'Detect changes between two PDFs',          icon: <GitCompare size={20} />, href: '/tools/compare-pdf' },
    ],
  },
  {
    id: 'ai', label: 'PDF Intelligence', accent: '#EC4899',
    pillBg: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
    icon: <Sparkles size={18} />,
    tools: [
      { name: 'AI Summarizer',  desc: 'Instantly summarize any PDF',           icon: <Sparkles size={20} />,   href: '/tools/ai-summarizer', badge: 'AI' },
      { name: 'Translate PDF',  desc: 'Translate PDFs to 100+ languages',      icon: <Languages size={20} />,  href: '/tools/translate-pdf', badge: 'AI' },
    ],
  },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen',  role: 'Product Manager · Linear',  text: 'DocuForge replaced three separate tools for us. Nothing gets lost in translation and everything is completely free.', stars: 5 },
  { name: 'Marcus Webb', role: 'Founder · Stripe',           text: 'We process thousands of contracts monthly. The merge and split tools are rock solid. And it costs us nothing.', stars: 5 },
  { name: 'Priya Nair',  role: 'Operations Lead · Vercel',   text: 'Word→PDF fidelity is unmatched. Tables, fonts, images — all perfect. Cannot believe this is free.', stars: 5 },
];

const FAQS = [
  { q: 'Is DocuForge completely free?',                a: 'Yes — every single tool on DocuForge is free. No paywalls, no watermarks, no account required. Ever.' },
  { q: 'Are my files stored on your servers?',         a: 'Never. Files are processed entirely in memory and permanently discarded immediately after your conversion completes.' },
  { q: 'What is the maximum file size?',               a: 'You can upload files up to 50 MB per tool. For merge operations, you can combine up to 20 files.' },
  { q: 'How accurate is the PDF to Word conversion?',  a: 'Very accurate. Our engine preserves margins, tables, fonts, embedded images, headers, footers, and page numbers.' },
  { q: 'What tools use AI?',                           a: 'AI Summarizer, Translate PDF, and OCR PDF use AI-powered processing. All other tools use direct PDF processing libraries.' },
  { q: 'Do you have an API?',                          a: 'Not yet publicly — but reach out if you need bulk processing. Our architecture supports it and we are working on an API.' },
];

export default function HomePage() {
  return (
    <div className="bg-slate-900 overflow-x-hidden">
      <HeroSection />
      <TrustedBySection />
      <ToolsSection />
      <AISection />
      <WorkflowSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#080e1c 0%,#0F172A 65%,#0F172A 100%)' }}>
      <div className="absolute inset-0 bg-grid-dark opacity-100 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black_40%,transparent_100%)]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale:[1,1.15,1], opacity:[0.25,0.45,0.25] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background:'radial-gradient(circle,rgba(37,99,235,0.22) 0%,transparent 70%)', filter:'blur(60px)' }} />
        <motion.div animate={{ scale:[1.1,1,1.1], opacity:[0.18,0.35,0.18] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }}
          className="absolute top-20 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)', filter:'blur(80px)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center lg:text-left">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-widest uppercase mb-6">
            <Sparkles size={11} /> 30+ tools · Always free
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-hero font-black tracking-tight text-white leading-[1.04] mb-6">
            All Your PDF Tools{' '}<span className="gradient-text">in One Place</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-slate-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
            Convert, edit, organize, secure and automate PDFs with powerful AI-driven tools. Completely free. No account needed.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
            <Link href="/word-to-pdf" className="btn-brand" style={{ padding:'14px 28px', fontSize:'15px' }}>
              <Zap size={16} /> Start Free
            </Link>
            <a href="#tools" className="btn-ghost" style={{ padding:'14px 28px', fontSize:'15px' }}>
              Explore Tools <ChevronRight size={16} />
            </a>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center lg:justify-start">
            {['No account required','50 MB limit','Zero storage','Always free'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-slate-500 text-sm">
                <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Check size={9} className="text-emerald-400" />
                </div>{t}
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.8, ease:[0.16,1,0.3,1], delay:0.2 }} className="hidden lg:block">
          <HeroPipelineMockup />
        </motion.div>
      </div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-600"
        animate={{ y:[0,5,0] }} transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}>
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <ChevronDown size={14} />
      </motion.div>
    </section>
  );
}

function HeroPipelineMockup() {
  return (
    <div className="relative w-full" style={{ height:460 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-60 h-60 rounded-full border border-white/4" />
        <div className="absolute w-44 h-44 rounded-full border border-white/4" />
      </div>
      <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}
        className="absolute left-0 top-8 glass-bright rounded-2xl p-5 w-48 shadow-card-dark"
        style={{ border:'1px solid rgba(37,99,235,0.25)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <FileText size={15} className="text-blue-400" />
          </div>
          <div><p className="text-white font-semibold text-xs">report.docx</p><p className="text-slate-500 text-[10px]">Word · 2.4 MB</p></div>
        </div>
        {[100,82,94,68,88].map((w,i) => <div key={i} className="h-1.5 rounded-full bg-slate-800 mb-1.5 last:mb-0" style={{ width:`${w}%` }} />)}
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ boxShadow:['0 0 20px rgba(37,99,235,0.3)','0 0 45px rgba(124,58,237,0.4)','0 0 20px rgba(37,99,235,0.3)'] }}
          transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
          className="w-20 h-20 rounded-3xl bg-brand-gradient flex flex-col items-center justify-center gap-1 z-10">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M3 2h7l3 3v9H3V2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 2v3h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 8h4M6 11h3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-white text-[8px] font-bold tracking-wider">FORGE</span>
        </motion.div>
      </div>

      {[0,60,120,180,240,300].map((deg,i) => (
        <motion.div key={i} className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate:[deg, deg+360] }} transition={{ duration:9, repeat:Infinity, ease:'linear', delay:i*0.35 }}>
          <div className="relative w-60 h-60">
            <div className="absolute w-2 h-2 rounded-full" style={{
              top:0, left:'50%', transform:'translateX(-50%)',
              background:['#3B82F6','#8B5CF6','#06B6D4','#22C55E','#F59E0B','#EC4899'][i],
              boxShadow:`0 0 8px ${['rgba(59,130,246,0.8)','rgba(139,92,246,0.8)','rgba(6,182,212,0.8)','rgba(34,197,94,0.8)','rgba(245,158,11,0.8)','rgba(236,72,153,0.8)'][i]}`
            }} />
          </div>
        </motion.div>
      ))}

      <motion.div animate={{ y:[0,10,0] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut', delay:1 }}
        className="absolute right-0 top-8 glass-bright rounded-2xl p-5 w-48 shadow-card-dark"
        style={{ border:'1px solid rgba(34,197,94,0.2)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <FileCheck size={15} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-xs">report.pdf</p>
            <p className="text-slate-500 text-[10px]">PDF · 1.8 MB · Ready</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={9} className="text-white" />
          </div>
        </div>
        {[100,82,94,68,88].map((w,i) => (
          <div key={i} className="h-1.5 rounded-full bg-emerald-500/10 mb-1.5 last:mb-0"
            style={{ width:`${w}%`, background:i===0?'linear-gradient(90deg,rgba(34,197,94,0.3),rgba(6,182,212,0.3))':undefined }} />
        ))}
      </motion.div>

      <motion.div animate={{ y:[0,-5,0] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut', delay:2 }}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 glass-bright rounded-xl px-4 py-2 flex items-center gap-2.5 whitespace-nowrap shadow-card-dark">
        <div className="w-5 h-5 rounded-lg bg-violet-gradient flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-white text-xs font-semibold">Layout preserved 100%</span>
      </motion.div>
    </div>
  );
}

function TrustedBySection() {
  const logos = ['Notion','Figma','Stripe','Vercel','Linear','Supabase','Resend','Lemon Squeezy'];
  return (
    <section className="border-y border-white/5 py-12" style={{ background:'rgba(255,255,255,0.02)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p className="text-center text-slate-600 text-xs font-semibold tracking-widest uppercase mb-7">
          Trusted by teams at fast-growing companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map(n => (
            <motion.div key={n} whileHover={{ scale:1.06, opacity:1 }}
              className="text-slate-700 hover:text-slate-400 font-bold text-base tracking-tight transition-all duration-200 cursor-default select-none">
              {n}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsSection() {
  const [open, setOpen] = useState(new Set(['organize','convert-to','convert-from']));
  const toggle = id => setOpen(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  return (
    <section id="tools" className="py-24 relative">
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-5">
            <Layers size={12} /> Complete PDF Toolkit
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-black text-white tracking-tight mb-4">
            Every tool you need,<br /><span className="gradient-text-cyan">all completely free</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-lg max-w-xl mx-auto">
            30+ professional PDF tools across 7 categories. No sign-up. No limits. No cost.
          </motion.p>
        </motion.div>

        <div className="space-y-3">
          {CATEGORIES.map((cat, ci) => (
            <motion.div key={cat.id}
              initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:ci*0.055, duration:0.45, ease:[0.16,1,0.3,1] }}
              className="glass rounded-2xl border border-white/6 overflow-hidden">
              <button onClick={() => toggle(cat.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors group"
                aria-expanded={open.has(cat.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background:`${cat.accent}18`, border:`1px solid ${cat.accent}30`, color:cat.accent }}>
                    {cat.icon}
                  </div>
                  <span className="font-bold text-white text-[15px]">{cat.label}</span>
                  <span className={`category-pill border ${cat.pillBg}`}>{cat.tools.length} tools</span>
                </div>
                <motion.div animate={{ rotate:open.has(cat.id)?180:0 }} transition={{ duration:0.22 }}>
                  <ChevronDown size={17} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open.has(cat.id) && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }} transition={{ duration:0.32, ease:[0.16,1,0.3,1] }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-white/5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4">
                        {cat.tools.map((tool,ti) => <ToolCard key={ti} tool={tool} accent={cat.accent} />)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolCard({ tool, accent }) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const bg = useTransform([x,y],([mx,my]) => `radial-gradient(360px circle at ${mx}px ${my}px, ${accent}16, transparent 55%)`);
  const onMove = e => { if(!ref.current) return; const r=ref.current.getBoundingClientRect(); x.set(e.clientX-r.left); y.set(e.clientY-r.top); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} whileHover={{ y:-2, scale:1.015 }} transition={spring}>
      <Link href={tool.href || '#'}
        className="relative block rounded-xl p-3.5 overflow-hidden group cursor-pointer"
        style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background:bg }} />
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow:`inset 0 0 0 1px ${accent}28` }} />
        <div className="relative flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110"
            style={{ background:`${accent}14`, border:`1px solid ${accent}22`, color:accent }}>
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-white font-semibold text-[13px] truncate">{tool.name}</p>
              {tool.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{
                  background:tool.badge==='AI'?'rgba(236,72,153,0.15)':tool.badge==='New'?'rgba(34,197,94,0.15)':'rgba(37,99,235,0.2)',
                  color:tool.badge==='AI'?'#f472b6':tool.badge==='New'?'#4ade80':'#60a5fa'
                }}>{tool.badge}</span>
              )}
            </div>
            <p className="text-slate-500 text-[11px] leading-snug">{tool.desc}</p>
          </div>
          <ArrowRight size={13} className="text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
        </div>
      </Link>
    </motion.div>
  );
}

function AISection() {
  const features = [
    { title:'AI PDF Summarizer',     desc:'Get instant summaries, key points, and executive overviews of any PDF document.',       icon:<Sparkles size={20}/>,   accent:'#EC4899', href:'/tools/ai-summarizer',  gradient:'from-pink-600/25 to-violet-600/15' },
    { title:'AI PDF Translator',     desc:'Translate entire PDFs to 100+ languages while preserving the original layout.',          icon:<Languages size={20}/>,  accent:'#3B82F6', href:'/tools/translate-pdf',  gradient:'from-blue-600/25 to-cyan-600/15' },
    { title:'AI Smart OCR',          desc:'Convert scanned documents into searchable, editable text with 99%+ accuracy.',           icon:<Eye size={20}/>,        accent:'#8B5CF6', href:'/tools/ocr-pdf',         gradient:'from-violet-600/25 to-pink-600/15' },
  ];
  return (
    <section className="py-24 relative overflow-hidden" style={{ background:'linear-gradient(180deg,#0F172A 0%,#0c1220 50%,#0F172A 100%)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15"
          style={{ background:'radial-gradient(circle,rgba(124,58,237,0.3) 0%,transparent 70%)', filter:'blur(80px)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-500/25 bg-pink-500/10 text-pink-400 text-xs font-semibold tracking-widest uppercase mb-5">
            <Sparkles size={11} /> Powered by AI
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-black text-white tracking-tight mb-4">
            Intelligence in<br /><span className="gradient-text">every workflow</span>
          </motion.h2>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map((f,i) => (
            <motion.div key={f.title}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.09, duration:0.5, ease:[0.16,1,0.3,1] }}
              whileHover={{ y:-5 }} className="relative rounded-3xl p-6 overflow-hidden group"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background:`${f.accent}16`, border:`1px solid ${f.accent}28`, color:f.accent }}>
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-[15px] mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{f.desc}</p>
                <Link href={f.href} className="inline-flex items-center gap-1 text-sm font-semibold transition-all" style={{ color:f.accent }}>
                  Try it free <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    { n:'01', title:'Upload your file',     desc:'Drag and drop or click to browse. Up to 50 MB.' },
    { n:'02', title:'Configure options',    desc:'Set your preferences for the specific tool.' },
    { n:'03', title:'Process instantly',    desc:'Our engine processes in seconds with full fidelity.' },
    { n:'04', title:'Download your result', desc:'File delivered directly to your browser. Done.' },
  ];
  return (
    <section className="py-24 border-y border-white/5" style={{ background:'rgba(255,255,255,0.01)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.h2 variants={fadeUp} className="text-section font-black text-white tracking-tight mb-4">
            Upload to download<br /><span className="gradient-text-brand">in four steps</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-lg">No sign-up. No watermarks. No limits.</motion.p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          {steps.map((step,i) => (
            <motion.div key={i} initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.1, duration:0.45 }} className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl glass border border-white/7 flex items-center justify-center mb-5 relative z-10">
                <span className="gradient-text font-black text-2xl tracking-tighter">{step.n}</span>
              </div>
              <h3 className="font-bold text-white text-[15px] mb-2">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const [active, setActive] = useState(0);
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-12">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 mb-4">
            {[...Array(5)].map((_,i) => <Star key={i} size={15} className="text-amber-400 fill-amber-400" />)}
            <span className="text-slate-400 text-sm ml-2">4.9 from 12,000+ reviews</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-black text-white tracking-tight">
            Loved by <span className="gradient-text">teams everywhere</span>
          </motion.h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t,i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.09 }} whileHover={{ y:-4 }} onClick={() => setActive(i)}
              className="glass-bright rounded-3xl p-7 cursor-pointer transition-all duration-200"
              style={{ border:`1px solid ${active===i?'rgba(37,99,235,0.3)':'rgba(255,255,255,0.07)'}` }}>
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.stars)].map((_,j) => <Star key={j} size={12} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-slate-300 text-[14px] leading-relaxed mb-6">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{t.name[0]}</div>
                <div><p className="text-white font-semibold text-sm">{t.name}</p><p className="text-slate-500 text-xs">{t.role}</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState(null);
  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-12">
          <motion.h2 variants={fadeUp} className="text-section font-black text-white tracking-tight">
            Frequently asked <span className="gradient-text">questions</span>
          </motion.h2>
        </motion.div>
        <div className="space-y-2.5">
          {FAQS.map((faq,i) => (
            <motion.div key={i} initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.06 }} className="glass rounded-2xl border border-white/6 overflow-hidden">
              <button onClick={() => setOpen(open===i?null:i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left group" aria-expanded={open===i}>
                <span className="font-semibold text-white text-[14px] pr-4">{faq.q}</span>
                <motion.div animate={{ rotate:open===i?180:0 }} transition={{ duration:0.2 }}>
                  <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open===i && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }} transition={{ duration:0.28, ease:[0.16,1,0.3,1] }}>
                    <p className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-28 relative overflow-hidden" style={{ background:'linear-gradient(180deg,#0F172A 0%,#080e1c 100%)' }}>
      <div className="absolute inset-0 bg-grid-dark opacity-35" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[350px] rounded-full opacity-20"
          style={{ background:'radial-gradient(ellipse,rgba(37,99,235,0.5) 0%,rgba(124,58,237,0.3) 50%,transparent 70%)', filter:'blur(80px)' }} />
      </div>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}
        className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div variants={fadeUp}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-widest uppercase mb-6">
          <Zap size={11} /> Completely free · No account needed
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-hero font-black text-white tracking-tight mb-6">
          Ready to transform<br /><span className="gradient-text">your PDF workflow?</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-slate-400 text-xl mb-10 max-w-xl mx-auto">
          Drop your file, get your result. Free forever.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/word-to-pdf" className="btn-brand" style={{ padding:'16px 36px', fontSize:'16px' }}>
            <Zap size={17} /> Start Free Now
          </Link>
          <a href="#tools" className="btn-ghost" style={{ padding:'16px 36px', fontSize:'16px' }}>
            Browse All Tools <ChevronRight size={17} />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
