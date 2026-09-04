/*
  Contas de demonstração — as mesmas do armazenamento em memória, para que o
  banco recém-criado se comporte como o `npm run dev` de sempre.

  ⚠️ NÃO APLIQUE EM PRODUÇÃO. As três senhas estão no README, o que quer dizer
  que são públicas. `desativada@revela.com` existe para testar o caminho da
  conta bloqueada.

  Os hashes são scrypt com salt por conta, no formato de `lib/password.ts` —
  gerados uma vez e fixados aqui de propósito: um seed que muda a cada
  execução não é um seed, é uma migração diferente toda vez.

  Idempotente: rodar duas vezes não duplica nem sobrescreve. Para redefinir uma
  senha alterada durante o teste, apague a linha e rode de novo.
*/

INSERT INTO dbo.users (id, name, email, password_hash, disabled)
SELECT v.id, v.name, v.email, v.password_hash, v.disabled
FROM (VALUES
  ('usr_ana',   N'Ana Ribeiro',      N'ana@revela.com',
   'scrypt$37b9dd8c983cadba8f1d7440f5e6efab$def50603a4c17bc46bdfbdb76f6ece3b1351d9406c3e12ca805306f6a00e3ec9c8acaa59750f4c4c946d57fe588608b8ea3f0c97c3ef9557837d1adf4245ef7b', 0),
  ('usr_bruno', N'Bruno Sato',       N'bruno@revela.com',
   'scrypt$bc6463a006f7d92ee776b9a14adc6fac$7a0a820843093a8956572b26ee25d81d2c25844893a1e0b26392863148d8eff4d00f45d1c0c9729726d31785dc2f2ab61c5d6270e679e10a7e1c6ad231037a10', 0),
  ('usr_off',   N'Conta Desativada', N'desativada@revela.com',
   'scrypt$21ff74eed8fcd9f5b640e5be39a8ed29$8642bbff02646f5f96a5117fe0da922f509f47a5d2e5c223eac7b66105211bd7a92a6d644da4300518cf2c06c43e22d81ebbe8577e455f98a63fd91730bfae7a', 1)
) AS v (id, name, email, password_hash, disabled)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.users u WHERE u.id = v.id OR u.email = v.email
);
