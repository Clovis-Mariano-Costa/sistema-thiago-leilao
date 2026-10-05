-- ST-MNM-40B — persistir no backend as capacidades de conectores já comprovadas.
-- Não cria capability nova; apenas espelha o registro público vigente em official-sources.js.
-- Preserva qualquer outro conteúdo existente em extra_data.

update public.official_sources
set extra_data = coalesce(extra_data,'{}'::jsonb) || jsonb_build_object(
  'lotsConnector',
  case id
    when 'prf-sc' then 'prf-pdf'
    when 'pncp' then 'pncp'
    when 'compras-sc' then 'pncp-detran'
  end
)
where id in ('prf-sc','pncp','compras-sc');
