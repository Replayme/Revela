'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicSession } from '@/lib/session';

const SessionContext = createContext<PublicSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: PublicSession | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): PublicSession | null {
  return useContext(SessionContext);
}
