import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import Toast from '@/components/Toast';

export const metadata: Metadata = {
  title: 'PromiseOS — Commitment Intelligence Platform',
  description: 'PromiseOS automatically turns conversations into accountable execution. Detect commitments, track delivery, and measure team reliability.',
  keywords: 'commitment tracking, accountability, AI meeting assistant, promise tracking, team reliability',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          {/* Ambient background blobs */}
          <div className="bg-blob" style={{ width: 600, height: 600, background: '#7c3aed', top: -200, left: -200 }} />
          <div className="bg-blob" style={{ width: 400, height: 400, background: '#00d4ff', top: 300, right: -100 }} />
          <div className="bg-blob" style={{ width: 300, height: 300, background: '#ec4899', bottom: 100, left: 300 }} />
          {children}
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
