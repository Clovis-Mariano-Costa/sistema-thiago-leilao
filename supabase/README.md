# PoC de persistência — Supabase

Este diretório prepara a próxima etapa do Sistema Thiago sem colocar credenciais no repositório público.

## Objetivo

Validar com **dados sintéticos**:

1. login Google e e-mail/senha;
2. criação de um leilão pelo proprietário;
3. convite de um segundo usuário;
4. dois usuários visualizando o mesmo leilão;
5. terceiro usuário autenticado vendo **sistema em branco**;
6. gravação e edição de lotes;
7. foto privada vinculada ao leilão;
8. RLS bloqueando acesso indevido;
9. exportação/backup antes de migrar dados locais reais.

## Arquivo

- `001_initial_schema.sql`: tabelas, relações, índices, funções de autorização e políticas RLS iniciais.

## Modelo de acesso

Conta autenticada **não** significa acesso a todos os leilões.

Acesso é determinado por:

- `auctions.owner_id`; ou
- `auction_members(auction_id,user_id,role)`.

Papéis:

- `owner`
- `admin`
- `participant`
- `observer`

`participant` pode trabalhar nos lotes. `observer` apenas visualiza. Alterações de membros/leilões ficam reservadas a `owner/admin`.

## Proveniência

Leilões, lotes e referências FIPE possuem campos para:

- `source_type`;
- `official_url`;
- `official_payload`;
- `source_evidence`;
- `extra_data`.

Assim, novas fontes podem adicionar campos sem perda de informação.

## Arquivos

O bucket privado previsto chama-se `auction-media`.

Nesta primeira versão, as políticas de Storage ficam propositalmente para o próximo gate: primeiro validaremos usuários e IDs reais, depois aplicaremos a política baseada no primeiro segmento do caminho `<auction_uuid>/...`.

## Segurança

Nunca colocar no GitHub:

- senha;
- service role key;
- segredo OAuth;
- token privado;
- `.env` real.

A chave pública/anon de um projeto Supabase não substitui RLS. Mesmo quando usada no frontend, o banco deve permanecer **fail closed** por políticas.

## Próximo gate

Após criar/conectar um projeto Supabase de teste:

1. aplicar `001_initial_schema.sql`;
2. criar três usuários de teste;
3. testar matriz de permissões;
4. aplicar políticas de Storage;
5. criar adapter do frontend;
6. migrar **uma cópia** de um leilão de teste;
7. somente depois avaliar migração dos dados reais atuais.

## Grants explícitos da Data API

Desde 20261005044030_explicit_data_api_grants_for_future_public_objects.sql, novas tabelas e sequences criadas por postgres no schema public não recebem automaticamente os grants de Data API que o frontend precisaria.

Regra para toda nova migration:

1. criar a tabela/sequence;
2. habilitar RLS quando o objeto estiver em schema exposto;
3. declarar somente os GRANT necessários para anon, authenticated e/ou service_role;
4. criar as policies RLS correspondentes;
5. verificar Security Advisor e o fluxo real do cliente.

Falta de GRANT deve falhar fechado. Nunca corrigir erro de acesso concedendo privilégios amplos sem revisar RLS e o papel real do cliente.
