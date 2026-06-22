'use client';
import ToolPage from '../../../components/ToolPage';
import { FileMinus, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'remove-pages',
  name: 'Remove Pages',
  description: 'Delete specific pages from a PDF and download the cleaned document.',
  endpoint: '/api/pdf/remove-pages',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <FileMinus size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "removed-pages.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Select individual pages or ranges to remove", "Preview page count before processing", "Remaining pages stay in original order", "Supports any PDF size"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-slate-400 text-xs font-medium block mb-2">Pages to Remove</label>
      <input type="text" placeholder="e.g. 1, 3, 5-8"
        value={values.pages || ''}
        onChange={e => setOpt('pages', e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      <p className="text-slate-600 text-xs mt-1.5">Enter page numbers or ranges, comma-separated</p>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    if (opts.pages) {
      const pages = [];
      opts.pages.split(',').forEach(p => {
        const t = p.trim();
        if (t.includes('-')) {
          const [a, b] = t.split('-').map(Number);
          for (let i = a; i <= b; i++) pages.push(i);
        } else if (Number(t)) pages.push(Number(t));
      });
      fd.append('pages', JSON.stringify(pages));
    }
    return fd;
  };


export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      options={OPTIONS}
      getFormData={GET_FORM_DATA}
    />
  );
}
