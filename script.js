
/* =========================================================
   GUSTAVO & EMILY — ASSISTÊNCIA TÉCNICA
   SCRIPT.JS — PAINEL ADMINISTRATIVO
   VERSÃO CORRIGIDA
========================================================= */

"use strict";

/* =========================================================
   ESTADO GLOBAL
========================================================= */

let clientsCache = [];
let servicesCache = [];
let budgetRequestsCache = [];
let selectedClient = null;
let searchTimeout = null;
let isLoading = false;

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const STATUS_INFO = {
  pending: {
    label: "Aguardando",
    className: "pending"
  },
  processing: {
    label: "Em andamento",
    className: "processing"
  },
  ready: {
    label: "Pronto",
    className: "ready"
  },
  completed: {
    label: "Concluído",
    className: "completed"
  },
  cancelled: {
    label: "Cancelado",
    className: "cancelled"
  }
};

const PROBLEM_VALUES = {
  "Tela Quebrada": [150, 800],
  "Tela Manchas": [100, 400],
  "Display": [200, 900],
  "Bateria": [80, 250],
  "Expandida": [150, 400],
  "Carrega": [80, 300],
  "Som": [50, 200],
  "Voz": [50, 180],
  "Virus": [80, 250],
  "Lento": [80, 200],
  "Dados": [150, 500],
  "Chip": [50, 150],
  "Camera": [100, 400],
  "Agua": [200, 800],
  "SO": [100, 300],
  "Limpeza": [80, 200],
  "SSD": [150, 500]
};

/* =========================================================
   HELPERS
========================================================= */

function getSupabase() {
  const client = window.supabaseClient;

  if (!client) {
    console.error("Supabase ainda não foi inicializado.");
    showToast("Conexão com o banco não inicializada.", "error");
    return null;
  }

  return client;
}

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function getInputValue(id) {
  const element = getElement(id);
  return element ? element.value.trim() : "";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("pt-BR");
}

function getInitials(name) {
  const text = String(name || "Cliente").trim();

  if (!text) return "CL";

  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getStatusInfo(status) {
  return STATUS_INFO[status] || {
    label: status || "Indefinido",
    className: "unknown"
  };
}

function createStatusBadge(status) {
  const info = getStatusInfo(status);

  return `
    <span class="status-badge ${escapeHTML(info.className)}">
      ${escapeHTML(info.label)}
    </span>
  `;
}

function createToastContainer() {
  let container = getElement("toastContainer");

  if (container) return container;

  container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "toast-container";

  document.body.appendChild(container);

  return container;
}

function showToast(message, type = "info") {
  const container = createToastContainer();
  const toast = document.createElement("div");

  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.remove();
  }, 4500);
}

function showAlert(message, type = "info") {
  const container = getElement("budgetAlerts");

  if (!container) {
    showToast(message, type);
    return;
  }

  container.innerHTML = `
    <div class="alert alert-${escapeHTML(type)}">
      ${escapeHTML(message)}
    </div>
  `;
}

function openModal(modalId) {
  const modal = getElement(modalId);

  if (!modal) return;

  modal.style.display = "flex";
  modal.classList.add("active", "show");
}

function closeModal(modalId) {
  const modal = getElement(modalId);

  if (!modal) return;

  modal.classList.remove("active", "show");
  modal.style.display = "none";
}

/* Compatibilidade com códigos antigos */
window.toast = showToast;
window.alertBox = showAlert;
window.money = formatMoney;
window.date = formatDate;
window.datetime = formatDateTime;
window.esc = escapeHTML;

/* =========================================================
   CARREGAMENTO DOS DADOS
========================================================= */

async function loadClientsFromDB() {
  const supabase = getSupabase();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar clientes:", error);
    showToast("Não foi possível carregar os clientes.", "error");
    return [];
  }

  return data || [];
}

async function loadBudgetRequestsFromDB() {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("budget_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Erro ao carregar solicitações de orçamento:", error);
    return [];
  }
  return data || [];
}

function renderBudgetRequests() {
  let panel = getElement("budgetRequestsPanel");
  const alerts = getElement("budgetAlerts");
  if (!alerts) return;
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "budgetRequestsPanel";
    panel.className = "card budget-requests-panel";
    alerts.insertAdjacentElement("afterend", panel);
  }
  if (!budgetRequestsCache.length) {
    panel.innerHTML = "<h3>Solicitações de orçamento dos clientes</h3><p>Nenhuma solicitação pendente.</p>";
    return;
  }
  panel.innerHTML = `<h3>Solicitações de orçamento dos clientes</h3>${budgetRequestsCache.map(r => `
    <article class="budget-request-item">
      <strong>${escapeHTML(r.device_type)} - ${escapeHTML(r.device_model || "Modelo não informado")}</strong>
      <p><b>Problema:</b> ${escapeHTML(r.problem_type)}</p>
      <p>${escapeHTML(r.observations || "Sem observações")}</p>
      <small>${formatDateTime(r.created_at)} | Status: ${escapeHTML(r.status || "pending")}</small>
    </article>`).join("")}`;
}

async function loadServicesFromDB() {
  const supabase = getSupabase();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar serviços:", error);
    showToast("Não foi possível carregar os serviços.", "error");
    return [];
  }

  return data || [];
}

async function refreshAll() {
  if (isLoading) return;

  isLoading = true;

  try {
    const [clients, services, budgetRequests] = await Promise.all([
      loadClientsFromDB(),
      loadServicesFromDB(),
      loadBudgetRequestsFromDB()
    ]);

    clientsCache = clients;
    servicesCache = services;
    budgetRequestsCache = budgetRequests;

    renderAll();
  } catch (error) {
    console.error("Erro ao atualizar o painel:", error);
    showToast("Erro ao atualizar os dados.", "error");
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
  renderBudgetRequests();
}

/* =========================================================
   DATA E ESTATÍSTICAS
========================================================= */

function updateDate() {
  const element =
    getElement("currentDate") ||
    getElement("todayDate");

  if (!element) return;

  element.textContent = new Date().toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function updateStats() {
  const totalClients = clientsCache.length;

  const totalServices = servicesCache.length;

  const completedServices = servicesCache.filter(
    service => service.status === "completed"
  ).length;

  const waitingServices = servicesCache.filter(
    service =>
      service.status === "ready" ||
      service.status === "pending"
  ).length;

  const vipClients = clientsCache.filter(
    client =>
      client.vip === true ||
      client.vip === "true" ||
      client.is_vip === true
  ).length;

  setText("totalClients", totalClients);
  setText("totalServices", totalServices);
  setText("completedServices", completedServices);
  setText("waitingServices", waitingServices);
  setText("vipClients", vipClients);
}

/* =========================================================
   CLIENTES
========================================================= */

function loadRecentClients() {
  const container = getElement("recentClients");
  const emptyMessage = getElement("noClientsMessage");

  if (!container) return;

  if (clientsCache.length === 0) {
    container.innerHTML = "";

    if (emptyMessage) {
      emptyMessage.style.display = "block";
    }

    return;
  }

  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  container.innerHTML = clientsCache
    .slice(0, 8)
    .map(client => {
      const name = client.name || "Cliente sem nome";
      const phone = client.phone || "Telefone não informado";

      return `
        <div class="client-item">
          <div class="client-avatar">
            ${escapeHTML(getInitials(name))}
          </div>

          <div class="client-info">
            <strong>${escapeHTML(name)}</strong>
            <span>${escapeHTML(phone)}</span>
          </div>

          ${
            client.vip
              ? `<span class="vip-badge">VIP</span>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function showAddClientForm() {
  const container =
    getElement("addClientContainer") ||
    getElement("clientFormContainer");

  if (!container) {
    showToast("Área de cadastro não encontrada.", "error");
    return;
  }

  container.innerHTML = `
    <form id="newClientForm" class="client-form">
      <input
        id="newClientName"
        type="text"
        placeholder="Nome completo"
        required
      />

      <input
        id="newClientPhone"
        type="tel"
        placeholder="Telefone"
      />

      <input
        id="newClientEmail"
        type="email"
        placeholder="E-mail"
      />

      <input
        id="newClientAddress"
        type="text"
        placeholder="Endereço"
      />

      <label>
        <input id="newClientVip" type="checkbox" />
        Cliente VIP
      </label>

      <div class="form-actions">
        <button type="submit">Salvar cliente</button>

        <button
          type="button"
          onclick="cancelAddClient()"
        >
          Cancelar
        </button>
      </div>
    </form>
  `;

  const form = getElement("newClientForm");

  if (form) {
    form.addEventListener("submit", addNewClient);
  }
}

function cancelAddClient() {
  const container =
    getElement("addClientContainer") ||
    getElement("clientFormContainer");

  if (container) {
    container.innerHTML = "";
  }
}

async function addNewClient(event) {
  event?.preventDefault();

  const supabase = getSupabase();

  if (!supabase) return;

  const name = getInputValue("newClientName");
  const phone = getInputValue("newClientPhone");
  const email = getInputValue("newClientEmail");
  const address = getInputValue("newClientAddress");
  const vip = Boolean(getElement("newClientVip")?.checked);

  if (!name) {
    showToast("Informe o nome do cliente.", "warning");
    return;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      vip
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao cadastrar cliente:", error);

    if (error.code === "23505") {
      showToast("Este telefone já está cadastrado.", "warning");
    } else {
      showToast("Erro ao cadastrar cliente.", "error");
    }

    return;
  }

  if (data) {
    clientsCache.unshift(data);
  }

  cancelAddClient();
  renderAll();

  showToast("Cliente cadastrado com sucesso.", "success");
}

/* =========================================================
   PESQUISA DE CLIENTES
========================================================= */

function searchClients() {
  const input = getElement("clientSearch");
  const results = getElement("searchResults");

  if (!input || !results) return;

  const query = input.value.trim().toLowerCase();

  clearTimeout(searchTimeout);

  if (!query) {
    results.innerHTML = "";
    results.hidden = true;
    input.removeAttribute("data-client-id");
    selectedClient = null;
    return;
  }

  searchTimeout = setTimeout(() => {
    const matches = clientsCache.filter(client => {
      const name = String(client.name || "").toLowerCase();
      const phone = String(client.phone || "").toLowerCase();
      const email = String(client.email || "").toLowerCase();

      return (
        name.includes(query) ||
        phone.includes(query) ||
        email.includes(query)
      );
    });

    results.hidden = false;

    if (matches.length === 0) {
      results.innerHTML = `
        <div class="search-empty">
          Nenhum cliente encontrado.
        </div>
      `;

      return;
    }

    results.innerHTML = matches
      .slice(0, 10)
      .map(client => `
        <button
          type="button"
          class="search-result"
          data-client-id="${escapeHTML(client.id)}"
        >
          <strong>
            ${escapeHTML(client.name || "Sem nome")}
          </strong>

          <span>
            ${escapeHTML(
              client.phone ||
              client.email ||
              "Sem contato"
            )}
          </span>
        </button>
      `)
      .join("");

    results.querySelectorAll("[data-client-id]")
      .forEach(button => {
        button.addEventListener("click", () => {
          selectClient(button.dataset.clientId);
        });
      });
  }, 250);
}

function selectClient(clientId) {
  const client = clientsCache.find(
    item => String(item.id) === String(clientId)
  );

  if (!client) {
    showToast("Cliente não encontrado.", "error");
    return;
  }

  selectedClient = client;

  const input = getElement("clientSearch");
  const results = getElement("searchResults");
  const selectedContainer = getElement("selectedClient");

  if (input) {
    input.value = client.name || "";
    input.dataset.clientId = client.id;
  }

  if (results) {
    results.innerHTML = "";
    results.hidden = true;
  }

  if (selectedContainer) {
    selectedContainer.innerHTML = `
      <div class="selected-client-card">
        <strong>
          ${escapeHTML(client.name || "Cliente")}
        </strong>

        <span>
          ${escapeHTML(
            client.phone || "Telefone não informado"
          )}
        </span>

        <button
          type="button"
          onclick="clearSelectedClient()"
        >
          Remover
        </button>
      </div>
    `;
  }
}

function clearSelectedClient() {
  selectedClient = null;

  const input = getElement("clientSearch");
  const results = getElement("searchResults");
  const container = getElement("selectedClient");

  if (input) {
    input.value = "";
    input.removeAttribute("data-client-id");
  }

  if (results) {
    results.innerHTML = "";
    results.hidden = true;
  }

  if (container) {
    container.innerHTML = "";
  }
}

/* =========================================================
   ORÇAMENTOS E SERVIÇOS
========================================================= */

function generateRandomValue(problemType) {
  const range = PROBLEM_VALUES[problemType] || [100, 500];

  const minimum = range[0];
  const maximum = range[1];

  const value =
    Math.random() * (maximum - minimum) + minimum;

  return Math.round(value / 10) * 10;
}

/*
  ATENÇÃO:
  Este é apenas um endereço de exemplo.
  Substitua por um link real de pagamento.
*/
function generatePaymentLink(serviceId, amount, type) {
  const value = Number(amount) || 0;

  return (
    `https://pagamento.exemplo.com/` +
    `${encodeURIComponent(serviceId || "")}` +
    `?valor=${encodeURIComponent(value.toFixed(2))}` +
    `&tipo=${encodeURIComponent(type || "payment")}`
  );
}

async function submitBudget(event) {
  event?.preventDefault();

  const supabase = getSupabase();

  if (!supabase) return;

  const clientInput = getElement("clientSearch");

  const clientId =
    clientInput?.dataset?.clientId ||
    selectedClient?.id;

  if (!clientId) {
    showToast("Selecione um cliente.", "warning");
    return;
  }

  const deviceType = getInputValue("deviceType");
  const deviceModel = getInputValue("deviceModel");
  const problemType = getInputValue("problemType");
  const observations = getInputValue("observations");

  if (!deviceType || !problemType) {
    showToast(
      "Preencha o tipo de aparelho e o problema.",
      "warning"
    );

    return;
  }

  const totalValue = generateRandomValue(problemType);
  const signalValue = Number((totalValue / 2).toFixed(2));
  const remainingValue = Number(
    (totalValue - signalValue).toFixed(2)
  );

  const temporaryId =
    `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

  const payload = {
    client_id: clientId,
    client_user_id: selectedClient?.auth_user_id || null,
    device_type: deviceType,
    device_model: deviceModel || null,
    problem_type: problemType,
    observations: observations || null,
    total_value: totalValue,
    signal_value: signalValue,
    remaining_value: remainingValue,
    signal_link: generatePaymentLink(
      temporaryId,
      signalValue,
      "signal"
    ),
    remaining_link: generatePaymentLink(
      temporaryId,
      remainingValue,
      "remaining"
    ),
    status: "pending"
  };

  const button = getElement("submitBudgetBtn");

  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Enviando...";
  }

  try {
    const { data, error } = await supabase
      .from("services")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar serviço:", error);
      showToast("Erro ao registrar o orçamento.", "error");
      return;
    }

    if (data) {
      servicesCache.unshift(data);
    }

    getElement("budgetForm")?.reset();

    clearSelectedClient();
    renderAll();

    showAlert(
      `Orçamento criado com sucesso. Valor estimado: ${formatMoney(totalValue)}.`,
      "success"
    );

    showToast("Orçamento criado com sucesso.", "success");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText || "Enviar orçamento";
    }
  }
}

/* =========================================================
   SERVIÇOS
========================================================= */

function getServiceClientName(service) {
  const client = clientsCache.find(
    item => String(item.id) === String(service.client_id)
  );

  return (
    client?.name ||
    service.client_name ||
    "Cliente não identificado"
  );
}

function filterServices() {
  const container = getElement("servicesList");
  const emptyMessage = getElement("noServicesMessage");

  if (!container) return;

  const search =
    getElement("serviceSearch")?.value
      ?.trim()
      .toLowerCase() || "";

  const statusFilter =
    getElement("filterStatus")?.value || "";

  const filtered = servicesCache.filter(service => {
    const clientName = getServiceClientName(service);

    const searchText = [
      clientName,
      service.device_type,
      service.device_model,
      service.problem_type
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchText.includes(search);

    const matchesStatus =
      !statusFilter ||
      service.status === statusFilter;

    const isHistory =
      service.status === "completed" ||
      service.status === "cancelled";

    return (
      matchesSearch &&
      matchesStatus &&
      !isHistory
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = "";

    if (emptyMessage) {
      emptyMessage.style.display = "block";
    }

    return;
  }

  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  container.innerHTML = filtered
    .map(createServiceCard)
    .join("");
}

function createServiceCard(service) {
  const clientName = getServiceClientName(service);
  const status = service.status || "pending";

  return `
    <div
      class="service-card"
      data-service-id="${escapeHTML(service.id)}"
    >
      <div class="service-card-header">
        <div>
          <h3>${escapeHTML(clientName)}</h3>
          <span>
            ${escapeHTML(service.device_type || "Aparelho")}
          </span>
        </div>

        ${createStatusBadge(status)}
      </div>

      <div class="service-card-body">
        <p>
          <strong>Modelo:</strong>
          ${escapeHTML(service.device_model || "Não informado")}
        </p>

        <p>
          <strong>Problema:</strong>
          ${escapeHTML(service.problem_type || "Não informado")}
        </p>

        <p>
          <strong>Valor:</strong>
          ${formatMoney(service.total_value)}
        </p>

        <p>
          <strong>Data:</strong>
          ${formatDate(service.created_at)}
        </p>
      </div>

      <div class="service-card-actions">
        <button
          type="button"
          onclick="showServiceDetails('${escapeHTML(service.id)}')"
        >
          Detalhes
        </button>

        ${
          status === "pending"
            ? `
              <button
                type="button"
                onclick="approveService('${escapeHTML(service.id)}')"
              >
                Aprovar sinal
              </button>
            `
            : ""
        }

        ${
          status === "processing"
            ? `
              <button
                type="button"
                onclick="markReady('${escapeHTML(service.id)}')"
              >
                Marcar como pronto
              </button>
            `
            : ""
        }

        ${
          status === "ready"
            ? `
              <button
                type="button"
                onclick="markComplete('${escapeHTML(service.id)}')"
              >
                Finalizar
              </button>
            `
            : ""
        }

        <button
          type="button"
          onclick="deleteService('${escapeHTML(service.id)}')"
        >
          Excluir
        </button>
      </div>
    </div>
  `;
}

/* =========================================================
   HISTÓRICO
========================================================= */

function loadHistoryTable() {
  const tbody = getElement("servicesTableBody");
  const emptyMessage = getElement("noHistoryMessage");

  if (!tbody) return;

  const history = servicesCache.filter(service =>
    service.status === "completed" ||
    service.status === "cancelled"
  );

  if (history.length === 0) {
    tbody.innerHTML = "";

    if (emptyMessage) {
      emptyMessage.style.display = "block";
    }

    return;
  }

  if (emptyMessage) {
    emptyMessage.style.display = "none";
  }

  tbody.innerHTML = history
    .map(service => `
      <tr>
        <td>${escapeHTML(getServiceClientName(service))}</td>
        <td>${escapeHTML(service.device_type || "—")}</td>
        <td>${escapeHTML(service.device_model || "—")}</td>
        <td>${formatMoney(service.total_value)}</td>
        <td>${createStatusBadge(service.status)}</td>
        <td>
          ${formatDate(service.completed_at || service.created_at)}
        </td>
        <td>
          <button
            type="button"
            onclick="showServiceDetails('${escapeHTML(service.id)}')"
          >
            Ver
          </button>
        </td>
      </tr>
    `)
    .join("");
}

/* =========================================================
   DETALHES
========================================================= */

function showServiceDetails(serviceId) {
  const service = servicesCache.find(
    item => String(item.id) === String(serviceId)
  );

  if (!service) {
    showToast("Serviço não encontrado.", "error");
    return;
  }

  setText(
    "modalTitle",
    `Serviço — ${getServiceClientName(service)}`
  );

  const body = getElement("modalBody");
  const footer = getElement("modalFooter");

  if (body) {
    body.innerHTML = `
      <div class="service-details">
        <p>
          <strong>Cliente:</strong>
          ${escapeHTML(getServiceClientName(service))}
        </p>

        <p>
          <strong>Aparelho:</strong>
          ${escapeHTML(service.device_type || "—")}
        </p>

        <p>
          <strong>Modelo:</strong>
          ${escapeHTML(service.device_model || "—")}
        </p>

        <p>
          <strong>Problema:</strong>
          ${escapeHTML(service.problem_type || "—")}
        </p>

        <p>
          <strong>Observações:</strong>
          ${escapeHTML(service.observations || "Nenhuma")}
        </p>

        <p>
          <strong>Valor total:</strong>
          ${formatMoney(service.total_value)}
        </p>

        <p>
          <strong>Sinal:</strong>
          ${formatMoney(service.signal_value)}
        </p>

        <p>
          <strong>Restante:</strong>
          ${formatMoney(service.remaining_value)}
        </p>

        <p>
          <strong>Status:</strong>
          ${createStatusBadge(service.status)}
        </p>

        <p>
          <strong>Criado em:</strong>
          ${formatDateTime(service.created_at)}
        </p>
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <button
        type="button"
        onclick="closeModal('serviceModal')"
      >
        Fechar
      </button>
    `;
  }

  openModal("serviceModal");
}

/* =========================================================
   STATUS DOS SERVIÇOS
========================================================= */

async function updateServiceStatus(serviceId, changes) {
  const supabase = getSupabase();

  if (!supabase) return false;

  const { data, error } = await supabase
    .from("services")
    .update(changes)
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar serviço:", error);
    showToast("Erro ao atualizar o serviço.", "error");
    return false;
  }

  const index = servicesCache.findIndex(
    service => String(service.id) === String(serviceId)
  );

  if (index !== -1 && data) {
    servicesCache[index] = data;
  }

  renderAll();

  return true;
}

async function approveService(serviceId) {
  if (!window.confirm("Deseja confirmar o pagamento do sinal?")) {
    return;
  }

  const success = await updateServiceStatus(serviceId, {
    status: "processing",
    signal_paid_at: new Date().toISOString()
  });

  if (success) {
    showToast(
      "Sinal confirmado. Serviço em andamento.",
      "success"
    );
  }
}

async function markReady(serviceId) {
  const success = await updateServiceStatus(serviceId, {
    status: "ready",
    ready_at: new Date().toISOString()
  });

  if (success) {
    showToast("Serviço marcado como pronto.", "success");

    showAlert(
      "O serviço foi marcado como pronto para retirada.",
      "success"
    );
  }
}

async function markComplete(serviceId) {
  if (!window.confirm("Deseja finalizar este serviço?")) {
    return;
  }

  const now = new Date().toISOString();

  const success = await updateServiceStatus(serviceId, {
    status: "completed",
    remaining_paid_at: now,
    completed_at: now
  });

  if (success) {
    showToast("Serviço finalizado com sucesso.", "success");
  }
}

async function deleteService(serviceId) {
  if (!window.confirm("Tem certeza que deseja excluir este serviço?")) {
    return;
  }

  const supabase = getSupabase();

  if (!supabase) return;

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    console.error("Erro ao excluir serviço:", error);
    showToast("Não foi possível excluir o serviço.", "error");
    return;
  }

  servicesCache = servicesCache.filter(
    service => String(service.id) !== String(serviceId)
  );

  renderAll();

  showToast("Serviço excluído com sucesso.", "success");
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

/*
  O auth.js é responsável por:
  - Verificar a sessão.
  - Verificar se o usuário é administrador.
  - Mostrar ou ocultar lockScreen e adminApp.

  Este arquivo apenas carrega os dados quando o painel
  estiver liberado.
*/

async function initializeAdminPanel() {
  const adminApp = getElement("adminApp");

  if (!adminApp) return;

  const isHidden =
    adminApp.classList.contains("hidden") ||
    adminApp.style.display === "none";

  if (isHidden) {
    return;
  }

  await refreshAll();
}

/* =========================================================
   EVENTOS
========================================================= */

function initializeAdminEvents() {
  const budgetForm = getElement("budgetForm");

  if (budgetForm && !budgetForm.dataset.eventsReady) {
    budgetForm.addEventListener("submit", submitBudget);
    budgetForm.dataset.eventsReady = "true";
  }

  const clientSearch = getElement("clientSearch");

  if (clientSearch && !clientSearch.dataset.eventsReady) {
    clientSearch.addEventListener("input", searchClients);
    clientSearch.dataset.eventsReady = "true";
  }

  const serviceSearch = getElement("serviceSearch");

  if (serviceSearch && !serviceSearch.dataset.eventsReady) {
    serviceSearch.addEventListener("input", filterServices);
    serviceSearch.dataset.eventsReady = "true";
  }

  const filterStatus = getElement("filterStatus");

  if (filterStatus && !filterStatus.dataset.eventsReady) {
    filterStatus.addEventListener("change", filterServices);
    filterStatus.dataset.eventsReady = "true";
  }

  const serviceModal = getElement("serviceModal");

  if (serviceModal && !serviceModal.dataset.eventsReady) {
    serviceModal.addEventListener("click", event => {
      if (event.target === serviceModal) {
        closeModal("serviceModal");
      }
    });

    serviceModal.dataset.eventsReady = "true";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeAdminEvents();

  /*
    Pequeno atraso para permitir que o auth.js:
    1. Inicialize o Supabase.
    2. Verifique a sessão.
    3. Libere o painel administrativo.
  */

  // O auth.js chama refreshAll() somente após liberar o painel.
  // Não carregamos dados aqui para evitar corrida de autenticação.
});

/* =========================================================
   FUNÇÕES GLOBAIS
========================================================= */

window.refreshAll = refreshAll;
window.renderAll = renderAll;

window.showAddClientForm = showAddClientForm;
window.cancelAddClient = cancelAddClient;
window.addNewClient = addNewClient;

window.searchClients = searchClients;
window.selectClient = selectClient;
window.clearSelectedClient = clearSelectedClient;

window.submitBudget = submitBudget;
window.filterServices = filterServices;

window.showServiceDetails = showServiceDetails;
window.closeModal = closeModal;
window.openModal = openModal;

window.approveService = approveService;
window.markReady = markReady;
window.markComplete = markComplete;
window.deleteService = deleteService;

window.logoutAdmin = async function () {
  const supabase = getSupabase();

  if (supabase) {
    await supabase.auth.signOut();
  }

  window.location.href = "login.html";
};

window.initializeAdminPanel = initializeAdminPanel;
