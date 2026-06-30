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

// Uniform solid-black pill across every badge type — no per-category hues,
// matching the site-wide monochrome system. Kept as a lookup object (rather
// than a single literal) so badge differentiation can be reintroduced later
// without touching the render call site.
const BADGE_STYLE = {
  AI:      { bg: '#000000', color: '#FFFFFF' },
  New:     { bg: '#000000', color: '#FFFFFF' },
  Live:    { bg: '#000000', color: '#FFFFFF' },
  Popular: { bg: '#000000', color: '#FFFFFF' },
};

const CATEGORIES = [
  {
    id: 'organize', label: 'Organize PDF',
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
    id: 'optimize', label: 'Optimize PDF',
    icon: <Minimize2 size={18} />,
    tools: [
      { name: 'Compress PDF',  desc: 'Reduce file size without quality loss',    icon: <Minimize2 size={20} />,   href: '/tools/compress-pdf',  badge: 'Popular' },
      { name: 'Repair PDF',    desc: 'Fix corrupted or broken PDF files',        icon: <Wrench size={20} />,      href: '/tools/repair-pdf' },
      { name: 'OCR PDF',       desc: 'Make scanned PDFs searchable',             icon: <Eye size={20} />,         href: '/tools/ocr-pdf',       badge: 'AI' },
    ],
  },
  {
    id: 'convert-to', label: 'Convert to PDF',
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
    id: 'convert-from', label: 'Convert from PDF',
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
    id: 'edit', label: 'Edit PDF',
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
    id: 'security', label: 'PDF Security',
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
    id: 'ai', label: 'PDF Intelligence',
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
    <div className="bg-[#F5F5F5] overflow-x-hidden">
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

/* ── ARROW-CHIP BUTTON ─────────────────────────────────────────────────────────
   The decorated primary CTA from the brief's "BUTTON DESIGN" spec: black pill,
   white circular arrow chip, scale-up on hover. Reserved for the two
   hero-level moments on the page; every other CTA uses the plain .btn-brand
   pill so the whole app still reads as "one button style." */
function ArrowChipButton({ href, children, size = 'lg', invert = false }) {
  const pad = size === 'lg' ? 'pl-7 pr-2 py-2' : 'pl-6 pr-1.5 py-1.5';
  const chip = size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  return (
    <Link href={href}
      className={[
        'group inline-flex items-center gap-4 rounded-full font-medium transition-all duration-200 hover:scale-[1.03]',
        size === 'lg' ? 'text-[16px]' : 'text-[15px]',
        pad,
        invert ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-[#222]',
      ].join(' ')}>
      {children}
      <span className={cnChip(chip, invert)}>
        <ArrowRight size={16} className={invert ? 'text-white' : 'text-black'} />
      </span>
    </Link>
  );
}
function cnChip(size, invert) {
  return `${size} rounded-full flex items-center justify-center transition-colors ${invert ? 'bg-black group-hover:bg-[#1a1a1a]' : 'bg-white group-hover:bg-gray-100'}`;
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#F5F5F5]">
      <div className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black_40%,transparent_100%)]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale:[1,1.1,1], opacity:[0.5,0.8,0.5] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background:'radial-gradient(circle,rgba(0,0,0,0.035) 0%,transparent 70%)', filter:'blur(60px)' }} />
      </div>

      <div className="relative max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center lg:text-left">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/8 bg-white text-black/60 text-xs font-semibold tracking-widest uppercase mb-6 shadow-soft">
            <Sparkles size={11} /> 30+ tools · Always free
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-hero font-semibold tracking-tight text-black leading-[1.04] mb-6">
            All Your PDF Tools{' '}<span className="gradient-text">in One Place</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-black/55 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
            Convert, edit, organize, secure and automate PDFs with powerful AI-driven tools. Completely free. No account needed.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10 items-center">
            <ArrowChipButton href="/word-to-pdf">Start Free</ArrowChipButton>
            <a href="#tools" className="btn-ghost bg-white" style={{ padding:'14px 28px', fontSize:'15px' }}>
              Explore Tools <ChevronRight size={16} />
            </a>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center lg:justify-start">
            {['No account required','50 MB limit','Zero storage','Always free'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-black/45 text-sm">
                <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Check size={9} className="text-emerald-600" />
                </div>{t}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Root cause of the "hero animation missing on mobile" bug: this used
            to be wrapped in `hidden lg:block`, i.e. `display:none` below the
            1024px breakpoint — Framer Motion's animate prop never had a
            chance to run because the element didn't exist in the DOM at all
            on phones/tablets. Fix: keep it mounted everywhere and scale the
            whole graphic down with a single GPU-friendly `transform: scale()`
            per breakpoint instead of hiding it. The outer box's height is
            sized to match each tier's scaled output so no extra blank space
            is introduced; `overflow-hidden` is a safety clip for the
            scaled-down tiers and is inert at lg (content already fits
            exactly), so desktop renders pixel-identical to before.

            Centering: `scale()` repaints around the element's OWN center,
            computed from its *unscaled* layout box (460px), not the shorter
            wrapper around it. With `mx-auto` + default top-alignment the
            460px box's own center sat well below/right of the wrapper's
            true center, so every tier scaled toward the wrong point —
            shifted down, clipped at the bottom, off-center sideways on
            narrow phones (a fixed-width box wider than its column makes
            `margin:auto` resolve to 0, not centered, per the CSS spec).
            Fix: make the wrapper a real flex-centering context so the
            460px box's center is always pinned to the wrapper's center
            regardless of any size mismatch — `shrink-0` keeps the box at
            its full conceptual width instead of being flex-shrunk (its
            children are all `absolute`, so without it the box's
            min-content width is ~0 and flexbox would crush it). */}
        <motion.div initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.8, ease:[0.16,1,0.3,1], delay:0.2 }}
          className="relative w-full flex items-center justify-center overflow-hidden lg:overflow-visible h-[268px] sm:h-[314px] md:h-[378px] lg:h-auto">
          <div className="w-[460px] lg:w-full shrink-0 origin-center scale-[0.58] sm:scale-[0.68] md:scale-[0.82] lg:scale-100 will-change-transform">
            <HeroPipelineMockup />
          </div>
        </motion.div>
      </div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-black/30"
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
        <div className="w-60 h-60 rounded-full border border-black/[0.06]" />
        <div className="absolute w-44 h-44 rounded-full border border-black/[0.06]" />
      </div>
      <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}
        className="absolute left-0 top-8 rounded-2xl p-5 w-48 bg-white border border-black/5 shadow-soft-lg">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText size={15} className="text-blue-600" />
          </div>
          <div><p className="text-black font-semibold text-xs">report.docx</p><p className="text-black/40 text-[10px]">Word · 2.4 MB</p></div>
        </div>
        {[100,82,94,68,88].map((w,i) => <div key={i} className="h-1.5 rounded-full bg-black/[0.06] mb-1.5 last:mb-0" style={{ width:`${w}%` }} />)}
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ boxShadow:['0 8px 24px rgba(0,0,0,0.12)','0 16px 40px rgba(0,0,0,0.18)','0 8px 24px rgba(0,0,0,0.12)'] }}
          transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
          className="w-20 h-20 rounded-3xl bg-black flex flex-col items-center justify-center gap-1 z-10">
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
              boxShadow:'0 2px 6px rgba(0,0,0,0.25)'
            }} />
          </div>
        </motion.div>
      ))}

      <motion.div animate={{ y:[0,10,0] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut', delay:1 }}
        className="absolute right-0 top-8 rounded-2xl p-5 w-48 bg-white border border-black/5 shadow-soft-lg">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileCheck size={15} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-black font-semibold text-xs">report.pdf</p>
            <p className="text-black/40 text-[10px]">PDF · 1.8 MB · Ready</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
            <Check size={9} className="text-white" />
          </div>
        </div>
        {[100,82,94,68,88].map((w,i) => (
          <div key={i} className="h-1.5 rounded-full bg-emerald-50 mb-1.5 last:mb-0"
            style={{ width:`${w}%`, background:i===0?'#A7F3D0':undefined }} />
        ))}
      </motion.div>

      <motion.div animate={{ y:[0,-5,0] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut', delay:2 }}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 flex items-center gap-2.5 whitespace-nowrap bg-white border border-black/5 shadow-soft-lg">
        <div className="w-5 h-5 rounded-lg bg-black flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-black text-xs font-semibold">Layout preserved 100%</span>
      </motion.div>
    </div>
  );
}

function TrustedBySection() {
  const logos = ['Notion','Figma','Stripe','Vercel','Linear','Supabase','Resend','Lemon Squeezy'];
  return (
    <section className="border-y border-black/5 py-12 bg-white">
      <div className="max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10">
        <p className="text-center text-black/35 text-xs font-semibold tracking-widest uppercase mb-7">
          Trusted by teams at fast-growing companies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map(n => (
            <motion.div key={n} whileHover={{ scale:1.06 }}
              className="text-black/25 hover:text-black/60 font-semibold text-base tracking-tight transition-all duration-200 cursor-default select-none">
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
    <section id="tools" className="py-24 relative bg-[#F5F5F5]">
      <div className="relative max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/8 bg-white text-black/60 text-xs font-semibold tracking-widest uppercase mb-5 shadow-soft">
            <Layers size={12} /> Complete PDF Toolkit
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-semibold text-black tracking-tight mb-4">
            Every tool you need,<br /><span className="gradient-text">all completely free</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-black/55 text-lg max-w-xl mx-auto">
            30+ professional PDF tools across 7 categories. No sign-up. No limits. No cost.
          </motion.p>
        </motion.div>

        <div className="space-y-3">
          {CATEGORIES.map((cat, ci) => (
            <motion.div key={cat.id}
              initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:ci*0.055, duration:0.45, ease:[0.16,1,0.3,1] }}
              className="rounded-2xl border border-black/5 bg-white shadow-soft overflow-hidden">
              <button onClick={() => toggle(cat.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-black/[0.015] transition-colors group"
                aria-expanded={open.has(cat.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 text-black">
                    {cat.icon}
                  </div>
                  <span className="font-semibold text-black text-[15px]">{cat.label}</span>
                  <span className="category-pill border bg-white text-black border-[#E5E5E5]">{cat.tools.length} tools</span>
                </div>
                <motion.div animate={{ rotate:open.has(cat.id)?180:0 }} transition={{ duration:0.22 }}>
                  <ChevronDown size={17} className="text-black/35 group-hover:text-black/60 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open.has(cat.id) && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }} transition={{ duration:0.32, ease:[0.16,1,0.3,1] }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-black/5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4">
                        {cat.tools.map((tool,ti) => <ToolCard key={ti} tool={tool} />)}
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

function ToolCard({ tool }) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const bg = useTransform([x,y],([mx,my]) => `radial-gradient(360px circle at ${mx}px ${my}px, rgba(0,0,0,0.05), transparent 55%)`);
  const onMove = e => { if(!ref.current) return; const r=ref.current.getBoundingClientRect(); x.set(e.clientX-r.left); y.set(e.clientY-r.top); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} whileHover={{ y:-2, scale:1.015 }} transition={spring}>
      <Link href={tool.href || '#'}
        className="relative block rounded-xl p-3.5 overflow-hidden group cursor-pointer bg-white border border-black/5 hover:shadow-soft-md transition-shadow duration-200">
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background:bg }} />
        <div className="relative flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 bg-black/5 text-black">
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-black font-semibold text-[13px] truncate">{tool.name}</p>
              {tool.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background:BADGE_STYLE[tool.badge]?.bg, color:BADGE_STYLE[tool.badge]?.color }}>{tool.badge}</span>
              )}
            </div>
            <p className="text-black/40 text-[11px] leading-snug">{tool.desc}</p>
          </div>
          <ArrowRight size={13} className="text-black/20 group-hover:text-black/55 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
        </div>
      </Link>
    </motion.div>
  );
}

function AISection() {
  const features = [
    { title:'AI PDF Summarizer',     desc:'Get instant summaries, key points, and executive overviews of any PDF document.',       icon:<Sparkles size={20}/>,   href:'/tools/ai-summarizer' },
    { title:'AI PDF Translator',     desc:'Translate entire PDFs to 100+ languages while preserving the original layout.',          icon:<Languages size={20}/>,  href:'/tools/translate-pdf' },
    { title:'AI Smart OCR',          desc:'Convert scanned documents into searchable, editable text with 99%+ accuracy.',           icon:<Eye size={20}/>,        href:'/tools/ocr-pdf' },
  ];
  return (
    <section className="py-24 relative overflow-hidden bg-[#F5F5F5]">
      <div className="relative max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/8 bg-white text-black/60 text-xs font-semibold tracking-widest uppercase mb-5 shadow-soft">
            <Sparkles size={11} /> Powered by AI
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-semibold text-black tracking-tight mb-4">
            Intelligence in<br /><span className="gradient-text">every workflow</span>
          </motion.h2>
        </motion.div>
        {/* Signature element for this section: dark "ink" cards (#2B2644) lift
            the three AI tools out of the otherwise all-white page, the one
            deliberate accent moment the brief's "Dark cards" token was made for. */}
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map((f,i) => (
            <motion.div key={f.title}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.09, duration:0.5, ease:[0.16,1,0.3,1] }}
              whileHover={{ y:-5 }} className="relative rounded-3xl p-6 overflow-hidden group bg-[#2B2644] shadow-soft-lg">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 bg-white/10 text-white">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-[15px] mb-2">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed mb-4">{f.desc}</p>
                <Link href={f.href} className="inline-flex items-center gap-1 text-sm font-semibold transition-all text-white hover:text-white/75">
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
    <section className="py-24 border-y border-black/5 bg-white">
      <div className="max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-14">
          <motion.h2 variants={fadeUp} className="text-section font-semibold text-black tracking-tight mb-4">
            Upload to download<br /><span className="gradient-text">in four steps</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-black/55 text-lg">No sign-up. No watermarks. No limits.</motion.p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
          {steps.map((step,i) => (
            <motion.div key={i} initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.1, duration:0.45 }} className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-white border border-black/5 shadow-soft flex items-center justify-center mb-5 relative z-10">
                <span className="text-black font-semibold text-2xl tracking-tighter">{step.n}</span>
              </div>
              <h3 className="font-semibold text-black text-[15px] mb-2">{step.title}</h3>
              <p className="text-black/45 text-sm leading-relaxed">{step.desc}</p>
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
    <section className="py-24 bg-[#F5F5F5]">
      <div className="max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-12">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 mb-4">
            {[...Array(5)].map((_,i) => <Star key={i} size={15} className="text-black fill-black" />)}
            <span className="text-black/45 text-sm ml-2">4.9 from 12,000+ reviews</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-section font-semibold text-black tracking-tight">
            Loved by <span className="gradient-text">teams everywhere</span>
          </motion.h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t,i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.09 }} whileHover={{ y:-4 }} onClick={() => setActive(i)}
              className="rounded-3xl p-7 cursor-pointer transition-all duration-200 bg-white shadow-soft hover:shadow-soft-md"
              style={{ border:`1px solid ${active===i?'rgba(0,0,0,0.18)':'rgba(0,0,0,0.05)'}` }}>
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.stars)].map((_,j) => <Star key={j} size={12} className="text-black fill-black" />)}
              </div>
              <p className="text-black/65 text-[14px] leading-relaxed mb-6">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{t.name[0]}</div>
                <div><p className="text-black font-semibold text-sm">{t.name}</p><p className="text-black/40 text-xs">{t.role}</p></div>
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
    <section className="py-24 border-t border-black/5 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }} className="text-center mb-12">
          <motion.h2 variants={fadeUp} className="text-section font-semibold text-black tracking-tight">
            Frequently asked <span className="gradient-text">questions</span>
          </motion.h2>
        </motion.div>
        <div className="space-y-2.5">
          {FAQS.map((faq,i) => (
            <motion.div key={i} initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.06 }} className="rounded-2xl border border-black/5 bg-[#FAFAFA] overflow-hidden">
              <button onClick={() => setOpen(open===i?null:i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left group" aria-expanded={open===i}>
                <span className="font-semibold text-black text-[14px] pr-4">{faq.q}</span>
                <motion.div animate={{ rotate:open===i?180:0 }} transition={{ duration:0.2 }}>
                  <ChevronDown size={16} className="text-black/35 group-hover:text-black/60 transition-colors flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open===i && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }} transition={{ duration:0.28, ease:[0.16,1,0.3,1] }}>
                    <p className="px-6 pb-5 text-black/55 text-sm leading-relaxed border-t border-black/5 pt-4">{faq.a}</p>
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
    <section className="py-28 relative overflow-hidden bg-[#2B2644]">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[350px] rounded-full opacity-60"
          style={{ background:'radial-gradient(ellipse,rgba(255,255,255,0.08) 0%,transparent 70%)', filter:'blur(60px)' }} />
      </div>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}
        className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div variants={fadeUp}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/10 text-white text-xs font-semibold tracking-widest uppercase mb-6">
          <Zap size={11} /> Completely free · No account needed
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-hero font-semibold text-white tracking-tight mb-6">
          Ready to transform<br />your PDF workflow?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-white/60 text-xl mb-10 max-w-xl mx-auto">
          Drop your file, get your result. Free forever.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <ArrowChipButton href="/word-to-pdf" invert>Start Free Now</ArrowChipButton>
          <a href="#tools" className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white px-7 py-3.5 text-[16px] font-medium hover:bg-white/10 transition-all duration-200">
            Browse All Tools <ChevronRight size={17} />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
