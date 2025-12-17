'use client';

import { Library, Plus } from 'lucide-react';
import Button from './Button';

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50">
    <Library size={48} className="text-stone-300 mb-4" />
    <h3 className="text-xl font-serif text-stone-700 mb-2">No books created yet</h3>
    <p className="text-stone-500 mb-6 max-w-sm">
      Your library is empty. Start your first masterpiece by converting raw ideas into structured chapters.
    </p>
    <Button onClick={onCreate}>
      <Plus size={18} className="mr-2" />
      Create New Book
    </Button>
  </div>
);

export default EmptyState;

