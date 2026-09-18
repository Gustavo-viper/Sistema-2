/* Sistema de Assistência Técnica - Gustavo & Emily
   Painel Admin - integrado ao Supabase */

// ==================== FORMATAÇÃO ====================

function money(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
}

function date(d) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

function datetime(d) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function initials(name) {
    return (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function badge(status) {
    const b = {
        pending: '<span class="badge badge-pending">⏳ Aguardando</span>',
        processing: '<span class="badge badge-processing">⚙️ Em Andamento</span>',
        ready: '<span class="badge badge-ready">✓ Pronto</span>',
        completed: '<span class="badge badge-completed">✓ Concluído</span>',
        cancelled: '<span class="badge badge-cancelled">✗ Cancelado</span>'
    };
    return b[status] || '<span>???</span>';
}

// ==================== UI ====================

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

function alertBox(type, title, msg) {
    const alerts = document.getElementById('budgetAlerts');
    if (!alerts) return;
    const icon = type === 'success' ?
        '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' :
        '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 9v3.75m0-3.75a9 9 0 110 18 9 9 0 010-18z"/></svg>';
    const a = document.createElement('div');
    a.className = `alert alert-${type}`;
    a.innerHTML = `
        ${icon}
        <div class="alert-message">
            <div class="alert-title">${title}</div>
            ${msg}
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    alerts.appendChild(a);
    setTimeout(() => { if (a.parentElement) a.remove(); }, 8000);
}

// ==================== CACHE EM MEMÓRIA ====================
// Carregado do Supabase; usado pelas funções de render.

let clientsCache = [];
let servicesCache = [];

function dbClients() { return clientsCache; }
function dbServices() { return servicesCache; }

// ==================== SUPABASE: CARREGAR DADOS ====================

async function loadClientsFromDB() {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar clientes:', error);
        toast('Erro', 'Falha ao carregar clientes: ' + error.message, 'error');
        return;
    }
    clientsCache = data || [];
}

async function loadServicesFromDB() {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar serviços:', error);
        toast('Erro', 'Falha ao carregar serviços: ' + error.message, 'error');
        return;
    }
    servicesCache = data || [];
}

async function refreshAll() {
    await Promise.all([loadClientsFromDB(), loadServicesFromDB()]);
    renderAll();
}

function renderAll() {
    updateDate();
    updateStats();
    loadRecentClients();
    filterServices();
    loadHistoryTable();
}

function updateDate() {
    document.getElementById('currentDate').textContent =
        new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==================== ESTATÍSTICAS ====================

function updateStats() {
    const services = dbServices();
    const clients = dbClients();

    const totalClients = clients.length;
    const completedServices = services.filter(s => s.status === 'completed').length;
    const pendingServices = services.filter(s => s.status === 'ready' || s.status === 'pending').length;
    const vipClients = clients.filter(c => c.vip).length;

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card blue">
            <div class="stat-card-header">
                <div class="stat-card-icon">👥</div>
                <div><span class="stat-card-value">${totalClients}</span><br><span class="stat-card-label">Clientes</span></div>
            </div>
        </div>
        <div class="stat-card green">
            <div class="stat-card-header">
                <div class="stat-card-icon">✅</div>
                <div><span class="stat-card-value">${completedServices}</span><br><span class="stat-card-label">Serviços Concluídos</span></div>
            </div>
        </div>
        <div class="stat-card yellow">
            <div class="stat-card-header">
                <div class="stat-card-icon">⏳</div>
                <div><span class="stat-card-value">${pendingServices}</span><br><span class="stat-card-label">Aguardando Retirada</span></div>
            </div>
        </div>
        <div class="stat-card red">
            <div class="stat-card-header">
                <div class="stat-card-icon">⭐</div>
                <div><span class="stat-card-value">${vipClients}</span><br><span class="stat-card-label">Clientes VIP</span></div>
            </div>
        </div>
    `;
}

// ==================== CLIENTES ====================

function showAddClientForm() {
    const container = document.getElementById('recentClients');
    container.innerHTML = `
        <div class="section" style="margin:0;">
            <div class="form-group">
                <label class="form-label">Nome Completo <span class="required">*</span></label>
                <input type="text" class="form-input" id="newClientName" placeholder="Digite o nome completo...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Telefone <span class="required">*</span></label>
                    <input type="tel" class="form-input" id="newClientPhone" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label class="form-label">E-mail</label>
                    <input type="email" class="form-input" id="newClientEmail" placeholder="email@exemplo.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Endereço</label>
                    <input type="text" class="form-input" id="newClientAddress" placeholder="Rua, número, bairro...">
                </div>
                <div class="form-group">
                    <label class="form-label">VIP</label>
                    <select class="form-select" id="newClientVip">
                        <option value="false">Não</option>
                        <option value="true">Sim - Cliente VIP</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:0.75rem;margin-top:1rem;">
                <button type="button" class="btn btn-primary" onclick="addNewClient()">Adicionar Cliente</button>
                <button type="button" class="btn btn-secondary" onclick="cancelAddClient()">Cancelar</button>
            </div>
        </div>
    `;
    document.getElementById('noClientsMessage').style.display = 'none';
}

function cancelAddClient() {
    document.getElementById('recentClients').innerHTML = '';
    loadRecentClients();
}

async function addNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    const phone = document.getElementById('newClientPhone').value.trim();
    const email = document.getElementById('newClientEmail').value.trim();
    const address = document.getElementById('newClientAddress').value.trim();
    const vip = document.getElementById('newClientVip').value === 'true';

    if (!name || !phone) {
        alertBox('error', 'Dados Incompletos', 'Nome e telefone são obrigatórios.');
        return;
    }

    const { data, error } = await supabase
        .from('clients')
        .insert([{ name, phone, email: email || null, address: address || null, vip }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            alertBox('error', 'Cliente Existente', 'Já existe um cliente com este telefone.');
        } else {
            alertBox('error', 'Erro ao cadastrar', error.message);
        }
        return;
    }

    toast('Cliente Cadastrado', `${name} foi adicionado à lista.`, 'success');
    clientsCache.unshift(data);
    cancelAddClient();
    updateStats();
}

function loadRecentClients() {
    const clients = dbClients();
    const container = document.getElementById('recentClients');
    const noMsg = document.getElementById('noClientsMessage');

    if (clients.length === 0) {
        container.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';

    container.innerHTML = clients.slice(0, 5).map(client => `
        <div class="service-item ${client.vip ? 'completed' : ''}" style="cursor:default;">
            <div class="customer-avatar" style="width:40px;height:40px;font-size:0.875rem;">${initials(client.name)}</div>
            <div class="service-item-info">
                <div class="service-item-title">${client.name} ${client.vip ? '⭐' : ''}</div>
                <div class="service-item-desc">${client.phone}${client.email ? ' • ' + client.email : ''}</div>
            </div>
            <div class="service-item-date">📅 ${date(client.created_at)}</div>
        </div>
    `).join('');
}

// ==================== PESQUISA DE CLIENTES ====================

let searchTimeout = null;

function searchClients() {
    const query = document.getElementById('clientSearch').value.trim();

    if (!query) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        const clients = dbClients();
        const results = clients.filter(c =>
            (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
            (c.phone || '').includes(query) ||
            (c.email || '').toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('searchResults');

        if (results.length === 0) {
            container.style.display = 'block';
            container.innerHTML = `
                <div class="alert alert-info" style="margin:0;">
                    <div class="alert-message">Nenhum cliente encontrado para "${query}"</div>
                </div>
            `;
            return;
        }

        container.style.display = 'block';
        container.innerHTML = results.map(client => `
            <div class="search-result-item" onclick="selectClient('${client.id}')">
                <div class="search-result-name">${client.name} ${client.vip ? '⭐' : ''}</div>
                <div class="search-result-contact">📱 ${client.phone}${client.email ? ' • 📧 ' + client.email : ''}</div>
            </div>
        `).join('');
    }, 300);
}

function selectClient(id) {
    const client = dbClients().find(c => c.id === id);
    if (!client) return;

    document.getElementById('selectedClient').style.display = 'block';
    document.getElementById('selectedClient').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <strong>${client.name}</strong> ${client.vip ? '⭐' : ''}
                <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">📱 ${client.phone}${client.email ? '<br>📧 ' + client.email : ''}</div>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="clearSelectedClient()">×</button>
        </div>
    `;

    document.getElementById('clientSearch').value = client.name;
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('clientError').classList.remove('show');
    document.getElementById('clientSearch').dataset.clientId = client.id;
}

function clearSelectedClient() {
    document.getElementById('selectedClient').style.display = 'none';
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientSearch').dataset.clientId = '';
}

// ==================== GERAÇÃO DE ORÇAMENTOS ====================

function generateRandomValue(problemType) {
    const range = values[problemType];
    if (!range) return 0;
    const [min, max] = range;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePaymentLink(serviceId, type) {
    const baseUrl = window.location.origin + window.location.pathname;
    return type === 'signal'
        ? `${baseUrl}?pay=${serviceId}&type=signal`
        : `${baseUrl}?pay=${serviceId}&type=remaining`;
}

// Valores por tipo de problema
const values = {
    'Tela Quebrada': [150, 800],
    'Tela Manchas': [100, 400],
    'Display': [200, 900],
    'Bateria': [80, 250],
    'Expandida': [150, 400],
    'Carrega': [80, 300],
    'Som': [50, 200],
    'Voz': [50, 180],
    'Virus': [80, 250],
    'Lento': [80, 200],
    'Dados': [150, 500],
    'Chip': [50, 150],
    'Camera': [100, 400],
    'Agua': [200, 800],
    'SO': [100, 300],
    'Limpeza': [80, 200],
    'SSD': [150, 500]
};

document.getElementById('budgetForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('submitBudgetBtn');
    btn.disabled = true;
    btn.textContent = 'Gerando...';

    const clientId = document.getElementById('clientSearch').dataset.clientId;
    if (!clientId) {
        document.getElementById('clientError').classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Gerar Orçamento Automático';
        return;
    }

    const deviceType = document.getElementById('deviceType').value;
    const problemType = document.getElementById('problemType').value;

    if (!deviceType || !problemType) {
        toast('Preencha os campos', 'Selecione aparelho e problema', 'error');
        btn.disabled = false;
        btn.textContent = 'Gerar Orçamento Automático';
        return;
    }

    const client = dbClients().find(c => c.id === clientId);
    const totalValue = generateRandomValue(problemType);
    const signalValue = Math.round(totalValue * 0.5);
    const remainingValue = totalValue - signalValue;
    const payId = 'svc_' + Date.now();

    const row = {
        client_id: clientId,
        client_user_id: client && client.auth_user_id ? client.auth_user_id : null,
        device_type: deviceType,
        device_model: document.getElementById('deviceModel').value.trim() || null,
        problem_type: problemType,
        observations: document.getElementById('observations').value.trim() || null,
        total_value: totalValue,
        signal_value: signalValue,
        remaining_value: remainingValue,
        signal_link: generatePaymentLink(payId, 'signal'),
        remaining_link: generatePaymentLink(payId, 'remaining'),
        status: 'pending'
    };

    const { data, error } = await supabase
        .from('services')
        .insert([row])
        .select()
        .single();

    if (error) {
        toast('Erro ao criar orçamento', error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Gerar Orçamento Automático';
        return;
    }

    servicesCache.unshift(data);

    toast('Orçamento Criado!', `Serviço para ${client ? client.name : 'cliente'}`, 'success');

    clearSelectedClient();
    document.getElementById('deviceType').value = '';
    document.getElementById('problemType').value = '';
    document.getElementById('deviceModel').value = '';
    document.getElementById('observations').value = '';

    alertBox('success', 'Orçamento Gerado!', `
        <p>Serviço para <strong>${client ? client.name : 'cliente'}</strong></p>
        <p>Total: ${money(data.total_value)} | Sinal: ${money(data.signal_value)}</p>
        <p>Envie o link de pagamento pelo WhatsApp.</p>
    `);

    btn.disabled = false;
    btn.textContent = 'Gerar Orçamento Automático';
    filterServices();
    loadHistoryTable();
    updateStats();
});

function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function serviceClientName(s) {
    var c = clientsCache.find(function(x) { return x.id === s.client_id; });
    if (c) return c;
    return { id: s.client_id, name: 'Cliente', phone: '', email: '' };
}

function filterServices() {
    var q = (document.getElementById('serviceSearch').value || '').toLowerCase();
    var st = document.getElementById('filterStatus').value;
    var list = document.getElementById('servicesList');
    var empty = document.getElementById('noServicesMessage');
    var items = servicesCache.filter(function(s) {
        if (s.status === 'completed' || s.status === 'cancelled') return false;
        if (st !== 'all' && s.status !== st) return false;
        if (!q) return true;
        var c = serviceClientName(s);
        var hay = ((c.name || '') + ' ' + (s.device_type || '') + ' ' + (s.device_model || '') + ' ' + (s.problem_type || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
    });
    if (!items.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    list.innerHTML = items.map(function(s) {
        var c = serviceClientName(s);
        var actions = '';
        if (s.status === 'pending') {
            actions = '<button class="btn btn-sm btn-success" onclick="approveService(\'' + s.id + '\')">Aprovar (sinal pago)</button> '
                + '<button class="btn btn-sm btn-danger" onclick="deleteService(\'' + s.id + '\')">Excluir</button>';
        } else if (s.status === 'processing') {
            actions = '<button class="btn btn-sm btn-primary" onclick="markReady(\'' + s.id + '\')">Pronto p/ retirada</button>';
        } else if (s.status === 'ready') {
            actions = '<button class="btn btn-sm btn-success" onclick="markComplete(\'' + s.id + '\')">Concluir (restante pago)</button>';
        }
        return '<div class="service-card">'
            + '<div class="service-header"><div><strong>' + esc(c.name) + '</strong>'
            + '<div class="text-muted">' + esc(s.device_type) + ' | ' + esc(s.problem_type) + '</div></div>'
            + badge(s.status) + '</div>'
            + '<div class="service-details">'
            + '<div class="service-detail-item"><div class="service-detail-label">Total</div><div class="service-detail-value">' + money(s.total_value) + '</div></div>'
            + '<div class="service-detail-item"><div class="service-detail-label">Sinal 50%</div><div class="service-detail-value small">' + money(s.signal_value) + '</div></div>'
            + '<div class="service-detail-item"><div class="service-detail-label">Restante 50%</div><div class="service-detail-value small">' + money(s.remaining_value) + '</div></div>'
            + '</div>'
            + '<div class="service-actions">'
            + '<button class="btn btn-sm btn-secondary" onclick="showServiceDetails(\'' + s.id + '\')">Detalhes</button> ' + actions
            + '</div></div>';
    }).join('');
}

function loadHistoryTable() {
    var tbody = document.getElementById('servicesTableBody');
    var empty = document.getElementById('noHistoryMessage');
    if (!servicesCache.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = servicesCache.map(function(s) {
        var c = serviceClientName(s);
        return '<tr><td>' + esc(c.name) + '</td>'
            + '<td>' + esc(s.device_type) + '</td>'
            + '<td>' + esc(s.problem_type) + '</td>'
            + '<td>' + money(s.total_value) + '</td>'
            + '<td>' + money(s.signal_value) + '</td>'
            + '<td>' + money(s.remaining_value) + '</td>'
            + '<td>' + badge(s.status) + '</td>'
            + '<td><button class="btn btn-sm btn-secondary" onclick="showServiceDetails(\'' + s.id + '\')">Ver</button></td></tr>';
    }).join('');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function setStatus(id, patch) {
    var res = await supabaseClient.from('services').update(patch).eq('id', id).select().single();
    if (res.error) { toast('Erro', res.error.message, 'error'); return null; }
    var i = servicesCache.findIndex(function(x) { return x.id === id; });
    if (i !== -1) servicesCache[i] = res.data;
    renderAll();
    return res.data;
}
function showServiceDetails(id) {
    var s = null;
    for (var i = 0; i < servicesCache.length; i++) {
        if (servicesCache[i].id === id) { s = servicesCache[i]; break; }
    }
    if (!s) return;
    var c = serviceClientName(s);
    document.getElementById('modalTitle').textContent = 'Servico - ' + c.name;
    var body = '<p><strong>Cliente:</strong> ' + esc(c.name) + ' (' + esc(c.phone || '-') + ')</p>'
        + '<p><strong>Aparelho:</strong> ' + esc(s.device_type) + '</p>'
        + '<p><strong>Problema:</strong> ' + esc(s.problem_type) + '</p>'
        + '<p><strong>Total:</strong> ' + money(s.total_value) + ' | <strong>Sinal:</strong> ' + money(s.signal_value) + ' | <strong>Restante:</strong> ' + money(s.remaining_value) + '</p>'
        + '<p><strong>Status:</strong> ' + badge(s.status) + '</p>'
        + '<p class="text-muted">Criado: ' + datetime(s.created_at) + '</p>';
    document.getElementById('modalBody').innerHTML = body;
    var foot = '<button class="btn btn-secondary" onclick="closeModal(\'serviceModal\')">Fechar</button> ';
    if (s.status === 'pending') foot += '<button class="btn btn-success" onclick="approveService(\'' + s.id + '\')">Aprovar (sinal pago)</button> ';
    if (s.status === 'processing') foot += '<button class="btn btn-primary" onclick="markReady(\'' + s.id + '\')">Marcar pronto</button> ';
    if (s.status === 'ready') foot += '<button class="btn btn-success" onclick="markComplete(\'' + s.id + '\')">Concluir (restante pago)</button> ';
    document.getElementById('modalFooter').innerHTML = foot;
    document.getElementById('serviceModal').classList.add('active');
}
async function approveService(id) {
    var s = await setStatus(id, { status: 'processing', signal_paid_at: new Date().toISOString() });
    if (s) toast('Sinal confirmado', 'Servico em andamento.', 'success');
    closeModal('serviceModal');
}

async function markReady(id) {
    var s = await setStatus(id, { status: 'ready' });
    if (!s) return;
    var c = serviceClientName(s);
    var n = document.getElementById('completedNotification');
    n.style.display = 'block';
    n.textContent = 'Aparelho pronto! Cliente: ' + c.name + ' - envie o link dos 50% finais.';
    toast('Cliente avisado!', 'Link de ' + money(s.remaining_value) + ' pronto para envio.', 'success');
    closeModal('serviceModal');
}

async function markComplete(id) {
    var s = await setStatus(id, { status: 'completed', remaining_paid_at: new Date().toISOString(), completed_at: new Date().toISOString() });
    if (s) toast('Servico concluido!', 'Pagamento final recebido.', 'success');
    closeModal('serviceModal');
}

async function deleteService(id) {
    if (!confirm('Excluir este servico?')) return;
    var res = await supabaseClient.from('services').delete().eq('id', id);
    if (res.error) { toast('Erro', res.error.message, 'error'); return; }
    servicesCache = servicesCache.filter(function(x) { return x.id !== id; });
    renderAll();
    toast('Excluido', 'Servico removido.', 'info');
}
document.addEventListener('DOMContentLoaded', async function() {
    updateDate();
    if (!supabase) { toast('Supabase nao configurado', 'Verifique auth.js', 'error'); return; }
    var sess = await supabaseClient.auth.getSession();
    if (!sess.data.session) { window.location.href = 'login.html?next=index.html'; return; }
    currentUser = sess.data.session.user;
    var admin = false;
    try {
        var r = await supabaseClient.rpc('current_user_is_admin');
        admin = r.data === true;
    } catch (e) { admin = false; }
    if (!admin) {
        document.getElementById('lockScreen').style.display = 'flex';
        return;
    }
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('adminApp').classList.remove('hidden');
    await refreshAll();
});
