import type { Metadata } from 'next';
import '../globals.css';
import BookProvider from './_lib/bookContext';
import BookShell from './_components/BookShell';

export const metadata: Metadata = {
  title: 'BookMaker',
  description: 'AI-assisted book creation studio',
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookProvider>
      <BookShell>{children}</BookShell>
    </BookProvider>
  );
}

