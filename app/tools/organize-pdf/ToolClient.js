'use client';
import ToolPage from '../../../components/ToolPage';
import { Layers, Settings, Check } from 'lucide-react';

const TOOL = {
  id: 'organize-pdf',
  name: 'Organize PDF',
  description: 'Rearrange pages by specifying a new page order.',
  endpoint: '/api/pdf/organize',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <Layers size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "organized.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Reorder pages with custom sequence", "Duplicate or omit pages", "All content preserved exactly", "Works on any PDF size"];

const OPTIONS = ({ values, setOpt }) => (
    <div>
      <label className="text-black/45 text-xs font-medium block mb-2">New Page Order</label>
      <input type="text" placeholder="e.g. 3, 1, 2, 4"
        value={values.order || ''}
        onChange={e => setOpt('order', e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
        style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} />
      <p className="text-black/35 text-xs mt-1.5">Enter page numbers in desired order</p>
    </div>
  );
const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    fd.append('file', files[0], files[0].name);
    if (opts.order) {
      const order = opts.order.split(',').map(p => Number(p.trim())).filter(Boolean);
      fd.append('order', JSON.stringify(order));
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
