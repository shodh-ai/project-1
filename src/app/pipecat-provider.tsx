'use client';

import { PipecatProvider } from '@/services/pipecat/PipecatProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PipecatProvider>
      {children}
    </PipecatProvider>
  );
}
