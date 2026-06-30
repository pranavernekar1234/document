'use client';
import ToolPage from '../../../components/ToolPage';
import { RotateCcw, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'rotate-pdf',
  name: 'Rotate PDF',
  description: 'Rotate all or specific pages of a PDF by 90, 180, or 270 degrees.',
  endpoint: '/api/pdf/rotate',
  category: 'Edit PDF',
  accent: '#F59E0B',
  icon: <RotateCcw size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "rotated.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Rotate all pages or specific pages", "90°, 180°, or 270° rotation", "Clockwise and counter-clockwise", "All other content preserved"];

const OPTIONS = ({ values, setOpt }) => (
    <div className="space-y-4">
      <div>
        <label className="text-black/45 text-xs font-medium block mb-2">Rotation Angle</label>
        <div className="grid grid-cols-3 gap-2">
          {[['90','90°'],['180','180°'],['270','270°']].map(([v,l]) => (
            <button key={v} onClick={() => setOpt('angle', v)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: (values.angle||'90')===v ? '#00000014' : '#FAFAFA', border: `1px solid ${(values.angle||'90')===v ? '#00000040' : 'rgba(0,0,0,0.08)'}`, color: (values.angle||'90')===v ? '#000' : 'rgba(0,0,0,0.5)', fontWeight: (values.angle||'90')===v ? 600 : 500 }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-black/45 text-xs font-medium block mb-1.5">Pages (optional)</label>
        <input type="text" placeholder="Leave blank for all pages"
          value={values.pages || ''}
          onChange={e => setOpt('pages', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
          style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
      </div>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    fd.append('angle', opts.angle || '90');
    if (opts.pages) {
      const pages = opts.pages.split(',').map(p => Number(p.trim())).filter(Boolean);
      fd.append('pages', JSON.stringify(pages));
    } else {
      fd.append('pages', JSON.stringify([]));
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
