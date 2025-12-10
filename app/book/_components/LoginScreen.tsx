"use client";

import { BookOpen } from "lucide-react";
import Button from "./Button";

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center bg-paper p-4">
    <div className="max-w-md w-full bg-white border border-stone-200 shadow-xl p-8 rounded-sm">
      <div className="flex justify-center mb-6">
        <div className="h-12 w-12 bg-brand-900 text-white flex items-center justify-center rounded-sm">
          <BookOpen size={24} />
        </div>
      </div>
      <h1 className="text-3xl font-serif text-center text-brand-900 mb-2">
        BookMaker
      </h1>
      <p className="text-center text-stone-500 mb-8 font-sans">
        Craft literature with intelligence.
      </p>
      <Button onClick={onLogin} className="w-full h-12 text-lg">
        Enter Studio
      </Button>
    </div>
  </div>
);

export default LoginScreen;
