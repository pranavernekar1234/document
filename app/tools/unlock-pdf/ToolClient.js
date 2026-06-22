'use client';
import ToolPage from '../../../components/ToolPage';
import { Unlock, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'unlock-pdf',
  name: 'Unlock PDF',
  description: 'Remove password protection from a PDF you have access to.',
  endpoint: '/api/pdf/unlock',
  category: 'PDF Security',
  accent: '#22C55E',
  icon: <Unlock size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "unlocked.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Remove user and owner passwords", "Works with standard encryption", "Output is fully accessible PDF", "Your credentials are never stored"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-slate-400 text-xs font-medium block mb-1.5">Current Password (if any)</label>
      <input type="password" placeholder="Enter current password"
        value={values.password || ''} onChange={e => setOpt('password', e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none"
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
