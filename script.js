/* Sistema de Assistência Técnica - Gustavo & Emily */

// Banco de Dados Local
const DB = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem('ge_' + key) || '[]');
        } catch (e) {
            return [];
        }
    },
    set(key, data) {
        localStorage.setItem('ge_' + key, JSON.stringify(data));
    },
    genId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

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

// Formatacao
function money(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function date(d) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

function datetime(d) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function initials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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

// Funções de UI
function toast(title, msg, type = 'info') {
    const c = document.getElementById('toastContainer');
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

// Data atual
function updateDate() {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Estatísticas
function updateStats() {
    const clients = DB.get('clients');
    const services = DB.get('services');

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

function addNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    const phone = document.getElementById('newClientPhone').value.trim();
    const email = document.getElementById('newClientEmail').value.trim();
    const address = document.getElementById('newClientAddress').value.trim();
    const vip = document.getElementById('newClientVip').value === 'true';

    if (!name || !phone) {
        alertBox('error', 'Dados Incompletos', 'Nome e telefone são obrigatórios.');
        return;
    }

    const clients = DB.get('clients');

    if (clients.some(c => c.phone === phone)) {
        alertBox('error', 'Cliente Existente', 'Já existe um cliente com este telefone.');
        return;
    }

    const newClient = {
        id: DB.genId(),
        name,
        phone,
        email: email || '',
        address: address || '',
        vip,
        createdAt: new Date().toISOString()
    };

    clients.push(newClient);
    DB.set('clients', clients);

    toast('Cliente Cadastrado', `${name} foi adicionado à lista.`, 'success');
    cancelAddClient();
}

function loadRecentClients() {
    const clients = DB.get('clients');
    const container = document.getElementById('recentClients');
    const noMsg = document.getElementById('noClientsMessage');

    if (clients.length === 0) {
        container.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';

    const recent = clients.slice(-5).reverse();

    container.innerHTML = recent.map(client => `
        <div class="service-item ${client.vip ? 'completed' : ''}" style="cursor:default;">
            <div class="customer-avatar" style="width:40px;height:40px;font-size:0.875rem;">${initials(client.name)}</div>
            <div class="service-item-info">
                <div class="service-item-title">${client.name} ${client.vip ? '⭐' : ''}</div>
                <div class="service-item-desc">${client.phone}${client.email ? ' • ' + client.email : ''}</div>
            </div>
            <div class="service-item-date">📅 ${date(client.createdAt)}</div>
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
        const clients = DB.get('clients');
        const results = clients.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query) ||
            c.email.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('searchResults');

        if (results.length === 0) {
            container.style.display = 'block';
            container.innerHTML = `
                <div class="alert alert-info" style="margin:0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
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
    const clients = DB.get('clients');
    const client = clients.find(c => c.id === id);

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
    if (type === 'signal') {
        return `${baseUrl}?pay=${serviceId}&type=signal`;
    } else {
        return `${baseUrl}?pay=${serviceId}&type=remaining`;
    }
}

document.getElementById('budgetForm').addEventListener('submit', function(e) {
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

    const totalValue = generateRandomValue(problemType);
    const signalValue = Math.round(totalValue * 0.5);
    const remainingValue = totalValue - signalValue;

    const payId = 'new_' + Date.now();
    const service = {
        id: DB.genId(),
        clientId: clientId,
        clientName: '',
        deviceType: deviceType,
        deviceModel: document.getElementById('deviceModel').value.trim(),
        problemType: problemType,
        observations: document.getElementById('observations').value.trim(),
        totalValue: totalValue,
        signalValue: signalValue,
        remainingValue: remainingValue,
        signalLink: generatePaymentLink(payId, 'signal'),
        remainingLink: generatePaymentLink(payId, 'remaining'),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const clients = DB.get('clients');
    const client = clients.find(c => c.id === clientId);
    if (client) service.clientName = client.name;

    const services = DB.get('services');
    services.push(service);
    DB.set('services', services);

    toast('Orçamento Criado!', `Serviço para ${service.clientName}`, 'success');

    clearSelectedClient();
    document.getElementById('deviceType').value = '';
    document.getElementById('problemType').value = '';
    document.getElementById('deviceModel').value = '';
    document.getElementById('observations').value = '';

    alertBox('success', 'Orçamento Gerado!', `
        <p>Serviço para <strong>${service.clientName}</strong></p>
        <p>Total: ${money(service.totalValue)} | Sinal: ${money(service.signalValue)}</p>
        <p>Envie o link de pagamento pelo WhatsApp.</p>
    `);

    btn.disabled = false;
    btn.textContent = 'Gerar Orçamento Automático';
    loadServicesList();
    updateStats();
});

// ==================== LISTAGEM DE SERVIÇOS ====================

function filterServices() {
    const search = document.getElementById('serviceSearch').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const services = DB.get('services');

    const filtered = services.filter(s => {
        const matchSearch = !search ||
            s.clientName.toLowerCase().includes(search) ||
            s.deviceType.toLowerCase().includes(search) ||
            s.problemType.toLowerCase().includes(search);

        const matchStatus = statusFilter === 'all' || s.status === statusFilter;

        return matchSearch && matchStatus;
    });

    const container = document.getElementById('servicesList');

    if (filtered.length === 0) {
        container.innerHTML = '';
        document.getElementById('noServicesMessage').style.display = 'block';
        return;
    }

    document.getElementById('noServicesMessage').style.display = 'none';

    container.innerHTML = filtered.map(s => `
        <div class="service-card ${s.status}">
            <div class="service-card-header">
                <div class="service-customer">
                    <div class="customer-avatar">${initials(s.clientName)}</div>
                    <div class="service-info">
                        <h3>${s.clientName}</h3>
                        <div class="service-device">${s.deviceType}${s.deviceModel ? ' - ' + s.deviceModel : ''}</div>
                    </div>
                </div>
                ${badge(s.status)}
            </div>
            <div class="service-details">
                <div class="service-detail-item">
                    <div class="service-detail-label">Problema</div>
                    <div class="service-detail-value small">${s.problemType}</div>
                </div>
                <div class="service-detail-item">
                    <div class="service-detail-label">Total</div>
                    <div class="service-detail-value">${money(s.totalValue)}</div>
                </div>
                <div class="service-detail-item">
                    <div class="service-detail-label">Sinal</div>
                    <div class="service-detail-value small" style="color:${s.status !== 'pending' ? '#10b981' : '#ef4444'}">${s.status !== 'pending' ? '✓' : '⏳'} ${money(s.signalValue)}</div>
                </div>
                <div class="service-detail-item">
                    <div class="service-detail-label">Restante</div>
                    <div class="service-detail-value small" style="color:${s.status === 'pending' ? '#f59e0b' : '#6b7280'}">${money(s.remainingValue)}</div>
                </div>
            </div>
            <div class="service-actions">
                ${s.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="markPaidSignal('${s.id}')">✓ Pagar Sinal</button>` : ''}
                ${s.status === 'processing' || s.status === 'pending' ? `<button class="btn btn-warning btn-sm" onclick="updateStatus('${s.id}','processing')">Iniciar</button>` : ''}
                ${s.status === 'processing' ? `<button class="btn btn-success btn-sm" onclick="markReady('${s.id}')">✓ Pronto</button>` : ''}
                ${s.status === 'ready' ? `<button class="btn btn-success btn-sm" onclick="completeService('${s.id}')">🎉 Concluir</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="showServiceModal('${s.id}')">Detalhes</button>
            </div>
        </div>
    `).join('');
}

function loadServicesList() {
    filterServices();
}

// ==================== AÇÕES NOS SERVIÇOS ====================

function updateStatus(serviceId, newStatus) {
    const services = DB.get('services');
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = newStatus;
    service.updatedAt = new Date().toISOString();
    DB.set('services', services);

    toast('Status Atualizado', `Serviço: ${newStatus}`, 'success');
    loadServicesList();
    updateStats();
}

function markPaidSignal(serviceId) {
    updateStatus(serviceId, 'processing');
    toast('Sinal Confirmado', 'Cliente pagou 50% do sinal', 'success');
}

function markReady(serviceId) {
    const services = DB.get('services');
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = 'ready';
    service.updatedAt = new Date().toISOString();
    DB.set('services', services);

    toast('Aparelho Pronto!', 'Cliente pode retirar', 'success');

    alertBox('success', '✅ Serviço Pronto para Entrega!', `
        <p>Aparelho de <strong>${service.clientName}</strong> está pronto!</p>
        <p>Restam <strong>${money(service.remainingValue)}</strong> para pagar.</p>
        <div style="margin-top:1rem;padding:1rem;background:#f9fafb;border-radius:8px;">
            <code style="word-break:break-all;font-size:0.75rem;">${service.remainingLink}</code>
        </div>
    `);

    loadServicesList();
    updateStats();
}

function completeService(serviceId) {
    const services = DB.get('services');
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = 'completed';
    service.updatedAt = new Date().toISOString();
    DB.set('services', services);

    // ==================== NOTIFICAÇÃO AUTOMÁTICA ====================
    // Quando o serviço é marcado como concluído, o cliente é avisado
    // de que o aparelho está pronto para retirada e recebe o link
    // de pagamento dos 50% finais.

    toast('🎉 Serviço Concluído!', 'Notificação enviada ao cliente', 'success');

    const notif = document.getElementById('completedNotification');
    notif.style.display = 'flex';
    notif.innerHTML = `
        <div style="font-size:1.5rem;">✅</div>
        <div>
            <div style="font-weight:600;">Serviço Concluído com Sucesso!</div>
            <div style="font-size:0.875rem;opacity:0.9;">Notificação enviada ao cliente ${service.clientName}</div>
        </div>
    `;

    setTimeout(() => { notif.style.display = 'none'; }, 5000);

    alertBox('success', '🎉 Serviço Concluído!', `
        <p>✅ <strong>${service.clientName}</strong> - Aparelho pronto para retirada!</p>
        <p>Faltam <strong>${money(service.remainingValue)}</strong> para pagamento final.</p>
        <div style="margin-top:1rem;padding:1rem;background:#f9fafb;border-radius:8px;">
            <p style="margin:0;"><strong>Link de Pagamento Final:</strong></p>
            <code style="word-break:break-all;font-size:0.75rem;margin-top:0.5rem;display:block;">${service.remainingLink}</code>
        </div>
        <p style="margin-top:0.75rem;font-size:0.875rem;color:#6b7280;">
            💡 Envie este link para o cliente via WhatsApp para pagar os 50% finais.
        </p>
    `);

    loadServicesList();
    updateStats();
    loadHistoryTable();
}

function cancelService(serviceId) {
    if (!confirm('Tem certeza que deseja cancelar este serviço?')) return;

    const services = DB.get('services');
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = 'cancelled';
    service.updatedAt = new Date().toISOString();
    DB.set('services', services);

    toast('Serviço Cancelado', service.clientName, 'warning');
    loadServicesList();
    updateStats();
    loadHistoryTable();
}

// ==================== HISTÓRICO ====================

function loadHistoryTable() {
    const services = DB.get('services');
    const tbody = document.getElementById('servicesTableBody');

    if (services.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('noHistoryMessage').style.display = 'block';
        return;
    }

    document.getElementById('noHistoryMessage').style.display = 'none';

    const sorted = [...services].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    tbody.innerHTML = sorted.map(s => `
        <tr class="${s.status === 'completed' ? 'completed' : ''}">
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div class="customer-avatar" style="width:32px;height:32px;font-size:0.75rem;">${initials(s.clientName)}</div>
                    <strong>${s.clientName}</strong>
                </div>
            </td>
            <td>${s.deviceType}${s.deviceModel ? ' - ' + s.deviceModel : ''}</td>
            <td>${s.problemType}</td>
            <td><strong>${money(s.totalValue)}</strong></td>
            <td>${s.status !== 'pending' ? `<span style="color:#10b981;">✓ ${money(s.signalValue)}</span>` : `<span style="color:#ef4444;">⏳ ${money(s.signalValue)}</span>`}</td>
            <td>${s.status === 'completed' ? `<span style="color:#10b981;">✓ ${money(s.remainingValue)}</span>` : money(s.remainingValue)}</td>
            <td>${badge(s.status)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="showServiceModal('${s.id}')" style="margin-right:0.5rem;">Ver</button>
                ${s.status !== 'completed' && s.status !== 'cancelled' ? `<button class="btn btn-sm btn-danger" onclick="cancelService('${s.id}')">Cancelar</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// ==================== MODAL DE DETALHES ====================

function showServiceModal(serviceId) {
    const services = DB.get('services');
    const service = services.find(s => s.id === serviceId);

    if (!service) return;

    document.getElementById('modalTitle').textContent = `Detalhes de ${service.clientName}`;

    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid;gap:1rem;">
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Informações do Cliente</h4>
                <p class="text-muted">${service.clientName}</p>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Aparelho</h4>
                <p class="text-muted">${service.deviceType}${service.deviceModel ? ' - ' + service.deviceModel : ''}</p>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Problema</h4>
                <p class="text-muted">${service.problemType}</p>
            </div>
            ${service.observations ? `
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Observações</h4>
                <p class="text-muted">${service.observations}</p>
            </div>
            ` : ''}
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Valores</h4>
                <div class="service-details" style="margin:0;">
                    <div class="service-detail-item">
                        <div class="service-detail-label">Total</div>
                        <div class="service-detail-value">${money(service.totalValue)}</div>
                    </div>
                    <div class="service-detail-item">
                        <div class="service-detail-label">Sinal</div>
                        <div class="service-detail-value small" style="color:${service.status !== 'pending' ? '#10b981' : '#ef4444'};">${service.status !== 'pending' ? '✓ Pago' : '⏳ Pendente'}</div>
                    </div>
                    <div class="service-detail-item">
                        <div class="service-detail-label">Restante</div>
                        <div class="service-detail-value small">${money(service.remainingValue)}</div>
                    </div>
                </div>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Links de Pagamento</h4>
                <div class="payment-section" style="margin:0;">
                    <div class="payment-link-box">
                        <div class="payment-link-icon">💳</div>
                        <div class="payment-link-info">
                            <div class="payment-link-label">Sinal (50%) - ${money(service.signalValue)}</div>
                            <div class="payment-link-url">${service.signalLink}</div>
                        </div>
                    </div>
                    <div class="payment-link-box">
                        <div class="payment-link-icon">✅</div>
                        <div class="payment-link-info">
                            <div class="payment-link-label">Restante (50%) - ${money(service.remainingValue)}</div>
                            <div class="payment-link-url">${service.remainingLink}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Status</h4>
                <p class="text-muted">Criado em: ${datetime(service.createdAt)}</p>
                <p class="text-muted">Atualizado em: ${datetime(service.updatedAt)}</p>
            </div>
        </div>
    `;

    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('serviceModal')">Fechar</button>
    `;

    document.getElementById('serviceModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Fechar modal ao clicar fora
document.getElementById('serviceModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    updateStats();
    loadRecentClients();
    loadServicesList();
    loadHistoryTable();

    // Atualizar data a cada minuto
    setInterval(updateDate, 60000);
});