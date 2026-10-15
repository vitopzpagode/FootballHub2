
"use strict";

const API_URL = "api/api.php";

const TABLES = {
    clubes: {
        title: "Clubes",
        singular: "clube",
        key: "clube_id",
        columns: [
            ["nome", "Nome"],
            ["pais", "País"],
            ["cidade", "Cidade"],
            ["estadio", "Estádio"],
            ["ano_fundacao", "Fundação"]
        ],
        fields: [
            ["nome", "Nome do clube", "text", true],
            ["pais", "País", "text", false, "Brasil"],
            ["cidade", "Cidade", "text"],
            ["estadio", "Estádio", "text"],
            ["ano_fundacao", "Ano de fundação", "number"],
            ["escudo_url", "URL do escudo", "url"]
        ]
    },
    jogadores: {
        title: "Jogadores",
        singular: "jogador",
        key: "jogador_id",
        columns: [
            ["nome", "Nome"],
            ["clube_id", "ID do clube"],
            ["posicao", "Posição"],
            ["numero_camisa", "Camisa"],
            ["nacionalidade", "Nacionalidade"],
            ["status", "Status"]
        ],
        fields: [
            ["nome", "Nome completo", "text", true],
            ["clube_id", "ID do clube", "number", true],
            ["posicao", "Posição", "select", true, "", [
                ["GOLEIRO", "Goleiro"],
                ["ZAGUEIRO", "Zagueiro"],
                ["LATERAL", "Lateral"],
                ["VOLANTE", "Volante"],
                ["MEIA", "Meia"],
                ["MEIO_CAMPISTA", "Meio-campista"],
                ["PONTA", "Ponta"],
                ["ATACANTE", "Atacante"]
            ]],
            ["numero_camisa", "Número da camisa", "number"],
            ["nacionalidade", "Nacionalidade", "text"],
            ["data_nascimento", "Data de nascimento", "date"],
            ["altura", "Altura em metros", "number"],
            ["peso", "Peso em kg", "number"],
            ["pe_dominante", "Pé dominante", "select", false, "", [
                ["DIREITO", "Direito"],
                ["ESQUERDO", "Esquerdo"],
                ["AMBIDESTRO", "Ambidestro"]
            ]],
            ["valor_mercado", "Valor de mercado (R$)", "number"],
            ["status", "Status", "select", false, "", [
                ["ATIVO", "Ativo"],
                ["LESIONADO", "Lesionado"],
                ["SUSPENSO", "Suspenso"],
                ["INATIVO", "Inativo"]
            ]]
        ]
    },
    competicoes: {
        title: "Competições",
        singular: "competição",
        key: "competicao_id",
        columns: [
            ["nome", "Nome"],
            ["tipo", "Tipo"],
            ["pais", "País"],
            ["organizacao", "Organização"]
        ],
        fields: [
            ["nome", "Nome da competição", "text", true],
            ["tipo", "Tipo de competição", "text"],
            ["pais", "País", "text"],
            ["organizacao", "Organização", "text"],
            ["descricao", "Descrição", "textarea"]
        ]
    },
    temporadas: {
        title: "Temporadas",
        singular: "temporada",
        key: "temporada_id",
        columns: [
            ["nome", "Temporada"],
            ["competicao_id", "ID da competição"],
            ["data_inicio", "Início"],
            ["data_fim", "Término"],
            ["status", "Status"]
        ],
        fields: [
            ["competicao_id", "ID da competição", "number", true],
            ["nome", "Nome da temporada", "text", true],
            ["data_inicio", "Data de início", "date"],
            ["data_fim", "Data de término", "date"],
            ["status", "Status", "text"]
        ]
    },
    partidas: {
        title: "Partidas",
        singular: "partida",
        key: "partida_id",
        columns: [
            ["mandante_id", "Mandante (ID)"],
            ["visitante_id", "Visitante (ID)"],
            ["data_hora", "Data e hora"],
            ["gols_mandante", "Gols casa"],
            ["gols_visitante", "Gols fora"],
            ["status", "Status"]
        ],
        fields: [
            ["temporada_id", "ID da temporada", "number"],
            ["competicao_id", "ID da competição", "number"],
            ["rodada", "Rodada", "text"],
            ["mandante_id", "ID do clube mandante", "number", true],
            ["visitante_id", "ID do clube visitante", "number", true],
            ["data_hora", "Data e hora", "datetime-local"],
            ["estadio", "Estádio", "text"],
            ["gols_mandante", "Gols do mandante", "number", false, "0"],
            ["gols_visitante", "Gols do visitante", "number", false, "0"],
            ["status", "Status", "text"]
        ]
    },
    eventos_partida: {
        title: "Eventos das partidas",
        singular: "evento",
        key: "evento_id",
        columns: [
            ["partida_id", "Partida (ID)"],
            ["jogador_id", "Jogador (ID)"],
            ["tipo", "Tipo"],
            ["minuto", "Minuto"],
            ["descricao", "Descrição"]
        ],
        fields: [
            ["partida_id", "ID da partida", "number", true],
            ["jogador_id", "ID do jogador", "number"],
            ["jogador_substituido_id", "ID do jogador substituído", "number"],
            ["tipo", "Tipo de evento", "text", true],
            ["minuto", "Minuto", "number"],
            ["descricao", "Descrição", "textarea"]
        ]
    },
    usuarios: {
        title: "Usuários",
        singular: "usuário",
        key: "usuario_id",
        columns: [
            ["nome", "Nome"],
            ["email", "E-mail"],
            ["perfil", "Perfil"]
        ],
        fields: [
            ["nome", "Nome completo", "text", true],
            ["email", "E-mail", "email", true],
            ["senha", "Senha", "password", true],
            ["perfil", "Perfil", "select", true, "COMUM", [
                ["ADMIN", "Administrador"],
                ["COMUM", "Usuário comum"]
            ]]
        ]
    }
};

const PAGE = document.body.dataset.page || "dashboard";
const app = document.querySelector("#app");
let records = [];
let editing = null;
let busy = false;

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
}[c]));

function pageName(resource) {
    return resource === "eventos_partida" ? "eventos" : resource;
}

function navigation() {
    const links = [
        ["dashboard", "⌂", "Painel"],
        ["clubes", "⚽", "Clubes"],
        ["jogadores", "♟", "Jogadores"],
        ["competicoes", "🏆", "Competições"],
        ["temporadas", "◷", "Temporadas"],
        ["partidas", "▣", "Partidas"],
        ["eventos_partida", "✦", "Eventos"],
        ["usuarios", "♙", "Usuários"]
    ];

    return links.map(([key, icon, label]) => `
        <a class="nav-link ${PAGE === key ? "active" : ""}"
           href="${key === "dashboard" ? "index.html" : pageName(key) + ".html"}">
            <span class="nav-icon">${icon}</span>
            <span>${label}</span>
        </a>
    `).join("");
}

function layout() {
    const config = TABLES[PAGE];
    const isDashboard = PAGE === "dashboard";
    const title = isDashboard ? "Painel inicial" : config?.title || "FootballHub";
    const description = isDashboard
        ? "Visão geral do gerenciamento de futebol."
        : "Cadastre, consulte e gerencie os dados.";

    app.innerHTML = `
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <aside class="sidebar">
            <div class="brand">
                <div class="brand-logo">F</div>
                <div>
                    <strong>FootballHub</strong>
                    <small>Gestão de futebol</small>
                </div>
            </div>

            <div class="nav-label">Menu principal</div>
            <nav>${navigation()}</nav>

            <div class="nav-label">Sistema</div>
            <div class="connection">
                <span class="connection-dot" id="connection-dot"></span>
                <span id="connection-label">Verificando banco...</span>
            </div>
        </aside>

        <main class="main">
            <header class="topbar">
                <div class="topbar-left">
                    <button class="mobile-menu" id="menu-button"
                            type="button" aria-label="Abrir menu">☰</button>
                    <span class="topbar-title">${esc(title)}</span>
                </div>
                <div class="topbar-right">
                    <div class="connection">
                        <span class="connection-dot" id="top-dot"></span>
                        <span id="top-connection">Conectando...</span>
                    </div>
                </div>
            </header>

            <section class="content">
                <div class="page-heading">
                    <div>
                        <h1>${esc(title)}</h1>
                        <p>${esc(description)}</p>
                    </div>
                    <div class="heading-actions">
                        ${isDashboard
            ? `<button class="btn" id="refresh-dashboard" type="button">↻ Atualizar</button>`
            : `
                                <button class="btn" id="reload-records" type="button">↻ Atualizar</button>
                                <button class="btn btn-primary" id="new-record" type="button">＋ Novo cadastro</button>
                            `}
                    </div>
                </div>

                ${isDashboard ? dashboardMarkup() : recordsMarkup(config)}
            </section>
        </main>

        <div class="modal-backdrop" id="modal-backdrop" hidden>
            <section class="modal" role="dialog" aria-modal="true"
                     aria-labelledby="modal-title">
                <div class="modal-header">
                    <div>
                        <h2 id="modal-title">Novo cadastro</h2>
                        <p id="modal-description">Preencha os campos abaixo.</p>
                    </div>
                    <button class="modal-close" type="button"
                            id="modal-close" aria-label="Fechar">✕</button>
                </div>

                <form id="record-form">
                    <div class="form-grid" id="form-fields"></div>
                    <div class="form-error" id="form-error" role="alert"></div>
                    <div class="modal-footer">
                        <button class="btn" type="button" id="cancel-button">Cancelar</button>
                        <button class="btn btn-primary" type="submit" id="save-button">Salvar cadastro</button>
                    </div>
                </form>
            </section>
        </div>
    `;
}

function dashboardMarkup() {
    return `
        <div class="stats-grid">
            ${[
            ["⚽", "Clubes cadastrados", "clubs-count"],
            ["♟", "Jogadores cadastrados", "players-count"],
            ["🏆", "Competições", "competitions-count"],
            ["▣", "Partidas", "matches-count"]
        ].map(([icon, label, id]) => `
                <article class="stat-card">
                    <div class="stat-icon">${icon}</div>
                    <div>
                        <div class="stat-label">${label}</div>
                        <div class="stat-value" id="${id}">—</div>
                    </div>
                </article>
            `).join("")}
        </div>

        <section class="panel">
            <div class="panel-header">
                <h2>Partidas recentes</h2>
                <a class="btn btn-small" href="partidas.html">Ver partidas</a>
            </div>
            <div class="match-list" id="recent-matches">
                <div class="empty-state">Carregando partidas...</div>
            </div>
        </section>
    `;
}

function recordsMarkup(config) {
    return `
        <section class="panel">
            <div class="panel-header">
                <h2>Lista de ${esc(config.title.toLowerCase())}</h2>
                <span class="result-count" id="result-count">Carregando...</span>
            </div>

            <div class="toolbar">
                <input class="search" id="search-input" type="search"
                       placeholder="Pesquisar registros..." aria-label="Pesquisar">
            </div>

            <div class="table-wrap">
                <table>
                    <thead id="table-head"></thead>
                    <tbody id="table-body">
                        <tr><td class="empty-state">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="empty-state" id="empty-state" hidden>
                Nenhum registro encontrado. Clique em “Novo cadastro” para começar.
            </div>
        </section>
    `;
}

async function api(action, resource = null, extra = {}) {
    const payload = { action, ...extra };
    if (resource) payload.resource = resource;

    let response;

    try {
        response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });
    } catch {
        throw new Error("Não foi possível acessar o PHP. Inicie o Apache e confira a URL do projeto.");
    }

    const text = await response.text();
    let result;

    try {
        result = JSON.parse(text);
    } catch {
        throw new Error("O PHP não retornou JSON válido. Confira os erros em api/api.php.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "A operação falhou.");
    }

    return result;
}

async function checkConnection() {
    const dot = document.querySelector("#connection-dot");
    const topDot = document.querySelector("#top-dot");
    const label = document.querySelector("#connection-label");
    const topLabel = document.querySelector("#top-connection");

    try {
        await api("health");
        [dot, topDot].forEach(el => {
            if (el) el.classList.add("online");
        });
        if (label) label.textContent = "Banco conectado";
        if (topLabel) topLabel.textContent = "Conectado";
    } catch (error) {
        [dot, topDot].forEach(el => {
            if (el) el.classList.add("offline");
        });
        if (label) label.textContent = "Banco indisponível";
        if (topLabel) topLabel.textContent = "Sem conexão";
        console.error(error);
    }
}

function formatValue(value, key) {
    if (value === null || value === undefined || value === "") return "—";

    if (key === "valor_mercado" && Number.isFinite(Number(value))) {
        return Number(value).toLocaleString("pt-BR", {
            style: "currency", currency: "BRL"
        });
    }

    if (["data_inicio", "data_fim", "data_nascimento"].includes(key)) {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    }

    if (key === "data_hora") {
        const date = new Date(String(value).replace(" ", "T"));
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleString("pt-BR");
        }
    }

    return String(value);
}

function recordId(record) {
    const config = TABLES[PAGE];
    return record[config.key] ?? record.id ?? null;
}

function renderTable() {
    const config = TABLES[PAGE];
    const head = document.querySelector("#table-head");
    const body = document.querySelector("#table-body");
    const search = (document.querySelector("#search-input")?.value || "")
        .trim().toLocaleLowerCase("pt-BR");

    if (!head || !body) return;

    head.innerHTML = `
        <tr>
            ${config.columns.map(([, label]) => `<th>${esc(label)}</th>`).join("")}
            <th>Ações</th>
        </tr>
    `;

    const filtered = records.filter(record =>
        Object.values(record).some(value =>
            String(value ?? "").toLocaleLowerCase("pt-BR").includes(search)
        )
    );

    body.innerHTML = filtered.map(record => {
        const id = recordId(record);

        return `
            <tr>
                ${config.columns.map(([field]) =>
            `<td>${esc(formatValue(record[field], field))}</td>`
        ).join("")}
                <td>
                    <div class="actions">
                        <button class="btn btn-small" type="button"
                                data-action="edit" data-id="${esc(id)}">Editar</button>
                        <button class="btn btn-small btn-danger" type="button"
                                data-action="delete" data-id="${esc(id)}">Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = filtered.length !== 0;

    document.querySelector("#result-count").textContent =
        `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
        body.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="empty-state">Nenhum registro encontrado.</td></tr>`;
    }
}

async function loadRecords() {
    const body = document.querySelector("#table-body");
    if (body) body.innerHTML = `<tr><td class="empty-state">Carregando registros...</td></tr>`;

    try {
        const result = await api("list", PAGE);
        records = Array.isArray(result.data) ? result.data :
            Array.isArray(result.records) ? result.records : [];
        renderTable();
    } catch (error) {
        if (body) {
            body.innerHTML = `<tr><td class="empty-state">${esc(error.message)}</td></tr>`;
        }
        document.querySelector("#result-count").textContent = "Erro ao carregar";
    }
}

function makeField(field, record = {}) {
    const [name, label, type = "text", required = false, defaultValue = "", options] = field;
    let value = record[name] ?? defaultValue;

    if (type === "datetime-local" && value) {
        value = String(value).replace(" ", "T").slice(0, 16);
    }

    if (type === "date" && value) value = String(value).slice(0, 10);

    if (type === "password" && record[name]) value = "";

    const req = required ? "required" : "";
    const id = `field-${name}`;
    let input;

    if (type === "select") {
        input = `
            <select id="${id}" name="${name}" ${req}>
                <option value="">Selecione...</option>
                ${(options || []).map(([v, text]) => `
                    <option value="${esc(v)}" ${String(value) === v ? "selected" : ""}>
                        ${esc(text)}
                    </option>
                `).join("")}
            </select>
        `;
    } else if (type === "textarea") {
        input = `<textarea id="${id}" name="${name}" ${req}>${esc(value)}</textarea>`;
    } else {
        input = `
            <input id="${id}" name="${name}" type="${type}"
                value="${esc(value)}" ${req}
                ${type === "number" ? 'step="any"' : ""}
                ${type === "password" ? 'autocomplete="new-password"' : ""}>
        `;
    }

    return `
        <div class="form-group ${type === "textarea" || type === "url" ? "full" : ""}">
            <label for="${id}">${esc(label)}${required ? " *" : ""}</label>
            ${input}
        </div>
    `;
}

function openForm(record = null) {
    editing = record;
    busy = false;

    const config = TABLES[PAGE];
    document.querySelector("#modal-title").textContent =
        `${record ? "Editar" : "Novo cadastro"} — ${config.singular}`;

    document.querySelector("#modal-description").textContent =
        record ? "Atualize os campos e salve as alterações." : "Preencha os dados abaixo.";

    document.querySelector("#form-fields").innerHTML =
        config.fields.map(field => makeField(field, record || {})).join("");

    document.querySelector("#form-error").textContent = "";

    // A senha só é obrigatória ao criar usuário.
    if (record && PAGE === "usuarios") {
        const password = document.querySelector("#field-senha");
        if (password) password.required = false;
    }

    document.querySelector("#save-button").textContent =
        record ? "Salvar alterações" : "Registrar cadastro";

    document.querySelector("#modal-backdrop").hidden = false;
    document.body.classList.add("modal-open");

    document.querySelector("#form-fields input, #form-fields select, #form-fields textarea")?.focus();
}

function closeForm() {
    document.querySelector("#modal-backdrop").hidden = true;
    document.body.classList.remove("modal-open");
    editing = null;
}

async function saveForm(event) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const config = TABLES[PAGE];
    const data = {};
    const formData = new FormData(form);

    for (const [key, raw] of formData.entries()) {
        let value = String(raw).trim();

        if (key === "senha" && value === "" && editing) continue;

        const field = config.fields.find(item => item[0] === key);

        if (field?.[2] === "number" && value !== "") {
            value = Number(value);
        }

        if (field?.[2] === "datetime-local" && value) {
            value = value.replace("T", " ") + ":00";
        }

        data[key] = value === "" ? null : value;
    }

    if (PAGE === "partidas" &&
        data.mandante_id && data.visitante_id &&
        Number(data.mandante_id) === Number(data.visitante_id)) {
        document.querySelector("#form-error").textContent =
            "O clube mandante e o visitante precisam ser diferentes.";
        return;
    }

    busy = true;
    const button = document.querySelector("#save-button");
    button.disabled = true;
    button.textContent = "Salvando...";

    try {
        if (editing) {
            const id = recordId(editing);
            await api("update", PAGE, {
                id,
                [config.key]: id,
                data
            });
        } else {
            await api("create", PAGE, { data });
        }

        closeForm();
        await loadRecords();
    } catch (error) {
        document.querySelector("#form-error").textContent = error.message;
    } finally {
        busy = false;
        button.disabled = false;
        button.textContent = editing ? "Salvar alterações" : "Registrar cadastro";
    }
}

async function deleteRecord(id) {
    const config = TABLES[PAGE];
    const record = records.find(item => String(recordId(item)) === String(id));
    if (!record) return;

    const name = record.nome || record.email || `${config.singular} ${id}`;

    if (!confirm(`Deseja realmente excluir "${name}"?`)) return;

    try {
        await api("delete", PAGE, { id, [config.key]: id });
        await loadRecords();
    } catch (error) {
        alert(`Não foi possível excluir: ${error.message}`);
    }
}

async function loadDashboard() {
    const resources = [
        ["clubes", "clubs-count"],
        ["jogadores", "players-count"],
        ["competicoes", "competitions-count"],
        ["partidas", "matches-count"]
    ];

    for (const [resource, elementId] of resources) {
        const element = document.getElementById(elementId);
        if (!element) continue;

        try {
            const result = await api("list", resource);
            const data = result.data || result.records || [];
            element.textContent = data.length;
        } catch {
            element.textContent = "—";
        }
    }

    const container = document.querySelector("#recent-matches");
    if (!container) return;

    try {
        const result = await api("list", "partidas");
        const matches = result.data || result.records || [];

        matches.sort((a, b) =>
            String(b.data_hora || "").localeCompare(String(a.data_hora || ""))
        );

        const recent = matches.slice(0, 5);

        container.innerHTML = recent.length ? recent.map(match => `
            <div class="match-row">
                <div class="match-team">
                    <strong>${esc(match.mandante_nome || match.nome_mandante || `Clube ${match.mandante_id}`)}</strong>
                </div>
                <div class="match-score">
                    ${match.gols_mandante ?? "—"} × ${match.gols_visitante ?? "—"}
                </div>
                <div class="match-team">
                    <strong>${esc(match.visitante_nome || match.nome_visitante || `Clube ${match.visitante_id}`)}</strong>
                </div>
            </div>
        `).join("") : `<div class="empty-state">Nenhuma partida cadastrada.</div>`;
    } catch {
        container.innerHTML = `<div class="empty-state">Não foi possível carregar as partidas.</div>`;
    }
}

function initializeEvents() {
    document.querySelector("#menu-button")?.addEventListener("click", () => {
        document.body.classList.toggle("menu-open");
    });

    document.querySelector("#sidebar-overlay")?.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
    });

    document.querySelector("#new-record")?.addEventListener("click", () => openForm());
    document.querySelector("#reload-records")?.addEventListener("click", loadRecords);
    document.querySelector("#refresh-dashboard")?.addEventListener("click", async () => {
        await checkConnection();
        await loadDashboard();
    });

    document.querySelector("#record-form")?.addEventListener("submit", saveForm);
    document.querySelector("#modal-close")?.addEventListener("click", closeForm);
    document.querySelector("#cancel-button")?.addEventListener("click", closeForm);

    document.querySelector("#modal-backdrop")?.addEventListener("click", event => {
        if (event.target.id === "modal-backdrop") closeForm();
    });

    document.querySelector("#search-input")?.addEventListener("input", renderTable);

    document.querySelector("#table-body")?.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const { action, id } = button.dataset;

        if (action === "edit") {
            const record = records.find(item => String(recordId(item)) === String(id));
            if (record) openForm(record);
        }

        if (action === "delete") deleteRecord(id);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeForm();
            document.body.classList.remove("menu-open");
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            document.body.classList.remove("menu-open");
        }
    });
}

async function initialize() {
    if (!app) return;

    layout();
    initializeEvents();
    await checkConnection();

    if (PAGE === "dashboard") {
        await loadDashboard();
    } else if (TABLES[PAGE]) {
        await loadRecords();
    }
}

document.addEventListener("DOMContentLoaded", initialize);
