'use client';
import ToolPage from '../../../components/ToolPage';
import { Droplets, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'watermark-pdf',
  name: 'Add Watermark',
  description: 'Stamp a text watermark on every page of your PDF with custom opacity and rotation.',
  endpoint: '/api/pdf/watermark',
  category: 'Edit PDF',
  accent: '#F59E0B',
  icon: <Droplets size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "watermarked.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Custom watermark text", "Adjustable opacity", "Configurable rotation angle", "Applied to every page"];

const OPTIONS = ({ values, setOpt }) => (
    <div className="space-y-4">
      <div>
        <label className="text-black/45 text-xs font-medium block mb-1.5">Watermark Text</label>
        <input type="text" placeholder="CONFIDENTIAL" value={values.text||''} onChange={e => setOpt('text', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
          style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-black/45 text-xs font-medium block mb-1.5">Opacity (0-1)</label>
          <input type="number" min="0.05" max="1" step="0.05" value={values.opacity||'0.15'} onChange={e => setOpt('opacity', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
        <div>
          <label className="text-black/45 text-xs font-medium block mb-1.5">Rotation (°)</label>
          <input type="number" min="0" max="360" value={values.rotation||'45'} onChange={e => setOpt('rotation', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
      </div>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    fd.append('text', opts.text || 'CONFIDENTIAL');
    fd.append('opacity', opts.opacity || '0.15');
    fd.append('rotation', opts.rotation || '45');
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
