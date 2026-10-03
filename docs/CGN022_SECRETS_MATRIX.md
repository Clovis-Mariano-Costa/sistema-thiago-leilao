# CGN-022 — matriz de secrets sem valores

| Superfície | Uso permitido | Armazenamento esperado | Proibido | Estado desta branch |
|---|---|---|---|---|
| GitHub Actions Secrets | CI/CD e publicação autorizada | Secrets do repositório/ambiente | HTML, JS, commit, issue, log | Não acessado |
| Supabase project secrets | Edge Functions/runtime Supabase | Secrets do projeto/Edge Function | Drive, GitHub, frontend | Não acessado |
| Cloudflare runtime secrets | Workers/Pages runtime | Secrets Store/variáveis protegidas | HTML público, Git, log | Não verificável sem console |
| OIDC | Federação CI/CD quando suportada | Trust policy + token efêmero | Credencial longa em arquivo | Não configurado nesta branch |
| Gmail OAuth / Send-As | Remetente institucional | Cofre/runtime autorizado | Drive, GitHub, logs | Parecer separado; envio real bloqueado |

## Regra

Esta matriz registra apenas nomes, finalidade, superfície e estado. Não registra valores, tokens, chaves, senhas, IDs privados ou cabeçalhos completos.

