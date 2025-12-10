import { BookOpen } from "lucide-react";
import Button from "../book/_components/Button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-brand-900 text-white flex items-center justify-center rounded-sm shadow-sm">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-serif text-brand-900 tracking-wide">
            BookMaker Studio
          </h1>
        </div>

        <Button type="button" variant="primary" className="w-full py-3">
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
