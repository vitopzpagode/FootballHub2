
// As páginas HTML ficam na raiz do projeto; a API fica na pasta api/.
const API = "api/api.php";

const configuracoes = {
    clubes: {
        titulo: "clube",
        campos: [
            { nome: "nome", label: "Nome do clube", required: true },
            { nome: "sigla", label: "Sigla", required: true },
            { nome: "pais", label: "País", required: true },
            { nome: "cidade", label: "Cidade" },
            { nome: "estadio", label: "Estádio" },
            { nome: "data_fundacao", label: "Data de fundação", tipo: "date" }
        ]
    },

    jogadores: {
        titulo: "jogador",
        campos: [
            { nome: "nome", label: "Nome do jogador", required: true },
            { nome: "data_nascimento", label: "Data de nascimento", tipo: "date" },
            { nome: "nacionalidade", label: "Nacionalidade" },
            {
                nome: "posicao",
                label: "Posição",
                tipo: "select",
                placeholder: "Selecione uma posição",
                opcoes: ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Ponta", "Atacante"]
            },
            { nome: "numero_camisa", label: "Número da camisa", tipo: "number" },
            {
                nome: "clube_id",
                label: "Clube",
                tipo: "relacao",
                recurso: "clubes",
                placeholder: "Selecione um clube"
            }
        ]
    },

    competicoes: {
        titulo: "competição",
        campos: [
            { nome: "nome", label: "Nome da competição", required: true },
            {
                nome: "tipo",
                label: "Tipo",
                tipo: "select",
                placeholder: "Selecione um tipo de competição",
                opcoes: ["Liga", "Copa", "Campeonato", "Amistoso", "Outro"]
            },
            { nome: "pais", label: "País" }
        ]
    },

    temporadas: {
        titulo: "temporada",
        campos: [
            {
                nome: "competicao_id",
                label: "Competição",
                tipo: "relacao",
                recurso: "competicoes",
                placeholder: "Selecione uma competição",
                required: true
            },
            { nome: "nome", label: "Nome da temporada", required: true },
            { nome: "ano_inicio", label: "Ano inicial", tipo: "number", required: true },
            { nome: "ano_fim", label: "Ano final", tipo: "number", required: true }
        ]
    },

    partidas: {
        titulo: "partida",
        campos: [
            {
                nome: "temporada_id",
                label: "Temporada",
                tipo: "relacao",
                recurso: "temporadas",
                placeholder: "Selecione uma temporada",
                required: true
            },
            {
                nome: "mandante_id",
                label: "Clube mandante",
                tipo: "relacao",
                recurso: "clubes",
                placeholder: "Selecione o clube mandante",
                required: true
            },
            {
                nome: "visitante_id",
                label: "Clube visitante",
                tipo: "relacao",
                recurso: "clubes",
                placeholder: "Selecione o clube visitante",
                required: true
            },
            { nome: "data_hora", label: "Data e hora", tipo: "datetime-local", required: true },
            { nome: "estadio", label: "Estádio" },
            { nome: "gols_mandante", label: "Gols do mandante", tipo: "number", required: true },
            { nome: "gols_visitante", label: "Gols do visitante", tipo: "number", required: true },
            {
                nome: "status",
                label: "Status",
                tipo: "select",
                placeholder: "Selecione o status da partida",
                opcoes: ["Agendada", "Em andamento", "Finalizada", "Cancelada"]
            }
        ]
    },

    eventos_partida: {
        titulo: "evento",
        campos: [
            {
                nome: "partida_id",
                label: "Partida",
                tipo: "relacao",
                recurso: "partidas",
                placeholder: "Selecione uma partida",
                required: true
            },
            {
                nome: "jogador_id",
                label: "Jogador",
                tipo: "relacao",
                recurso: "jogadores",
                placeholder: "Selecione um jogador"
            },
            { nome: "minuto", label: "Minuto", tipo: "number" },
            {
                nome: "tipo",
                label: "Tipo de evento",
                tipo: "select",
                placeholder: "Selecione o tipo de evento",
                opcoes: ["Gol", "Gol contra", "Cartão amarelo", "Cartão vermelho", "Substituição", "Pênalti", "Outro"],
                required: true
            },
            { nome: "descricao", label: "Descrição" }
        ]
    },

    usuarios: {
        titulo: "usuário",
        campos: [
            { nome: "nome", label: "Nome completo", required: true },
            { nome: "email", label: "E-mail", tipo: "email", required: true },
            {
                nome: "senha",
                label: "Senha",
                tipo: "password",
                required: true
            },
            {
                nome: "perfil",
                label: "Perfil",
                tipo: "select",
                placeholder: "Selecione um perfil",
                opcoes: ["Administrador", "Usuário"],
                required: true
            }
        ]
    }
};

const elemento = id => document.getElementById(id);
const recurso = document.querySelector("[data-resource]")?.dataset.resource;
const config = configuracoes[recurso];

let registroEditando = null;
let registros = [];
const cacheRelacionamentos = {};

// Escapa textos antes de inserir valores em HTML.
function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function mostrarMensagem(texto, tipo = "sucesso") {
    const caixa = elemento("mensagem");

    if (!caixa) return;

    caixa.textContent = texto;
    caixa.className = `mensagem ${tipo}`;
}

/*
 * Lê a resposta como texto primeiro.
 * Assim, se o PHP devolver uma resposta vazia ou inválida,
 * mostramos uma mensagem mais útil em vez de apenas
 * "Unexpected end of JSON input".
 */
async function requisicao(url, opcoes = {}) {
    let resposta;

    try {
        resposta = await fetch(url, {
            ...opcoes,
            headers: {
                ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
                ...opcoes.headers
            }
        });
    } catch (erro) {
        throw new Error(
            "Não foi possível acessar o servidor. Confere se o Apache está ligado no XAMPP e se abriste o site pelo localhost."
        );
    }

    const texto = await resposta.text();

    if (!texto.trim()) {
        const metodo = (opcoes.method || "GET").toUpperCase();
        console.error("Resposta vazia da API:", {
            url: resposta.url,
            metodo,
            status: resposta.status
        });

        throw new Error(
            `A URL ${resposta.url} respondeu HTTP ${resposta.status} sem conteúdo (método ${metodo}). Abra o site pelo Apache em http://localhost/FootballHub2/clubes.html, não pelo Live Server.`
        );
    }

    let dados;

    try {
        dados = JSON.parse(texto);
    } catch (erro) {
        console.error("Resposta não JSON recebida do servidor:", texto);

        throw new Error(
            "O PHP não retornou JSON válido. Abre F12 > Network/Rede, clica na requisição api.php e confere a resposta."
        );
    }

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(
            dados.mensagem || `Erro do servidor (HTTP ${resposta.status}).`
        );
    }

    return dados;
}

async function listarRecurso(nome) {
    const dados = await requisicao(
        `${API}?recurso=${encodeURIComponent(nome)}`
    );

    if (!Array.isArray(dados.registros)) {
        throw new Error(`A API não retornou uma lista válida para ${nome}.`);
    }

    return dados.registros;
}

function criarOpcao(valor, texto) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = texto;
    return option;
}

async function carregarCampos() {
    const container = elemento("campos-form");
    container.innerHTML = "";

    for (const campo of config.campos) {
        const wrapper = document.createElement("div");
        wrapper.className = "campo";

        const label = document.createElement("label");
        label.htmlFor = campo.nome;
        label.textContent = campo.label;

        let input;

        if (campo.tipo === "select" || campo.tipo === "relacao") {
            input = document.createElement("select");

            input.appendChild(
                criarOpcao("", campo.placeholder || "Selecione uma opção")
            );

            if (campo.tipo === "relacao") {
                try {
                    const opcoes = await listarRecurso(campo.recurso);

                    opcoes.forEach(opcao => {
                        input.appendChild(
                            criarOpcao(opcao.id, opcao.nome)
                        );
                    });
                } catch (erro) {
                    console.error(`Erro ao carregar ${campo.recurso}:`, erro);
                    mostrarMensagem(
                        `Não foi possível carregar ${campo.label.toLowerCase()}: ${erro.message}`,
                        "erro"
                    );
                }
            } else {
                campo.opcoes.forEach(opcao => {
                    input.appendChild(criarOpcao(opcao, opcao));
                });
            }
        } else {
            input = document.createElement("input");
            input.type = campo.tipo || "text";
        }

        input.id = campo.nome;
        input.name = campo.nome;
        input.required = Boolean(campo.required);

        if (campo.tipo === "number") {
            input.min = "0";
        }

        if (campo.nome === "senha") {
            input.autocomplete = "new-password";
            input.placeholder = "Mínimo de 6 caracteres";
        }

        wrapper.append(label, input);
        container.appendChild(wrapper);
    }
}

async function carregarRelacionamentos() {
    const recursos = new Set(
        config.campos
            .filter(campo => campo.tipo === "relacao")
            .map(campo => campo.recurso)
    );

    for (const nome of recursos) {
        try {
            cacheRelacionamentos[nome] = await listarRecurso(nome);
        } catch (erro) {
            cacheRelacionamentos[nome] = [];
            console.error(`Erro ao carregar relacionamento ${nome}:`, erro);
        }
    }
}

function valorFormatado(valor, campo) {
    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    if (campo.tipo === "date") {
        const partes = String(valor).slice(0, 10).split("-");

        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
    }

    if (campo.tipo === "datetime-local") {
        return String(valor).replace("T", " ").slice(0, 16);
    }

    if (campo.tipo === "relacao") {
        const relacionados = cacheRelacionamentos[campo.recurso] || [];
        const encontrado = relacionados.find(
            registro => String(registro.id) === String(valor)
        );

        return encontrado ? encontrado.nome : valor;
    }

    return valor;
}

async function carregarTabela() {
    const head = elemento("tabela-head");
    const body = elemento("tabela-body");

    try {
        await carregarRelacionamentos();
        registros = await listarRecurso(recurso);

        head.innerHTML = `
            <tr>
                ${config.campos.map(campo => `<th>${escapar(campo.label)}</th>`).join("")}
                <th>Ações</th>
            </tr>
        `;

        if (registros.length === 0) {
            body.innerHTML = `
                <tr>
                    <td class="vazio" colspan="${config.campos.length + 1}">
                        Nenhum registro cadastrado.
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = registros.map(registro => `
            <tr>
                ${config.campos.map(campo => `
                    <td>${escapar(
            campo.nome === "senha"
                ? "••••••••"
                : valorFormatado(registro[campo.nome], campo)
        )}</td>
                `).join("")}
                <td>
                    <div class="acoes-tabela">
                        <button type="button" class="pequeno" data-editar="${escapar(registro.id)}">
                            Editar
                        </button>
                        <button type="button" class="pequeno perigo" data-excluir="${escapar(registro.id)}">
                            Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    } catch (erro) {
        mostrarMensagem(`Erro ao carregar os registros: ${erro.message}`, "erro");
        console.error(erro);
    }
}

function limparFormulario() {
    registroEditando = null;
    elemento("form-registro").reset();

    elemento("titulo-form").textContent = `Cadastrar ${config.titulo}`;
    elemento("btn-salvar").textContent = `Cadastrar ${config.titulo}`;
    elemento("btn-cancelar").hidden = true;

    const senha = elemento("senha");

    if (senha) {
        senha.required = true;
        senha.placeholder = "Mínimo de 6 caracteres";
    }
}

function preencherFormulario(id) {
    const registro = registros.find(
        item => String(item.id) === String(id)
    );

    if (!registro) return;

    registroEditando = registro.id;

    elemento("titulo-form").textContent = `Editar ${config.titulo}`;
    elemento("btn-salvar").textContent = "Salvar alterações";
    elemento("btn-cancelar").hidden = false;

    config.campos.forEach(campo => {
        const input = elemento(campo.nome);

        if (!input) return;

        if (campo.nome === "senha") {
            input.value = "";
            input.required = false;
            input.placeholder = "Deixe vazio para manter a senha atual";
            return;
        }

        let valor = registro[campo.nome] ?? "";

        if (campo.tipo === "datetime-local" && valor) {
            valor = String(valor).replace(" ", "T").slice(0, 16);
        }

        input.value = valor;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function salvarRegistro(evento) {
    evento.preventDefault();

    const botao = elemento("btn-salvar");
    botao.disabled = true;

    try {
        const dados = {};

        for (const campo of config.campos) {
            const input = elemento(campo.nome);
            let valor = input.value.trim();

            if (campo.tipo === "number" && valor !== "") {
                valor = Number(valor);
            }

            // Se estiver editando e a senha ficar vazia,
            // não envia o campo para manter a senha existente.
            if (campo.nome === "senha" && registroEditando && !valor) {
                continue;
            }

            dados[campo.nome] = valor === "" ? null : valor;
        }

        if (
            recurso === "partidas" &&
            String(dados.mandante_id) === String(dados.visitante_id)
        ) {
            throw new Error(
                "O clube mandante e o visitante precisam ser diferentes."
            );
        }

        const corpo = {
            acao: registroEditando ? "atualizar" : "criar",
            recurso,
            dados
        };

        if (registroEditando) {
            corpo.id = registroEditando;
        }

        await requisicao(API, {
            method: "POST",
            body: JSON.stringify(corpo)
        });

        mostrarMensagem(
            registroEditando
                ? "Registro atualizado com sucesso!"
                : "Registro cadastrado com sucesso!"
        );

        limparFormulario();
        await carregarCampos();
        await carregarTabela();

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
        console.error("Erro ao salvar:", erro);
    } finally {
        botao.disabled = false;
    }
}

async function excluirRegistro(id) {
    if (!window.confirm("Tem certeza de que deseja excluir este registro?")) {
        return;
    }

    try {
        await requisicao(API, {
            method: "POST",
            body: JSON.stringify({
                acao: "excluir",
                recurso,
                id
            })
        });

        mostrarMensagem("Registro excluído com sucesso!");

        if (String(registroEditando) === String(id)) {
            limparFormulario();
        }

        await carregarTabela();

    } catch (erro) {
        mostrarMensagem(`Não foi possível excluir: ${erro.message}`, "erro");
        console.error("Erro ao excluir:", erro);
    }
}

async function iniciar() {
    if (!config) return;

    elemento("form-registro").addEventListener("submit", salvarRegistro);
    elemento("btn-cancelar").addEventListener("click", limparFormulario);

    elemento("tabela-body").addEventListener("click", evento => {
        const botaoEditar = evento.target.closest("[data-editar]");
        const botaoExcluir = evento.target.closest("[data-excluir]");

        if (botaoEditar) {
            preencherFormulario(botaoEditar.dataset.editar);
        }

        if (botaoExcluir) {
            excluirRegistro(botaoExcluir.dataset.excluir);
        }
    });

    try {
        await carregarCampos();
        await carregarTabela();
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
        console.error(erro);
    }
}

document.addEventListener("DOMContentLoaded", iniciar);
