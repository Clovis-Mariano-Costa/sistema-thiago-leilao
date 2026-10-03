# Segurança e autenticação — Sistema Thiago

Estado: MVP em endurecimento — 2026-10-03.

## O que já está ativo

- Supabase Auth para e-mail/senha.
- Confirmação de e-mail antes do acesso a leilões compartilhados.
- Row Level Security (RLS) por leilão.
- Papéis previstos: owner, admin, participant, observer.
- Perfil separado por usuário.
- Avatar em bucket privado, limitado a JPG/PNG/WebP e 2 MB.
- Importador PNCP protegido por sessão real e e-mail confirmado.
- Publishable key no navegador; nenhuma service-role key ou segredo administrativo no repositório.
- Lotes extraídos automaticamente recebem aviso de revisão.
- Backup JSON local disponível.
- Backup/sincronização transitória por usuário autenticado em Supabase, protegida por RLS.
- Bucket `auction-media` privado com políticas por leilão e papel.
- GitHub Actions executa testes a cada push.

## Política de senha

A interface exige:

- mínimo de 8 caracteres;
- pelo menos uma letra minúscula;
- pelo menos uma letra maiúscula;
- pelo menos um número;
- pelo menos um símbolo;
- confirmação idêntica.

A mesma regra deve ser configurada também no Supabase Dashboard em Authentication > Providers > Email / Password security. A validação do navegador é uma ajuda ao usuário; a regra do provedor é a barreira de servidor.

A proteção de senha vazada do Supabase é recurso de plano pago. Não ativar upgrade sem autorização humana expressa.

## Confirmação e URLs

No Supabase Dashboard, configurar URL de site/redirects para os ambientes usados:

- https://clovis-mariano-costa.github.io/sistema-thiago-leilao/
- https://clovis-mariano-costa.github.io/sistema-thiago-leilao/auth.html
- https://sistema.thiago.jus9verde.jus9tecnologia.com.br/
- https://sistema.thiago.jus9verde.jus9tecnologia.com.br/auth.html

## Google OAuth

A Jus 9 já possui projeto Google Cloud institucional com login público usando somente openid, email e profile.

Para o Sistema Thiago, foi criado um **OAuth Client ID do tipo Web application separado** dentro do mesmo projeto Google Cloud institucional.

Authorized JavaScript origins:

- https://clovis-mariano-costa.github.io
- https://sistema.thiago.jus9verde.jus9tecnologia.com.br

Authorized redirect URI do Google para o Supabase:

- https://mnwsyiglxhvblxzimook.supabase.co/auth/v1/callback

No Supabase Dashboard > Authentication > Providers > Google, o provedor já foi habilitado, com Client ID e Client Secret inseridos diretamente no painel. O Client Secret continua proibido em GitHub, HTML, print ou chat. O fluxo humano de login Google já foi validado; mudanças futuras em domínio ou redirect precisam repetir o teste ponta a ponta.

## Persistência em transição

O navegador mantém uma cópia em `localStorage` para funcionamento rápido, mas contas autenticadas e confirmadas passam a ter também um snapshot online em Supabase, isolado por `user_id` e RLS. Isso reduz o risco de perda por troca de domínio/dispositivo, mas ainda não substitui o modelo relacional canônico de leilões, lotes e itens.

Enquanto a migração operacional não terminar:

- dados locais continuam separados por navegador e origem/domínio;
- GitHub Pages e o domínio customizado têm `localStorage` diferentes;
- o snapshot online serve como ponte de recuperação/sincronização, não como banco final;
- outra pessoa com acesso ao mesmo perfil do navegador pode ler a cópia local;
- material sigiloso deve usar somente os fluxos privados previstos;
- o modelo relacional Supabase deverá ser a fonte canônica antes de declarar o sistema multiusuário concluído.

Abas abertas no mesmo domínio recebem atualização automática por evento `storage`.

## Próximos hardenings gratuitos/candidatos

- configurar no servidor a mesma política forte de senha;
- Cloudflare Turnstile ou hCaptcha para cadastro/login/recuperação;
- MFA/TOTP para owner/admin depois do fluxo básico estar estável;
- rate limit do importador oficial;
- migrar leilões/lotes de localStorage para Supabase;
- Content Security Policy e headers no domínio Cloudflare;
- matriz de testes owner/admin/participant/observer;
- revisar logs e auditoria sem expor PII.

## Proveniência

Dados extraídos de fonte oficial não dispensam revisão humana. O sistema deve sempre preservar:

- URL da fonte;
- documento usado;
- data da consulta;
- diagnóstico do parser;
- marcador needsReview quando houver extração automática.

Antes de dar lance ou tomar decisão, conferir o lote no edital/documento oficial vigente.


## Segredos e CI/CD

Arquitetura adotada:

- navegador recebe apenas configuração pública, como URL do projeto e publishable key com RLS;
- Supabase Project Secrets guardam credenciais consumidas por Edge Functions;
- Cloudflare Secrets guardam credenciais usadas por Workers/Pages Functions;
- GitHub Actions Secrets recebem somente o necessário ao pipeline;
- quando o provedor permitir, preferir identidade federada/OIDC e credenciais de curta duração em vez de segredo permanente.

Arquivos locais de segredo devem ficar fora do Git:

- `.env` e `.env.*` reais;
- `.dev.vars` e `.dev.vars.*`;
- estado local do Wrangler em `.wrangler/`.

Exemplos sanitizados como `.env.example` podem ser versionados sem valores reais.
