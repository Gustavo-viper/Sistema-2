var _supLib = (typeof window !== 'undefined') ? window.supabase : null;
var SUPABASE_URL = 'https://ytghpftgeqnadecxsxgg.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_N9FjpZBFCsWEiDNMF72eag_NpoDSKsI';
var currentUser = null;
var userProfile = null;
var isAdminUser = false;
var supabaseClient = null;

(function initSupabase() {
  try {
    var lib = (_supLib&&_supLib.createClient)?_supLib:(window.supabaseClient&&window.supabaseClient.createClient?window.supabaseClient:null);
    if (lib && lib.createClient) {
      supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.supabaseClient = supabaseClient;
    }
  } catch (e) { console.error('Supabase init:', e); }
})();

function ensureAuth() {
  if (supabaseClient) return true;
  alert('Sem conexao com Supabase (CDN bloqueado). Verifique a internet e recarregue.');
  return false;
}

function toastSafe(t, m, type) {
  if (typeof toast === 'function' && toast !== toastSafe) { try { toast(t, m, type); return; } catch (e) {} }
  var c = document.getElementById('toastContainer');
  if (!c) { alert(t + ': ' + m); return; }
  var d = document.createElement('div');
  d.className = 'toast ' + (type || 'info');
  d.textContent = t + ' - ' + m;
  c.appendChild(d);
  setTimeout(function() { if (d.parentElement) d.remove(); }, 4000);
}

function getNext() {
  try {
    var p = new URLSearchParams(window.location.search).get('next');
    if (p) return p;
  } catch (e) {}
  return '';
}

async function checkIsAdmin(uid) {
  try {
    var r = await supabaseClient.rpc('current_user_is_admin');
    if (r.data === true) return true;
  } catch (e) {}
  try {
    var em = (currentUser && currentUser.email || '').toLowerCase();
    if (em === 'cainaoliveiraguga@gmail.com' || em === 'equintanilha56@gmail.com') return true;
  } catch (e) {}
  return false;
}

async function afterLogin() {
  var s = await supabaseClient.auth.getSession();
  currentUser = s.data.session ? s.data.session.user : null;
  if (!currentUser) { window.location.href = 'login.html'; return; }
  await loadUserProfile();
  isAdminUser = await checkIsAdmin(currentUser.id);
  var nx = getNext();
  if (nx) { window.location.href = nx; return; }
  window.location.href = isAdminUser ? 'index.html' : 'client.html';
}

async function loadUserProfile() {
  if (!supabase || !currentUser) return null;
  try {
    var r = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    userProfile = r.data || null;
  } catch (e) { userProfile = null; }
  return userProfile;
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  if (!ensureAuth()) return;
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPassword').value;
  if (!email || !pass) { toastSafe('Atenção', 'Preencha e-mail e senha', 'warning'); return; }
  var btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
  var res = await supabaseClient.auth.signInWithPassword({ email: email, password: pass });
  if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
  if (res.error) { toastSafe('Erro no login', res.error.message, 'error'); return; }
  toastSafe('Bem-vindo!', 'Login realizado.', 'success');
  await afterLogin();
}

async function handleRegister(e) {
  if (e) e.preventDefault();
  if (!ensureAuth()) return;
  var name = document.getElementById('registerName').value.trim();
  var email = document.getElementById('registerEmail').value.trim();
  var phoneEl = document.getElementById('registerPhone');
  var phone = phoneEl ? phoneEl.value.trim() : '';
  var pass = document.getElementById('registerPassword').value;
  var conf = document.getElementById('registerConfirm').value;
  if (!name || !email || !pass) { toastSafe('Atenção', 'Preencha nome, e-mail e senha', 'warning'); return; }
  if (pass.length < 6) { toastSafe('Atenção', 'Senha mínimo 6 caracteres', 'warning'); return; }
  if (pass !== conf) { toastSafe('Atenção', 'Senhas não conferem', 'warning'); return; }
  var btn = document.getElementById('registerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Criando...'; }
  console.log('[register] tentando criar conta:', email);
  var res;
  try {
    res = await supabaseClient.auth.signUp({ email: email, password: pass, options: { data: { name: name, phone: phone } } });
  } catch (err) {
    console.error('[register] excecao:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Criar Conta'; }
    toastSafe('Erro ao criar conta', String(err && err.message || err), 'error');
    return;
  }
  console.log('[register] resposta:', JSON.stringify(res));
  if (btn) { btn.disabled = false; btn.textContent = 'Criar Conta'; }
  if (res.error) {
    console.error('[register] erro supabase:', res.error);
    toastSafe('Erro ao criar conta (' + (res.error.status || '?') + ')', res.error.message, 'error');
    alert('Erro ao criar conta: ' + res.error.message);
    return;
  }
  if (res.data.session) {
    toastSafe('Conta criada!', 'Bem-vindo, ' + name, 'success');
    await afterLogin();
  } else {
    toastSafe('Conta criada!', 'Verifique seu e-mail para confirmar e faça login.', 'success');
    if (typeof window.switchTab === 'function') window.switchTab('login');
  }
}

async function showForgotPassword() {
  if (!ensureAuth()) return;
  var em = prompt('Digite seu e-mail para recuperar a senha:');
  if (!em) return;
  var res = await supabaseClient.auth.resetPasswordForEmail(em.trim());
  if (res.error) toastSafe('Erro', res.error.message, 'error');
  else toastSafe('Enviado!', 'Verifique seu e-mail.', 'success');
}

async function logout() {
  try { if (supabase) await supabaseClient.auth.signOut(); } catch (e) {}
  currentUser = null; userProfile = null; isAdminUser = false;
  window.location.href = 'login.html';
}
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showForgotPassword = showForgotPassword;
window.logout = logout;
window.loadUserProfile = loadUserProfile;
