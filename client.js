    
/* =====================================================
   GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
   CLIENT.JS - PAINEL DO CLIENTE
   VERSÃO CORRIGIDA E SEGURA
===================================================== */

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabaseClient) {
            redirectToLogin();
            return;
        }
        
        const budgetRequestForm = document.getElementById('budgetRequestForm');

if (budgetRequestForm) {
    budgetRequestForm.addEventListener(
        'submit',
        submitBudgetRequest
    );
}

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error || !data?.session) {
            redirectToLogin();
            return;
        }

        currentUser = data.session.user;

        await loadUserProfile();
        await loadProfile();
        await loadMyServices();
        await loadClientHistory();

    } catch (error) {
        console.error('Erro ao iniciar painel:', error);

        toastSafe(
            'Erro',
            'Não foi possível carregar o painel.',
            'error'
        );
    }
});

/* =====================================================
   VERIFICAR AUTENTICAÇÃO
===================================================== */

async function ensureClientSession() {
    if (!supabaseClient) {
        redirectToLogin();
        return false;
    }

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error || !data?.session) {
        redirectToLogin();
        return false;
    }

    currentUser = data.session.user;
    return true;
}

/* =====================================================
   CARREGAR PERFIL
===================================================== */

async function loadProfile() {
    const avatar = document.getElementById('profileAvatar');
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');

    if (!name || !email) return;

    const profileName =
        userProfile?.name ||
        userProfile?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email ||
        'Cliente';

    if (avatar) {
        avatar.textContent =
            profileName.charAt(0).toUpperCase();
    }

    name.textContent = profileName;
    email.textContent = currentUser?.email || '';
}

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function formatDate(date) {
    if (!date) return '-';

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(parsed);
}

function formatDateTime(date) {
    if (!date) return '-';

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
        pending: 'Aguardando Sinal',
        processing: 'Em Andamento',
        ready: 'Pronto para Entrega',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };

    return labels[status] || status || 'Desconhecido';
}

function getStatusBadge(status) {
    const classes = {
        pending: 'badge-pending',
        processing: 'badge-processing',
        ready: 'badge-ready',
        completed: 'badge-completed',
        cancelled: 'badge-cancelled'
    };

    const labels = {
        pending: '⏳ Aguardando',
        processing: '⚙️ Em Andamento',
        ready: '✓ Pronto',
        completed: '✓ Concluído',
        cancelled: '✗ Cancelado'
    };

    return `
        <span class="badge ${classes[status] || 'badge-completed'}">
            ${escapeHTML(labels[status] || status || 'Desconhecido')}
        </span>
    `;
}

/* =====================================================
   OBTER ID DO CLIENTE
===================================================== */

async function myClientId() {
    if (!supabaseClient || !currentUser) {
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('clients')
            .select('id')
            .eq('auth_user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar cliente:', error);
            return null;
        }

        return data?.id || null;

    } catch (error) {
        console.error('Erro inesperado ao buscar cliente:', error);
        return null;
    }
}

/* =====================================================
   CONSULTAR SERVIÇOS DO CLIENTE
===================================================== */

async function getMyServices() {
    if (!supabaseClient || !currentUser) {
        return [];
    }

    const myId = await myClientId();

    let query = supabaseClient
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

    /*
      O filtro abaixo pressupõe que a tabela services
      tenha client_id ou client_user_id configurado.

      As políticas RLS do Supabase devem garantir que
      o cliente só veja os próprios serviços.
    */

    if (myId) {
        query = query.eq('client_id', myId);
    } else {
        query = query.eq('client_user_id', currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data || [];
}

/* =====================================================
   CARREGAR SERVIÇOS EM ANDAMENTO
===================================================== */

async function loadMyServices() {
    const list = document.getElementById('myServicesList');
    const noMessage = document.getElementById('noServicesClient');

    if (!list) return;

    try {
        const services = await getMyServices();

        const activeServices = services.filter(service =>
            service.status !== 'cancelled' &&
            service.status !== 'completed'
        );

        if (!activeServices.length) {
            list.innerHTML = '';

            if (noMessage) {
                noMessage.style.display = 'block';
            }

            return;
        }

        if (noMessage) {
            noMessage.style.display = 'none';
        }

        list.innerHTML = activeServices
            .map(service => renderServiceCard(service))
            .join('');

    } catch (error) {
        console.error('Erro ao carregar serviços:', error);

        toastSafe(
            'Erro',
            'Não foi possível carregar seus serviços.',
            'error'
        );
    }
}

/* =====================================================
   RENDERIZAR CARTÃO DE SERVIÇO
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

    const total = formatMoney(service.total_value);
    const remaining = formatMoney(service.remaining_value);

    let buttons = '';

    /*
      Os botões de pagamento apenas solicitam o pagamento.
      A confirmação deve ocorrer por um backend ou webhook
      confiável do provedor de pagamentos.
    */

    if (status === 'pending') {
        buttons += `
            <button
                class="btn btn-success btn-sm"
                onclick="paySignal('${id}')">
                Pagar Sinal
            </button>
        `;
    }

    if (status === 'ready') {
        buttons += `
            <button
                class="btn btn-success btn-sm"
                onclick="payRemaining('${id}')">
                Pagar Restante
            </button>
        `;
    }

    if (status === 'completed') {
        buttons += `
            <button
                class="btn btn-secondary btn-sm"
                onclick="rateService('${id}')">
                Avaliar
            </button>
        `;
    }

    buttons += `
        <button
            class="btn btn-secondary btn-sm"
            onclick="showServiceDetails('${id}')">
            Detalhes
        </button>
    `;

    return `
        <article class="service-item-client ${escapeHTML(status)}">

            <div>
                <h3>${device}${model}</h3>
                <p class="text-muted">${problem}</p>
                <p>${getStatusBadge(status)}</p>
            </div>

            <div class="service-details">

                <div class="service-detail-item">
                    <div class="service-detail-label">Total</div>
                    <div class="service-detail-value">
                        ${total}
                    </div>
                </div>

                <div class="service-detail-item">
                    <div class="service-detail-label">Restante</div>
                    <div class="service-detail-value small">
                        ${remaining}
                    </div>
                </div>

            </div>

            <div style="
                margin-top: 1rem;
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            ">
                ${buttons}
            </div>

        </article>
    `;
}

/* =====================================================
   CARREGAR HISTÓRICO
===================================================== */

async function loadClientHistory() {
    const tbody = document.getElementById('clientHistoryBody');
    const noMessage = document.getElementById('noHistoryClient');

    if (!tbody) return;

    try {
        const services = await getMyServices();

        if (!services.length) {
            tbody.innerHTML = '';

            if (noMessage) {
                noMessage.style.display = 'block';
            }

            return;
        }

        if (noMessage) {
            noMessage.style.display = 'none';
        }

        tbody.innerHTML = services
            .map(service => `
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
                            class="btn btn-sm btn-secondary"
                            onclick="showServiceDetails('${escapeHTML(service.id)}')">
                            Ver
                        </button>
                    </td>
                </tr>
            `)
            .join('');

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);

        toastSafe(
            'Erro',
            'Não foi possível carregar o histórico.',
            'error'
        );
    }
}

/* =====================================================
   SOLICITAR ORÇAMENTO
===================================================== */


/* =====================================================
   SOLICITAÇÃO DE ORÇAMENTO PELO CLIENTE
===================================================== */

function requestBudget() {
    const modal = document.getElementById('budgetRequestModal');

    if (!modal) {
        toast(
            'Erro',
            'Formulário de orçamento não encontrado.',
            'error'
        );
        return;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

async function submitBudgetRequest(event) {
    event.preventDefault();

    if (!supabaseClient || !currentUser) {
        toast(
            'Erro',
            'Sua sessão expirou. Faça login novamente.',
            'error'
        );
        return;
    }

    const deviceType = document
        .getElementById('requestDeviceType')
        .value
        .trim();

    const deviceModel = document
        .getElementById('requestDeviceModel')
        .value
        .trim();

    const problemType = document
        .getElementById('requestProblemType')
        .value
        .trim();

    const observations = document
        .getElementById('requestObservations')
        .value
        .trim();

    if (!deviceType || !problemType) {
        toast(
            'Atenção',
            'Preencha o tipo de aparelho e o problema.',
            'warning'
        );
        return;
    }

    const button = document.getElementById('submitBudgetRequestBtn');

    if (button) {
        button.disabled = true;
        button.textContent = 'Enviando...';
    }

    try {
        const { error } = await supabaseClient
            .from('budget_requests')
            .insert({
                user_id: currentUser.id,
                device_type: deviceType,
                device_model: deviceModel || null,
                problem_type: problemType,
                observations: observations || null
            });

        if (error) {
            throw error;
        }

        toast(
            'Solicitação enviada!',
            'Nossa equipe analisará seu pedido em breve.',
            'success'
        );

        document.getElementById('budgetRequestForm').reset();
        closeModal('budgetRequestModal');

    } catch (error) {
        console.error('Erro ao solicitar orçamento:', error);

        toast(
            'Erro ao enviar',
            error.message || 'Não foi possível enviar sua solicitação.',
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

    const element = document.getElementById('myServicesList');

    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

async function viewHistory() {
    await loadClientHistory();

    const element = document.getElementById('clientHistoryBody');

    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

/* =====================================================
   PAGAMENTO DO SINAL
===================================================== */

async function paySignal(serviceId) {
    if (!await ensureClientSession()) return;

    /*
      NÃO alteramos o status do serviço diretamente.

      O correto é criar uma cobrança através de um
      backend seguro ou de uma Edge Function do Supabase.
    */

    toastSafe(
        'Pagamento',
        'A integração de pagamento ainda precisa ser configurada.',
        'info'
    );

    console.log('Solicitação de pagamento do sinal:', serviceId);
}

/* =====================================================
   PAGAMENTO RESTANTE
===================================================== */

async function payRemaining(serviceId) {
    if (!await ensureClientSession()) return;

    toastSafe(
        'Pagamento',
        'A integração de pagamento ainda precisa ser configurada.',
        'info'
    );

    console.log('Solicitação de pagamento restante:', serviceId);
}

/* =====================================================
   DETALHES DO SERVIÇO
===================================================== */

async function showServiceDetails(serviceId) {
    if (!await ensureClientSession()) return;

    try {
        const { data: service, error } = await supabaseClient
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .maybeSingle();

        if (error) throw error;

        if (!service) {
            toastSafe(
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

        const problem = escapeHTML(service.problem_type || '-');
        const observations = service.observations
            ? escapeHTML(service.observations)
            : '';

        title.textContent = `Serviço - ${device}`;

        body.innerHTML = `
            <div style="display: grid; gap: 1rem;">

                <div>
                    <h4>Aparelho</h4>
                    <p class="text-muted">${device}${model}</p>
                </div>

                <div>
                    <h4>Problema</h4>
                    <p class="text-muted">${problem}</p>
                </div>

                ${
                    observations
                        ? `
                        <div>
                            <h4>Observações</h4>
                            <p class="text-muted">${observations}</p>
                        </div>
                        `
                        : ''
                }

                <div>
                    <h4>Valores</h4>

                    <div class="service-details">

                        <div class="service-detail-item">
                            <div class="service-detail-label">Total</div>
                            <div class="service-detail-value">
                                ${formatMoney(service.total_value)}
                            </div>
                        </div>

                        <div class="service-detail-item">
                            <div class="service-detail-label">Sinal</div>
                            <div class="service-detail-value small">
                                ${
                                    service.signal_paid_at
                                        ? '✓ Pago'
                                        : '⚠ Pendente'
                                }
                            </div>
                        </div>

                        <div class="service-detail-item">
                            <div class="service-detail-label">Restante</div>
                            <div class="service-detail-value small">
                                ${formatMoney(service.remaining_value)}
                            </div>
                        </div>

                    </div>
                </div>

                <div>
                    <h4>Status</h4>
                    <p class="text-muted">
                        ${escapeHTML(getStatusLabel(service.status))}
                    </p>

                    <p class="text-muted">
                        Criado: ${escapeHTML(formatDateTime(service.created_at))}
                    </p>

                    ${
                        service.completed_at
                            ? `
                            <p class="text-muted">
                                Concluído: ${escapeHTML(formatDateTime(service.completed_at))}
                            </p>
                            `
                            : ''
                    }
                </div>

            </div>
        `;

        footer.innerHTML = `
            <button
                class="btn btn-secondary"
                onclick="closeModal('serviceModal')">
                Fechar
            </button>
        `;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

    } catch (error) {
        console.error('Erro ao mostrar detalhes:', error);

        toastSafe(
            'Erro',
            'Não foi possível carregar os detalhes.',
            'error'
        );
    }
}

/* =====================================================
   FECHAR MODAL
===================================================== */

function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('serviceModal')?.addEventListener(
    'click',
    event => {
        if (event.target.id === 'serviceModal') {
            closeModal('serviceModal');
        }
    }
);

/* =====================================================
   AVALIAR SERVIÇO
===================================================== */

async function rateService(serviceId) {
    if (!await ensureClientSession()) return;

    const rating = prompt('Avalie de 1 a 5 estrelas:');

    if (
        !rating ||
        !/^[1-5]$/.test(rating.trim())
    ) {
        toastSafe(
            'Avaliação inválida',
            'Digite um número de 1 a 5.',
            'warning'
        );
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('services')
            .update({
                rating: Number(rating),
                updated_at: new Date().toISOString()
            })
            .eq('id', serviceId);

        if (error) throw error;

        toastSafe(
            'Avaliação enviada!',
            'Obrigado pelo feedback.',
            'success'
        );

        await loadMyServices();
        await loadClientHistory();

    } catch (error) {
        console.error('Erro ao avaliar serviço:', error);

        toastSafe(
            'Erro',
            'Não foi possível enviar a avaliação.',
            'error'
        );
    }
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
