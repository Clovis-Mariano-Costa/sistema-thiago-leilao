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
| DETRAN/SC 1600/2026 | 822 | 822 | 822 | success + documento |
| **Total** | **2.893** | **2.893** | **2.893** | alinhado por resultId |

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

1. manter CI, Worker dry-run e advisors como sentinelas;
2. corrigir findings pós-merge antes de ampliar capacidade;
3. não criar conector novo sem fonte oficial delimitada, parser específico, proveniência e caso real;
4. melhorar observabilidade e recuperação sem mutação automática destrutiva;
5. atualizar este cronograma sempre que um pacote alterar o estado material.

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
