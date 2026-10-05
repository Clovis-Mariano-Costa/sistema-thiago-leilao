-- ST-MNM-37A — opt-in antecipado ao modelo de grants explícitos da Data API.
-- Afeta somente objetos FUTUROS criados por postgres no schema public.
-- Objetos existentes preservam seus grants atuais.

alter default privileges for role postgres in schema public
revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke usage, select on sequences from anon, authenticated, service_role;
