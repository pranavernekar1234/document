'use client';
import ToolPage from '../../../components/ToolPage';
import { Scissors, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'split-pdf',
  name: 'Split PDF',
  description: 'Split a PDF into multiple files by page ranges or extract every page.',
  endpoint: '/api/pdf/split',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <Scissors size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: undefined,
  outputMime: undefined,
  multipleOutputs: true,
};

const BULLETS = ["Split by custom page ranges", "Extract every page as a separate PDF", "Download all split files individually", "Original file is never modified", "Unlimited page splits"];

const OPTIONS = ({ values, setOpt }) => (
    <div className="space-y-4">
      <p className="text-black font-semibold text-sm flex items-center gap-2"><Settings size={14} className="text-black/50" /> Split Options</p>
      <div>
        <label className="text-black/45 text-xs font-medium block mb-2">Split Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {[['every-page','Every page'],['custom','Custom ranges']].map(([v,l]) => (
            <button key={v} onClick={() => setOpt('mode', v)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: (values.mode||'every-page')===v ? '#00000014' : '#FAFAFA', border: `1px solid ${(values.mode||'every-page')===v ? '#00000040' : 'rgba(0,0,0,0.08)'}`, color: (values.mode||'every-page')===v ? '#000' : 'rgba(0,0,0,0.5)', fontWeight: (values.mode||'every-page')===v ? 600 : 500 }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {(values.mode === 'custom') && (
        <div>
          <label className="text-black/45 text-xs font-medium block mb-1.5">Page Ranges</label>
          <input type="text" placeholder="e.g. 1-3, 4-7, 8-10"
            value={values.ranges || ''}
            onChange={e => setOpt('ranges', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
            style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
          <p className="text-black/35 text-xs mt-1.5">Enter comma-separated page ranges</p>
        </div>
      )}
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    const mode = opts.mode || 'every-page';
    if (mode === 'custom' && opts.ranges) {
      const ranges = opts.ranges.split(',').map(r => {
        const [from, to] = r.trim().split('-').map(Number);
        return { from: from || 1, to: to || from || 1 };
      }).filter(r => r.from > 0 && r.to > 0);
      fd.append('ranges', JSON.stringify(ranges));
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
