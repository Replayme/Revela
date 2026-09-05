-- Acervo de demonstração — os mesmos autores e as mesmas fotos que viviam em
-- `lib/mock-photos.ts` e `lib/mock-photographers.ts`, para que o banco
-- recém-criado se comporte como o `npm run dev` de sempre.
--
-- ⚠️ NÃO APLIQUE EM PRODUÇÃO. Um acervo de verdade começa vazio, e vazio é a
-- resposta certa: quem entra vê que ninguém publicou ainda, em vez de catorze
-- fotos do picsum.photos com preço inventado.
--
-- Depende de `002_seed_demo.sql` (as contas), porque o vínculo do fim do
-- arquivo liga a conta da Ana ao autor Ana Vilar. Aplicar só este deixa o
-- vínculo sem efeito — sem erro, porque o UPDATE não acha a linha.
--
-- As URLs apontam para o picsum.photos e não há original em bucket nenhum:
-- `storage_key` fica nulo, que é o estado honesto de uma foto que ninguém
-- enviou. Ver `db/003_catalogo.sql`.

INSERT INTO photographers (id, name, avatar_url, cover_photo_url, rating) VALUES
  ('ana-vilar', 'Ana Vilar', 'https://picsum.photos/seed/ana-vilar-avatar/200/200', 'https://picsum.photos/seed/ana-vilar-cover/800/600', 4.9),
  ('joao-benicio', 'João Benício', 'https://picsum.photos/seed/joao-benicio-avatar/200/200', 'https://picsum.photos/seed/joao-benicio-cover/800/600', 4.7),
  ('marina-costa', 'Marina Costa', 'https://picsum.photos/seed/marina-costa-avatar/200/200', 'https://picsum.photos/seed/marina-costa-cover/800/600', 5),
  ('rafael-drumond', 'Rafael Drumond', 'https://picsum.photos/seed/rafael-drumond-avatar/200/200', 'https://picsum.photos/seed/rafael-drumond-cover/800/600', 4.6),
  ('leticia-sa', 'Letícia Sá', 'https://picsum.photos/seed/leticia-sa-avatar/200/200', 'https://picsum.photos/seed/leticia-sa-cover/800/600', 4.8),
  ('clara-nobrega', 'Clara Nóbrega', 'https://picsum.photos/seed/clara-nobrega-avatar/200/200', 'https://picsum.photos/seed/clara-nobrega-cover/800/600', 4.5)
ON CONFLICT (id) DO NOTHING;

-- Todas nascem publicadas: no acervo de demonstração, estar no catálogo *é*
-- estar publicado. Rascunho e análise passam a existir com quem os grave — e o
-- padrão da coluna é 'rascunho' justamente porque foto enviada de verdade não
-- entra à venda sozinha.
INSERT INTO photos
  (id, photographer_id, title, category, price, rating, width, height, thumbnail_url, full_url, status)
VALUES
  ('p-01', 'ana-vilar', 'Véu ao vento na Praia da Pipa', 'Casamento', 89.9, 4.9, 3000, 2000, 'https://picsum.photos/seed/p-01/800/600', 'https://picsum.photos/seed/p-01/3000/2000', 'publicada'),
  ('p-02', 'joao-benicio', 'Feira de São José ao amanhecer', 'Documental e rua', 54, 4.7, 3000, 2000, 'https://picsum.photos/seed/p-02/800/600', 'https://picsum.photos/seed/p-02/3000/2000', 'publicada'),
  ('p-03', 'marina-costa', 'Retrato em luz de janela', 'Retrato', 120, 5, 2000, 3000, 'https://picsum.photos/seed/p-03/800/600', 'https://picsum.photos/seed/p-03/2000/3000', 'publicada'),
  ('p-04', 'rafael-drumond', 'Dunas de Genipabu no fim da tarde', 'Documental e rua', 67.5, 4.6, 3000, 2000, 'https://picsum.photos/seed/p-04/800/600', 'https://picsum.photos/seed/p-04/3000/2000', 'publicada'),
  ('p-05', 'leticia-sa', 'Moqueca servida na panela de barro', 'Gastronomia', 45, 4.8, 3000, 2000, 'https://picsum.photos/seed/p-05/800/600', 'https://picsum.photos/seed/p-05/3000/2000', 'publicada'),
  ('p-06', 'ana-vilar', 'Escadaria do casarão restaurado', 'Arquitetura e imóveis', 98, 4.5, 2000, 3000, 'https://picsum.photos/seed/p-06/800/600', 'https://picsum.photos/seed/p-06/2000/3000', 'publicada'),
  ('p-07', 'clara-nobrega', 'Mãos da avó sovando o pão', 'Família e infantil', 72, 4.9, 3000, 2000, 'https://picsum.photos/seed/p-07/800/600', 'https://picsum.photos/seed/p-07/3000/2000', 'publicada'),
  ('p-08', 'joao-benicio', 'Cerâmica no torno, oficina do centro', 'Produto e e-commerce', 39.9, 4.4, 3000, 2000, 'https://picsum.photos/seed/p-08/800/600', 'https://picsum.photos/seed/p-08/3000/2000', 'publicada'),
  ('p-09', 'marina-costa', 'Primeiro banho de mar', 'Família e infantil', 84, 4.8, 3000, 2000, 'https://picsum.photos/seed/p-09/800/600', 'https://picsum.photos/seed/p-09/3000/2000', 'publicada'),
  ('p-10', 'rafael-drumond', 'Congresso na abertura da plenária', 'Eventos corporativos', 110, 4.3, 3000, 2000, 'https://picsum.photos/seed/p-10/800/600', 'https://picsum.photos/seed/p-10/3000/2000', 'publicada'),
  ('p-11', 'leticia-sa', 'Aliança sobre renda renascença', 'Casamento', 63, 4.7, 2000, 3000, 'https://picsum.photos/seed/p-11/800/600', 'https://picsum.photos/seed/p-11/2000/3000', 'publicada'),
  ('p-12', 'clara-nobrega', 'Café coado no fim do expediente', 'Gastronomia', 41.5, 4.6, 3000, 2000, 'https://picsum.photos/seed/p-12/800/600', 'https://picsum.photos/seed/p-12/3000/2000', 'publicada'),
  ('p-13', 'ana-vilar', 'Fachada modernista em contraluz', 'Arquitetura e imóveis', 132, 4.9, 2000, 3000, 'https://picsum.photos/seed/p-13/800/600', 'https://picsum.photos/seed/p-13/2000/3000', 'publicada'),
  ('p-14', 'marina-costa', 'Ensaio de gestante no manguezal', 'Retrato', 95, 4.8, 3000, 2000, 'https://picsum.photos/seed/p-14/800/600', 'https://picsum.photos/seed/p-14/3000/2000', 'publicada')
ON CONFLICT (id) DO NOTHING;

-- O vínculo que o VINCULO_DEMO fazia à mão. A conta da Ana chama-se "Ana
-- Ribeiro" e assina "Ana Vilar" — não é defeito: o nome da conta é de quem
-- recebe, a assinatura é de quem fotografou.
UPDATE users SET photographer_id = 'ana-vilar'
 WHERE email = 'ana@revela.com' AND photographer_id IS NULL;
