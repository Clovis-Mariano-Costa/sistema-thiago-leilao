# Sistema Thiago — Controle e Agenda de Leilões

Aplicação web **mobile first** para Thiago acompanhar leilões, organizar lotes, registrar preferências, valores e resultados, manter agenda e consultar referências veiculares separadas da operação do leilão.

## Estado atual

A base inicial preserva os **37 lotes** extraídos das conversas e agora funciona dentro de uma arquitetura de **vários leilões**.

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
- migração dos dados da versão anterior salvos no navegador.

## Regra de proveniência

Existem apenas duas classificações na entrada:

1. **Fonte oficial** — acompanhada de URL oficial.
2. **Dados inseridos pelo usuário** — conversa, imagem, digitação ou informação ainda não validada oficialmente.

Nenhum dado é convertido automaticamente de “usuário” para “oficial”.

## Segurança e login

> **MVP EM VALIDAÇÃO.** A etapa atual ainda usa armazenamento local do navegador e não deve ser tratada como ambiente seguro.

O login verdadeiro com **Google** e **e-mail/senha** está agendado no cronograma e só será considerado implementado quando o serviço de autenticação, banco compartilhado e regras de acesso forem configurados e testados.

Regra planejada: um usuário autenticado só verá leilões de que participe ou para os quais tenha sido convidado. Quem não tiver leilões compartilhados abrirá um sistema em branco.

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

## Persistência — arquitetura candidata

A persistência atual em `localStorage` é apenas de MVP e não deve virar a fonte canônica multiusuário.

Arquitetura em avaliação:

- Cloudflare Workers: API/backend e autorização;
- Cloudflare D1: usuários, leilões, membros, convites, lotes, FIPE, fontes e auditoria;
- Cloudflare R2: imagens, capas e documentos;
- Cron Triggers/Workflows: atualização periódica de fontes oficiais;
- Queues: processamento assíncrono;
- Browser Run: apenas para páginas oficiais que exijam navegador real e permitam automação;
- Firebase Authentication: Google + e-mail/senha, com identidade validada pelo backend.

Google Drive permanece adequado para continuidade, documentação e exportação, não como banco transacional principal do aplicativo.
