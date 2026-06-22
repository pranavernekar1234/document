'use client';
import ToolPage from '../../../components/ToolPage';
import { Lock, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'protect-pdf',
  name: 'Protect PDF',
  description: 'Add password protection to your PDF to prevent unauthorized access.',
  endpoint: '/api/pdf/protect',
  category: 'PDF Security',
  accent: '#22C55E',
  icon: <Lock size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "protected.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Strong 256-bit AES encryption", "User and owner password support", "Prevents printing and copying", "Compatible with all PDF readers"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-slate-400 text-xs font-medium block mb-1.5">Password</label>
      <input type="password" placeholder="Enter a strong password"
        value={values.password || ''} onChange={e => setOpt('password', e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    fd.append('password', opts.password || '');
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
