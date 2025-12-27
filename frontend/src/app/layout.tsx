import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RustLearn-MEM1',
  description: 'MEM1 방식의 효율적인 Rust 학습 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
