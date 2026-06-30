import ToolClient from './ToolClient';

export const metadata = { title: 'Add Watermark', description: 'Stamp a text watermark on every page of your PDF with custom opacity and rotation.' };

export default function Page() {
  return <ToolClient />;
}
