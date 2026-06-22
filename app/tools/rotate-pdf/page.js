import ToolClient from './ToolClient';

export const metadata = { title: 'Rotate PDF', description: 'Rotate all or specific pages of a PDF by 90, 180, or 270 degrees.' };

export default function Page() {
  return <ToolClient />;
}
