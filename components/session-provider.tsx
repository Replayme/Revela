'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicSession } from '@/lib/session';

const SessionContext = createContext<PublicSession | null>(null);

/**
 * A sessão lida no layout (servidor) e repassada para os componentes de
 * cliente que precisam dela — hoje o header.
 *
 * Só identidade, nunca o token: o cookie continua `HttpOnly` e nada do que
 * está aqui serve para autenticar em lugar nenhum. Quem decide o que a pessoa
 * pode fazer é o servidor, a cada requisição; isto aqui só decide o que a tela
 * mostra.
 */
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
