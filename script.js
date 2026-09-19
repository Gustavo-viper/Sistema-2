
/* =====================================================
   GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
   SCRIPT.JS - PAINEL ADMINISTRATIVO
   Integração com Supabase
===================================================== */

'use strict';

/* =====================================================
   ESTADO DA APLICAÇÃO
===================================================== */

let clientsCache = [];
let servicesCache = [];
let searchTimeout = null;
let isLoading = false;

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function getSupabase() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.error('Supabase não foi inicializado.');
        toast('Erro de conexão', 'Supabase não está disponível.', 'error');
        return null;
    }

    return supabaseClient;
}

function money(value) {
    const number = Number(value);

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number.isFinite(number) ? number : 0);
}

function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function date(value) {
    if (!value) return '-';

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(parsedDate);
}

function datetime(value) {
    if (!value) return '-';

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsedDate);
}

function initials(name) {
    const normalizedName = String(name || '?').trim();

    if (!normalizedName) return '?';

    return normalizedName
        .split(/\s+/)
        .map(part => part.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, text) {
    const element = getElement(id);

    if (element) {
        element.textContent = text;
    }
}

function getInputValue(id) {
    const element = getElement(id);
    return element ? element.value.trim() : '';
}

function closeModal(id = 'serviceModal') {
    const modal = getElement(id);

    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

/* =====================================================
   STATUS DOS SERVIÇOS
===================================================== */

const STATUS_INFO = {
    pending: {
        label: '⏳ Aguardando',
        className: 'badge-pending'
    },
    processing: {
        label: '⚙️ Em andamento',
        className: 'badge-processing'
    },
    ready: {
        label: '✓ Pronto',
        className: 'badge-ready'
    },
    completed: {
        label: '✓ Concluído',
        className: 'badge-completed'
    },
    cancelled: {
        label: '✗ Cancelado',
        className: 'badge-cancelled'
    }
};

function getStatusBadge(status) {
    const info = STATUS_INFO[status];

    if (!info) {
        return '<span class="badge">Status desconhecido</span>';
    }

    return `
        <span class="badge ${info.className}">
            ${esc(info.label)}
        </span>
    `;
}

function badge(status) {
    return getStatusBadge(status);
}

/* =====================================================
   NOTIFICAÇÕES
===================================================== */

function toast(title, message, type = 'info') {
    const container = getElement('toastContainer');

    if (!container) {
        console.log(`[${type}] ${title}: ${message}`);
        return;
    }

    const toastElement = document.createElement('div');

    toastElement.className = `toast ${esc(type)}`;
    toastElement.setAttribute('role', 'status');

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ⓘ'
    };

    const icon = icons[type] || icons.info;

    const iconElement = document.createElement('span');
    iconElement.className = 'toast-icon';
    iconElement.textContent = icon;

    const content = document.createElement('div');
    content.className = 'toast-content';

    const titleElement = document.createElement('div');
    titleElement.className = 'toast-title';
    titleElement.textContent = title;

    const messageElement = document.createElement('div');
    messageElement.className = 'toast-message';
    messageElement.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'toast-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Fechar notificação');

    closeButton.addEventListener('click', () => {
        toastElement.remove();
    });

    content.appendChild(titleElement);
    content.appendChild(messageElement);

    toastElement.appendChild(iconElement);
    toastElement.appendChild(content);
    toastElement.appendChild(closeButton);

    container.appendChild(toastElement);

    setTimeout(() => {
        if (toastElement.parentElement) {
            toastElement.remove();
        }
    }, 5000);
}

function alertBox(type, title, message) {
    const container = getElement('budgetAlerts');

    if (!container) {
        toast(title, message, type);
        return;
    }

    const alertElement = document.createElement('div');

    alertElement.className = `alert alert-${type}`;
    alertElement.setAttribute('role', 'alert');

    const content = document.createElement('div');
    content.className = 'alert-message';

    const titleElement = document.createElement('div');
    titleElement.className = 'alert-title';
    titleElement.textContent = title;

    const messageElement = document.createElement('div');
    messageElement.innerHTML = message;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'alert-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Fechar aviso');

    closeButton.addEventListener('click', () => {
        alertElement.remove();
    });

    content.appendChild(titleElement);
    content.appendChild(messageElement);

    alertElement.appendChild(content);
    alertElement.appendChild(closeButton);

    container.appendChild(alertElement);

    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 8000);
}

/* =====================================================
   ACESSO AOS CACHES
===================================================== */

function dbClients() {
    return clientsCache;
}

function dbServices() {
    return servicesCache;
}

/* =====================================================
   CARREGAMENTO DOS DADOS
===================================================== */

async function loadClientsFromDB() {
    const client = getSupabase();

    if (!client) return false;

    const { data, error } = await client
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar clientes:', error);
        toast('Erro', `Falha ao carregar clientes: ${error.message}`, 'error');
        return false;
    }

    clientsCache = Array.isArray(data) ? data : [];
    return true;
}

async function loadServicesFromDB() {
    const client = getSupabase();

    if (!client) return false;

    const { data, error } = await client
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar serviços:', error);
        toast('Erro', `Falha ao carregar serviços: ${error.message}`, 'error');
        return false;
    }

    servicesCache = Array.isArray(data) ? data : [];
    return true;
}

async function refreshAll() {
    if (isLoading) return;

    isLoading = true;

    try {
        await Promise.all([
            loadClientsFromDB(),
            loadServicesFromDB()
        ]);

        renderAll();
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        toast('Erro', 'Não foi possível atualizar os dados.', 'error');
    } finally {
        isLoading = false;
    }
}

function renderAll() {
    updateDate();
    updateStats();
    loadRecentClients();
    filterServices();
    loadHistoryTable();
}

function updateDate() {
    const element = getElement('currentDate');

    if (!element) return;

    element.textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/* =====================================================
   ESTATÍSTICAS
===================================================== */

function updateStats() {
    const clients = dbClients();
    const services = dbServices();

    const totalClients = clients.length;

    const completedServices = services.filter(service =>
        service.status === 'completed'
    ).length;

    const pendingServices = services.filter(service =>
        service.status === 'ready' || service.status === 'pending'
    ).length;

    const vipClients = clients.filter(client =>
        client.vip === true
    ).length;

    const statsGrid = getElement('statsGrid');

    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div class="stat-card blue">
            <div class="stat-card-header">
                <div class="stat-card-icon">👥</div>
                <div>
                    <span class="stat-card-value">${totalClients}</span>
                    <br>
                    <span class="stat-card-label">Clientes</span>
                </div>
            </div>
        </div>

        <div class="stat-card green">
            <div class="stat-card-header">
                <div class="stat-card-icon">✅</div>
                <div>
                    <span class="stat-card-value">${completedServices}</span>
                    <br>
                    <span class="stat-card-label">Serviços concluídos</span>
                </div>
            </div>
        </div>

        <div class="stat-card yellow">
            <div class="stat-card-header">
                <div class="stat-card-icon">⏳</div>
                <div>
                    <span class="stat-card-value">${pendingServices}</span>
                    <br>
                    <span class="stat-card-label">Aguardando retirada</span>
                </div>
            </div>
        </div>

        <div class="stat-card red">
            <div class="stat-card-header">
                <div class="stat-card-icon">⭐</div>
                <div>
                    <span class="stat-card-value">${vipClients}</span>
                    <br>
                    <span class="stat-card-label">Clientes VIP</span>
                </div>
            </div>
        </div>
    `;
}

/* =====================================================
   CLIENTES
===================================================== */

function showAddClientForm() {
    const container = getElement('recentClients');

    if (!container) return;

    container.innerHTML = `
        <div class="section" style="margin:0;">
            <div class="form-group">
                <label class="form-label" for="newClientName">
                    Nome completo <span class="required">*</span>
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="newClientName"
                    placeholder="Digite o nome completo"
                    maxlength="120"
                    required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="newClientPhone">
                        Telefone <span class="required">*</span>
                    </label>

                    <input
                        type="tel"
                        class="form-input"
                        id="newClientPhone"
                        placeholder="(00) 00000-0000"
                        maxlength="25"
                        required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="newClientEmail">
                        E-mail
                    </label>

                    <input
                        type="email"
                        class="form-input"
                        id="newClientEmail"
                        placeholder="email@exemplo.com"
                        maxlength="150">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="newClientAddress">
                        Endereço
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        id="newClientAddress"
                        placeholder="Rua, número, bairro"
                        maxlength="250">
                </div>

                <div class="form-group">
                    <label class="form-label" for="newClientVip">
                        Cliente VIP
                    </label>

                    <select class="form-select" id="newClientVip">
                        <option value="false">Não</option>
                        <option value="true">Sim - Cliente VIP</option>
                    </select>
                </div>
            </div>

            <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem;">
                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="addNewClient()">
                    Adicionar cliente
                </button>

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="cancelAddClient()">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    const noMessage = getElement('noClientsMessage');

    if (noMessage) {
        noMessage.style.display = 'none';
    }
}

function cancelAddClient() {
    const container = getElement('recentClients');

    if (container) {
        container.innerHTML = '';
    }

    loadRecentClients();
}

async function addNewClient() {
    const client = getSupabase();

    if (!client) return;

    const name = getInputValue('newClientName');
    const phone = getInputValue('newClientPhone');
    const email = getInputValue('newClientEmail');
    const address = getInputValue('newClientAddress');

    const vipElement = getElement('newClientVip');
    const vip = vipElement ? vipElement.value === 'true' : false;

    if (!name || !phone) {
        alertBox(
            'error',
            'Dados incompletos',
            'Nome e telefone são obrigatórios.'
        );
        return;
    }

    const emailValue = email || null;
    const addressValue = address || null;

    const { data, error } = await client
        .from('clients')
        .insert([{
            name,
            phone,
            email: emailValue,
            address: addressValue,
            vip
        }])
        .select()
        .single();

    if (error) {
        console.error('Erro ao cadastrar cliente:', error);

        if (error.code === '23505') {
            alertBox(
                'error',
                'Cliente existente',
                'Já existe um cliente com este telefone.'
            );
        } else {
            alertBox(
                'error',
                'Erro ao cadastrar',
                esc(error.message)
            );
        }

        return;
    }

    if (!data) {
        toast('Erro', 'O cliente não foi retornado pelo banco.', 'error');
        return;
    }

    clientsCache.unshift(data);

    toast(
        'Cliente cadastrado',
        `${name} foi adicionado à lista.`,
        'success'
    );

    cancelAddClient();
    updateStats();
    loadRecentClients();
}

/* =====================================================
   LISTA DE CLIENTES RECENTES
===================================================== */

function loadRecentClients() {
    const container = getElement('recentClients');
    const noMessage = getElement('noClientsMessage');

    if (!container) return;

    const clients = dbClients();

    if (clients.length === 0) {
        container.innerHTML = '';

        if (noMessage) {
            noMessage.style.display = 'block';
        }

        return;
    }

    if (noMessage) {
        noMessage.style.display = 'none';
    }

    container.innerHTML = clients
        .slice(0, 5)
        .map(client => {
            const clientName = esc(client.name || 'Cliente');
            const clientPhone = esc(client.phone || '-');
            const clientEmail = client.email
                ? ` • ${esc(client.email)}`
                : '';

            return `
                <div
                    class="service-item"
                    style="cursor:default;">

                    <div
                        class="customer-avatar"
                        style="width:40px;height:40px;font-size:.875rem;">
                        ${esc(initials(client.name))}
                    </div>

                    <div class="service-item-info">
                        <div class="service-item-title">
                            ${clientName}
                            ${client.vip ? '⭐' : ''}
                        </div>

                        <div class="service-item-desc">
                            ${clientPhone}${clientEmail}
                        </div>
                    </div>

                    <div class="service-item-date">
                        📅 ${esc(date(client.created_at))}
                    </div>
                </div>
            `;
        })
        .join('');
}

/* =====================================================
   PESQUISA DE CLIENTES
===================================================== */

function searchClients() {
    const searchInput = getElement('clientSearch');
    const resultsContainer = getElement('searchResults');

    if (!searchInput || !resultsContainer) return;

    const query = searchInput.value.trim().toLowerCase();

    clearTimeout(searchTimeout);

    if (!query) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(() => {
        const results = dbClients().filter(client => {
            const name = String(client.name || '').toLowerCase();
            const phone = String(client.phone || '').toLowerCase();
            const email = String(client.email || '').toLowerCase();

            return (
                name.includes(query) ||
                phone.includes(query) ||
                email.includes(query)
            );
        });

        if (results.length === 0) {
            resultsContainer.style.display = 'block';

            resultsContainer.innerHTML = `
                <div class="alert alert-info" style="margin:0;">
                    Nenhum cliente encontrado.
                </div>
            `;

            return;
        }

        resultsContainer.style.display = 'block';

        resultsContainer.innerHTML = results
            .map(client => `
                <div
                    class="search-result-item"
                    role="button"
                    tabindex="0"
                    onclick="selectClient('${esc(client.id)}')"
                    onkeydown="if(event.key==='Enter')selectClient('${esc(client.id)}')">

                    <div class="search-result-name">
                        ${esc(client.name || 'Cliente')}
                        ${client.vip ? '⭐' : ''}
                    </div>

                    <div class="search-result-contact">
                        📱 ${esc(client.phone || '-')}
                        ${client.email ? ` • 📧 ${esc(client.email)}` : ''}
                    </div>
                </div>
            `)
            .join('');
    }, 300);
}

function selectClient(id) {
    const client = dbClients().find(item => String(item.id) === String(id));

    if (!client) {
        toast('Erro', 'Cliente não encontrado.', 'error');
        return;
    }

    const selectedClient = getElement('selectedClient');
    const searchInput = getElement('clientSearch');
    const searchResults = getElement('searchResults');
    const clientError = getElement('clientError');

    if (!selectedClient || !searchInput) return;

    selectedClient.style.display = 'block';

    selectedClient.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
            <div>
                <strong>${esc(client.name || 'Cliente')}</strong>
                ${client.vip ? '⭐' : ''}

                <div style="font-size:.875rem;color:#6b7280;margin-top:.25rem;">
                    📱 ${esc(client.phone || '-')}
                    ${client.email ? `<br>📧 ${esc(client.email)}` : ''}
                </div>
            </div>

            <button
                type="button"
                class="btn btn-sm btn-secondary"
                onclick="clearSelectedClient()"
                aria-label="Remover cliente selecionado">
                ×
            </button>
        </div>
    `;

    searchInput.value = client.name || '';
    searchInput.dataset.clientId = String(client.id);

    if (searchResults) {
        searchResults.style.display = 'none';
    }

    if (clientError) {
        clientError.classList.remove('show');
    }
}

function clearSelectedClient() {
    const selectedClient = getElement('selectedClient');
    const searchInput = getElement('clientSearch');
    const searchResults = getElement('searchResults');

    if (selectedClient) {
        selectedClient.style.display = 'none';
        selectedClient.innerHTML = '';
    }

    if (searchInput) {
        searchInput.value = '';
        delete searchInput.dataset.clientId;
    }

    if (searchResults) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }
}

/* =====================================================
   VALORES DOS SERVIÇOS
===================================================== */

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

function generateRandomValue(problemType) {
    const range = values[problemType];

    if (!range) return 0;

    const [minimum, maximum] = range;

    return Math.floor(
        Math.random() * (maximum - minimum + 1)
    ) + minimum;
}

function generatePaymentLink(serviceId, type) {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;

    const paymentType = type === 'signal'
        ? 'signal'
        : 'remaining';

    return `${baseUrl}?pay=${encodeURIComponent(serviceId)}&type=${paymentType}`;
}

/* =====================================================
   GERAÇÃO DE ORÇAMENTOS
===================================================== */

async function submitBudget(event) {
    if (event) {
        event.preventDefault();
    }

    const client = getSupabase();

    if (!client) return;

    const button = getElement('submitBudgetBtn');

    if (button) {
        button.disabled = true;
        button.textContent = 'Gerando...';
    }

    try {
        const searchInput = getElement('clientSearch');
        const clientId = searchInput
            ? searchInput.dataset.clientId
            : '';

        const clientError = getElement('clientError');

        if (!clientId) {
            if (clientError) {
                clientError.classList.add('show');
            }

            toast(
                'Atenção',
                'Selecione um cliente antes de continuar.',
                'warning'
            );

            return;
        }

        const deviceType = getInputValue('deviceType');
        const problemType = getInputValue('problemType');
        const deviceModel = getInputValue('deviceModel');
        const observations = getInputValue('observations');

        if (!deviceType || !problemType) {
            toast(
                'Campos obrigatórios',
                'Selecione o aparelho e o problema.',
                'warning'
            );

            return;
        }

        const selectedClient = dbClients().find(
            item => String(item.id) === String(clientId)
        );

        if (!selectedClient) {
            toast('Erro', 'Cliente não encontrado.', 'error');
            return;
        }

        const totalValue = generateRandomValue(problemType);

        if (totalValue <= 0) {
            toast(
                'Erro',
                'Não existe valor cadastrado para este problema.',
                'error'
            );

            return;
        }

        const signalValue = Number((totalValue * 0.5).toFixed(2));
        const remainingValue = Number(
            (totalValue - signalValue).toFixed(2)
        );

        const temporaryId = `svc_${Date.now()}`;

        const serviceData = {
            client_id: clientId,
            client_user_id: selectedClient.auth_user_id || null,
            device_type: deviceType,
            device_model: deviceModel || null,
            problem_type: problemType,
            observations: observations || null,
            total_value: totalValue,
            signal_value: signalValue,
            remaining_value: remainingValue,
            signal_link: generatePaymentLink(temporaryId, 'signal'),
            remaining_link: generatePaymentLink(temporaryId, 'remaining'),
            status: 'pending'
        };

        const { data, error } = await client
            .from('services')
            .insert([serviceData])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar orçamento:', error);

            toast(
                'Erro ao criar orçamento',
                error.message,
                'error'
            );

            return;
        }

        if (!data) {
            toast(
                'Erro',
                'O orçamento não foi retornado pelo banco.',
                'error'
            );

            return;
        }

        servicesCache.unshift(data);

        toast(
            'Orçamento criado',
            `Serviço para ${selectedClient.name || 'cliente'} criado com sucesso.`,
            'success'
        );

        clearSelectedClient();

        const fieldsToClear = [
            'deviceType',
            'problemType',
            'deviceModel',
            'observations'
        ];

        fieldsToClear.forEach(id => {
            const field = getElement(id);

            if (field) {
                field.value = '';
            }
        });

        alertBox(
            'success',
            'Orçamento gerado',
            `
                <p>Cliente: <strong>${esc(selectedClient.name || 'Cliente')}</strong></p>
                <p>Total: <strong>${money(data.total_value)}</strong></p>
                <p>Sinal de 50%: <strong>${money(data.signal_value)}</strong></p>
                <p>O link de pagamento deve ser enviado ao cliente após a integração com o gateway de pagamento.</p>
            `
        );

        filterServices();
        loadHistoryTable();
        updateStats();

    } catch (error) {
        console.error('Erro inesperado ao gerar orçamento:', error);

        toast(
            'Erro inesperado',
            'Não foi possível gerar o orçamento.',
            'error'
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Gerar orçamento automático';
        }
    }
}

/* =====================================================
   SERVIÇOS
===================================================== */

function serviceClientName(service) {
    const client = clientsCache.find(
        item => String(item.id) === String(service.client_id)
    );

    return client || {
        id: service.client_id,
        name: 'Cliente não identificado',
        phone: '',
        email: ''
    };
}

function filterServices() {
    const searchInput = getElement('serviceSearch');
    const statusInput = getElement('filterStatus');
    const list = getElement('servicesList');
    const emptyMessage = getElement('noServicesMessage');

    if (!list) return;

    const query = searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';

    const selectedStatus = statusInput
        ? statusInput.value
        : 'all';

    const services = servicesCache.filter(service => {
        if (
            service.status === 'completed' ||
            service.status === 'cancelled'
        ) {
            return false;
        }

        if (
            selectedStatus !== 'all' &&
            service.status !== selectedStatus
        ) {
            return false;
        }

        if (!query) return true;

        const client = serviceClientName(service);

        const searchableText = [
            client.name,
            service.device_type,
            service.device_model,
            service.problem_type
        ]
            .join(' ')
            .toLowerCase();

        return searchableText.includes(query);
    });

    if (services.length === 0) {
        list.innerHTML = '';

        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }

        return;
    }

    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }

    list.innerHTML = services
        .map(service => {
            const client = serviceClientName(service);

            let actions = '';

            if (service.status === 'pending') {
                actions = `
                    <button
                        class="btn btn-sm btn-success"
                        onclick="approveService('${esc(service.id)}')">
                        Confirmar sinal
                    </button>

                    <button
                        class="btn btn-sm btn-danger"
                        onclick="deleteService('${esc(service.id)}')">
                        Excluir
                    </button>
                `;
            }

            if (service.status === 'processing') {
                actions = `
                    <button
                        class="btn btn-sm btn-primary"
                        onclick="markReady('${esc(service.id)}')">
                        Pronto para retirada
                    </button>
                `;
            }

            if (service.status === 'ready') {
                actions = `
                    <button
                        class="btn btn-sm btn-success"
                        onclick="markComplete('${esc(service.id)}')">
                        Confirmar conclusão
                    </button>
                `;
            }

            return `
                <div class="service-card">
                    <div class="service-header">
                        <div>
                            <strong>${esc(client.name)}</strong>

                            <div class="text-muted">
                                ${esc(service.device_type || '-')}
                                |
                                ${esc(service.problem_type || '-')}
                            </div>
                        </div>

                        ${getStatusBadge(service.status)}
                    </div>

                    <div class="service-details">
                        <div class="service-detail-item">
                            <div class="service-detail-label">Total</div>
                            <div class="service-detail-value">
                                ${money(service.total_value)}
                            </div>
                        </div>

                        <div class="service-detail-item">
                            <div class="service-detail-label">Sinal 50%</div>
                            <div class="service-detail-value small">
                                ${money(service.signal_value)}
                            </div>
                        </div>

                        <div class="service-detail-item">
                            <div class="service-detail-label">Restante 50%</div>
                            <div class="service-detail-value small">
                                ${money(service.remaining_value)}
                            </div>
                        </div>
                    </div>

                    <div class="service-actions">
                        <button
                            class="btn btn-sm btn-secondary"
                            onclick="showServiceDetails('${esc(service.id)}')">
                            Detalhes
                        </button>

                        ${actions}
                    </div>
                </div>
            `;
        })
        .join('');
}

function loadHistoryTable() {
    const tbody = getElement('servicesTableBody');
    const emptyMessage = getElement('noHistoryMessage');

    if (!tbody) return;

    if (servicesCache.length === 0) {
        tbody.innerHTML = '';

        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }

        return;
    }

    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }

    tbody.innerHTML = servicesCache
        .map(service => {
            const client = serviceClientName(service);

            return `
                <tr>
                    <td>${esc(client.name)}</td>
                    <td>${esc(service.device_type || '-')}</td>
                    <td>${esc(service.problem_type || '-')}</td>
                    <td>${money(service.total_value)}</td>
                    <td>${money(service.signal_value)}</td>
                    <td>${money(service.remaining_value)}</td>
                    <td>${getStatusBadge(service.status)}</td>
                    <td>
                        <button
                            class="btn btn-sm btn-secondary"
                            onclick="showServiceDetails('${esc(service.id)}')">
                            Ver
                        </button>
                    </td>
                </tr>
            `;
        })
        .join('');
}

/* =====================================================
   DETALHES DO SERVIÇO
===================================================== */

function showServiceDetails(id) {
    const service = servicesCache.find(
        item => String(item.id) === String(id)
    );

    if (!service) {
        toast('Erro', 'Serviço não encontrado.', 'error');
        return;
    }

    const client = serviceClientName(service);

    const modal = getElement('serviceModal');
    const title = getElement('modalTitle');
    const body = getElement('modalBody');
    const footer = getElement('modalFooter');

    if (!modal || !title || !body || !footer) return;

    title.textContent = `Serviço - ${client.name || 'Cliente'}`;

    body.innerHTML = `
        <div style="display:grid;gap:1rem;">
            <p>
                <strong>Cliente:</strong>
                ${esc(client.name || '-')}
            </p>

            <p>
                <strong>Telefone:</strong>
                ${esc(client.phone || '-')}
            </p>

            <p>
                <strong>Aparelho:</strong>
                ${esc(service.device_type || '-')}
            </p>

            <p>
                <strong>Modelo:</strong>
                ${esc(service.device_model || '-')}
            </p>

            <p>
                <strong>Problema:</strong>
                ${esc(service.problem_type || '-')}
            </p>

            <p>
                <strong>Observações:</strong>
                ${esc(service.observations || '-')}
            </p>

            <div class="service-details">
                <div class="service-detail-item">
                    <div class="service-detail-label">Total</div>
                    <div class="service-detail-value">
                        ${money(service.total_value)}
                    </div>
                </div>

                <div class="service-detail-item">
                    <div class="service-detail-label">Sinal</div>
                    <div class="service-detail-value small">
                        ${money(service.signal_value)}
                    </div>
                </div>

                <div class="service-detail-item">
                    <div class="service-detail-label">Restante</div>
                    <div class="service-detail-value small">
                        ${money(service.remaining_value)}
                    </div>
                </div>
            </div>

            <p>
                <strong>Status:</strong>
                ${getStatusBadge(service.status)}
            </p>

            <p class="text-muted">
                Criado em: ${esc(datetime(service.created_at))}
            </p>
        </div>
    `;

    let footerHTML = `
        <button
            type="button"
            class="btn btn-secondary"
            onclick="closeModal('serviceModal')">
            Fechar
        </button>
    `;

    if (service.status === 'pending') {
        footerHTML += `
            <button
                type="button"
                class="btn btn-success"
                onclick="approveService('${esc(service.id)}')">
                Confirmar sinal
            </button>
        `;
    }

    if (service.status === 'processing') {
        footerHTML += `
            <button
                type="button"
                class="btn btn-primary"
                onclick="markReady('${esc(service.id)}')">
                Marcar como pronto
            </button>
        `;
    }

    if (service.status === 'ready') {
        footerHTML += `
            <button
                type="button"
                class="btn btn-success"
                onclick="markComplete('${esc(service.id)}')">
                Confirmar conclusão
            </button>
        `;
    }

    footer.innerHTML = footerHTML;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

/* =====================================================
   ATUALIZAÇÃO DE STATUS
===================================================== */

async function setStatus(id, changes) {
    const client = getSupabase();

    if (!client) return null;

    try {
        const { data, error } = await client
            .from('services')
            .update(changes)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar serviço:', error);

            toast(
                'Erro',
                `Não foi possível atualizar o serviço: ${error.message}`,
                'error'
            );

            return null;
        }

        const index = servicesCache.findIndex(
            service => String(service.id) === String(id)
        );

        if (index !== -1 && data) {
            servicesCache[index] = data;
        }

        renderAll();

        return data;

    } catch (error) {
        console.error('Erro inesperado:', error);
        toast('Erro', 'Falha inesperada ao atualizar o serviço.', 'error');
        return null;
    }
}

async function approveService(id) {
    const service = servicesCache.find(
        item => String(item.id) === String(id)
    );

    if (!service) return;

    const confirmed = confirm(
        'Confirme somente se o pagamento do sinal foi realmente recebido.'
    );

    if (!confirmed) return;

    const updatedService = await setStatus(id, {
        status: 'processing',
        signal_paid_at: new Date().toISOString()
    });

    if (updatedService) {
        toast(
            'Sinal confirmado',
            'O serviço foi marcado como em andamento.',
            'success'
        );
    }

    closeModal();
}

async function markReady(id) {
    const updatedService = await setStatus(id, {
        status: 'ready'
    });

    if (!updatedService) return;

    const client = serviceClientName(updatedService);
    const notification = getElement('completedNotification');

    if (notification) {
        notification.style.display = 'block';
        notification.textContent =
            `Aparelho pronto! Cliente: ${client.name}. ` +
            `Valor restante: ${money(updatedService.remaining_value)}.`;
    }

    toast(
        'Serviço pronto',
        'O aparelho está pronto para retirada.',
        'success'
    );

    closeModal();
}

async function markComplete(id) {
    const confirmed = confirm(
        'Confirme somente se o pagamento final foi realmente recebido.'
    );

    if (!confirmed) return;

    const updatedService = await setStatus(id, {
        status: 'completed',
        remaining_paid_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
    });

    if (updatedService) {
        toast(
            'Serviço concluído',
            'O serviço foi marcado como concluído.',
            'success'
        );
    }

    closeModal();
}

async function deleteService(id) {
    const client = getSupabase();

    if (!client) return;

    const confirmed = confirm(
        'Tem certeza de que deseja excluir este serviço?'
    );

    if (!confirmed) return;

    const { error } = await client
        .from('services')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao excluir serviço:', error);

        toast(
            'Erro',
            `Não foi possível excluir o serviço: ${error.message}`,
            'error'
        );

        return;
    }

    servicesCache = servicesCache.filter(
        service => String(service.id) !== String(id)
    );

    renderAll();

    toast(
        'Serviço excluído',
        'O serviço foi removido.',
        'success'
    );

    closeModal();
}

/* =====================================================
   INICIALIZAÇÃO DO PAINEL ADMINISTRATIVO
===================================================== */

async function initializeAdminPanel() {
    updateDate();

    const client = getSupabase();

    if (!client) {
        const lockScreen = getElement('lockScreen');

        if (lockScreen) {
            lockScreen.style.display = 'flex';
        }

        return;
    }

    try {
        const { data, error } = await client.auth.getSession();

        if (error || !data.session) {
            window.location.href = 'login.html?next=index.html';
            return;
        }

        if (typeof currentUser !== 'undefined') {
            currentUser = data.session.user;
        }

        let isAdmin = false;

        try {
            const result = await client.rpc('current_user_is_admin');

            if (!result.error && result.data === true) {
                isAdmin = true;
            }
        } catch (error) {
            console.error('Erro ao verificar administrador:', error);
        }

        const lockScreen = getElement('lockScreen');
        const adminApp = getElement('adminApp');

        if (!isAdmin) {
            if (lockScreen) {
                lockScreen.style.display = 'flex';
            }

            if (adminApp) {
                adminApp.classList.add('hidden');
            }

            toast(
                'Acesso negado',
                'Sua conta não possui permissão de administrador.',
                'error'
            );

            return;
        }

        if (lockScreen) {
            lockScreen.style.display = 'none';
        }

        if (adminApp) {
            adminApp.classList.remove('hidden');
        }

        await refreshAll();

    } catch (error) {
        console.error('Erro ao iniciar painel administrativo:', error);

        toast(
            'Erro',
            'Não foi possível iniciar o painel administrativo.',
            'error'
        );
    }
}

/* =====================================================
   EVENTOS
===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const budgetForm = getElement('budgetForm');

    if (budgetForm) {
        budgetForm.addEventListener('submit', submitBudget);
    }

    const serviceModal = getElement('serviceModal');

    if (serviceModal) {
        serviceModal.setAttribute('aria-hidden', 'true');

        serviceModal.addEventListener('click', event => {
            if (event.target === serviceModal) {
                closeModal('serviceModal');
            }
        });
    }

    initializeAdminPanel();
});

/* =====================================================
   FUNÇÕES GLOBAIS USADAS PELO HTML
===================================================== */

window.money = money;
window.date = date;
window.datetime = datetime;
window.toast = toast;
window.alertBox = alertBox;
window.badge = badge;

window.showAddClientForm = showAddClientForm;
window.cancelAddClient = cancelAddClient;
window.addNewClient = addNewClient;
window.loadRecentClients = loadRecentClients;

window.searchClients = searchClients;
window.selectClient = selectClient;
window.clearSelectedClient = clearSelectedClient;

window.generateRandomValue = generateRandomValue;
window.generatePaymentLink = generatePaymentLink;

window.filterServices = filterServices;
window.loadHistoryTable = loadHistoryTable;

window.showServiceDetails = showServiceDetails;
window.closeModal = closeModal;

window.approveService = approveService;
window.markReady = markReady;
window.markComplete = markComplete;
window.deleteService = deleteService;

window.refreshAll = refreshAll;
window.updateStats = updateStats;
window.updateDate = updateDate;
