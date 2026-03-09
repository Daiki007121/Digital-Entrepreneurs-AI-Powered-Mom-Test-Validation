import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export const metadata: Metadata = {
  title: 'Digital Entrepreneurs — AI Mom Test',
  description: 'AI-powered Mom Test interview validation for startup founders',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased aurora-bg">
        <ThemeProvider>
          <ErrorBoundary>
            <div className="relative z-10">{children}</div>
          </ErrorBoundary>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
