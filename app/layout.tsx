import type { Metadata } from 'next';
import '@vscode/codicons/dist/codicon.css';
import './styles.css';

export const metadata: Metadata = {
  title: 'Live ARC-1 Replay',
  description: 'Interactive static replays that show how ARC-1 connects AI clients to SAP development context.',
  metadataBase: new URL('https://live-arc-1.arc-1-mcp.com'),
  openGraph: {
    title: 'Live ARC-1 Replay',
    description: 'Replay ARC-1 SAP tool workflows in Claude, VS Code, Teams, Outlook, and Copilot themed demos.',
    url: 'https://live-arc-1.arc-1-mcp.com',
    siteName: 'Live ARC-1 Replay',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
