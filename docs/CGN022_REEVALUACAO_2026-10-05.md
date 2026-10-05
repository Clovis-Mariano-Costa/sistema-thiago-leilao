# CGN-022 — reavaliação sobre o main vigente

Data: 2026-10-05

## Decisão

O antigo PR #11 não foi mesclado porque ficou centenas de commits atrás do main. A reavaliação encontrou dois controles que ainda não possuíam equivalente no repositório atual e continuam úteis como bibliotecas fail-closed:

1. Guardia/JIT sintética para acesso temporário a material classificado;
2. publication gate para impedir publicação de material sigiloso/secreto ou com marcadores de não publicação.

## Alterações em relação ao protótipo antigo

- classificação desconhecida agora bloqueia publicação;
- aprovação exige timestamp válido dentro da janela do pedido;
- leitura exige timestamp válido;
- material não-PUBLIC continua fail-closed;
- alerta não transporta texto livre de `reason`, reduzindo risco de registrar segredo por acidente;
- nenhum segredo, credencial, ACL, RLS, tabela ou deploy é alterado.

## Escopo

Estes módulos são guardrails de aplicação/teste. Eles não substituem RLS, Auth, Storage policies, revisão humana ou controles de infraestrutura.
