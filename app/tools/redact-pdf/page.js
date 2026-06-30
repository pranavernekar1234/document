import ToolClient from './ToolClient';

export const metadata = { title: 'Redact PDF', description: 'Permanently remove sensitive information from your PDF.' };

export default function Page() {
  return <ToolClient />;
}
