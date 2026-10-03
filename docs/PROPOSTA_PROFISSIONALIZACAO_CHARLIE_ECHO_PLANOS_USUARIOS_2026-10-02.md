# Proposta — profissionalização do Sistema Thiago

**Estado:** PROPOSTA PARA CONVERSA — NÃO IMPLEMENTAR AUTOMATICAMENTE AS REGRAS COMERCIAIS OU DE AUTORIDADE SEM APROVAÇÃO HUMANA.

**Data de referência:** 2026-10-02

## 1. Princípios preservados

1. A qualidade essencial do plano gratuito não será degradada.
2. O que varia entre planos é volume, fluxo, armazenamento, usuários, prioridade, integrações, automações, auditoria, suporte e garantias.
3. Segurança-base, correções essenciais e confiabilidade não podem ser negadas ao gratuito.
4. Inteligência artificial auxilia, mas não substitui autoridade humana.
5. Toda importação automática deve preservar fonte, proveniência, data, diagnóstico e revisão humana.

## 2. Arquitetura de autoridade proposta

### Camada Plataforma Jus 9
- platform_owner — autoridade máxima da plataforma.
- platform_admin — administração delegada.
- support_analyst — suporte, sem acesso indiscriminado ao conteúdo dos clientes.
- none — usuário comum.

**Regra de bootstrap:** o primeiro titular de autoridade máxima deve ser provisionado de forma controlada. Não usar simplesmente “quem se cadastrou primeiro” por contagem de linhas em produção, para evitar corrida de cadastro ou tomada indevida de autoridade.

A conta fundadora atual poderá ser promovida manualmente a platform_owner após confirmação segura da identidade.

### Camada Workspace / Conta de cliente
- owner — proprietário do workspace.
- admin — administra membros e configurações.
- manager — coordena operação.
- operator — trabalha em leilões e lotes.
- viewer — somente consulta.

Um usuário não pode conceder papel superior ao próprio.

### Tipo do workspace
- individual
- company
- nonprofit_social
- public_institution
- jus9_internal

O “tipo do usuário” mostrado no cadastro deve ser tratado separadamente do papel de autoridade. Uma pessoa pode representar uma empresa, uma entidade social ou a Jus 9 sem que isso automaticamente a torne administradora.

## 3. Convites

Fluxo proposto:
1. owner/admin informa e-mail;
2. escolhe papel permitido;
3. escolhe workspace e, opcionalmente, leilões específicos;
4. sistema grava convite pendente com expiração;
5. e-mail contém link de convite;
6. convidado cria conta ou entra pelo Google;
7. o e-mail precisa estar verificado e ser o mesmo do convite;
8. convite é aceito e vinculado ao UID;
9. auditoria registra quem convidou, quando e qual papel foi concedido.

Convites e criação administrativa devem acontecer server-side. Nunca expor service-role no navegador.

## 4. Charlie Echo

Charlie Echo deve entrar como **agente de serviço governado**, não como usuário humano.

### Pode auxiliar em:
- leitura e estruturação de editais;
- extração de lotes;
- validação cruzada de campos importados;
- identificação de divergências e dados faltantes;
- consulta assistida de FIPE;
- resumo de condições, taxas e prazos do leilão;
- cenários de custo total de aquisição;
- organização de preferências e alertas;
- modo ao vivo com resumo conciso do próximo lote;
- relatório pós-leilão;
- suporte de uso do sistema;
- medição de tokens e custo técnico da própria IA.

### Não deve fazer autonomamente:
- elevar papel de usuário;
- aprovar gratuidade social;
- alterar plano comercial;
- autorizar cobrança;
- efetuar lance em nome do usuário;
- apagar dados críticos;
- decidir conflito de autorização.

Toda execução IA deve registrar:
- usuário solicitante;
- workspace;
- ação;
- modelo/provedor;
- tokens de entrada e saída;
- fontes consultadas;
- estimativa de custo;
- resultado;
- necessidade de revisão;
- confirmação humana quando aplicável.

## 5. Planos propostos para o Sistema Thiago

A matriz institucional existente da Jus 9 já possui valores de referência. Para este produto, proposta inicial de apresentação:

| Camada | Referência | Papel |
|---|---:|---|
| Gratuito / Profissional Pequeno | R$ 0,00 | alta qualidade, volume limitado |
| Padrão / Profissional Médio | R$ 99,90/mês | primeiro pago padrão |
| Profissional Grande | R$ 299,90/mês | uso individual robusto |
| Equipe / Escritório | R$ 599,99/mês | multiusuário e operação compartilhada |

Institucional e Enterprise permanecem sob consulta e fora da primeira tela comercial.

**Atenção:** valores são referência interna até vistas jurídicas/contábeis e decisão humana de publicação.

## 6. Medição de uso

Não cobrar “qualidade”. Medir consumo.

### Medidores visíveis ao usuário
- uso de IA;
- pesquisas oficiais;
- PDFs/editais processados;
- automações executadas;
- armazenamento usado;
- quantidade de leilões/lotes ativos;
- quantidade de usuários do workspace.

### Medidores internos
- tokens de entrada/saída;
- custo estimado por provedor/modelo;
- tempo de função;
- bytes de Storage;
- carga de banco;
- erros/retries;
- custo médio por usuário/workspace.

Evitar cobrar diretamente por consulta SQL ou leitura de banco. Esses sinais são úteis para custo interno, mas a cobrança ao usuário deve corresponder a unidades compreensíveis de valor.

## 7. Avisos de limite

Proposta:
- 70% — informativo;
- 85% — aviso;
- 95% — aviso crítico;
- 100% — limite do período.

No gratuito, ao atingir o limite:
- não degradar modelo/qualidade;
- manter login, leitura dos próprios dados, segurança e exportação;
- pausar recursos de custo variável quando necessário;
- permitir solicitar ampliação gratuita;
- oferecer migração para plano pago.

Nos pagos, não gerar cobrança excedente sem opt-in explícito.

## 8. Gratuidade ampliada e responsabilidade social

Criar solicitação formal de benefício social.

Campos mínimos:
- tipo de atividade social;
- entidade/projeto vinculado, se houver;
- descrição objetiva do trabalho;
- evidência documental ou link público;
- período da atividade;
- declaração de veracidade;
- consentimento para análise.

Charlie Echo pode:
- verificar completude;
- resumir os documentos;
- apontar inconsistências objetivas.

Charlie Echo **não decide** aprovação. A decisão é humana.

Estados:
- draft
- submitted
- under_review
- needs_information
- approved
- denied
- expired

Benefício deve ter revisão periódica e prazo de validade.

## 9. E-mails @jus9tecnologia.com.br

Depois da confirmação do e-mail:
1. detectar domínio exato jus9tecnologia.com.br;
2. marcar usuário como candidato a gratuidade interna ampliada;
3. criar evento de revisão para suporte;
4. notificar suporte@jus9tecnologia.com.br;
5. suporte define o patamar de gratuidade;
6. decisão fica auditada.

Não conceder autoridade administrativa apenas pelo domínio.

Sugestão de patamares independentes dos planos comerciais:
- free_base
- free_extended
- free_social
- free_internal
- free_internal_high

Os limites quantitativos de cada patamar só devem ser definidos após telemetria real.

## 10. Dados necessários

Novas entidades propostas:
- workspaces
- workspace_members
- workspace_invitations
- plans
- subscriptions
- entitlements
- usage_events
- usage_periods
- quota_overrides
- social_benefit_requests
- support_notifications
- ai_runs
- ai_agent_permissions
- billing_events
- audit_log (ampliar o existente)

## 11. E-mail transacional

Para venda/convites em produção, o SMTP padrão de desenvolvimento não é suficiente.

Precisamos decidir e configurar serviço transacional próprio para:
- confirmação;
- recuperação de senha;
- convite;
- alertas de segurança;
- aviso de limite;
- notificação ao suporte.

Manter e-mail de autenticação separado de marketing.

## 12. Decisões a conversar antes de implementar

1. Confirmar nomes finais dos papéis.
2. Confirmar se workspace individual e empresarial compartilharão a mesma estrutura.
3. Confirmar os três planos pagos e nomes comerciais.
4. Definir quotas reais após medição de custo.
5. Definir patamares de gratuidade social/interna.
6. Definir periodicidade de revisão da gratuidade ampliada.
7. Definir provedor de e-mail transacional.
8. Definir gateway de pagamento.
9. Definir quais funções da Charlie Echo entram na primeira versão.
10. Definir MFA obrigatório para platform_owner/admin.
11. Migrar localStorage para Supabase antes de vender como multiusuário.

## 13. Mudanças já autorizadas e de baixo risco

- senha da interface alinhada ao Supabase: mínimo 8 + minúscula + maiúscula + número + símbolo;
- OAuth Google documentado como configurado, pendente de teste ponta a ponta;
- nenhuma regra comercial/autoridade desta proposta foi aplicada ao banco ainda.
