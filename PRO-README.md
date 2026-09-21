# Recursos Pro — Gustavo & Emily

Esta versão acrescenta módulos de estoque, financeiro, agendamentos, auditoria, anexos, edição de perfil, linha do tempo e impressão de relatórios.

## Instalação
1. Faça backup do projeto e do banco.
2. Envie todos os arquivos, inclusive `pro-features.js` e `pro-features.css`.
3. Execute `PRO-MODULES.sql` no SQL Editor do Supabase depois do `setup.sql`.
4. Crie/verifique o bucket privado `client-attachments` caso o Supabase não permita criá-lo via SQL.
5. Atualize em janela anônima.

Os módulos dependem da função `public.is_admin()` já existente no projeto. Não desative o RLS.
