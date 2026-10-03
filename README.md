# Sistema Thiago — Controle e Agenda de Leilões

Aplicação web **mobile first** para Thiago acompanhar leilões, organizar lotes, registrar preferências, valores e resultados, manter agenda e consultar referências veiculares separadas da operação do leilão.

## Estado atual

O sistema está em transição do armazenamento apenas local para Supabase. A estrutura suporta **vários leilões**, **vários itens por lote**, login real e backup/sincronização online por usuário. A recuperação da antiga Base inicial depende de trazer os dados do navegador/origem em que foram cadastrados; não se atribui conteúdo antigo silenciosamente a uma nova conta.

### Já implementado no MVP

- botão **Acompanhar leilão**, com escolha por data e referência;
- **Cadastrar Novo Leilão**, com data, hora, referência, local, fonte, URL e foto/capa;
- agenda de vários leilões;
- primeiro usuário operacional: **Thiago**;
- cadastro completo de lote: lote, tipo, placa, marca/modelo, chassi, motor, ano, cor, combustível e lance mínimo;
- separação entre **Fonte oficial** e **Dados inseridos pelo usuário**;
- página própria de **Veículos / FIPE**;
- catálogo das informações transcritas das imagens do usuário, sem promovê-las automaticamente a dados oficiais;
- links apenas para **FIPE oficial** e fontes oficiais de leilões;
- módulo **Fontes oficiais SC** com DETRAN/SC e Portal de Compras;
- importação de leilão oficial para a agenda, mantendo a proveniência;
- preferência em dois níveis: `★ Preferência` e `★★ Prioridade`;
- `Aguardando` / `Leiloado`;
- resultado pós-leilão opcional;
- nosso valor máximo e valor final opcionais;
- Modo ao Vivo v2 com seletor de leilão, Preferência, Pular e Leiloado;
- CSV e PDF/impressão por leilão;
- recuperação assistida de dados legados encontrados no mesmo navegador/origem;
- snapshot online por usuário autenticado, protegido por RLS, como ponte até a migração relacional completa;
- conversa contextual com Charlie Echo dentro do painel;
- aviso de cookies/armazenamento essencial;
- múltiplos itens dentro do mesmo lote e cadastro de vários lotes.

## Regra de proveniência

Existem apenas duas classificações na entrada:

1. **Fonte oficial** — acompanhada de URL oficial.
2. **Dados inseridos pelo usuário** — conversa, imagem, digitação ou informação ainda não validada oficialmente.

Nenhum dado é convertido automaticamente de “usuário” para “oficial”.

## Segurança e login

> **MVP EM VALIDAÇÃO.** O login verdadeiro com **Google** e **e-mail/senha**, RLS e perfis já estão ativos. O navegador ainda mantém uma cópia local, enquanto um snapshot online por usuário autenticado serve como ponte de recuperação e sincronização. A fonte canônica final continua sendo o modelo relacional Supabase.

Regra vigente: uma conta nova começa vazia. Dados antigos só são recuperados quando pertencem àquele navegador/origem ou quando chegam pelo backup online da própria conta. Compartilhamento entre usuários deve respeitar associação explícita ao leilão.

## Fontes oficiais iniciais

- DETRAN/SC — Leilões
- Calendário DETRAN/SC
- Editais DETRAN/SC
- Portal de Compras de Santa Catarina
- FIPE oficial para consulta de preço médio

## Cronograma

Veja [CRONOGRAMA.md](CRONOGRAMA.md).

## Publicação

Endereço operacional informado:

https://sistema.thiago.jus9verde.jus9tecnologia.com.br/

Fallback / publicação GitHub Pages:

https://clovis-mariano-costa.github.io/sistema-thiago-leilao/

O GitHub continua como fonte de código e histórico. Durante a transição, lembre que `localStorage` é separado por domínio/origem: os dados locais gravados no GitHub Pages não aparecem automaticamente no domínio próprio e vice-versa.

## Persistência — arquitetura vigente

- Supabase Auth: Google e e-mail/senha.
- Supabase Postgres + RLS: usuários, leilões, membros, lotes, itens, FIPE e auditoria em migração gradual.
- `user_state_snapshots`: ponte transitória para recuperação/sincronização do estado do MVP por usuário.
- Supabase Storage privado `auction-media`: destino previsto para imagens e documentos do leilão com políticas por leilão/papel.
- Cloudflare: entrega do domínio próprio e Workers/Pages Functions quando necessários.
- GitHub Actions: testes/publicação; usar Secrets só para pipeline e preferir OIDC quando possível.
- Google Drive: continuidade, documentação e exportação, não banco transacional principal.

`localStorage` permanece apenas como cache/cópia local enquanto a migração relacional é concluída.
