'use client';
import ToolPage from '../../../components/ToolPage';
import { FileSearch, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'extract-pages',
  name: 'Extract Pages',
  description: 'Extract specific pages from a PDF into a new document.',
  endpoint: '/api/pdf/extract-pages',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <FileSearch size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "extracted.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Extract any combination of pages", "Supports page ranges", "Output is a clean new PDF", "Original file untouched"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-black/45 text-xs font-medium block mb-2">Pages to Extract</label>
      <input type="text" placeholder="e.g. 1, 3, 5-8"
        value={values.pages || ''}
        onChange={e => setOpt('pages', e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
        style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    if (opts.pages) {
      const pages = [];
      opts.pages.split(',').forEach(p => {
        const t = p.trim();
        if (t.includes('-')) { const [a,b]=t.split('-').map(Number); for(let i=a;i<=b;i++) pages.push(i); }
        else if(Number(t)) pages.push(Number(t));
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
