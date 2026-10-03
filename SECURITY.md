# Segurança e autenticação — Sistema Thiago

Estado: MVP em endurecimento — 2026-10-02.

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

No Supabase Dashboard > Authentication > Providers > Google, o provedor já foi habilitado, com Client ID e Client Secret inseridos diretamente no painel. O Client Secret continua proibido em GitHub, HTML, print ou chat. Falta apenas a validação ponta a ponta do login Google.

## Risco ainda aberto: localStorage

A autenticação **não protege** os dados que continuam armazenados em localStorage.

Enquanto a migração operacional não terminar:

- dados locais são separados por navegador e origem/domínio;
- GitHub Pages e o domínio customizado têm localStorage diferentes;
- outra pessoa com acesso ao mesmo perfil do navegador pode ler os dados locais;
- não armazenar material sigiloso nessa camada;
- o banco Supabase deverá se tornar a fonte canônica antes de declarar o sistema multiusuário seguro.

Abas abertas no mesmo domínio recebem atualização automática por evento storage.

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
