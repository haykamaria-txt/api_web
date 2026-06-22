const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin;
const TOKEN_KEY = "laboratorios_token";
const USER_KEY = "laboratorios_usuario";
const page = window.location.pathname.split("/").pop() || "index.html";
const adminPages = new Set(["dashboard.html", "professores.html", "reclamacoes-admin.html"]);
const professorPages = new Set(["agendamentos.html", "reclamacoes.html", "controle.html", "checkout.html", "inventario.html"]);

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => showPageMessage(error.message, "error"));
});

async function init() {
  attachLogout();

  if (page === "index.html") {
    initLogin();
    return;
  }

  if (!ensureAuthenticated()) return;
  renderNavigation();

  const actions = {
    "dashboard.html": initDashboard,
    "professores.html": initProfessores,
    "agendamentos.html": initAgendamentos,
    "laboratorios.html": initLaboratorios,
    "reclamacoes.html": initReclamacoes,
    "reclamacoes-admin.html": initReclamacoesAdmin,
    "inventario.html": loadInventario,
    "controle.html": () => initAcesso("checkin"),
    "checkout.html": () => initAcesso("checkout"),
    "perfil.html": initPerfil,
  };

  if (actions[page]) await actions[page]();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

function setSession(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function ensureAuthenticated() {
  const user = getUser();
  if (!getToken() || !user) {
    window.location.href = "index.html";
    return false;
  }

  if (adminPages.has(page) && user.role !== "admin") {
    window.location.href = "agendamentos.html";
    return false;
  }

  if (professorPages.has(page) && user.role === "admin") {
    window.location.href = "dashboard.html";
    return false;
  }

  return true;
}

function renderNavigation() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  const user = getUser();
  const links = user.role === "admin"
    ? [
      ["dashboard.html", "Início"],
      ["professores.html", "Professores"],
      ["laboratorios.html", "Laboratórios"],
      ["reclamacoes-admin.html", "Reclamações"],
      ["perfil.html", "Perfil"],
    ]
    : [
      ["agendamentos.html", "Agendamentos"],
      ["laboratorios.html", "Laboratórios"],
      ["reclamacoes.html", "Reclamações"],
      ["inventario.html", "Inventário"],
      ["controle.html", "Check-in"],
      ["checkout.html", "Check-out"],
      ["perfil.html", "Perfil"],
    ];

  nav.innerHTML = links
    .map(([href, label]) => `<a class="${href === page ? "active" : ""}" href="${href}">${label}</a>`)
    .join("");
}

function attachLogout() {
  document.querySelectorAll("[data-logout]").forEach((link) => {
    link.addEventListener("click", () => clearSession());
  });
}

async function api(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.erro || "Não foi possível concluir a operação.");
  }

  return data;
}

function initLogin() {
  const form = document.querySelector("#login-form");
  const matriculaInput = document.querySelector("#login-matricula");
  const senhaInput = document.querySelector("#login-senha");

  form?.addEventListener("submit", (event) => event.preventDefault());

  document.querySelectorAll("[data-login-role]").forEach((button) => {
    button.addEventListener("click", async () => {
      const role = button.dataset.loginRole;
      const matricula = matriculaInput.value.trim();
      const senha = senhaInput.value;

      if (!matricula && !senha) {
        showFormMessage(form, "Informe a matrícula e a senha.", "error");
        matriculaInput.focus();
        return;
      }

      if (!matricula) {
        showFormMessage(form, "Informe a matrícula.", "error");
        matriculaInput.focus();
        return;
      }

      if (!senha) {
        showFormMessage(form, "Informe a senha.", "error");
        senhaInput.focus();
        return;
      }

      try {
        const { token, usuario } = await api("/autenticacao/login", {
          method: "POST",
          body: { matricula, senha },
        });
        if (usuario.role !== role) throw new Error("Perfil diferente do botão escolhido.");
        setSession(token, usuario);
        window.location.href = role === "admin" ? "dashboard.html" : "agendamentos.html";
      } catch (error) {
        showFormMessage(form, error.message, "error");
      }
    });
  });
}

async function initPerfil() {
  const form = document.querySelector("#perfil-form");
  const { usuario } = await api("/autenticacao/perfil");
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));

  document.querySelector("#perfil-nome").value = usuario.nome || "";
  document.querySelector("#perfil-matricula").value = usuario.matricula || "";
  document.querySelector("#perfil-curso").value = usuario.curso || "";
  document.querySelector("#perfil-role").value = usuario.role === "admin" ? "Administrador" : "Professor";

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const senha = document.querySelector("#perfil-senha").value;
      const response = await api("/autenticacao/perfil", {
        method: "PUT",
        body: {
          nome: document.querySelector("#perfil-nome").value.trim(),
          curso: document.querySelector("#perfil-curso").value.trim(),
          ...(senha ? { senha } : {}),
        },
      });
      localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
      document.querySelector("#perfil-senha").value = "";
      showFormMessage(form, "Perfil atualizado.");
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

async function initDashboard() {
  await Promise.all([
    loadDashboardResumo(),
    loadAdminReservations(),
    loadReports(),
  ]);
}

async function loadDashboardResumo() {
  const resumo = await api("/dashboard/resumo");
  Object.entries(resumo).forEach(([key, value]) => {
    const element = document.querySelector(`[data-stat="${key}"]`);
    if (element) element.textContent = String(value).padStart(2, "0");
  });
}

async function loadAdminReservations() {
  const table = document.querySelector("#reservas-admin-tabela");
  if (!table) return;

  const { historico } = await api("/relatorios/historico");
  table.innerHTML = historico.map((reserva) => `
    <tr>
      <td>${escapeHtml(reserva.professor?.nome || "-")}</td>
      <td>${escapeHtml(reserva.laboratorio?.nome || "-")}</td>
      <td>${formatDate(reserva.data)}</td>
      <td>${escapeHtml(reserva.inicio)} - ${escapeHtml(reserva.termino)}</td>
      <td>${statusTag(reserva.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-button icon-button-success" type="button" data-approve-reservation="${reserva.id}" title="Aprovar">
            ${checkIcon()}
          </button>
          <button class="icon-button icon-button-warning" type="button" data-reject-reservation="${reserva.id}" title="Rejeitar">
            ${xIcon()}
          </button>
          <button class="icon-button icon-button-danger" type="button" data-cancel-reservation="${reserva.id}" title="Cancelar">
            ${trashIcon()}
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  table.querySelectorAll("[data-approve-reservation]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/reservas/${button.dataset.approveReservation}/aprovar`, { method: "PATCH" });
      await Promise.all([loadAdminReservations(), loadReports(), loadDashboardResumo()]);
    });
  });

  table.querySelectorAll("[data-reject-reservation]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/reservas/${button.dataset.rejectReservation}/rejeitar`, { method: "PATCH" });
      await Promise.all([loadAdminReservations(), loadReports(), loadDashboardResumo()]);
    });
  });

  table.querySelectorAll("[data-cancel-reservation]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Cancelar esta reserva?")) return;
      await api(`/reservas/${button.dataset.cancelReservation}`, { method: "DELETE" });
      await Promise.all([loadAdminReservations(), loadReports(), loadDashboardResumo()]);
    });
  });
}

async function loadReports() {
  const [utilizacao, maisUtilizados, problemas] = await Promise.all([
    api("/relatorios/utilizacao"),
    api("/relatorios/labs-mais-utilizados"),
    api("/relatorios/problemas"),
  ]);

  const utilizacaoTable = document.querySelector("#relatorio-utilizacao");
  if (utilizacaoTable) {
    utilizacaoTable.innerHTML = utilizacao.utilizacao.map((item) => `
      <tr>
        <td>${escapeHtml(item.laboratorio.nome)}</td>
        <td>${item.totalReservas}</td>
        <td>${item.horasUtilizadas}</td>
      </tr>
    `).join("");
  }

  const rankingTable = document.querySelector("#relatorio-ranking");
  if (rankingTable) {
    rankingTable.innerHTML = maisUtilizados.laboratorios.slice(0, 5).map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.laboratorio.nome)}</td>
        <td>${item.totalReservas}</td>
      </tr>
    `).join("");
  }

  const problemSummary = document.querySelector("#relatorio-problemas");
  if (problemSummary) {
    const statuses = problemas.porStatus || {};
    problemSummary.innerHTML = `
      <article class="overview-card"><strong>${problemas.total}</strong><span>Total</span></article>
      <article class="overview-card"><strong>${statuses.aberto || 0}</strong><span>Abertas</span></article>
      <article class="overview-card"><strong>${statuses.em_andamento || 0}</strong><span>Em andamento</span></article>
      <article class="overview-card"><strong>${statuses.resolvido || 0}</strong><span>Resolvidas</span></article>
    `;
  }
}

async function initProfessores() {
  const form = document.querySelector("#professor-form");
  await loadProfessores();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/autenticacao/cadastro", {
        method: "POST",
        body: {
          nome: document.querySelector("#professor-nome").value.trim(),
          matricula: document.querySelector("#professor-matricula").value.trim(),
          curso: document.querySelector("#professor-curso").value.trim(),
          senha: document.querySelector("#professor-senha").value,
          role: "professor",
        },
      });
      form.reset();
      showFormMessage(form, "Professor cadastrado.");
      await loadProfessores();
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

async function loadProfessores() {
  const table = document.querySelector("#professores-tabela");
  if (!table) return;

  const { usuarios } = await api("/usuarios");
  table.innerHTML = usuarios
    .filter((usuario) => usuario.role === "professor")
    .map((usuario) => `
      <tr>
        <td>${escapeHtml(usuario.matricula)}</td>
        <td>${escapeHtml(usuario.nome)}</td>
        <td>${escapeHtml(usuario.curso)}</td>
        <td>
          <div class="action-buttons">
            <button class="icon-button icon-button-danger" type="button" data-delete-user="${usuario.id}" title="Remover">
              ${trashIcon()}
            </button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  table.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Remover este professor?")) return;
      await api(`/usuarios/${button.dataset.deleteUser}`, { method: "DELETE" });
      await loadProfessores();
    });
  });
}

async function initAgendamentos() {
  const form = document.querySelector("#agendamento-form");
  const recommendationButton = document.querySelector("[data-fill-recommendation]");
  const cancelEditButton = document.querySelector("#agendamento-cancelar-edicao");
  const dateInput = document.querySelector("#agendamento-data");
  if (dateInput) dateInput.min = datePlusDays(3);

  await fillLabSelect(document.querySelector("#agendamento-laboratorio"));
  await loadRecommendation();
  await loadAgendamentos();

  recommendationButton?.addEventListener("click", () => {
    document.querySelector("#agendamento-data").value = recommendationButton.dataset.date || "";
    document.querySelector("#agendamento-inicio").value = recommendationButton.dataset.start || "";
    document.querySelector("#agendamento-termino").value = recommendationButton.dataset.end || "";
    document.querySelector("#agendamento-laboratorio").value = recommendationButton.dataset.labId || "";
  });

  cancelEditButton?.addEventListener("click", () => resetAgendamentoForm(form));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const editId = form.dataset.editId;
    try {
      await api(editId ? `/reservas/${editId}` : "/reservas", {
        method: editId ? "PUT" : "POST",
        body: {
          data: document.querySelector("#agendamento-data").value,
          inicio: document.querySelector("#agendamento-inicio").value,
          termino: document.querySelector("#agendamento-termino").value,
          labId: document.querySelector("#agendamento-laboratorio").value,
          quantidadeAlunos: document.querySelector("#agendamento-alunos").value,
          observacao: document.querySelector("#agendamento-observacao").value.trim(),
        },
      });
      resetAgendamentoForm(form);
      showFormMessage(form, editId ? "Agendamento atualizado." : "Agendamento salvo.");
      await loadAgendamentos();
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

function resetAgendamentoForm(form) {
  form?.reset();
  if (form) delete form.dataset.editId;
  const title = document.querySelector("#agendamento-form-title");
  const submitButton = document.querySelector("#agendamento-submit");
  const cancelEditButton = document.querySelector("#agendamento-cancelar-edicao");
  if (title) title.textContent = "Novo agendamento";
  if (submitButton) submitButton.textContent = "Salvar agendamento";
  if (cancelEditButton) cancelEditButton.hidden = true;
}

async function loadRecommendation() {
  const button = document.querySelector("[data-fill-recommendation]");
  if (!button) return;
  const { recomendacao } = await api("/reservas/recomendacao");
  if (!recomendacao?.laboratorio) return;

  button.dataset.date = recomendacao.data;
  button.dataset.start = recomendacao.inicio;
  button.dataset.end = recomendacao.termino;
  button.dataset.labId = recomendacao.laboratorio.id;

  const box = document.querySelector(".recommendation-box");
  const title = box?.querySelector("strong");
  const text = box?.querySelector("p");
  if (title) title.textContent = recomendacao.laboratorio.nome;
  if (text) text.textContent = `Data sugerida: ${formatDate(recomendacao.data)}, das ${recomendacao.inicio} às ${recomendacao.termino}.`;
}

async function loadAgendamentos() {
  const table = document.querySelector("#agendamentos-tabela");
  if (!table) return;
  const { reservas } = await api("/reservas");
  table.innerHTML = reservas.map((reserva) => `
    <tr>
      <td>${escapeHtml(reserva.laboratorio?.nome || "-")}</td>
      <td>${formatDate(reserva.data)}</td>
      <td>${escapeHtml(reserva.inicio)} - ${escapeHtml(reserva.termino)}</td>
      <td>${escapeHtml(reserva.quantidadeAlunos || "-")}</td>
      <td>${statusTag(reserva.status)}</td>
      <td>${escapeHtml(reserva.observacao || "-")}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-button" type="button" data-edit-reservation="${reserva.id}" title="Editar">
            ${editIcon()}
          </button>
          <button class="icon-button icon-button-danger" type="button" data-delete-reservation="${reserva.id}" title="Cancelar">
            ${trashIcon()}
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  table.querySelectorAll("[data-edit-reservation]").forEach((button) => {
    button.addEventListener("click", async () => {
      const { reserva } = await api(`/reservas/${button.dataset.editReservation}`);
      const form = document.querySelector("#agendamento-form");
      form.dataset.editId = reserva.id;
      document.querySelector("#agendamento-data").value = reserva.data;
      document.querySelector("#agendamento-inicio").value = reserva.inicio;
      document.querySelector("#agendamento-termino").value = reserva.termino;
      document.querySelector("#agendamento-laboratorio").value = reserva.labId;
      document.querySelector("#agendamento-alunos").value = reserva.quantidadeAlunos || "";
      document.querySelector("#agendamento-observacao").value = reserva.observacao || "";
      document.querySelector("#agendamento-form-title").textContent = "Editar agendamento";
      document.querySelector("#agendamento-submit").textContent = "Atualizar agendamento";
      document.querySelector("#agendamento-cancelar-edicao").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  table.querySelectorAll("[data-delete-reservation]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Cancelar este agendamento?")) return;
      await api(`/reservas/${button.dataset.deleteReservation}`, { method: "DELETE" });
      await loadAgendamentos();
    });
  });
}

async function initLaboratorios() {
  const user = getUser();
  const dateInput = document.querySelector("#calendario-data");
  const filterForm = document.querySelector("#laboratorios-filtro");
  const adminPanel = document.querySelector("#admin-labs-panel");
  if (dateInput && !dateInput.value) dateInput.value = datePlusDays(4);

  if (adminPanel) adminPanel.hidden = user.role !== "admin";

  await Promise.all([
    loadCalendario(),
    loadLaboratoriosLista(),
    user.role === "admin" ? loadLabManagement() : Promise.resolve(),
  ]);

  dateInput?.addEventListener("change", loadCalendario);
  filterForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadLaboratoriosLista();
  });

  if (user.role === "admin") initLabForm();
}

function initLabForm() {
  const form = document.querySelector("#lab-form");
  const cancelButton = document.querySelector("#lab-cancelar-edicao");
  cancelButton?.addEventListener("click", () => resetLabForm(form));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const labId = document.querySelector("#lab-id").value;
    const recursos = document.querySelector("#lab-recursos").value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      await api(labId ? `/labs/${labId}` : "/labs", {
        method: labId ? "PUT" : "POST",
        body: {
          nome: document.querySelector("#lab-nome").value.trim(),
          tipo: document.querySelector("#lab-tipo").value.trim(),
          capacidade: document.querySelector("#lab-capacidade").value,
          localizacao: document.querySelector("#lab-localizacao").value.trim(),
          recursos,
        },
      });
      resetLabForm(form);
      showFormMessage(form, labId ? "Laboratório atualizado." : "Laboratório cadastrado.");
      await Promise.all([loadLabManagement(), loadLaboratoriosLista(), loadCalendario()]);
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

function resetLabForm(form) {
  form?.reset();
  document.querySelector("#lab-id").value = "";
  document.querySelector("#lab-form-title").textContent = "Novo laboratório";
  document.querySelector("#lab-submit").textContent = "Salvar laboratório";
  document.querySelector("#lab-cancelar-edicao").hidden = true;
}

async function loadLabManagement() {
  const table = document.querySelector("#labs-admin-tabela");
  if (!table) return;
  const { laboratorios } = await api("/labs");
  table.innerHTML = laboratorios.map((lab) => `
    <tr>
      <td>${escapeHtml(lab.nome)}</td>
      <td>${escapeHtml(lab.tipo)}</td>
      <td>${lab.capacidade}</td>
      <td>${escapeHtml(lab.localizacao)}</td>
      <td>${escapeHtml((lab.recursos || []).join(", "))}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-button" type="button" data-edit-lab="${lab.id}" title="Editar">
            ${editIcon()}
          </button>
          <button class="icon-button icon-button-danger" type="button" data-delete-lab="${lab.id}" title="Remover">
            ${trashIcon()}
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  table.querySelectorAll("[data-edit-lab]").forEach((button) => {
    button.addEventListener("click", async () => {
      const { laboratorio } = await api(`/labs/${button.dataset.editLab}`);
      document.querySelector("#lab-id").value = laboratorio.id;
      document.querySelector("#lab-nome").value = laboratorio.nome;
      document.querySelector("#lab-tipo").value = laboratorio.tipo;
      document.querySelector("#lab-capacidade").value = laboratorio.capacidade;
      document.querySelector("#lab-localizacao").value = laboratorio.localizacao;
      document.querySelector("#lab-recursos").value = (laboratorio.recursos || []).join(", ");
      document.querySelector("#lab-form-title").textContent = "Editar laboratório";
      document.querySelector("#lab-submit").textContent = "Atualizar laboratório";
      document.querySelector("#lab-cancelar-edicao").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  table.querySelectorAll("[data-delete-lab]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Remover este laboratório?")) return;
      await api(`/labs/${button.dataset.deleteLab}`, { method: "DELETE" });
      await Promise.all([loadLabManagement(), loadLaboratoriosLista(), loadCalendario()]);
    });
  });
}

async function loadLaboratoriosLista() {
  const table = document.querySelector("#laboratorios-lista");
  if (!table) return;
  const capacidade = document.querySelector("#laboratorios-capacidade")?.value;
  const query = capacidade ? `?capacidade=${encodeURIComponent(capacidade)}` : "";
  const { laboratorios } = await api(`/labs${query}`);
  table.innerHTML = laboratorios.map((lab) => `
    <tr>
      <td>${escapeHtml(lab.nome)}</td>
      <td>${escapeHtml(lab.tipo)}</td>
      <td>${lab.capacidade}</td>
      <td>${escapeHtml(lab.localizacao)}</td>
      <td>${escapeHtml((lab.recursos || []).join(", ") || "-")}</td>
    </tr>
  `).join("");
}

async function loadCalendario() {
  const table = document.querySelector("#calendario-tabela");
  const date = document.querySelector("#calendario-data")?.value;
  if (!table || !date) return;

  const { laboratorios } = await api(`/calendario?data=${encodeURIComponent(date)}`);
  table.innerHTML = laboratorios.map((item) => `
    <tr>
      <td>${escapeHtml(item.laboratorio.nome)}</td>
      ${item.slots.map((slot) => `
        <td class="${slot.status === "livre" ? "slot-free" : "slot-busy"}">
          ${slot.status === "livre" ? "Livre" : "Ocupado"}
        </td>
      `).join("")}
    </tr>
  `).join("");
}

async function initReclamacoes() {
  const form = document.querySelector("#reclamacao-form");
  await Promise.all([
    fillLabSelect(document.querySelector("#reclamacao-laboratorio")),
    loadMinhasReclamacoes(),
  ]);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/problemas", {
        method: "POST",
        body: {
          labId: document.querySelector("#reclamacao-laboratorio").value,
          tipo: document.querySelector("#reclamacao-tipo").value,
          descricao: document.querySelector("#reclamacao-descricao").value.trim(),
        },
      });
      form.reset();
      showFormMessage(form, "Reclamação registrada.");
      await loadMinhasReclamacoes();
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

async function loadMinhasReclamacoes() {
  const table = document.querySelector("#reclamacoes-tabela");
  if (!table) return;
  const { problemas } = await api("/problemas");
  table.innerHTML = problemas.map((problema) => `
    <tr>
      <td>${formatDate(problema.createdAt?.slice(0, 10))}</td>
      <td>${escapeHtml(problema.laboratorio?.nome || "-")}</td>
      <td>${escapeHtml(problema.tipo)}</td>
      <td>${statusTag(problema.status)}</td>
    </tr>
  `).join("");
}

async function initReclamacoesAdmin() {
  await loadReclamacoesAdmin();
}

async function loadReclamacoesAdmin() {
  const table = document.querySelector("#reclamacoes-admin-tabela");
  if (!table) return;
  const { problemas } = await api("/problemas");
  table.innerHTML = problemas.map((problema) => `
    <tr>
      <td>${formatDate(problema.createdAt?.slice(0, 10))}</td>
      <td>${escapeHtml(problema.laboratorio?.nome || "-")}</td>
      <td>${escapeHtml(problema.tipo)}</td>
      <td>${escapeHtml(problema.responsavel?.nome || "-")}</td>
      <td>${statusTag(problema.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-button icon-button-success" type="button" data-resolve-problem="${problema.id}" title="Resolver">
            ${checkIcon()}
          </button>
          <button class="icon-button icon-button-danger" type="button" data-delete-problem="${problema.id}" title="Remover">
            ${trashIcon()}
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  table.querySelectorAll("[data-resolve-problem]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/problemas/${button.dataset.resolveProblem}`, {
        method: "PUT",
        body: { status: "resolvido" },
      });
      await loadReclamacoesAdmin();
    });
  });

  table.querySelectorAll("[data-delete-problem]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Remover esta reclamação?")) return;
      await api(`/problemas/${button.dataset.deleteProblem}`, { method: "DELETE" });
      await loadReclamacoesAdmin();
    });
  });
}

async function loadInventario() {
  const container = document.querySelector("#inventario-lista");
  if (!container) return;
  const { inventario } = await api("/inventario");
  const groups = new Map();

  inventario.forEach((item) => {
    const key = item.laboratorio?.id || item.labId;
    if (!groups.has(key)) groups.set(key, { laboratorio: item.laboratorio, itens: [] });
    groups.get(key).itens.push(item);
  });

  container.innerHTML = [...groups.values()].map((group) => `
    <article class="card">
      <h2>${escapeHtml(group.laboratorio?.nome || "Laboratório")}</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Disponivel</th>
              <th>Indisponivel</th>
            </tr>
          </thead>
          <tbody>
            ${group.itens.map((item) => `
              <tr>
                <td>${escapeHtml(item.item)}</td>
                <td>${item.disponivel}</td>
                <td>${item.indisponivel}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `).join("");
}

async function initAcesso(tipo) {
  const form = document.querySelector(`#${tipo}-form`);
  const select = document.querySelector(`#${tipo}-laboratorio`);
  await fillLabSelect(select);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/acessos/${tipo}`, {
        method: "POST",
        body: { labId: select.value },
      });
      showFormMessage(form, `${tipo === "checkin" ? "Check-in" : "Check-out"} registrado.`);
    } catch (error) {
      showFormMessage(form, error.message, "error");
    }
  });
}

async function fillLabSelect(select) {
  if (!select) return;
  const { laboratorios } = await api("/labs");
  select.innerHTML = laboratorios
    .map((lab) => `<option value="${lab.id}">${escapeHtml(lab.nome)}</option>`)
    .join("");
}

function showFormMessage(form, message, type = "success") {
  if (!form) return;
  let element = form.querySelector(".form-message");
  if (!element) {
    element = document.createElement("p");
    element.className = "form-message";
    form.appendChild(element);
  }
  element.textContent = message;
  element.dataset.type = type;
}

function showPageMessage(message, type = "success") {
  const container = document.querySelector(".content") || document.body;
  const element = document.createElement("p");
  element.className = "form-message";
  element.dataset.type = type;
  element.textContent = message;
  container.prepend(element);
}

function datePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

function statusTag(status) {
  const labels = {
    pendente: "Pendente",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
    aberto: "Aberto",
    em_andamento: "Em andamento",
    resolvido: "Resolvido",
  };
  const type = ["aprovada", "resolvido"].includes(status)
    ? "success"
    : ["rejeitada", "cancelada"].includes(status)
      ? "danger"
      : "warning";
  return `<span class="tag tag-${type}">${labels[status] || escapeHtml(status || "-")}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function trashIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  `;
}

function checkIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  `;
}

function xIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `;
}

function editIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  `;
}
