import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "What's Next - Strategy Execution Platform",
  description: 'Execution Intelligence Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
