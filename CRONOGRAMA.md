# Cronograma — Sistema Thiago

Atualização: 02/10/2026  
Objetivo imediato: deixar o sistema operacional para Thiago acompanhar leilões até segunda-feira, sem perder a arquitetura para evolução multiusuário.

## Regra de origem dos dados

1. **Fonte oficial**: informação acompanhada da URL de origem governamental/oficial.
2. **Dados inseridos pelo usuário**: tudo que vier de conversa, imagem, digitação, anotação ou associação ainda não confirmada.
3. Uma informação nunca muda de "usuário" para "oficial" apenas porque parece plausível.
4. Valor FIPE, lance mínimo, nosso limite e valor final são campos diferentes.

## Cronograma até segunda-feira

### Módulo 01 — Base multi-leilão e agenda
**Janela:** 02/10  
**Estado:** IMPLEMENTADO NO MVP

- escolher qual leilão acompanhar;
- exibir data e referência;
- agenda de leilões;
- cadastrar novo leilão;
- foto/capa opcional;
- fonte e URL oficial;
- primeiro usuário operacional: Thiago;
- migração da versão antiga do navegador.

### Módulo 02 — Cadastro completo do lote
**Janela:** 02/10–03/10  
**Estado:** IMPLEMENTADO NO MVP / DADOS A REVISAR

Campos:

- lote;
- tipo;
- veículo/item;
- placa;
- marca/modelo;
- chassi;
- motor;
- ano;
- cor;
- combustível;
- valor FIPE;
- imagem do lote/veículo;
- lance mínimo;
- nosso máximo;
- resultado;
- valor final;
- observação;
- origem do dado e URL oficial quando houver.

### Módulo 03 — Veículo e FIPE em tela separada
**Janela:** 03/10  
**Estado:** IMPLEMENTADO NO MVP / VALIDAÇÃO EM ANDAMENTO

- catálogo das imagens fornecidas pelo usuário;
- selo "Dados inseridos pelo usuário";
- placa, chassi parcial, ano, cor, licenciamento e referência mostrada;
- lista das opções FIPE exibidas nas capturas;
- link exclusivo para consulta FIPE oficial;
- cadastro unitário de novas referências;
- importação em massa CSV/JSON;
- colunas adicionais preservadas;
- nenhuma opção é escolhida automaticamente como "a correta".

### Módulo 04 — Fontes oficiais de leilões
**Janela:** 03/10–04/10  
**Estado:** PRIMEIRA INTEGRAÇÃO IMPLEMENTADA

Fontes iniciais:

- DETRAN/SC;
- Calendário DETRAN/SC;
- Editais DETRAN/SC;
- Portal de Compras de Santa Catarina.

Próximo passo: extrair lotes dos editais descritivos e preparar importação para revisão humana antes do salvamento.

### Módulo 05 — Modo ao vivo
**Janela:** 04/10  
**Estado:** VERSÃO 2 IMPLEMENTADA / TESTE COM THIAGO PENDENTE

Inclui:

- seletor do leilão;
- data e referência;
- lote atual;
- preferência/prioridade;
- nosso máximo;
- botão LEILOADO reversível;
- botão Voltar;
- botão Preferência/Prioridade;
- botão Próximo;
- acesso aos dados do veículo/FIPE.

### Módulo 06 — Exportação e fechamento do leilão
**Janela:** 04/10  
**Estado:** IMPLEMENTADO NO MVP

- CSV por leilão;
- PDF/impressão;
- resultado opcional;
- histórico local.

### Módulo 07 — Teste de aceitação com Thiago
**Janela:** 05/10  
**Estado:** PENDENTE

Roteiro:

1. abrir o site no celular;
2. escolher leilão;
3. cadastrar leilão e lote;
4. testar foto;
5. testar preferência/prioridade;
6. testar modo ao vivo;
7. marcar leiloado;
8. preencher resultado opcional;
9. exportar CSV e PDF;
10. registrar ajustes necessários.

## Evolução logo após o MVP

### Módulo 08 — Login verdadeiro
**Estado:** PENDENTE DE CONFIGURAÇÃO EXTERNA

- Google;
- e-mail e senha;
- autenticação real;
- substituição do usuário local fixo.

### Módulo 09 — Participantes, convites e autorização
**Estado:** DEPENDE DO MÓDULO 08

Regra planejada:

- usuário autenticado não recebe acesso automático aos leilões anteriores;
- só enxerga leilões de que participa ou para os quais foi convidado;
- quem não participa de nenhum recebe um sistema em branco;
- funções: proprietário, administrador, participante e observador.

### Módulo 10 — Banco compartilhado e sincronização
**Estado:** DEPENDE DO MÓDULO 08

- vários celulares;
- persistência central;
- histórico;
- regras de acesso;
- auditoria mínima.

## Observação sobre segurança

A versão local atual não deve ser tratada como ambiente seguro. O login verdadeiro e as regras de acesso só serão considerados implementados depois que autenticação, banco e regras forem configurados e testados.
