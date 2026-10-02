# Sistema Thiago — Controle de Leilão

Painel web **mobile first** para acompanhar lotes de interesse durante leilões.

## Estado atual

A primeira base contém **37 lotes pré-cadastrados** a partir do material recebido. Ao abrir a página, os lotes já aparecem; não é necessário cadastrá-los manualmente.

## Funcionalidades já disponíveis

- Status `Aguardando` / `Leiloado`, com possibilidade de desfazer.
- Preferência em dois níveis: `★ Preferência` e `★★ Prioridade`.
- Resultado pós-leilão **opcional**: arrematado por nós, arrematado por outro, não vendido, desistimos, sem interesse ou outro.
- Valor máximo de lance **opcional**.
- Valor final **opcional** após o lote ser leiloado.
- Observação livre e opcional por lote.
- Destaque automático do próximo lote ainda não leiloado.
- **Modo ao vivo** para uso no celular durante o leilão.
- Busca por lote, veículo, valores, resultado ou observação.
- Filtros por aguardando, preferências e leiloados.
- Contadores e barra de progresso.
- Exportação do resultado para **CSV**.
- Relatório preparado para **PDF / impressão**.
- Identidade visual com o logo fornecido.
- Layout responsivo, desenvolvido com prioridade para celular.
- Persistência local pelo `localStorage` do navegador.

## Aviso de segurança

> **MVP SEM SEGURANÇA.** A versão atual não oferece autenticação, sigilo, controle de acesso nem garantia contra alteração ou exclusão de dados. Não devem ser inseridos dados sensíveis, pessoais, senhas ou credenciais. Os dados atuais ficam somente no navegador usado.

## Multiusuário, vários leilões e agenda

A evolução prevista é transformar a aplicação em um pequeno sistema compartilhado com:

- cadastro operacional de vários usuários;
- vários leilões independentes;
- participantes por leilão;
- lotes separados por leilão;
- agenda de leilões e lembretes;
- histórico;
- sincronização entre celulares/computadores;
- exportação por leilão.

Enquanto não existir autenticação real, qualquer cadastro de usuário deve ser entendido apenas como **identificação operacional**, não como mecanismo de segurança.

## Publicação

Site público:

https://clovis-mariano-costa.github.io/sistema-thiago-leilao/

A publicação é feita pelo GitHub Pages a partir da branch `main`.

## Próxima etapa técnica

Para sincronização real entre vários usuários/dispositivos será necessário um armazenamento compartilhado. A opção preferencial para avaliação é um banco simples para web (por exemplo, Firebase/Firestore) ou, se houver vantagem operacional, um mini-backend separado no ecossistema Google.

O miniBackend existente `JUS9_DRIVE_SAVER_MVP` foi concebido para salvamento governado de documentos no Google Drive; ele não deve ser tratado automaticamente como banco transacional deste sistema sem uma adaptação específica.
