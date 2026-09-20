# Assistência Técnica Gustavo & Emily

Sistema web de gestão para assistência técnica de celulares e computadores.

## ✨ Funcionalidades

### Painel do Admin (`index.html`)
- Cadastro e busca de clientes (nome, telefone, e-mail)
- Orçamentos automáticos por tipo de problema
- Gestão de serviços com status: pendente → em andamento → pronto → concluído
- Links de pagamento (50% sinal + 50% na entrega)
- Notificação automática ao concluir serviço, com link dos 50% finais
- Dashboard com estatísticas e histórico completo

### Área do Cliente (`login.html` → `client.html`)
- Login/cadastro com e-mail e senha (Supabase Auth)
- Acompanhamento dos serviços em tempo real
- Pagamento do sinal (50%) e do restante (50%)
- Avaliação do serviço (1–5 estrelas)
- Histórico completo de serviços

## 🛠️ Tecnologias
- HTML5 + CSS3 + JavaScript (vanilla, sem frameworks)
- Supabase (autenticação + banco PostgreSQL + RLS)
- supabase-js v2 via CDN

## 🚀 Como rodar
1. Crie um projeto gratuito em https://supabase.com
2. No SQL Editor do Supabase, execute o conteúdo de `setup.sql`
3. Edite `auth.js` com a URL e a chave do seu projeto
4. Abra `index.html` no navegador — não precisa de servidor

## 👥 Administradores
Definidos em `setup.sql` (função `is_admin`). Clientes comuns veem apenas seus próprios serviços.

## 📄 Licença
Uso privado — Gustavo & Emily.

## Personalização visual
- `logo.png`: logotipo da assistência usado na tela de login.
- `theme.js`: seletor de temas azul, branco e verde.
- A chave PIX para o sinal é exibida no painel do cliente ao clicar em **Pagar sinal**.
