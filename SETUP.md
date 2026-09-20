# Sistema de Assistência Técnica - Supabase Setup

## 📋 Instruções de Configuração

### 1. Criar conta no Supabase
- Acesse https://supabase.com
- Crie uma conta gratuita
- Crie um novo projeto

### 2. Obter credenciais
No dashboard do projeto, vá em **Project Settings > API**:
- Copie o **Project URL**
- Copie a **anon public key**

### 3. Atualizar os arquivos
Substitua nas credenciais nos arquivos:
- `auth.js` - linhas 3-4
- `client.js` - se necessário

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';
```

### 4. Criar tabelas no Supabase

#### Tabela: profiles
```sql
create table profiles (
  id uuid references auth.users not null primary key,
  name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
```

#### Tabela: services
```sql
create table services (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references auth.users not null,
  client_name text,
  device_type text not null,
  device_model text,
  problem_type text not null,
  observations text,
  total_value numeric(10,2) default 0,
  signal_value numeric(10,2) default 0,
  remaining_value numeric(10,2) default 0,
  signal_link text,
  remaining_link text,
  status text default 'pending' check (status in ('pending', 'processing', 'ready', 'completed', 'cancelled')),
  signal_paid_at timestamp with time zone,
  remaining_paid_at timestamp with time zone,
  completed_at timestamp with time zone,
  rating integer check (rating between 1 and 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table services enable row level security;

create policy "Clients can view own services" on services
  for select using (auth.uid() = client_id);

create policy "Admins can view all services" on services
  for select using (auth.jwt()->>'role' = 'admin');

create policy "Admins can insert services" on services
  for insert with check (auth.jwt()->>'role' = 'admin');

create policy "Admins can update services" on services
  for update using (auth.jwt()->>'role' = 'admin');
```

### 5. Função para atualizar updated_at
```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;
```

### 6. Trigger para profiles
```sql
create trigger create_profile_for_new_user
  after insert on auth.users
  for each row execute procedure 
  create_profile_for_new_user();
```

## 🔧 Integrações Futuras

### Pagamento (Escolha uma):
- **Mercado Pago** - https://www.mercadopago.com.br/developers
- **PagSeguro** - https://dev.pagseguro.uol.com.br
- **Stripe** - https://stripe.com/docs

### Notificações:
- **Email** - Use SendGrid, Mailgun ou SMTP do Supabase
- **WhatsApp** - Use API do Twilio ou Z-API
- **Real-time** - Supabase Realtime já incluso

## 📱 Fluxo do Cliente

1. **Login/Registro** → login.html
2. **Painel do Cliente** → client.html
   - Ver serviços em andamento
   - Ver histórico
   - Pagar sinal/restante (integração com gateway)
   - Avaliar serviço
3. **Solicitar Orçamento** → (em desenvolvimento)

## 👨‍💼 Fluxo do Admin (Técnico)

1. **Dashboard** → index.html
   - Ver todos os serviços
   - Criar orçamentos
   - Atualizar status
   - Gerar links de pagamento
2. **Concluir Serviço** → notificação automática ao cliente

## ⚠️ Notas Importantes

- O sistema atual usa **localStorage** como fallback se o Supabase não estiver configurado
- Para produção, configure RLS (Row Level Security) corretamente
- Para pagamentos reais, implemente as APIs dos gateways de pagamento
- Para notificações automáticas, use Supabase Edge Functions ou integração com APIs externas