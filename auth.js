
/* =====================================================
   GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
   AUTH.JS - AUTENTICAÇÃO SUPABASE
   VERSÃO REVISADA
===================================================== */

'use strict';

/* =====================================================
   CONFIGURAÇÃO DO SUPABASE
===================================================== */

const SUPABASE_URL = 'https://ytghpftgeqnadecxsxgg.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_N9FjpZBFCsWEiDNMF72eag_NpoDSKsI';

/* =====================================================
   ESTADO GLOBAL
===================================================== */

let currentUser = null;
let userProfile = null;
let isAdminUser = false;
let supabaseClient = null;

/* =====================================================
   INICIALIZAÇÃO DO SUPABASE
===================================================== */

(function initSupabase() {
  try {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== 'function'
    ) {
      console.error('Biblioteca do Supabase não encontrada.');
      return;
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

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
    'Não foi possível conectar ao Supabase. Recarregue a página.',
    'error'
  );

  return false;
}

/* =====================================================
   NOTIFICAÇÕES
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
    console.warn('Erro ao exibir notificação:', error);
  }

  const container = document.getElementById('toastContainer');

  if (!container) {
    console.log(`${title}: ${message}`);
    return;
  }

  const notification = document.createElement('div');

  notification.className = `toast ${type}`;
  notification.setAttribute('role', 'alert');
  notification.textContent = `${title} - ${message}`;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 4000);
}

/* =====================================================
   FECHAR MODAL
===================================================== */

function closeModal(modalId) {
  if (!modalId || typeof modalId !== 'string') {
    return;
  }

  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');

  if (modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
}

/* =====================================================
   REDIRECIONAMENTO SEGURO
===================================================== */

function getNext() {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    if (
      next &&
      next.startsWith('/') &&
      !next.startsWith('//') &&
      !next.includes('..') &&
      !next.includes('://')
    ) {
      return next;
    }
  } catch (error) {
    console.warn('Erro ao obter redirecionamento:', error);
  }

  return '';
}

/* =====================================================
   VERIFICAR ADMINISTRADOR
===================================================== */

/*
  A função RPC current_user_is_admin deve existir
  no Supabase e verificar as permissões no servidor.

  A RPC é a fonte principal de autorização.
*/

async function checkIsAdmin(userId) {
  if (!supabaseClient || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient.rpc(
      'current_user_is_admin'
    );

    if (error) {
      console.warn('Erro na verificação de administrador:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao verificar administrador:', error);
    return false;
  }
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
   ATUALIZAR ESTADO DA SESSÃO
===================================================== */

async function updateAuthState() {
  if (!ensureAuth()) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentUser = data?.session?.user || null;

    if (!currentUser) {
      userProfile = null;
      isAdminUser = false;
      return null;
    }

    await loadUserProfile();

    isAdminUser = await checkIsAdmin(currentUser.id);

    return currentUser;
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);

    currentUser = null;
    userProfile = null;
    isAdminUser = false;

    return null;
  }
}

/* =====================================================
   APÓS LOGIN
===================================================== */

async function afterLogin() {
  if (!ensureAuth()) {
    return;
  }

  try {
    await updateAuthState();

    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

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
  const button = document.getElementById('loginBtn');

  if (!emailElement || !passwordElement) {
    toastSafe(
      'Erro',
      'Campos de login não encontrados.',
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

  if (button) {
    button.disabled = true;
    button.textContent = 'Entrando...';
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
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
  const button = document.getElementById('registerBtn');

  if (
    !nameElement ||
    !emailElement ||
    !passwordElement ||
    !confirmElement
  ) {
    toastSafe(
      'Erro',
      'Campos de cadastro não encontrados.',
      'error'
    );
    return;
  }

  const name = nameElement.value.trim();
  const email = emailElement.value.trim().toLowerCase();
  const phone = phoneElement
    ? phoneElement.value.trim()
    : '';
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

  if (button) {
    button.disabled = true;
    button.textContent = 'Criando...';
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
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

    if (data?.session) {
      currentUser =
        data.user || data.session.user || null;

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
    console.error('Erro no cadastro:', error);

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

  const email = window.prompt(
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
          redirectTo:
            `${window.location.origin}/reset-password.html`
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
      const { error } =
        await supabaseClient.auth.signOut();

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
  const message = String(
    error?.message || ''
  ).toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (
    message.includes('user already registered') ||
    message.includes('already been registered')
  ) {
    return 'Este e-mail já está cadastrado.';
  }

  if (message.includes('email rate limit exceeded')) {
    return 'Limite de envio de e-mails atingido. Aguarde e tente novamente mais tarde.';
  }

  if (message.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (
    message.includes('invalid email') ||
    message.includes('unable to validate email')
  ) {
    return 'Informe um endereço de e-mail válido.';
  }

  if (message.includes('network')) {
    return 'Erro de conexão. Verifique sua internet.';
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
window.closeModal = closeModal;
window.loadUserProfile = loadUserProfile;
window.updateAuthState = updateAuthState;
window.afterLogin = afterLogin;
window.checkIsAdmin = checkIsAdmin;
window.ensureAuth = ensureAuth;
window.toastSafe = toastSafe;
window.supabaseClient = supabaseClient;
