
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
        const markReadButton = document.getElementById('markNotificationsReadBtn');

        if (form) {
            form.addEventListener('submit', submitBudgetRequest);
        }

        if (markReadButton) {
            markReadButton.addEventListener('click', markAllNotificationsRead);
        }

        await loadUserProfile();
        await loadProfile();
        await loadMyServices();
        await loadClientHistory();
        await loadMyBudgetRequests();
        await loadMyNotifications();

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
   NOTIFICAÇÕES DO CLIENTE
===================================================== */

function notificationTypeLabel(type) {
    const labels = { success: 'Atualização', info: 'Informação', warning: 'Atenção', error: 'Aviso' };
    return labels[type] || 'Notificação';
}

async function getMyNotifications() {
    const client = window.supabaseClient;
    const user = window.currentUser;
    if (!client || !user) return [];

    const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) throw error;
    return data || [];
}

function renderNotification(item) {
    const unread = !item.read_at;
    return `
        <article class="notification-item ${unread ? 'unread' : ''}">
            <h3>${escapeHTML(item.title || notificationTypeLabel(item.type))}</h3>
            <p>${escapeHTML(item.message || '')}</p>
            <small>${escapeHTML(formatDateTime(item.created_at))}${unread ? ' • Não lida' : ''}</small>
            ${unread ? `<div class="notification-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="markNotificationRead('${escapeHTML(item.id)}')">Marcar como lida</button></div>` : ''}
        </article>`;
}

async function loadMyNotifications() {
    const list = document.getElementById('notificationsList');
    const empty = document.getElementById('noNotificationsClient');
    const count = document.getElementById('notificationCount');
    if (!list) return;

    try {
        const notifications = await getMyNotifications();
        list.innerHTML = notifications.map(renderNotification).join('');
        const unreadCount = notifications.filter(item => !item.read_at).length;
        if (count) {
            count.textContent = String(unreadCount);
            count.hidden = unreadCount === 0;
        }
        if (empty) empty.style.display = notifications.length ? 'none' : 'block';
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        list.innerHTML = '';
        if (count) count.hidden = true;
        if (empty) {
            empty.style.display = 'block';
            empty.querySelector('p')?.replaceChildren(document.createTextNode('Não foi possível carregar as notificações.'));
        }
    }
}

async function markNotificationRead(notificationId) {
    const client = window.supabaseClient;
    const user = window.currentUser;
    if (!client || !user || !notificationId) return;

    const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Erro ao marcar notificação:', error);
        notify('Erro', 'Não foi possível marcar a notificação.', 'error');
        return;
    }

    await loadMyNotifications();
}

async function markAllNotificationsRead() {
    const client = window.supabaseClient;
    const user = window.currentUser;
    if (!client || !user) return;

    const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

    if (error) {
        console.error('Erro ao marcar notificações:', error);
        notify('Erro', 'Não foi possível marcar as notificações.', 'error');
        return;
    }

    await loadMyNotifications();
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
   SOLICITAÇÕES DE ORÇAMENTO DO CLIENTE
===================================================== */

const BUDGET_REQUEST_STATUS = {
    pending: 'Aguardando análise',
    reviewing: 'Em análise',
    quoted: 'Orçamento respondido',
    approved: 'Aprovado',
    rejected: 'Recusado',
    cancelled: 'Cancelado'
};

async function getMyBudgetRequests() {
    const client = window.supabaseClient;
    const user = window.currentUser;
    if (!client || !user) return [];

    const { data, error } = await client
        .from('budget_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

function renderBudgetRequestCard(request) {
    const status = request.status || 'pending';
    const statusLabel = BUDGET_REQUEST_STATUS[status] || status;
    const response = request.admin_response
        ? `<div class="budget-request-response"><strong>Resposta da assistência:</strong><p>${escapeHTML(request.admin_response)}</p></div>`
        : '';
    const value = request.quoted_value !== null && request.quoted_value !== undefined
        ? `<p><strong>Valor informado:</strong> ${formatMoney(request.quoted_value)}</p>`
        : '';

    return `
        <article class="budget-request-card">
            <h3>${escapeHTML(request.device_type || 'Aparelho')} ${request.device_model ? `- ${escapeHTML(request.device_model)}` : ''}</h3>
            <p><strong>Problema:</strong> ${escapeHTML(request.problem_type || 'Não informado')}</p>
            <p><strong>Observações:</strong> ${escapeHTML(request.observations || 'Nenhuma')}</p>
            ${value}
            ${response}
            <div class="budget-request-meta">
                <span class="status-badge ${escapeHTML(status)}">${escapeHTML(statusLabel)}</span>
                <small>Enviado em ${escapeHTML(formatDateTime(request.created_at))}</small>
            </div>
        </article>`;
}

async function loadMyBudgetRequests() {
    const list = document.getElementById('myBudgetRequestsList');
    const empty = document.getElementById('noBudgetRequestsClient');
    if (!list) return;

    try {
        const requests = await getMyBudgetRequests();
        list.innerHTML = requests.map(renderBudgetRequestCard).join('');
        if (empty) empty.style.display = requests.length ? 'none' : 'block';
    } catch (error) {
        console.error('Erro ao carregar solicitações de orçamento:', error);
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        notify('Erro', 'Não foi possível carregar suas solicitações de orçamento.', 'error');
    }
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

const PIX_SIGNAL_KEY = '04416436041';

function copyPixKey() {
    const key = PIX_SIGNAL_KEY;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(key).then(() => {
            notify('PIX copiado', 'A chave PIX foi copiada para a área de transferência.', 'success');
        }).catch(() => notify('Chave PIX', key, 'info'));
    } else {
        const helper = document.createElement('textarea');
        helper.value = key;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        try { document.execCommand('copy'); notify('PIX copiado', 'A chave PIX foi copiada.', 'success'); }
        catch { notify('Chave PIX', key, 'info'); }
        helper.remove();
    }
}

function openPixSignalModal(service) {
    const existing = document.getElementById('pixSignalModal');
    existing?.remove();
    const amount = service?.signal_value !== null && service?.signal_value !== undefined
        ? formatMoney(service.signal_value) : 'a confirmar';
    const modal = document.createElement('div');
    modal.id = 'pixSignalModal';
    modal.className = 'modal-overlay active payment-pix-modal';
    modal.setAttribute('aria-hidden', 'false');
    modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pixSignalTitle">
            <div class="modal-header">
                <h2 id="pixSignalTitle" class="modal-title">💚 Pagar sinal via PIX</h2>
                <button type="button" class="modal-close" id="closePixSignal" aria-label="Fechar">×</button>
            </div>
            <div class="modal-body">
                <div class="pix-animation" aria-hidden="true">✓</div>
                <h3>Chave PIX da assistência</h3>
                <p>Valor do sinal: <strong>${escapeHTML(amount)}</strong></p>
                <div class="pix-key-box">
                    <span class="pix-key" id="pixSignalKey">${PIX_SIGNAL_KEY}</span>
                    <button type="button" class="btn btn-primary btn-sm" id="copyPixSignal">Copiar</button>
                </div>
                <p class="muted">Após realizar o pagamento, envie o comprovante pelo chat para confirmarmos seu sinal.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="closePixSignalFooter">Fechar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.remove(); };
    document.getElementById('closePixSignal')?.addEventListener('click', close);
    document.getElementById('closePixSignalFooter')?.addEventListener('click', close);
    document.getElementById('copyPixSignal')?.addEventListener('click', copyPixKey);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
}

async function paySignal(serviceId) {
    if (!await ensureClientSession()) return;
    try {
        const { data: service, error } = await window.supabaseClient
            .from('services').select('id, signal_value, device_type, device_model')
            .eq('id', serviceId).maybeSingle();
        if (error) throw error;
        openPixSignalModal(service || {});
    } catch (error) {
        console.error('Erro ao carregar sinal:', error);
        openPixSignalModal({});
    }
}

async function payRemaining(serviceId) {
    if (!await ensureClientSession()) return;
    notify('Pagamento', 'Para pagar o valor restante, entre em contato com a assistência pelo chat.', 'info');
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
window.loadMyBudgetRequests = loadMyBudgetRequests;
window.requestBudget = requestBudget;
window.submitBudgetRequest = submitBudgetRequest;
window.viewMyServices = viewMyServices;
window.viewHistory = viewHistory;
window.paySignal = paySignal;
window.copyPixKey = copyPixKey;
window.loadMyNotifications = loadMyNotifications;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.payRemaining = payRemaining;
window.showServiceDetails = showServiceDetails;
window.closeModal = closeModal;
window.rateService = rateService;
window.getStatusLabel = getStatusLabel;
window.getStatusBadge = getStatusBadge;
window.redirectToLogin = redirectToLogin;
window.ensureClientSession = ensureClientSession;

/* =====================================================
   PACOTE COMPLETO - ETAPAS 3, 4 E 5
   Chat, anexos e avaliações
===================================================== */

function featureEscape(value) {
    return escapeHTML(value ?? '');
}

function ensureClientExtraPanels() {
    const container = document.querySelector('main.container');
    if (!container) return;

    if (!document.getElementById('clientChatPanel')) {
        const section = document.createElement('section');
        section.id = 'clientChatPanel';
        section.className = 'feature-panel';
        section.innerHTML = `
            <div class="feature-heading"><h2 class="section-title">💬 Fale com a assistência</h2></div>
            <div id="clientChatMessages" class="chat-messages" aria-live="polite"></div>
            <p id="clientChatEmpty" class="muted">Nenhuma mensagem ainda. Envie uma mensagem para começar.</p>
            <form id="clientChatForm" class="chat-form">
                <textarea id="clientChatInput" rows="2" maxlength="4000" required placeholder="Digite sua mensagem..."></textarea>
                <button class="btn btn-primary" type="submit" id="clientChatSendBtn">Enviar mensagem</button>
            </form>`;
        const notifications = document.getElementById('notificationsTitle')?.closest('section');
        (notifications || container.firstElementChild)?.insertAdjacentElement('afterend', section);
    }

    if (!document.getElementById('clientAttachmentsPanel')) {
        const section = document.createElement('section');
        section.id = 'clientAttachmentsPanel';
        section.className = 'feature-panel';
        section.innerHTML = `
            <h2 class="section-title">📎 Fotos e documentos</h2>
            <p class="muted">Envie fotos do aparelho ou documentos para facilitar o atendimento.</p>
            <form id="clientAttachmentForm" class="attachment-form">
                <label>Solicitação de orçamento
                    <select id="attachmentBudgetRequest" required><option value="">Selecione uma solicitação</option></select>
                </label>
                <label>Arquivo
                    <input id="clientAttachmentFile" type="file" accept="image/*,.pdf,.doc,.docx" required>
                </label>
                <button class="btn btn-primary" type="submit" id="clientAttachmentBtn">Enviar arquivo</button>
            </form>
            <div id="clientAttachmentsList" class="attachments-list"></div>`;
        container.appendChild(section);
    }

    if (!document.getElementById('clientRatingsPanel')) {
        const section = document.createElement('section');
        section.id = 'clientRatingsPanel';
        section.className = 'feature-panel';
        section.innerHTML = `
            <h2 class="section-title">⭐ Avalie seu atendimento</h2>
            <div id="clientRatingsList" class="ratings-list"></div>
            <p id="clientRatingsEmpty" class="muted">Você poderá avaliar um serviço quando ele estiver concluído.</p>`;
        container.appendChild(section);
    }
}

async function loadClientChat() {
    const box = document.getElementById('clientChatMessages');
    const empty = document.getElementById('clientChatEmpty');
    if (!box || !window.supabaseClient || !window.currentUser) return;
    const { data, error } = await window.supabaseClient.from('chat_messages').select('*').eq('user_id', window.currentUser.id).order('created_at', { ascending: true });
    if (error) { console.error('Chat:', error); return; }
    box.innerHTML = (data || []).map(item => `
        <div class="chat-message ${item.sender_type === 'admin' ? 'from-admin' : 'from-client'}">
            <strong>${item.sender_type === 'admin' ? 'Assistência' : 'Você'}</strong>
            <p>${featureEscape(item.message)}</p>
            <small>${featureEscape(formatDateTime(item.created_at))}</small>
        </div>`).join('');
    if (empty) empty.style.display = data?.length ? 'none' : 'block';
    box.scrollTop = box.scrollHeight;
}

async function sendClientChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('clientChatInput');
    const button = document.getElementById('clientChatSendBtn');
    const message = input?.value.trim();
    if (!message || !window.supabaseClient || !window.currentUser) return;
    if (button) { button.disabled = true; button.textContent = 'Enviando...'; }
    const { error } = await window.supabaseClient.from('chat_messages').insert({
        user_id: window.currentUser.id,
        sender_id: window.currentUser.id,
        sender_type: 'client',
        message
    });
    if (error) { console.error(error); notify('Erro', 'Não foi possível enviar a mensagem.', 'error'); }
    else { input.value = ''; await loadClientChat(); }
    if (button) { button.disabled = false; button.textContent = 'Enviar mensagem'; }
}

async function loadAttachmentOptions() {
    const select = document.getElementById('attachmentBudgetRequest');
    if (!select || !window.supabaseClient || !window.currentUser) return;
    const requests = await getMyBudgetRequests();
    select.innerHTML = '<option value="">Selecione uma solicitação</option>' + requests.map(item =>
        `<option value="${featureEscape(item.id)}">${featureEscape(item.device_type || 'Aparelho')} - ${featureEscape(item.device_model || 'Sem modelo')} (${featureEscape(formatDate(item.created_at))})</option>`
    ).join('');
}

async function uploadClientAttachment(event) {
    event.preventDefault();
    const select = document.getElementById('attachmentBudgetRequest');
    const fileInput = document.getElementById('clientAttachmentFile');
    const button = document.getElementById('clientAttachmentBtn');
    const file = fileInput?.files?.[0];
    const requestId = select?.value;
    if (!file || !requestId || !window.supabaseClient || !window.currentUser) return;
    if (file.size > 10 * 1024 * 1024) { notify('Atenção', 'O arquivo deve ter no máximo 10 MB.', 'warning'); return; }
    if (button) { button.disabled = true; button.textContent = 'Enviando...'; }
    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${window.currentUser.id}/${Date.now()}-${safeName}`;
        const upload = await window.supabaseClient.storage.from('client-attachments').upload(path, file, { upsert: false });
        if (upload.error) throw upload.error;
        const { error } = await window.supabaseClient.from('client_attachments').insert({
            user_id: window.currentUser.id,
            budget_request_id: requestId,
            file_name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            file_size: file.size
        });
        if (error) throw error;
        notify('Sucesso', 'Arquivo enviado para a assistência.', 'success');
        fileInput.value = '';
        await loadClientAttachments();
    } catch (error) {
        console.error('Anexo:', error);
        notify('Erro', 'Não foi possível enviar o arquivo. Verifique o SQL e o bucket no Supabase.', 'error');
    } finally {
        if (button) { button.disabled = false; button.textContent = 'Enviar arquivo'; }
    }
}

async function loadClientAttachments() {
    const box = document.getElementById('clientAttachmentsList');
    if (!box || !window.supabaseClient || !window.currentUser) return;
    const { data, error } = await window.supabaseClient.from('client_attachments').select('*').eq('user_id', window.currentUser.id).order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    box.innerHTML = (data || []).map(item => `<div class="attachment-item"><span>📄 ${featureEscape(item.file_name)}</span><small>${featureEscape(formatDateTime(item.created_at))}</small><button type="button" class="btn btn-secondary btn-sm" onclick="downloadClientAttachment('${featureEscape(item.storage_path)}')">Abrir</button></div>`).join('');
}

async function downloadClientAttachment(path) {
    if (!window.supabaseClient || !path) return;
    const { data, error } = await window.supabaseClient.storage.from('client-attachments').createSignedUrl(path, 300);
    if (error) { notify('Erro', 'Não foi possível abrir o arquivo.', 'error'); return; }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

async function loadClientRatings() {
    const box = document.getElementById('clientRatingsList');
    const empty = document.getElementById('clientRatingsEmpty');
    if (!box || !window.supabaseClient || !window.currentUser) return;
    const services = await getMyServices();
    const completed = services.filter(item => item.status === 'completed');
    const { data: ratings } = await window.supabaseClient.from('service_ratings').select('*').eq('user_id', window.currentUser.id);
    const rated = new Map((ratings || []).map(item => [String(item.service_id), item]));
    box.innerHTML = completed.map(service => {
        const rating = rated.get(String(service.id));
        return `<article class="rating-item"><strong>${featureEscape(service.device_type || 'Serviço')} ${featureEscape(service.device_model || '')}</strong>
            ${rating ? `<p>Você avaliou: ${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}</p><p>${featureEscape(rating.comment || '')}</p>` : `<form onsubmit="submitServiceRating(event, '${featureEscape(service.id)}')"><div class="rating-stars"><label>Nota <select name="rating" required><option value="">Selecione</option><option value="1">1 estrela</option><option value="2">2 estrelas</option><option value="3">3 estrelas</option><option value="4">4 estrelas</option><option value="5">5 estrelas</option></select></label><input name="comment" maxlength="1000" placeholder="Comentário (opcional)"><button class="btn btn-primary btn-sm" type="submit">Enviar avaliação</button></div></form>`}</article>`;
    }).join('');
    if (empty) empty.style.display = completed.length ? 'none' : 'block';
}

async function submitServiceRating(event, serviceId) {
    event.preventDefault();
    const form = event.currentTarget;
    const rating = Number(form.elements.rating.value);
    const comment = form.elements.comment.value.trim();
    if (!rating || rating < 1 || rating > 5 || !window.supabaseClient || !window.currentUser) return;
    const { error } = await window.supabaseClient.from('service_ratings').upsert({ service_id: serviceId, user_id: window.currentUser.id, rating, comment: comment || null, updated_at: new Date().toISOString() }, { onConflict: 'service_id' });
    if (error) { console.error(error); notify('Erro', 'Não foi possível salvar a avaliação.', 'error'); return; }
    notify('Obrigado!', 'Sua avaliação foi registrada.', 'success');
    await loadClientRatings();
}

window.downloadClientAttachment = downloadClientAttachment;
window.submitServiceRating = submitServiceRating;

window.addEventListener('load', () => {
    ensureClientExtraPanels();
    document.getElementById('clientChatForm')?.addEventListener('submit', sendClientChatMessage);
    document.getElementById('clientAttachmentForm')?.addEventListener('submit', uploadClientAttachment);
    setTimeout(async () => {
        if (!window.currentUser || !window.supabaseClient) return;
        await loadClientChat();
        await loadAttachmentOptions();
        await loadClientAttachments();
        await loadClientRatings();
    }, 500);
});
