
/* =====================================================
   GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
   CLIENT.JS - PAINEL DO CLIENTE
   VERSÃO REVISADA
===================================================== */

'use strict';

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabaseClient) {
            redirectToLogin();
            return;
        }

        const sessionValid = await ensureClientSession();

        if (!sessionValid) return;

        const form = document.getElementById('budgetRequestForm');

        if (form) {
            form.addEventListener('submit', submitBudgetRequest);
        }

        await loadUserProfile();
        await loadProfile();
        await loadMyServices();
        await loadClientHistory();

    } catch (error) {
        console.error('Erro ao iniciar painel:', error);

        notify(
            'Erro',
            'Não foi possível carregar o painel.',
            'error'
        );
    }
});

/* =====================================================
   NOTIFICAÇÕES
===================================================== */

function notify(title, message, type = 'info') {
    if (typeof window.toastSafe === 'function') {
        window.toastSafe(title, message, type);
        return;
    }

    if (typeof window.toast === 'function') {
        window.toast(title, message, type);
        return;
    }

    console.log(`${title}: ${message}`);
}

/* =====================================================
   SESSÃO DO CLIENTE
===================================================== */

async function ensureClientSession() {
    if (!window.supabaseClient) {
        redirectToLogin();
        return false;
    }

    try {
        const { data, error } =
            await window.supabaseClient.auth.getSession();

        if (error || !data?.session?.user) {
            redirectToLogin();
            return false;
        }

        window.currentUser = data.session.user;

        return true;

    } catch (error) {
        console.error('Erro ao verificar sessão:', error);

        redirectToLogin();
        return false;
    }
}

/* =====================================================
   CARREGAR PERFIL NA TELA
===================================================== */

async function loadProfile() {
    const avatar = document.getElementById('profileAvatar');
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');

    if (!name || !email) return;

    const user = window.currentUser;
    const profile = window.userProfile;

    const profileName =
        profile?.name ||
        profile?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        'Cliente';

    if (avatar) {
        avatar.textContent = profileName
            .trim()
            .charAt(0)
            .toUpperCase() || '👤';
    }

    name.textContent = profileName;
    email.textContent = user?.email || '';
}

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function formatDate(date) {
    if (!date) return '-';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function formatDateTime(date) {
    if (!date) return '-';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(parsed);
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 'R$ 0,00';
    }

    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function safeText(value) {
    return String(value ?? '');
}

function escapeHTML(value) {
    return safeText(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Aguardando sinal',
        processing: 'Em andamento',
        ready: 'Pronto para entrega',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };

    return labels[status] || status || 'Desconhecido';
}

function getStatusBadge(status) {
    const labels = {
        pending: '⏳ Aguardando',
        processing: '⚙️ Em andamento',
        ready: '✓ Pronto',
        completed: '✓ Concluído',
        cancelled: '✗ Cancelado'
    };

    const classes = {
        pending: 'badge-pending',
        processing: 'badge-processing',
        ready: 'badge-ready',
        completed: 'badge-completed',
        cancelled: 'badge-cancelled'
    };

    return `
        <span class="badge ${escapeHTML(
            classes[status] || 'badge-completed'
        )}">
            ${escapeHTML(labels[status] || status || 'Desconhecido')}
        </span>
    `;
}

/* =====================================================
   IDENTIFICAR CLIENTE
===================================================== */

async function myClientId() {
    const client = window.supabaseClient;
    const user = window.currentUser;

    if (!client || !user) return null;

    try {
        const { data, error } = await client
            .from('clients')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar cliente:', error);
            return null;
        }

        return data?.id || null;

    } catch (error) {
        console.error('Erro inesperado:', error);
        return null;
    }
}

/* =====================================================
   SERVIÇOS DO CLIENTE
===================================================== */

async function getMyServices() {
    const client = window.supabaseClient;
    const user = window.currentUser;

    if (!client || !user) return [];

    const clientId = await myClientId();

    /*
      A estrutura abaixo utiliza client_id quando existe
      um cadastro correspondente na tabela clients.

      O esquema definitivo deve ser confirmado no SQL.
    */

    let query = client
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

    if (clientId) {
        query = query.eq('client_id', clientId);
    } else {
        query = query.eq('client_user_id', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
}

/* =====================================================
   SERVIÇOS EM ANDAMENTO
===================================================== */

async function loadMyServices() {
    const list = document.getElementById('myServicesList');
    const empty = document.getElementById('noServicesClient');

    if (!list) return;

    try {
        const services = await getMyServices();

        const active = services.filter(service =>
            !['cancelled', 'completed'].includes(service.status)
        );

        list.innerHTML = active
            .map(renderServiceCard)
            .join('');

        if (empty) {
            empty.style.display = active.length ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar serviços:', error);

        list.innerHTML = '';

        if (empty) empty.style.display = 'block';

        notify(
            'Erro',
            'Não foi possível carregar seus serviços.',
            'error'
        );
    }
}

/* =====================================================
   CARTÃO DE SERVIÇO
===================================================== */

function renderServiceCard(service) {
    const id = escapeHTML(service.id);
    const status = safeText(service.status);

    const device = escapeHTML(
        service.device_type || 'Aparelho'
    );

    const model = service.device_model
        ? ` - ${escapeHTML(service.device_model)}`
        : '';

    const problem = escapeHTML(
        service.problem_type || 'Problema não informado'
    );

    let buttons = '';

    if (status === 'pending') {
        buttons += `
            <button
                type="button"
                class="btn btn-success btn-sm"
                onclick="paySignal('${id}')">
                Pagar sinal
            </button>
        `;
    }

    if (status === 'ready') {
        buttons += `
            <button
                type="button"
                class="btn btn-success btn-sm"
                onclick="payRemaining('${id}')">
                Pagar restante
            </button>
        `;
    }

    if (status === 'completed') {
        buttons += `
            <button
                type="button"
                class="btn btn-secondary btn-sm"
                onclick="rateService('${id}')">
                Avaliar
            </button>
        `;
    }

    buttons += `
        <button
            type="button"
            class="btn btn-secondary btn-sm"
            onclick="showServiceDetails('${id}')">
            Detalhes
        </button>
    `;

    return `
        <article class="service-item-client ${escapeHTML(status)}">

            <h3>${device}${model}</h3>

            <p class="text-muted">${problem}</p>

            <p>${getStatusBadge(status)}</p>

            <div class="service-details">

                <div class="service-detail-item">
                    <div class="service-detail-label">Total</div>
                    <div class="service-detail-value">
                        ${formatMoney(service.total_value)}
                    </div>
                </div>

                <div class="service-detail-item">
                    <div class="service-detail-label">Restante</div>
                    <div class="service-detail-value small">
                        ${formatMoney(service.remaining_value)}
                    </div>
                </div>

            </div>

            <div style="
                margin-top: 1rem;
                display: flex;
                gap: .5rem;
                flex-wrap: wrap;
            ">
                ${buttons}
            </div>

        </article>
    `;
}

/* =====================================================
   HISTÓRICO
===================================================== */

async function loadClientHistory() {
    const tbody = document.getElementById('clientHistoryBody');
    const empty = document.getElementById('noHistoryClient');

    if (!tbody) return;

    try {
        const services = await getMyServices();

        tbody.innerHTML = services.map(service => `
            <tr>
                <td>${escapeHTML(formatDate(service.created_at))}</td>

                <td>${escapeHTML(service.device_type || '-')}</td>

                <td>${escapeHTML(service.problem_type || '-')}</td>

                <td>
                    <strong>
                        ${formatMoney(service.total_value)}
                    </strong>
                </td>

                <td>
                    ${getStatusBadge(service.status)}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-sm btn-secondary"
                        onclick="showServiceDetails('${escapeHTML(service.id)}')">
                        Ver
                    </button>
                </td>
            </tr>
        `).join('');

        if (empty) {
            empty.style.display = services.length ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);

        tbody.innerHTML = '';

        if (empty) empty.style.display = 'block';

        notify(
            'Erro',
            'Não foi possível carregar o histórico.',
            'error'
        );
    }
}

/* =====================================================
   SOLICITAR ORÇAMENTO
===================================================== */

function requestBudget() {
    const modal = document.getElementById('budgetRequestModal');

    if (!modal) {
        notify(
            'Erro',
            'Formulário de orçamento não encontrado.',
            'error'
        );
        return;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    document.getElementById('requestDeviceType')?.focus();
}

async function submitBudgetRequest(event) {
    event.preventDefault();

    if (!await ensureClientSession()) return;

    const deviceType = document
        .getElementById('requestDeviceType')?.value.trim();

    const deviceModel = document
        .getElementById('requestDeviceModel')?.value.trim();

    const problemType = document
        .getElementById('requestProblemType')?.value.trim();

    const observations = document
        .getElementById('requestObservations')?.value.trim();

    if (!deviceType || !problemType) {
        notify(
            'Atenção',
            'Preencha o tipo de aparelho e o problema.',
            'warning'
        );
        return;
    }

    const button = document.getElementById(
        'submitBudgetRequestBtn'
    );

    if (button) {
        button.disabled = true;
        button.textContent = 'Enviando...';
    }

    try {
        /*
          ATENÇÃO:
          Confirme no setup.sql se a tabela possui user_id.
          O código abaixo depende dessa coluna.
        */

        const { error } = await window.supabaseClient
            .from('budget_requests')
            .insert({
                user_id: window.currentUser.id,
                device_type: deviceType,
                device_model: deviceModel || null,
                problem_type: problemType,
                observations: observations || null
            });

        if (error) throw error;

        notify(
            'Solicitação enviada!',
            'Nossa equipe analisará seu pedido em breve.',
            'success'
        );

        document.getElementById('budgetRequestForm')?.reset();

        closeModal('budgetRequestModal');

    } catch (error) {
        console.error('Erro ao enviar orçamento:', error);

        notify(
            'Erro ao enviar',
            'Não foi possível enviar sua solicitação. Verifique a configuração do banco.',
            'error'
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Enviar Solicitação';
        }
    }
}

/* =====================================================
   NAVEGAÇÃO
===================================================== */

async function viewMyServices() {
    await loadMyServices();

    document.getElementById('myServicesList')
        ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
}

async function viewHistory() {
    await loadClientHistory();

    document.getElementById('clientHistoryBody')
        ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
}

/* =====================================================
   PAGAMENTOS
===================================================== */

async function paySignal(serviceId) {
    if (!await ensureClientSession()) return;

    notify(
        'Pagamento',
        'A integração de pagamento ainda precisa ser configurada.',
        'info'
    );

    console.log('Pagamento do sinal solicitado:', serviceId);
}

async function payRemaining(serviceId) {
    if (!await ensureClientSession()) return;

    notify(
        'Pagamento',
        'A integração de pagamento ainda precisa ser configurada.',
        'info'
    );

    console.log('Pagamento restante solicitado:', serviceId);
}

/* =====================================================
   DETALHES DO SERVIÇO
===================================================== */

async function showServiceDetails(serviceId) {
    if (!await ensureClientSession()) return;

    try {
        const { data: service, error } =
            await window.supabaseClient
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .maybeSingle();

        if (error) throw error;

        if (!service) {
            notify(
                'Aviso',
                'Serviço não encontrado.',
                'warning'
            );
            return;
        }

        const modal = document.getElementById('serviceModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        const footer = document.getElementById('modalFooter');

        if (!modal || !title || !body || !footer) return;

        const device = escapeHTML(service.device_type || '-');
        const model = service.device_model
            ? ` - ${escapeHTML(service.device_model)}`
            : '';

        title.textContent = `Serviço - ${device}`;

        body.innerHTML = `
            <div style="display:grid;gap:1rem">

                <div>
                    <h4>Aparelho</h4>
                    <p>${device}${model}</p>
                </div>

                <div>
                    <h4>Problema</h4>
                    <p>${escapeHTML(service.problem_type || '-')}</p>
                </div>

                <div>
                    <h4>Observações</h4>
                    <p>${escapeHTML(service.observations || '-')}</p>
                </div>

                <div>
                    <h4>Valor total</h4>
                    <p>${formatMoney(service.total_value)}</p>
                </div>

                <div>
                    <h4>Restante</h4>
                    <p>${formatMoney(service.remaining_value)}</p>
                </div>

                <div>
                    <h4>Status</h4>
                    <p>${escapeHTML(getStatusLabel(service.status))}</p>
                </div>

                <div>
                    <h4>Data de criação</h4>
                    <p>${escapeHTML(formatDateTime(service.created_at))}</p>
                </div>

            </div>
        `;

        footer.innerHTML = `
            <button
                type="button"
                class="btn btn-secondary"
                onclick="closeModal('serviceModal')">
                Fechar
            </button>
        `;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);

        notify(
            'Erro',
            'Não foi possível carregar os detalhes.',
            'error'
        );
    }
}

/* =====================================================
   MODAIS
===================================================== */

function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', event => {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal(event.target.id);
    }
});

/* =====================================================
   AVALIAÇÃO
===================================================== */

async function rateService(serviceId) {
    if (!await ensureClientSession()) return;

    notify(
        'Avaliação',
        'A avaliação será disponibilizada em breve.',
        'info'
    );

    console.log('Avaliação do serviço:', serviceId);
}

/* =====================================================
   REDIRECIONAMENTO
===================================================== */

function redirectToLogin() {
    window.location.href = 'login.html';
}

/* =====================================================
   FUNÇÕES GLOBAIS
===================================================== */

window.loadProfile = loadProfile;
window.loadMyServices = loadMyServices;
window.loadClientHistory = loadClientHistory;
window.requestBudget = requestBudget;
window.submitBudgetRequest = submitBudgetRequest;
window.viewMyServices = viewMyServices;
window.viewHistory = viewHistory;
window.paySignal = paySignal;
window.payRemaining = payRemaining;
window.showServiceDetails = showServiceDetails;
window.closeModal = closeModal;
window.rateService = rateService;
window.getStatusLabel = getStatusLabel;
window.getStatusBadge = getStatusBadge;
window.redirectToLogin = redirectToLogin;
window.ensureClientSession = ensureClientSession;
