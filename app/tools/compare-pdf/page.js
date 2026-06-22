import ToolClient from './ToolClient';

export const metadata = { title: 'Compare PDF', description: 'Detect differences between two PDF versions visually and by text.' };

export default function Page() {
  return <ToolClient />;
}
