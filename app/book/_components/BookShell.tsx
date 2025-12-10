"use client";

import Link from "next/link";
import { BookOpen, LogOut } from "lucide-react";
import { useBook } from "../_lib/bookContext";
import LoginScreen from "./LoginScreen";

const BookShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state: { isAuthenticated, currentUser },
    actions: { logout, login },
  } = useBook();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/book" className="flex items-center gap-2">
            <div className="bg-brand-900 text-white p-1.5 rounded-sm">
              <BookOpen size={20} />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-brand-900">
              BookMaker
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">
              Welcome, {currentUser?.name}
            </span>
            <button
              onClick={logout}
              className="text-stone-400 hover:text-brand-900 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default BookShell;
