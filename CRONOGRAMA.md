# Cronograma operacional — Sistema Thiago

Atualização canônica: 05/10/2026  
Modo de execução: **Mão na Massa Seriado / event-driven**  
Regra: **fato comprovado != plano; merge != deploy; snapshot != banco relacional; CI != gate humano**.

## Estado executivo

O MVP já ultrapassou o cronograma original de 02/10. O sistema possui autenticação real, RLS, snapshot online, banco relacional, Storage privado, importadores oficiais, proveniência por run/documento, Integridade, participantes/convites e Modo ao Vivo. O trabalho atual é de **endurecimento, prova de produção e gates humanos**.

### Evidência oficial canônica atual

| Resultado oficial | Snapshot | Lots relacionais | Lot items | Proveniência |
| --- | ---: | ---: | ---: | --- |
| PRF/SC 02/2026 | 1.331 | 1.331 | 1.331 | success + documento |
| DETRAN/SC 1500/2026 | 740 | 740 | 740 | success + documento |
| DETRAN/SC 1600/2026 | 822 | 822 | 822 | success + documento; existe run posterior órfão preservado |
| DETRAN/SC 0013/2026 | não reconfirmado nesta varredura | 0 | 0 | 489 encontrados em success + documento; write-through relacional pendente |
| **Total relacional oficial** | — | **2.893** | **2.893** | três resultados canonizados |
| **Total com prova backend por resultId** | — | — | — | **3.382 lotes** em quatro resultados |

A tela Integridade mede evidência por resultado oficial, sem somar processos distintos de uma mesma fonte.

## Fases concluídas com evidência

### Fase A — Autenticação, isolamento e persistência
**Estado: CLOSED_WITH_EVIDENCE técnico**

- autenticação real Supabase;
- e-mail confirmado exigido nas superfícies protegidas;
- contas começam isoladas;
- snapshot online por usuário;
- modelo relacional auctions → lots → lot_items;
- RLS e grants de menor privilégio;
- recuperação local/cloud com bloqueio de autosync em conflito;
- migrations Git ↔ Supabase reconciliadas.

### Fase B — Importação oficial e proveniência
**Estado: CLOSED_WITH_EVIDENCE para os três resultados acima**

- PRF/PDF comprovado;
- PNCP + documento DETRAN comprovado;
- source_search_runs e source_documents;
- idempotência relacional;
- preservação de campos confirmados pelo humano;
- recibo da importação com IDs de evidência;
- reconciliação snapshot-only → banco relacional concluída para DETRAN 1500 e 1600.

### Fase C — Governança de conectores
**Estado: CLOSED_WITH_EVIDENCE técnico**

- capabilities persistidas em official_sources.extra_data;
- backend é autoridade da capability;
- UI falha fechado quando backend está ausente ou diverge do catálogo;
- Edge pncp-lots também valida fonte ativa + capability antes da telemetria;
- chamada direta à Edge não contorna a governança;
- PNCP continua exigindo coordenadas compatíveis;
- PRF/PDF permanece restrito à fonte PRF/SC.

### Fase D — Observabilidade e Integridade
**Estado: ACTIVE / maturidade crescente**

- paridade snapshot × relacional;
- contagem canônica por leilão;
- cobertura de runs/documentos por fonte;
- ciclo de vida do último run separado da prova histórica;
- evidência por resultId;
- capability backend × catálogo;
- readiness de papéis/convites/auditoria;
- Reconciliação assistida para duplicidade de Base inicial.

### Fase E — Infraestrutura pública
**Estado: CLOSED_WITH_EVIDENCE para produção**

- GitHub CI;
- build público sanitizado;
- Cloudflare Pages;
- Worker dry-run;
- Workers Builds de produção;
- domínio oficial respondendo;
- preview de branch não é critério de saúde da produção.

## Gates que continuam abertos

### P2 — ST-MNM-24B: matriz multiusuário real
**Estado: HUMAN_GATE**

Executar com identidades reais e e-mail confirmado:
1. owner;
2. admin;
3. participant;
4. observer;
5. outsider.

Provar:
- convite;
- aceite;
- revogação;
- leitura autorizada/negada;
- edição autorizada/negada;
- audit_log correspondente.

**Regra:** não fabricar contas para declarar o gate concluído.

### P3 — ST-MNM-25B: Modo ao Vivo no celular
**Estado: PHYSICAL_MOBILE_GATE**

No aparelho real:
1. abrir o sistema;
2. selecionar leilão;
3. editar preferência/prioridade;
4. editar nosso máximo;
5. avançar/voltar/pular;
6. marcar e desfazer leiloado;
7. consultar veículo/FIPE/foto;
8. recarregar;
9. confirmar snapshot + banco relacional;
10. validar conflito local/cloud quando aplicável.

**Regra:** emulação não substitui o smoke físico.

### P5 — proteção contra senhas vazadas
**Estado: EXTERNAL_PLAN_GATE**

Security Advisor aponta apenas `Leaked Password Protection Disabled`. A organização Supabase está no plano Free e essa proteção exige plano compatível. Não substituir por mudança arbitrária de senha mínima nem por migration de banco.

### Base inicial duplicada
**Estado: ASSISTED_RECONCILIATION**

- novas duplicações são bloqueadas de forma idempotente/fail-closed;
- duplicatas históricas não devem ser apagadas por antiguidade;
- Integridade oferece Reconciliação assistida por suporte;
- antes de consolidar: escolher survivor com prova campo a campo, preservar lot_items/mídias, registrar auditoria e vincular snapshot ao relationalAuctionId canônico.

## Próxima ordem técnica enquanto gates humanos aguardam

1. concluir o write-through governado do DETRAN/SC 0013/2026 (489 lotes) e provar idempotência sem SQL ad hoc — issue #1;
2. reconciliar a telemetria órfã do DETRAN/SC 1600 sem apagar histórico nem convertê-la silenciosamente em success — issue #101;
3. executar reconciliação assistida das duas cópias da Base inicial antes de qualquer exclusão — issue #102;
4. manter ST-MNM-24B/P2 e ST-MNM-25B/P3 como gates humanos reais; não fabricar identidades nem smoke físico;
5. manter Leaked Password Protection como gate externo de plano/configuração — issue #71;
6. reavaliar o protótipo CGN-022 somente em branch limpa baseada no main vigente — issue #103;
7. manter CI, Worker dry-run e advisors como sentinelas; não remover índices apenas por aviso de unused index em ambiente ainda jovem;
8. não criar conector novo sem fonte oficial delimitada, parser específico, proveniência e caso real;
9. atualizar este cronograma sempre que um pacote alterar o estado material.

## Regra de Harmonia Perfeita

- exatamente uma cabeça primária por objeto/superfície;
- outra trilha pode auditar e produzir evidência, mas não mutar os mesmos arquivos/objetos simultaneamente;
- quando o main avançar durante um pacote, reconciliar ou recriar sobre o main; nunca force-merge;
- dependência externa bloqueia somente o pacote dependente;
- documentação de continuidade deve refletir o estado real após cada espira material.

## Referências operacionais

- Produção: https://sistema.thiago.jus9verde.jus9tecnologia.com.br/
- Integridade: /integridade.html
- Fontes oficiais: /fontes-oficiais.html
- Participantes e convites: /convites.html
- Recuperação legada: /recuperar-legado.html

## Varredura integral — ST-MNM-42A a ST-MNM-42D — 05/10/2026

### Fechado com evidência

- **ST-MNM-42A / PR #98:** pncp-detran passou a priorizar o edital oficial DETRAN antes dos PDFs PNCP. Edge implantada como v14 e readback confirmado.
- **ST-MNM-42B / PR #99:** Integridade distingue run ativo de run started possivelmente órfão após 10 minutos, sem mutar telemetria histórica.
- **ST-MNM-42C / PR #100:** finishSourceRun preserva metadata inicial ao finalizar; connector, requestedBy e demais campos de abertura deixam de ser perdidos. Edge implantada como **v15**, com verify_jwt=true e readback do mergedMetadata.
- **PR #11 / CGN-022:** fechado como SUPERSEDED_WITH_CONTINUITY; branch estava 276 commits atrás do main. Continuidade transferida para issue #103.

### Estado real do banco nesta varredura

- 5 auctions relacionais: 3 oficiais + 2 cópias históricas da Base inicial.
- 2.967 lots e 2.968 lot_items no total.
- Base inicial A: 37 lots / 38 lot_items.
- Base inicial B: 37 lots / 37 lot_items.
- auction_members=0, invitations=0; portanto P2 continua humano.
- DETRAN 0013/2026 possui múltiplos runs success com **489** lotes e documento, mas ainda sem auction relacional.
- DETRAN 1600/2026 conserva prova success de **822** lotes e um run posterior órfão ligado ao incidente CPU Time exceeded / HTTP 546.
- Security Advisor: único WARN continua Leaked Password Protection Disabled.
- Performance Advisor: somente INFO de índices ainda não usados; não é autorização para removê-los.

### Pendências canônicas abertas

- **#1** — concluir DETRAN 0013/2026 no relacional e provar idempotência.
- **#101** — reconciliar run órfão do DETRAN 1600 de forma auditável.
- **#102** — reconciliar as duas Bases iniciais sem escolha automática por antiguidade.
- **#103** — reavaliar Guardia/publication gates do CGN-022 sobre o main atual.
- **#7 / #4** — matriz multiusuário real e papéis/convites.
- **#2 / #20** — smoke físico móvel e recuperação/mídias no aparelho.
- **#71** — Leaked Password Protection / plano Supabase.
- **#5** — atualização contínua de fontes oficiais permanece trilha contínua.

### Regra de continuidade após a varredura

Pendência humana ou externa bloqueia somente sua própria trilha. O trabalho técnico pode continuar em observabilidade, documentação, segurança fail-closed e preparação de reconciliação, desde que não fabrique identidades, sessão autenticada, decisão humana de survivor ou smoke físico.

## ST-MNM-43 — fechamento técnico e gates humanos — 05/10/2026

### Encerrado tecnicamente

- **ST-MNM-42E / PR #105:** observabilidade por resultId usa a mesma classificação de run órfão da visão por fonte. CI + Worker dry-run verdes.
- **ST-MNM-43A / PR #106:** CGN-022 foi reavaliado sobre o main vigente e integrado com Guardia/JIT sintética + publication gate fail-closed endurecidos. CI + Worker dry-run verdes.
- **Issue #101:** run órfão DETRAN 1600 reconciliado como `error`, nunca `success`, preservando causa HTTP 546 / CPU Time exceeded e executionId na metadata.
- **Issue #103:** fechado após integração limpa do CGN-022.
- **Issue #7 / M13:** PoC multiusuário real passou **12/12** com três usuários confirmados já existentes; dados sintéticos foram removidos. Storage privado foi validado em transação com rollback.
- **Issue #5 / M11:** registro extensível de fontes oficiais + capabilities existentes + rotina diária condicional de monitoramento oficial estão operacionais.
- **Issue #71 / P5:** organização Supabase está no plano Free; documentação atual exige Pro+ para Leaked Password Protection. Gate fechado como limitação documentada do plano, sem upgrade/custo automático.
- **M14 técnico:** 37 vínculos `lot_media` criados para a segunda Base inicial; todos apontam para objetos privados existentes, sem mover propriedade e sem exclusão.

### Gates que não podem ser fabricados

- **#1 — AUTH_SESSION_GATE:** DETRAN 0013/2026 já tem 489 lotes comprovados em backend, mas exige sessão autenticada real para write-through governado + repetição idempotente.
- **#4 — HUMAN_GATE navegador:** backend/RLS passou; falta repetir owner/admin/participant/observer/outsider com sessões reais separadas na interface.
- **#2 — HUMAN_GATE celular:** falta smoke físico do Modo ao Vivo no aparelho.
- **#20 — HUMAN_GATE celular:** recuperação no navegador/aparelho original e canonização final das mídias após decisão de conta.
- **#102 — HUMAN_GATE propriedade:** as duas Bases iniciais pertencem a contas diferentes; há evidências conflitantes/associações `requires_review`. Nenhum survivor deve ser escolhido automaticamente.

### Estado de governança

- Não existem PRs técnicos abertos ao fim desta espira.
- Pendência humana bloqueia apenas a própria trilha.
- Não fabricar JWT, sessão, usuário, decisão de titularidade ou smoke físico.
- Não fazer write-through DETRAN 0013 por SQL ad hoc.
- Não mover dados/mídia entre contas até confirmação explícita de propriedade e conta canônica.
- Ao receber a presença humana necessária, executar cada gate e fechar o respectivo issue imediatamente após evidência.
