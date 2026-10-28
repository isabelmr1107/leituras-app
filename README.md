# Minha Estante

Aplicação de leitura construída em Next.js, React, TypeScript, Auth.js, Prisma e PostgreSQL.

## Desenvolvimento

1. Execute `npm install`.
2. Copie `.env.example` para `.env.local` e configure o banco PostgreSQL e um `AUTH_SECRET` seguro.
3. Execute `npx prisma db push` para criar as tabelas (ambiente de desenvolvimento).
4. Execute `npm run dev` e acesse http://localhost:3000.

Os dados de cada livro e entrada de diário são associados ao usuário autenticado. O dashboard utiliza os registros persistidos. Em produção, prefira migrations versionadas (`prisma migrate deploy`) e configure as variáveis no host.

### Recursos

- Cadastro com senha armazenada como hash e login Auth.js;
- CRUD de livros por usuário e quatro estados de leitura;
- Diário de notas, resenhas, citações e sessões de leitura;
- Dashboard com progresso e estatísticas.

### Migração da versão inicial

A versão anterior usava Neon Auth e uma tabela `books` SQL manual com colunas distintas. Este branch usa Auth.js e Prisma, e **não migra automaticamente os usuários ou livros antigos**. Faça backup antes de adotar este modelo em banco já utilizado. Use banco novo durante a avaliação. O visual e a organização do painel anterior foram reaproveitados.