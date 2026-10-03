# CGN-022 — registro técnico de execução

**Branch:** `codex/cgn022-thiago-execution`  
**Base:** `origin/main` em 2026-10-03  
**Estado:** protótipo sintético e evidência local; sem deploy e sem alteração de produção.

## Identificadores

| Item | REQUEST_ID | Estado operacional |
|---|---|---|
| Sistema Thiago — Auth/imagens/FIPE/convites/quotas/Echo | `REQ-THIAGO-AUTH-IMAGENS-FIPE-2026-10-03-001` | documental aceito com restrições |
| Sistema Thiago — arquitetura Cloudflare/Supabase | `REQ-MESTRE-ARQ-SISTEMA-THIAGO-CLOUDFLARE-2026-10-02-001` | parecer + descoberta |
| Cibersegurança seriada | `REQ-CYBER-MNM-SERIADO-2026-10-02-001` | gates sintéticos nesta branch |
| CI core | `REQ-MNM-GITHUB-CI-CORE-2026-10-02-001` | teste reproduzível |
| Guardia Echo | `REQ-GUARDIA-ECHO-2026-10-01-001` | protótipo sintético nesta branch |
| Inventário de automações | `REQ-MNM-TOTAL-MESTRE-2026-10-02-001` | revalidação por delta |

## Alvo confirmado

`Clovis-Mariano-Costa/sistema-thiago-leilao`, público, branch principal `main`, com workflows `Testar aplicação` e `Publicar site`. O cofre relacionado `Jus-9/cofre-sistema-thiago-leilao` é privado e não foi aberto nem alterado.

## Evidência CI

- Execução local em `origin/main`: 12 testes PASS.
- Falha histórica `37097786510`: 11 PASS / 1 FAIL em `mao-na-massa-landing`, causada pela ausência de `id="userPill"` na versão daquele branch.
- Execuções posteriores em `main` e `mao-na-massa-multi-itens-2026-10-03`: PASS.
- A falha histórica não deve ser confundida com falha atual nem com falha de deploy.

## Limites

Os protótipos desta branch usam fixtures sintéticas. Não contêm segredo, credencial, imagem real, token, alteração de ACL, mudança de visibilidade, migração ou chamada a Supabase/Cloudflare.

## Gates PRE/POST

**PRE:** branch isolada, base registrada, working tree limpo, fixtures sintéticas.  
**Ação:** executar somente testes locais determinísticos.  
**POST:** `npm test`, `git diff --check`, diff e estado da branch registrados.  
**Rollback:** descartar a branch/PR sem tocar `main`.

