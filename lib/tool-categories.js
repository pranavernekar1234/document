/**
 * @file lib/tool-categories.js
 * Single source of truth for the tool category structure.
 * Used by both the homepage tools grid and the navbar mega menu.
 *
 * Icons are NOT included here (kept as plain data) — components
 * importing this map icon names to actual lucide-react components.
 */

export const TOOL_CATEGORIES = [
  {
    id: 'organize', label: 'Organize PDF', accent: '#3B82F6', icon: 'Layers',
    tools: [
      { name: 'Merge PDF',     desc: 'Combine multiple PDFs into one',  icon: 'Merge',     href: '/tools/merge-pdf',     badge: 'Popular' },
      { name: 'Split PDF',     desc: 'Separate PDF into multiple files', icon: 'Scissors',  href: '/tools/split-pdf' },
      { name: 'Remove Pages',  desc: 'Delete specific pages from a PDF', icon: 'FileMinus', href: '/tools/remove-pages' },
      { name: 'Extract Pages', desc: 'Pull out pages into a new PDF',    icon: 'FileSearch',href: '/tools/extract-pages' },
      { name: 'Organize PDF',  desc: 'Rearrange pages in any order',     icon: 'Layers',    href: '/tools/organize-pdf' },
      { name: 'Scan to PDF',   desc: 'Convert scanned images to PDF',    icon: 'ScanLine',  href: '/tools/scan-to-pdf',  badge: 'New' },
    ],
  },
  {
    id: 'optimize', label: 'Optimize PDF', accent: '#8B5CF6', icon: 'Minimize2',
    tools: [
      { name: 'Compress PDF', desc: 'Reduce file size without quality loss', icon: 'Minimize2', href: '/tools/compress-pdf', badge: 'Popular' },
      { name: 'Repair PDF',   desc: 'Fix corrupted or broken PDF files',     icon: 'Wrench',    href: '/tools/repair-pdf' },
      { name: 'OCR PDF',      desc: 'Make scanned PDFs searchable',          icon: 'Eye',       href: '/tools/ocr-pdf',      badge: 'AI' },
    ],
  },
  {
    id: 'convert-to', label: 'Convert to PDF', accent: '#06B6D4', icon: 'FileType',
    tools: [
      { name: 'Word to PDF',       desc: 'Convert DOCX to PDF perfectly', icon: 'FileText',        href: '/word-to-pdf',       badge: 'Live' },
      { name: 'JPG to PDF',        desc: 'Convert images to PDF',         icon: 'Image',           href: '/tools/images-to-pdf' },
      { name: 'PowerPoint to PDF', desc: 'Convert PPTX presentations',    icon: 'Presentation',    href: '/tools/pptx-to-pdf' },
      { name: 'Excel to PDF',      desc: 'Convert XLSX spreadsheets',     icon: 'TableProperties', href: '/tools/xlsx-to-pdf' },
      { name: 'HTML to PDF',       desc: 'Convert HTML pages or URLs',    icon: 'Globe',           href: '/tools/html-to-pdf' },
    ],
  },
  {
    id: 'convert-from', label: 'Convert from PDF', accent: '#A78BFA', icon: 'FileCheck',
    tools: [
      { name: 'PDF to Word',       desc: 'Convert PDF to editable DOCX', icon: 'FileText',        href: '/pdf-to-word',        badge: 'Live' },
      { name: 'PDF to JPG',        desc: 'Export pages as JPG images',   icon: 'Image',           href: '/tools/pdf-to-jpg' },
      { name: 'PDF to PowerPoint', desc: 'Convert PDF to editable PPTX', icon: 'Presentation',    href: '/tools/pdf-to-pptx' },
      { name: 'PDF to Excel',      desc: 'Extract tables into XLSX',     icon: 'BarChart2',       href: '/tools/pdf-to-xlsx' },
      { name: 'PDF to PDF/A',      desc: 'Convert to archival format',   icon: 'FileCheck',       href: '/tools/pdf-to-pdfa' },
    ],
  },
  {
    id: 'edit', label: 'Edit PDF', accent: '#F59E0B', icon: 'Edit3',
    tools: [
      { name: 'Rotate PDF',       desc: 'Rotate pages to correct orientation', icon: 'RotateCcw', href: '/tools/rotate-pdf' },
      { name: 'Add Page Numbers', desc: 'Insert page numbers anywhere',        icon: 'Hash',      href: '/tools/add-page-numbers' },
      { name: 'Add Watermark',    desc: 'Stamp text watermarks on pages',      icon: 'Droplets',  href: '/tools/watermark-pdf' },
      { name: 'Crop PDF',         desc: 'Crop pages to a custom size',         icon: 'Crop',      href: '/tools/crop-pdf' },
      { name: 'Edit PDF',         desc: 'Annotate, highlight, and redact',     icon: 'Edit3',     href: '/tools/edit-pdf',    badge: 'New' },
    ],
  },
  {
    id: 'security', label: 'PDF Security', accent: '#22C55E', icon: 'Shield',
    tools: [
      { name: 'Unlock PDF',  desc: 'Remove password protection',           icon: 'Unlock',     href: '/tools/unlock-pdf' },
      { name: 'Protect PDF', desc: 'Add password encryption',              icon: 'Lock',       href: '/tools/protect-pdf' },
      { name: 'Sign PDF',    desc: 'Add a digital signature stamp',        icon: 'PenTool',    href: '/tools/sign-pdf',    badge: 'Popular' },
      { name: 'Redact PDF',  desc: 'Permanently remove sensitive content', icon: 'EyeOff',     href: '/tools/redact-pdf' },
      { name: 'Compare PDF', desc: 'Detect changes between two PDFs',      icon: 'GitCompare', href: '/tools/compare-pdf' },
    ],
  },
  {
    id: 'ai', label: 'PDF Intelligence', accent: '#EC4899', icon: 'Sparkles',
    tools: [
      { name: 'AI Summarizer', desc: 'Instantly summarize any PDF',      icon: 'Sparkles',  href: '/tools/ai-summarizer', badge: 'AI' },
      { name: 'Translate PDF', desc: 'Translate PDFs to 12+ languages',  icon: 'Languages', href: '/tools/translate-pdf', badge: 'AI' },
    ],
  },
];
