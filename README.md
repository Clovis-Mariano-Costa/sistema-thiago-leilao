# Sistema Thiago — Controle de Leilão

Painel web **mobile first** para acompanhar, durante o leilão, os lotes previamente selecionados nas conversas de 01/10 e 02/10.

## Estado atual

A primeira base contém **37 lotes pré-cadastrados** a partir do material recebido. Ao abrir a página, os lotes já aparecem; não é necessário cadastrá-los manualmente.

## Funcionalidades

- Status `Aguardando` / `Leiloado` com possibilidade de desfazer.
- Marcação independente de `★ Preferência`.
- Resultado pós-leilão **opcional**: arrematado por nós, arrematado por outro, não vendido, desistimos, sem interesse ou outro.
- Observação livre e opcional por lote.
- Destaque automático do próximo lote ainda não leiloado.
- Busca por lote, veículo, resultado ou observação.
- Filtros por aguardando, preferências e leiloados.
- Contadores e barra de progresso.
- Imagens de referência associadas aos lotes.
- Persistência local pelo `localStorage` do navegador.
- Identidade visual com o logo fornecido.
- Layout responsivo, desenvolvido com prioridade para celular.

## Publicação

O site é estático. A raiz do repositório pode ser publicada diretamente pelo GitHub Pages.

## Próxima etapa recomendada

Hoje o andamento fica salvo apenas no navegador/dispositivo usado. Para sincronizar o mesmo leilão entre dois celulares ou computadores, a próxima evolução deve incluir autenticação e banco de dados/backend.

> Atenção: algumas imagens de referência podem conter placa, chassi ou outros dados. Antes de tornar o site publicamente acessível, é recomendável decidir se as imagens permanecerão públicas ou se o painel será restrito.
