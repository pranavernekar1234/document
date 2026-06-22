'use client';
import ToolPage from '../../../components/ToolPage';
import { Hash, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'add-page-numbers',
  name: 'Add Page Numbers',
  description: 'Insert page numbers to any PDF with customizable position, style, and starting number.',
  endpoint: '/api/pdf/add-page-numbers',
  category: 'Edit PDF',
  accent: '#F59E0B',
  icon: <Hash size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "numbered.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["6 position options: corners and center", "Customizable starting page number", "Optional prefix text (e.g. Page)", "Adjustable font size"];

const OPTIONS = ({ values, setOpt }) => (
    <div className="space-y-4">
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-2">Position</label>
        <div className="grid grid-cols-3 gap-2">
          {[['bottom-center','Bottom Center'],['bottom-left','Bottom Left'],['bottom-right','Bottom Right'],['top-center','Top Center'],['top-left','Top Left'],['top-right','Top Right']].map(([v,l]) => (
            <button key={v} onClick={() => setOpt('position', v)}
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: (values.position||'bottom-center')===v ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${(values.position||'bottom-center')===v ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`, color: (values.position||'bottom-center')===v ? '#FBB740' : '#94A3B8' }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1.5">Start From</label>
          <input type="number" min="1" value={values.startFrom||'1'} onChange={e => setOpt('startFrom', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1.5">Font Size</label>
          <input type="number" min="8" max="24" value={values.fontSize||'12'} onChange={e => setOpt('fontSize', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Prefix (optional)</label>
        <input type="text" placeholder="e.g. Page " value={values.prefix||''} onChange={e => setOpt('prefix', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    fd.append('position', opts.position || 'bottom-center');
    fd.append('startFrom', opts.startFrom || '1');
    fd.append('fontSize', opts.fontSize || '12');
    fd.append('prefix', opts.prefix || '');
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
