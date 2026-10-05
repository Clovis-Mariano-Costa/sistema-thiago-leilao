-- ST-MNM-23A — registro canônico das fontes oficiais já aprovadas no catálogo público.
-- Mantém a lista extensível no banco e permite que source_documents/source_search_runs
-- referenciem somente fontes explicitamente cadastradas.

insert into public.official_sources
  (id,name,agency,scope,kind,url,search_url,method,status,last_verified,active,extra_data)
values
  (
    'detran-sc',
    'DETRAN/SC — Leilões',
    'Departamento Estadual de Trânsito de Santa Catarina',
    'Santa Catarina',
    'Leilões de veículos / editais',
    'https://www.detran.sc.gov.br/leiloes/',
    'https://www.detran.sc.gov.br/download-category/leiloes/',
    'Página e editais oficiais',
    'ATIVA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'compras-sc',
    'Portal de Compras SC',
    'Governo do Estado de Santa Catarina',
    'Santa Catarina',
    'Processos de compras, alienações e leilões',
    'https://sistemas.sc.gov.br/sea/portaldecompras/',
    'https://sistemas.sc.gov.br/sea/portaldecompras/processos_publicados_portal.asp',
    'Portal oficial de processos publicados',
    'ATIVA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'pncp',
    'PNCP',
    'Portal Nacional de Contratações Públicas',
    'Brasil',
    'Editais e contratações públicas',
    'https://pncp.gov.br/',
    'https://pncp.gov.br/app/editais',
    'Portal oficial nacional',
    'ATIVA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'prf-sc',
    'PRF/SC — Leilões',
    'Polícia Rodoviária Federal — Santa Catarina',
    'Santa Catarina',
    'Leilões de veículos recolhidos',
    'https://www.gov.br/prf/pt-br/assuntos/leiloes-prf/santa-catarina',
    'https://www.gov.br/prf/search?SearchableText=Leil%C3%A3o&origem=keyword',
    'Páginas e editais oficiais GOV.BR',
    'ATIVA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'receita-federal',
    'Receita Federal — Leilões',
    'Receita Federal do Brasil',
    'Brasil',
    'Mercadorias apreendidas ou abandonadas',
    'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/leilao',
    'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/leilao',
    'Sistema oficial de Leilão Eletrônico / e-CAC',
    'ATIVA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'florianopolis',
    'Prefeitura de Florianópolis — Licitações',
    'Município de Florianópolis',
    'Florianópolis/SC',
    'Licitações e eventuais leilões municipais',
    'https://www.pmf.sc.gov.br/',
    'https://www.pmf.sc.gov.br/',
    'Portal oficial municipal',
    'MONITORAR',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'sao-jose',
    'Prefeitura de São José — Publicações/Leilões',
    'Município de São José',
    'São José/SC',
    'Publicações legais e leilões municipais',
    'https://saojose.sc.gov.br/',
    'https://saojose.sc.gov.br/',
    'Portal oficial municipal',
    'MONITORAR',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'palhoca',
    'Prefeitura de Palhoça — Licitações',
    'Município de Palhoça',
    'Palhoça/SC',
    'Licitações e eventuais leilões municipais',
    'https://palhoca.atende.net/',
    'https://palhoca.atende.net/',
    'Portal oficial municipal',
    'MONITORAR',
    date '2026-10-02',
    true,
    '{}'::jsonb
  ),
  (
    'biguacu',
    'Prefeitura de Biguaçu',
    'Município de Biguaçu',
    'Biguaçu/SC',
    'Publicações e licitações municipais',
    'https://www.biguacu.sc.gov.br/',
    'https://www.biguacu.sc.gov.br/',
    'Portal oficial municipal — localização específica a validar',
    'VALIDAR_ROTA',
    date '2026-10-02',
    true,
    '{}'::jsonb
  )
on conflict (id) do update
set
  name=excluded.name,
  agency=excluded.agency,
  scope=excluded.scope,
  kind=excluded.kind,
  url=excluded.url,
  search_url=excluded.search_url,
  method=excluded.method,
  status=excluded.status,
  last_verified=excluded.last_verified,
  active=excluded.active,
  extra_data=public.official_sources.extra_data || excluded.extra_data,
  updated_at=now();
