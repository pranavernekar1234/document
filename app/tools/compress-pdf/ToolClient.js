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
      <label className="text-black/45 text-xs font-medium block mb-2">Compression Level</label>
      <div className="grid grid-cols-3 gap-2">
        {[['low','Low'],['medium','Medium'],['high','High']].map(([v,l]) => (
          <button key={v} onClick={() => setOpt('level', v)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: (values.level||'medium')===v ? '#00000014' : '#FAFAFA', border: `1px solid ${(values.level||'medium')===v ? '#00000040' : 'rgba(0,0,0,0.08)'}`, color: (values.level||'medium')===v ? '#000' : 'rgba(0,0,0,0.5)', fontWeight: (values.level||'medium')===v ? 600 : 500 }}>
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
