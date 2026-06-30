import ToolClient from './ToolClient';

export const metadata = {
  title: 'Edit PDF',
  description: 'Annotate, highlight, and redact PDF documents directly in your browser.',
};

export default function Page() {
  return <ToolClient />;
}
