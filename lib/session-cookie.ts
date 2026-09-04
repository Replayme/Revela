/**
 * O nome do cookie de sessão, sozinho num módulo.
 *
 * O `middleware.ts` roda no runtime de edge e precisa desta constante. Se ele
 * a importasse de `lib/session.ts`, viria junto o `lib/tokens.ts` e o
 * `node:crypto` que não existe lá — o build quebra. Uma constante num arquivo
 * sem dependência nenhuma é o que mantém os dois lados falando do mesmo cookie
 * sem arrastar um para dentro do outro.
 */
export const SESSION_COOKIE = 'revela_session';
