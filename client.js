/* Painel do Cliente - Funcionalidades */

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    if (!supabase) { redirectToLogin(); return; }
    var sess = await supabase.auth.getSession();
    if (!sess.data.session) { redirectToLogin(); return; }
    currentUser = sess.data.session.user;
    await loadUserProfile();
    await loadProfile();
    await loadMyServices();
    await loadClientHistory();
});

// Carregar perfil
async function loadProfile() {
    const header = document.getElementById('profileHeader');
    const avatar = document.getElementById('profileAvatar');
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');
    
    if (userProfile) {
        avatar.textContent = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '?';
        name.textContent = userProfile.name || currentUser.email;
        email.textContent = currentUser.email;
    } else {
        name.textContent = currentUser.email;
        email.textContent = 'Cliente do Sistema';
    }
}

// Funções de UI
function formatDate(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
}

function formatDateTime(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

async function myClientId() {
    try {
        var r = await supabase.from('clients').select('id').eq('auth_user_id', currentUser.id).limit(1).maybeSingle();
        if (r.data && r.data.id) return r.data.id;
    } catch (e) {}
    return null;
}

// Carregar servicos do cliente
async function loadMyServices() {
    var servicesList = document.getElementById('myServicesList');
    var noMsg = document.getElementById('noServicesClient');
    if (!servicesList) return;
    var myId = await myClientId();
    var q = supabase.from('services').select('*').neq('status', 'cancelled').order('created_at', { ascending: false });
    if (myId) q = q.eq('client_id', myId);
    else q = q.eq('client_user_id', currentUser.id);
    var res = await q;
    if (res.error) { toast('Erro ao carregar', res.error.message, 'error'); return; }
    var data = res.data || [];
    if (!data.length) { servicesList.innerHTML = ''; if (noMsg) noMsg.style.display = 'block'; return; }
    if (noMsg) noMsg.style.display = 'none';
    servicesList.innerHTML = data.map(function(s) {
        var total = s.total_value != null ? s.total_value.toFixed(2) : '0,00';
        var rest = s.remaining_value != null ? s.remaining_value.toFixed(2) : '0,00';
        var btns = '';
        if (s.status === 'pending') btns += '<button class="btn btn-success btn-sm" onclick="paySignal(\'' + s.id + '\')">Pagar Sinal</button> ';
        if (s.status === 'ready') btns += '<button class="btn btn-success btn-sm" onclick="payRemaining(\'' + s.id + '\')">Pagar Restante</button> ';
        if (s.status === 'completed') btns += '<button class="btn btn-secondary btn-sm" onclick="rateService(\'' + s.id + '\')">Avaliar</button> ';
        btns += '<button class="btn btn-secondary btn-sm" onclick="showServiceDetails(\'' + s.id + '\')">Detalhes</button>';
        return '<div class="service-item-client ' + s.status + '">'
            + '<div><h3>' + s.device_type + '</h3><p class="text-muted">' + s.problem_type + '</p></div>'
            + '<div class="service-details"><div class="service-detail-item"><div class="service-detail-label">Total</div><div class="service-detail-value">R$ ' + total + '</div></div>'
            + '<div class="service-detail-item"><div class="service-detail-label">Restante</div><div class="service-detail-value small">R$ ' + rest + '</div></div></div>'
            + '<div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' + btns + '</div>'
            + '</div>';
    }).join('');
}

// Carregar historico
async function loadClientHistory() {
    var tbody = document.getElementById('clientHistoryBody');
    var noMsg = document.getElementById('noHistoryClient');
    if (!tbody) return;
    var myId = await myClientId();
    var q = supabase.from('services').select('*').order('created_at', { ascending: false });
    if (myId) q = q.eq('client_id', myId);
    else q = q.eq('client_user_id', currentUser.id);
    var res = await q;
    if (res.error) { toast('Erro ao carregar historico', res.error.message, 'error'); return; }
    var data = res.data || [];
    if (!data.length) { tbody.innerHTML = ''; if (noMsg) noMsg.style.display = 'block'; return; }
    if (noMsg) noMsg.style.display = 'none';
    tbody.innerHTML = data.map(function(s) {
        return '<tr>'
            + '<td>' + formatDate(s.created_at) + '</td>'
            + '<td>' + s.device_type + '</td>'
            + '<td>' + s.problem_type + '</td>'
            + '<td><strong>R$ ' + (s.total_value != null ? s.total_value.toFixed(2) : '0,00') + '</strong></td>'
            + '<td>' + getStatusBadge(s.status) + '</td>'
            + '<td><button class="btn btn-sm btn-secondary" onclick="showServiceDetails(\'' + s.id + '\')">Ver</button></td>'
            + '</tr>';
    }).join('');
}

// Solicitar orçamento
async function requestBudget() {
    toast('Em desenvolvimento', 'Em breve você poderá solicitar orçamentos pelo painel', 'info');
}

// Ver meus serviços
async function viewMyServices() {
    await loadMyServices();
    document.getElementById('myServicesList').scrollIntoView({ behavior: 'smooth' });
}

// Ver histórico
async function viewHistory() {
    await loadClientHistory();
    document.getElementById('clientHistoryBody').scrollIntoView({ behavior: 'smooth' });
}

// Pagar sinal
async function paySignal(serviceId) {
    toast('Pagamento do Sinal', 'Em produção: integrar com Mercado Pago/PagSeguro', 'info');
    
    await supabase
        .from('services')
        .update({ 
            status: 'processing',
            signal_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);
    
    toast('Sinal Pago!', 'O serviço foi iniciado', 'success');
    await loadMyServices();
}

// Pagar restante
async function payRemaining(serviceId) {
    toast('Pagamento Final', 'Em produção: integrar com Mercado Pago/PagSeguro', 'info');
    
    await supabase
        .from('services')
        .update({ 
            status: 'completed',
            remaining_paid_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);
    
    toast('Pagamento Finalizado!', 'Obrigado pela confiança!', 'success');
    await loadMyServices();
    await loadClientHistory();
}
// Mostrar detalhes do serviço
async function showServiceDetails(serviceId) {
    const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
    
    if (!service) return;
    
    document.getElementById('modalTitle').textContent = `Serviço - ${service.device_type}`;
    
    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid;gap:1rem;">
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Aparelho</h4>
                <p class="text-muted">${service.device_type}${service.device_model ? ' - ' + service.device_model : ''}</p>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Problema</h4>
                <p class="text-muted">${service.problem_type}</p>
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
                        <div class="service-detail-value">R$ ${service.total_value?.toFixed(2) || '0,00'}</div>
                    </div>
                    <div class="service-detail-item">
                        <div class="service-detail-label">Sinal</div>
                        <div class="service-detail-value small" style="color:${service.status !== 'pending' ? '#10b981' : '#ef4444'};">
                            ${service.status !== 'pending' ? '✓ Pago' : '⚠ Pendente'}
                        </div>
                    </div>
                    <div class="service-detail-item">
                        <div class="service-detail-label">Restante</div>
                        <div class="service-detail-value small">R$ ${service.remaining_value?.toFixed(2) || '0,00'}</div>
                    </div>
                </div>
            </div>
            <div>
                <h4 style="font-weight:600;margin-bottom:0.25rem;">Status</h4>
                <p class="text-muted">Criado: ${formatDateTime(service.created_at)}</p>
                ${service.completed_at ? `<p class="text-muted">Concluído: ${formatDateTime(service.completed_at)}</p>` : ''}
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

document.getElementById('serviceModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// Avaliar serviço
async function rateService(serviceId) {
    const rating = prompt('Avalie de 1 a 5 estrelas:');
    
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        toast('Avaliação inválida', 'Digite um número de 1 a 5', 'warning');
        return;
    }
    
    await supabase
        .from('services')
        .update({ 
            rating: parseInt(rating),
            updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);
    
    toast('Avaliação Enviada!', 'Obrigado pelo feedback!', 'success');
}
function getStatusLabel(status) {
    const labels = {
        pending: 'Aguardando Sinal',
        processing: 'Em Andamento',
        ready: 'Pronto para Entrega',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
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
    return `<span class="badge ${classes[status] || 'badge-completed'}">${labels[status] || status}</span>`;
}

// Redirecionamento
function redirectToLogin() {
    window.location.href = 'login.html';
}