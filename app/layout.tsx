import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'Flipkart Seller Analytics',
  description: 'Next.js replica of the Flipkart Seller dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
