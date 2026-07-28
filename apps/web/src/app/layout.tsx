import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  title: 'CodeScape',
  description: 'Visualize software repositories as interactive 3D cities.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
