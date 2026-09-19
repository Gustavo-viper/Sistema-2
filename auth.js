
/* =====================================================
   GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
   AUTH.JS - AUTENTICAÇÃO SUPABASE
   VERSÃO CORRIGIDA E ORGANIZADA
===================================================== */

/* =====================================================
   CONFIGURAÇÃO DO SUPABASE
===================================================== */

const SUPABASE_URL = 'https://ytghpftgeqnadecxsxgg.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_N9FjpZBFCsWEiDNMF72eag_NpoDSKsI';

let currentUser = null;
let userProfile = null;
let isAdminUser = false;
let supabaseClient = null;

/* =====================================================
   INICIALIZAÇÃO DO SUPABASE
===================================================== */

(function initSupabase() {
  try {
    const lib =
      window.supabase && typeof window.supabase.createClient === 'function'
        ? window.supabase
        : null;

    if (!lib) {
      console.error('Biblioteca do Supabase não encontrada.');
      return;
    }

    supabaseClient = lib.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    // Disponibiliza o cliente globalmente
    window.supabaseClient = supabaseClient;

    console.log('Supabase inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar o Supabase:', error);
  }
})();

/* =====================================================
   VERIFICAR CONEXÃO
===================================================== */

function ensureAuth() {
  if (supabaseClient) {
    return true;
  }

  toastSafe(
    'Erro',
    'Não foi possível conectar ao Supabase. Verifique a internet e recarregue a página.',
    'error'
  );

  return false;
}

/* =====================================================
   SISTEMA DE NOTIFICAÇÕES
===================================================== */

function toastSafe(title, message, type = 'info') {
  try {
    if (
      typeof window.toast === 'function' &&
      window.toast !== toastSafe
    ) {
      window.toast(title, message, type);
      return;
    }
  } catch (error) {
    console.warn('Erro no sistema de notificações:', error);
  }

  const container = document.getElementById('toastContainer');

  if (!container) {
    alert(`${title}: ${message}`);
    return;
  }

  const notification = document.createElement('div');

  notification.className = `toast ${type}`;
  notification.textContent = `${title} - ${message}`;

  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 4000);
}

/* =====================================================
   OBTER REDIRECIONAMENTO
===================================================== */

function getNext() {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    // Permite apenas páginas locais simples
    if (
      next &&
      !next.includes('://') &&
      !next.startsWith('//') &&
      !next.includes('..')
    ) {
      return next;
    }
  } catch (error) {
    console.warn('Erro ao obter redirecionamento:', error);
  }

  return '';
}

/* =====================================================
   VERIFICAR SE O USUÁRIO É ADMINISTRADOR
===================================================== */

async function checkIsAdmin(userId) {
  if (!supabaseClient || !userId) {
    return false;
  }

  // Primeiro, verifica a função RPC do banco de dados
  try {
    const { data, error } = await supabaseClient.rpc(
      'current_user_is_admin'
    );

    if (!error && data === true) {
      return true;
    }
  } catch (error) {
    console.warn('RPC de administrador indisponível:', error);
  }

  // Segundo, verifica o perfil do usuário
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('role, tipo, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (!error && profile) {
      if (
        profile.role === 'admin' ||
        profile.role === 'administrador' ||
        profile.tipo === 'admin' ||
        profile.tipo === 'administrador' ||
        profile.is_admin === true
      ) {
        return true;
      }
    }
  } catch (error) {
    console.warn('Erro ao consultar perfil de administrador:', error);
  }

  /*
    FALLBACK TEMPORÁRIO

    O ideal é controlar administradores exclusivamente
    pelo banco de dados, com RLS e funções seguras.
  */

  const email = (currentUser?.email || '').toLowerCase();

  const adminEmails = [
    'cainaoliveiraguga@gmail.com',
    'equintanilha56@gmail.com'
  ];

  return adminEmails.includes(email);
}

/* =====================================================
   CARREGAR PERFIL DO USUÁRIO
===================================================== */

async function loadUserProfile() {
  if (!supabaseClient || !currentUser) {
    userProfile = null;
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar perfil:', error);
      userProfile = null;
      return null;
    }

    userProfile = data || null;

    return userProfile;
  } catch (error) {
    console.error('Erro inesperado ao carregar perfil:', error);
    userProfile = null;
    return null;
  }
}

/* =====================================================
   APÓS O LOGIN
===================================================== */

async function afterLogin() {
  if (!ensureAuth()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentUser = data?.session?.user || null;

    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    await loadUserProfile();

    isAdminUser = await checkIsAdmin(currentUser.id);

    const nextPage = getNext();

    if (nextPage) {
      window.location.href = nextPage;
      return;
    }

    window.location.href = isAdminUser
      ? 'index.html'
      : 'client.html';

  } catch (error) {
    console.error('Erro após login:', error);

    toastSafe(
      'Erro',
      'Não foi possível carregar os dados da conta.',
      'error'
    );
  }
}

/* =====================================================
   LOGIN
===================================================== */

async function handleLogin(event) {
  if (event) {
    event.preventDefault();
  }

  if (!ensureAuth()) {
    return;
  }

  const emailElement = document.getElementById('loginEmail');
  const passwordElement = document.getElementById('loginPassword');

  if (!emailElement || !passwordElement) {
    toastSafe(
      'Erro',
      'Campos de login não encontrados no HTML.',
      'error'
    );
    return;
  }

  const email = emailElement.value.trim().toLowerCase();
  const password = passwordElement.value;

  if (!email || !password) {
    toastSafe(
      'Atenção',
      'Preencha o e-mail e a senha.',
      'warning'
    );
    return;
  }

  const button = document.getElementById('loginBtn');

  if (button) {
    button.disabled = true;
    button.textContent = 'Entrando...';
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    currentUser = data?.user || data?.session?.user || null;

    toastSafe(
      'Bem-vindo!',
      'Login realizado com sucesso.',
      'success'
    );

    await afterLogin();

  } catch (error) {
    console.error('Erro no login:', error);

    toastSafe(
      'Erro no login',
      traduzirErroAuth(error),
      'error'
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Entrar';
    }
  }
}

/* =====================================================
   CADASTRO
===================================================== */

async function handleRegister(event) {
  if (event) {
    event.preventDefault();
  }

  if (!ensureAuth()) {
    return;
  }

  const nameElement = document.getElementById('registerName');
  const emailElement = document.getElementById('registerEmail');
  const phoneElement = document.getElementById('registerPhone');
  const passwordElement = document.getElementById('registerPassword');
  const confirmElement = document.getElementById('registerConfirm');

  if (!nameElement || !emailElement || !passwordElement || !confirmElement) {
    toastSafe(
      'Erro',
      'Campos de cadastro não encontrados no HTML.',
      'error'
    );
    return;
  }

  const name = nameElement.value.trim();
  const email = emailElement.value.trim().toLowerCase();
  const phone = phoneElement ? phoneElement.value.trim() : '';
  const password = passwordElement.value;
  const confirmation = confirmElement.value;

  if (!name || !email || !password || !confirmation) {
    toastSafe(
      'Atenção',
      'Preencha todos os campos obrigatórios.',
      'warning'
    );
    return;
  }

  if (password.length < 6) {
    toastSafe(
      'Atenção',
      'A senha deve ter pelo menos 6 caracteres.',
      'warning'
    );
    return;
  }

  if (password !== confirmation) {
    toastSafe(
      'Atenção',
      'As senhas não conferem.',
      'warning'
    );
    return;
  }

  const button = document.getElementById('registerBtn');

  if (button) {
    button.disabled = true;
    button.textContent = 'Criando...';
  }

  try {
    console.log('[Cadastro] Criando conta:', email);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone
        }
      }
    });

    if (error) {
      throw error;
    }

    console.log('[Cadastro] Conta criada com sucesso.');

    if (data?.session) {
      currentUser = data.user || data.session.user;

      toastSafe(
        'Conta criada!',
        `Bem-vindo, ${name}!`,
        'success'
      );

      await afterLogin();
    } else {
      toastSafe(
        'Cadastro realizado!',
        'Verifique seu e-mail para confirmar a conta.',
        'success'
      );

      if (typeof window.switchTab === 'function') {
        window.switchTab('login');
      }
    }

  } catch (error) {
    console.error('[Cadastro] Erro:', error);

    toastSafe(
      'Erro ao criar conta',
      traduzirErroAuth(error),
      'error'
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Criar Conta';
    }
  }
}

/* =====================================================
   RECUPERAR SENHA
===================================================== */

async function showForgotPassword() {
  if (!ensureAuth()) {
    return;
  }

  const email = prompt(
    'Digite seu e-mail para recuperar a senha:'
  );

  if (!email || !email.trim()) {
    return;
  }

  try {
    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password.html`
        }
      );

    if (error) {
      throw error;
    }

    toastSafe(
      'E-mail enviado!',
      'Verifique sua caixa de entrada.',
      'success'
    );

  } catch (error) {
    console.error('Erro ao recuperar senha:', error);

    toastSafe(
      'Erro',
      traduzirErroAuth(error),
      'error'
    );
  }
}

/* =====================================================
   LOGOUT
===================================================== */

async function logout() {
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('Erro ao sair:', error);
      }
    }
  } catch (error) {
    console.error('Erro inesperado ao sair:', error);
  } finally {
    currentUser = null;
    userProfile = null;
    isAdminUser = false;

    window.location.href = 'login.html';
  }
}

/* =====================================================
   TRADUZIR ERROS DO SUPABASE
===================================================== */

function traduzirErroAuth(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (message.includes('user already registered')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (message.includes('email rate limit exceeded')) {
    return 'Limite de envio de e-mails atingido. Aguarde e tente novamente mais tarde.';
  }

  if (message.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (message.includes('email')) {
    return 'Informe um endereço de e-mail válido.';
  }

  return error?.message || 'Ocorreu um erro inesperado.';
}

/* =====================================================
   DISPONIBILIZAR FUNÇÕES GLOBALMENTE
===================================================== */

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showForgotPassword = showForgotPassword;
window.logout = logout;
window.loadUserProfile = loadUserProfile;
window.afterLogin = afterLogin;
window.checkIsAdmin = checkIsAdmin;
window.ensureAuth = ensureAuth;
window.supabaseClient = supabaseClient;
