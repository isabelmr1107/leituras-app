# Checklist de lançamento — LIO

READY confirma o build, não valida automaticamente cada fluxo ou aparelho.

## Contas e segurança
- [ ] Cadastro, login, recuperação e logout.
- [ ] A conta B não vê os dados da conta A.
- [ ] PATCH de progresso sem sessão retorna 401, para outro usuário retorna 404.
- [ ] Página inválida retorna 400 e atualização desatualizada retorna 409.
- [ ] Avanço de 10 páginas salva uma sessão de 10 páginas; correção para trás não cria sessão negativa.

## Desktop e app instalado
- [ ] Home e Estante: registrar páginas, editar e abrir livro.
- [ ] Filtros da biblioteca por título, autor, gênero, status, favoritos; limpar filtros.
- [ ] Diário: filtrar tipo, livro, texto, salvar e excluir anotação.
- [ ] Metas e Cronograma: precisão das contagens, planejamento e registro.
- [ ] As nove paletas e modos claro, escuro e automático em todas as telas.
- [ ] iPhone, Android e desktop: teclado, barra do sistema, botões e navegação.
- [ ] Sem internet: mostrar erro de salvamento, não afirmar que salvou; PWA requer internet.

## Publicação
1. Teste de tipos e build de preview para SHA exato.
2. Revisão visual real em aparelho, ainda pendente até ser executada.
3. Merge após preview READY, e confirmar produção READY para SHA do merge.
