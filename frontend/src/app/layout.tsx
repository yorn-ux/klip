import './globals.css';
import { ThemeProvider } from 'next-themes';
import ClientLayout from '../components/layout/ClientLayout';

export const metadata = {
  title: 'Klip',
  description: 'Secure platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}