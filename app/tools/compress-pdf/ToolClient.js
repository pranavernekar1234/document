'use client';
import ToolPage from '../../../components/ToolPage';
import { Minimize2, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'compress-pdf',
  name: 'Compress PDF',
  description: 'Reduce PDF file size with three compression levels while preserving quality.',
  endpoint: '/api/pdf/compress',
  category: 'Optimize PDF',
  accent: '#8B5CF6',
  icon: <Minimize2 size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "compressed.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Three compression levels: low, medium, high", "See size reduction after processing", "No visible quality loss on medium compression", "Works on scanned and digital PDFs"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-slate-400 text-xs font-medium block mb-2">Compression Level</label>
      <div className="grid grid-cols-3 gap-2">
        {[['low','Low'],['medium','Medium'],['high','High']].map(([v,l]) => (
          <button key={v} onClick={() => setOpt('level', v)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: (values.level||'medium')===v ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${(values.level||'medium')===v ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, color: (values.level||'medium')===v ? '#A78BFA' : '#94A3B8' }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    fd.append('level', opts.level || 'medium');
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
