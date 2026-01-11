import { useEffect } from 'react';

interface UseBeforeUnloadParams {
  isEnabled: boolean;
}

export function useBeforeUnload({ isEnabled }: UseBeforeUnloadParams) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEnabled]);
}
