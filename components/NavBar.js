'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { TOOL_CATEGORIES } from '../lib/tool-categories';
import {
  Merge, Scissors, FileMinus, FileSearch, Layers, ScanLine, Minimize2, Wrench, Eye,
  FileType, FileText, Image, Presentation, TableProperties, Globe, FileCheck,
  BarChart2, Edit3, RotateCcw, Hash, Droplets, Crop, Shield, Unlock, Lock,
  PenTool, EyeOff, GitCompare, Sparkles, Languages, ChevronDown, ArrowRight,
} from 'lucide-react';

const ICONS = {
  Merge, Scissors, FileMinus, FileSearch, Layers, ScanLine, Minimize2, Wrench, Eye,
  FileType, FileText, Image, Presentation, TableProperties, Globe, FileCheck,
  BarChart2, Edit3, RotateCcw, Hash, Droplets, Crop, Shield, Unlock, Lock,
  PenTool, EyeOff, GitCompare, Sparkles, Languages,
};

function ToolIcon({ name, size = 16, ...rest }) {
  const Comp = ICONS[name] ?? FileText;
  return <Comp size={size} {...rest} />;
}

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

const megaContainerVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.025 } },
  exit: { opacity: 0, y: -6, scale: 0.985, transition: { duration: 0.15, ease: 'easeIn' } },
};

const columnVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

export default function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMegaOpen(false); setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMegaOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openMega = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); setMegaOpen(true); }, []);
  const scheduleClose = useCallback(() => { closeTimer.current = setTimeout(() => setMegaOpen(false), 160); }, []);

  return (
    <header
      className={cn('fixed top-0 inset-x-0 z-50 transition-all duration-300', (scrolled || megaOpen) ? 'glass-nav shadow-soft-md' : 'bg-transparent')}
      style={{ height: 'var(--nav-height)' }}
    >
      <div className="max-w-[88rem] mx-auto px-6 lg:px-8 xl:px-10 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h7l3 3v9H3V2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2v3h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 8h4M6 11h3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-semibold text-[15px] text-black tracking-tight hidden sm:block">DocuForge</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 h-full">
          <div className="relative h-full flex items-center" onMouseEnter={openMega} onMouseLeave={scheduleClose}>
            <button className={cn('nav-link flex items-center gap-1.5', megaOpen && 'active')}
              aria-expanded={megaOpen} aria-haspopup="true" onClick={() => setMegaOpen(v => !v)}>
              All Tools
              <motion.span animate={{ rotate: megaOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={13} />
              </motion.span>
            </button>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-600/15 bg-emerald-50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span className="text-emerald-700 text-xs font-semibold">100% FREE</span>
          </div>
          <Link href="/word-to-pdf" className="btn-brand hidden sm:inline-flex" style={{ padding: '9px 18px', fontSize: '13px' }}>Start Free</Link>
          <button className="md:hidden p-2 rounded-lg text-black/60 hover:text-black hover:bg-black/[0.04] transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></> : <><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></>}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {megaOpen && (
          <motion.div variants={megaContainerVariants} initial="hidden" animate="show" exit="exit"
            onMouseEnter={openMega} onMouseLeave={scheduleClose}
            className="hidden md:block absolute top-full inset-x-0 z-40">
            <div className="mx-auto max-w-[88rem] px-6 lg:px-8 xl:px-10">
              <div className="rounded-3xl overflow-hidden mt-3 bg-white shadow-soft-xl border border-black/5">
                <div className="grid grid-cols-4 gap-0 p-6">
                  {TOOL_CATEGORIES.map((cat) => (
                    <motion.div key={cat.id} variants={columnVariants} className="px-3">
                      <div className="flex items-center gap-2 mb-3.5 px-1">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-black/5 text-black">
                          <ToolIcon name={cat.icon} size={13} />
                        </div>
                        <span className="text-black font-semibold text-[12.5px] tracking-tight">{cat.label}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {cat.tools.map((tool) => (
                          <li key={tool.href}>
                            <Link href={tool.href} className="group flex items-start gap-2.5 px-1.5 py-1.5 rounded-lg transition-colors hover:bg-black/[0.04]">
                              <ToolIcon name={tool.icon} size={14} className="flex-shrink-0 mt-0.5 text-black/40 group-hover:text-black transition-colors" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-black/65 group-hover:text-black text-[12.5px] font-medium transition-colors">{tool.name}</span>
                                  {tool.badge && (
                                    <span className="text-[8.5px] font-bold px-1.5 py-0 rounded-full flex-shrink-0 leading-[14px]"
                                      style={{ background: BADGE_STYLE[tool.badge]?.bg, color: BADGE_STYLE[tool.badge]?.color }}>
                                      {tool.badge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-7 py-3.5 border-t border-black/5 bg-black/[0.015]">
                  <p className="text-black/40 text-xs">30+ tools · always free · no sign-up required</p>
                  <Link href="/#tools" className="flex items-center gap-1.5 text-xs font-semibold text-black hover:text-black/70 transition-colors">
                    Browse full directory <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="md:hidden glass-nav border-t border-black/5 overflow-hidden">
            <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
              {TOOL_CATEGORIES.map((cat) => (
                <div key={cat.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-black/5 text-black">
                      <ToolIcon name={cat.icon} size={11} />
                    </div>
                    <span className="text-black font-semibold text-xs">{cat.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.tools.map((tool) => (
                      <Link key={tool.href} href={tool.href} className="nav-link text-xs px-2.5 py-1.5" onClick={() => setMobileOpen(false)}>{tool.name}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
