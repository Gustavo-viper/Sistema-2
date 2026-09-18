/* Sistema de Autenticação - Supabase */
// ⚠️ SUBISTITUIR COM SUAS CREDENCIAIS DO SUPABASE

const SUPABASE_URL = 'https://ytghpftgeqnadecxsxgg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N9FjpZBFCsWEiDNMF72eag_NpoDSKsI';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let userProfile = null;

// Função toast (reutilizável)
function toast(title, msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 9v3.75m0-3.75a9 9 0 110 18 9 9 0 010-18z"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M12 9v3.75m0 0v3.75m0-3.75h3.75m-3.75 0H8.25"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    t.innerHTML = `
        ${icons[type]}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${msg}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    c.appendChild(t);
    setTimeout(() => { if (t.parentElement) t.remove(); }, 4000);
}
// Verificar sessão existente
async function checkSession() {
    if (!supabase) {
        console.warn('Supabase não configurado!');
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        redirectToDashboard();
    }
}

// Login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        toast('Preencha os campos', 'E-mail e senha são obrigatórios', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
            currentUser = data.user;
            await loadUserProfile();
            toast('Login realizado!', 'Bem-vindo de volta!', 'success');
            redirectToDashboard();
        }
    } catch (error) {
        toast('Erro no login', error.message || 'E-mail ou senha incorretos', 'error');
    }
}

// Registro
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (!name || !email || !password) {
        toast('Preencha os campos obrigatórios', 'Nome, e-mail e senha são necessários', 'error');
        return;
    }
    
    if (password !== confirm) {
        toast('Senhas não coincidem', 'As senhas não são iguais', 'error');
        return;
    }
    
    if (password.length < 6) {
        toast('Senha muito curta', 'Mínimo 6 caracteres', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { name: name, phone: phone || '' } }
        });
        
        if (error) throw error;
        if (data.user) {
            toast('Conta criada!', 'Verifique seu e-mail para confirmar', 'success');
            if (data.user.confirmed_at) {
                currentUser = data.user;
                await loadUserProfile();
                redirectToDashboard();
            }
        }
    } catch (error) {
        toast('Erro no registro', error.message || 'Não foi possível criar a conta', 'error');
    }
}
// Carregar perfil do usuário
async function loadUserProfile() {
    if (!currentUser || !supabase) return;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error);
    }
    userProfile = data || null;
}

// Logout
async function logout() {
    if (!supabase) {
        currentUser = null;
        userProfile = null;
        redirectToLogin();
        return;
    }
    await supabase.auth.signOut();
    currentUser = null;
    userProfile = null;
    toast('Logout realizado', 'Você saiu da sua conta', 'info');
    redirectToLogin();
}

// Troca de aba
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('switchText').innerHTML = 'Não tem conta? <a href="#" onclick="switchTab(\'register\')">Criar conta</a>';
    } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('switchText').innerHTML = 'Já tem conta? <a href="#" onclick="switchTab(\'login\')">Fazer login</a>';
    }
}

// Esqueceu a senha
function showForgotPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
        toast('Informe seu e-mail', 'Digite o e-mail cadastrado', 'warning');
        return;
    }
    if (!supabase) {
        toast('Erro', 'Sistema não configurado', 'error');
        return;
    }
    supabase.auth.resetPasswordForEmail(email, {
        emailRedirectTo: window.location.origin + '/reset-password.html'
    });
    toast('E-mail enviado', `Enviamos um link para ${email}`, 'success');
}

// Redirecionamentos
function redirectToDashboard() {
    window.location.href = 'client.html';
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    if (supabase) {
        await checkSession();
    }
});