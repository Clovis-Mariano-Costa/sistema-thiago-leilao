-- RECONCILIACAO DE HISTORICO — 2026-10-04
-- Versao alinhada ao historico remoto Supabase 20261002223728.
-- O SQL historico original nao foi localizado no Git.
-- Estado remoto verificado: extensao http 1.6 instalada no schema extensions.
-- Reconstrucao idempotente do estado observado; nao representa alegacao de texto historico original.

create extension if not exists http with schema extensions;
