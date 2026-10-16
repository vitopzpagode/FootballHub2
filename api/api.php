
<?php

// A API deve responder em JSON, inclusive quando ocorrer um erro.
ini_set("display_errors", "0");
ini_set("log_errors", "1");

header("Content-Type: application/json; charset=utf-8");

ob_start();

function responder($dados, $status = 200) {
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($status);
    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

// Converte erros fatais em uma resposta JSON quando possível.
register_shutdown_function(function () {
    $erro = error_get_last();

    if ($erro && in_array($erro["type"], [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR
    ], true)) {
        error_log(
            "Erro fatal na API: " .
            $erro["message"] .
            " em " .
            $erro["file"] .
            ":" .
            $erro["line"]
        );

        if (!headers_sent()) {
            if (ob_get_length()) {
                ob_clean();
            }

            http_response_code(500);
            header("Content-Type: application/json; charset=utf-8");
            echo json_encode([
                "sucesso" => false,
                "mensagem" => "O PHP encontrou um erro interno. Confira o log de erros do Apache."
            ], JSON_UNESCAPED_UNICODE);
        }
    }
});

set_exception_handler(function ($erro) {
    error_log("Exceção não tratada na API: " . $erro->getMessage());

    responder([
        "sucesso" => false,
        "mensagem" => "Ocorreu um erro interno no servidor."
    ], 500);
});

require_once __DIR__ . "/conexao.php";

$estrutura = [
    "clubes" => [
        "campos" => [
            "nome", "sigla", "pais", "cidade", "estadio", "data_fundacao"
        ],
        "obrigatorios" => ["nome", "sigla", "pais"]
    ],

    "jogadores" => [
        "campos" => [
            "nome", "data_nascimento", "nacionalidade",
            "posicao", "numero_camisa", "clube_id"
        ],
        "obrigatorios" => ["nome"]
    ],

    "competicoes" => [
        "campos" => ["nome", "tipo", "pais"],
        "obrigatorios" => ["nome"]
    ],

    "temporadas" => [
        "campos" => [
            "competicao_id", "nome", "ano_inicio", "ano_fim"
        ],
        "obrigatorios" => [
            "competicao_id", "nome", "ano_inicio", "ano_fim"
        ]
    ],

    "partidas" => [
        "campos" => [
            "temporada_id", "mandante_id", "visitante_id",
            "data_hora", "estadio", "gols_mandante",
            "gols_visitante", "status"
        ],
        "obrigatorios" => [
            "temporada_id", "mandante_id", "visitante_id",
            "data_hora", "gols_mandante", "gols_visitante"
        ]
    ],

    "eventos_partida" => [
        "campos" => [
            "partida_id", "jogador_id", "minuto", "tipo", "descricao"
        ],
        "obrigatorios" => ["partida_id", "tipo"]
    ],

    "usuarios" => [
        "campos" => ["nome", "email", "senha", "perfil"],
        "obrigatorios" => ["nome", "email", "senha", "perfil"]
    ]
];

function validarRecurso($recurso, $estrutura) {
    if (!is_string($recurso) || !isset($estrutura[$recurso])) {
        responder([
            "sucesso" => false,
            "mensagem" => "Recurso inválido."
        ], 400);
    }
}

function validarId($valor) {
    $id = filter_var($valor, FILTER_VALIDATE_INT);

    if (!$id || $id < 1) {
        responder([
            "sucesso" => false,
            "mensagem" => "ID inválido."
        ], 400);
    }

    return $id;
}

function validarDados($recurso, $dados, $estrutura, $acao) {
    if (!is_array($dados)) {
        responder([
            "sucesso" => false,
            "mensagem" => "Os dados enviados são inválidos."
        ], 400);
    }

    $camposPermitidos = $estrutura[$recurso]["campos"];

    foreach ($dados as $campo => $valor) {
        if (!in_array($campo, $camposPermitidos, true)) {
            responder([
                "sucesso" => false,
                "mensagem" => "Campo não permitido: " . $campo
            ], 400);
        }
    }

    foreach ($estrutura[$recurso]["obrigatorios"] as $campo) {
        if ($acao === "criar") {
            if (
                !array_key_exists($campo, $dados) ||
                $dados[$campo] === null ||
                $dados[$campo] === ""
            ) {
                responder([
                    "sucesso" => false,
                    "mensagem" => "Preencha o campo obrigatório: " . $campo . "."
                ], 400);
            }
        } elseif (
            array_key_exists($campo, $dados) &&
            ($dados[$campo] === null || $dados[$campo] === "")
        ) {
            responder([
                "sucesso" => false,
                "mensagem" => "O campo " . $campo . " não pode ficar vazio."
            ], 400);
        }
    }

    if (
        $recurso === "usuarios" &&
        isset($dados["email"]) &&
        !filter_var($dados["email"], FILTER_VALIDATE_EMAIL)
    ) {
        responder([
            "sucesso" => false,
            "mensagem" => "Informe um e-mail válido."
        ], 400);
    }

    if (
        $recurso === "usuarios" &&
        $acao === "criar" &&
        isset($dados["senha"]) &&
        strlen($dados["senha"]) < 6
    ) {
        responder([
            "sucesso" => false,
            "mensagem" => "A senha deve ter pelo menos 6 caracteres."
        ], 400);
    }

    if (
        $recurso === "usuarios" &&
        $acao === "atualizar" &&
        isset($dados["senha"]) &&
        strlen($dados["senha"]) < 6
    ) {
        responder([
            "sucesso" => false,
            "mensagem" => "A nova senha deve ter pelo menos 6 caracteres."
        ], 400);
    }

    if ($recurso === "partidas") {
        $mandante = $dados["mandante_id"] ?? null;
        $visitante = $dados["visitante_id"] ?? null;

        if (
            $mandante !== null &&
            $visitante !== null &&
            (string)$mandante === (string)$visitante
        ) {
            responder([
                "sucesso" => false,
                "mensagem" => "O clube mandante e o visitante precisam ser diferentes."
            ], 400);
        }
    }
}

try {
    // LISTAGEM
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $recurso = $_GET["recurso"] ?? "";
        validarRecurso($recurso, $estrutura);

        $stmt = $pdo->query(
            "SELECT * FROM `" . $recurso . "` ORDER BY id DESC"
        );

        $registros = $stmt->fetchAll();

        // Não envia hashes de senhas ao navegador.
        if ($recurso === "usuarios") {
            foreach ($registros as &$registro) {
                unset($registro["senha"]);
            }
            unset($registro);
        }

        responder([
            "sucesso" => true,
            "registros" => $registros
        ]);
    }

    // Só aceitamos GET e POST.
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        responder([
            "sucesso" => false,
            "mensagem" => "Método HTTP não permitido."
        ], 405);
    }

    $textoEntrada = file_get_contents("php://input");
    $entrada = json_decode($textoEntrada, true);

    if (!is_array($entrada) || json_last_error() !== JSON_ERROR_NONE) {
        responder([
            "sucesso" => false,
            "mensagem" => "O corpo da solicitação não contém JSON válido."
        ], 400);
    }

    $acao = $entrada["acao"] ?? "";
    $recurso = $entrada["recurso"] ?? "";

    validarRecurso($recurso, $estrutura);

    // EXCLUSÃO
    if ($acao === "excluir") {
        $id = validarId($entrada["id"] ?? null);

        $stmt = $pdo->prepare(
            "DELETE FROM `" . $recurso . "` WHERE id = ?"
        );
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            responder([
                "sucesso" => false,
                "mensagem" => "Registro não encontrado."
            ], 404);
        }

        responder([
            "sucesso" => true,
            "mensagem" => "Registro excluído com sucesso."
        ]);
    }

    if (!in_array($acao, ["criar", "atualizar"], true)) {
        responder([
            "sucesso" => false,
            "mensagem" => "Ação inválida."
        ], 400);
    }

    $dados = $entrada["dados"] ?? [];
    validarDados($recurso, $dados, $estrutura, $acao);

    // CADASTRO
    if ($acao === "criar") {
        if ($recurso === "usuarios") {
            $dados["senha"] = password_hash(
                $dados["senha"],
                PASSWORD_DEFAULT
            );
        }

        $campos = array_keys($dados);

        if (count($campos) === 0) {
            responder([
                "sucesso" => false,
                "mensagem" => "Nenhum dado foi enviado."
            ], 400);
        }

        $nomes = implode(
            ", ",
            array_map(fn($campo) => "`" . $campo . "`", $campos)
        );

        $marcadores = implode(
            ", ",
            array_fill(0, count($campos), "?")
        );

        $sql = "INSERT INTO `" . $recurso . "` ($nomes) VALUES ($marcadores)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($dados));

        responder([
            "sucesso" => true,
            "mensagem" => "Registro cadastrado com sucesso.",
            "id" => $pdo->lastInsertId()
        ], 201);
    }

    // ATUALIZAÇÃO
    $id = validarId($entrada["id"] ?? null);

    if ($recurso === "usuarios" && !empty($dados["senha"])) {
        $dados["senha"] = password_hash(
            $dados["senha"],
            PASSWORD_DEFAULT
        );
    }

    if (count($dados) === 0) {
        responder([
            "sucesso" => false,
            "mensagem" => "Nenhum campo foi enviado para atualização."
        ], 400);
    }

    $partes = [];

    foreach (array_keys($dados) as $campo) {
        $partes[] = "`" . $campo . "` = ?";
    }

    $sql = "UPDATE `" . $recurso . "` SET " .
        implode(", ", $partes) .
        " WHERE id = ?";

    $valores = array_values($dados);
    $valores[] = $id;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($valores);

    // Confere se o registro existe, inclusive quando nenhum valor mudou.
    $verificar = $pdo->prepare(
        "SELECT id FROM `" . $recurso . "` WHERE id = ?"
    );
    $verificar->execute([$id]);

    if (!$verificar->fetch()) {
        responder([
            "sucesso" => false,
            "mensagem" => "Registro não encontrado."
        ], 404);
    }

    responder([
        "sucesso" => true,
        "mensagem" => "Registro atualizado com sucesso."
    ]);

} catch (PDOException $erro) {
    error_log(
        "Erro PDO na API FootballHub: " .
        $erro->getMessage()
    );

    if ($erro->getCode() === "23000") {
        responder([
            "sucesso" => false,
            "mensagem" => "Não foi possível concluir. Verifique se o e-mail já existe ou se há registros relacionados."
        ], 409);
    }

    responder([
        "sucesso" => false,
        "mensagem" => "Erro ao consultar o banco. Confira os nomes das tabelas e colunas e as relações entre elas."
    ], 500);

} catch (Throwable $erro) {
    error_log(
        "Erro na API FootballHub: " .
        $erro->getMessage()
    );

    responder([
        "sucesso" => false,
        "mensagem" => "Ocorreu um erro interno no servidor. Confira o log de erros do Apache."
    ], 500);
}
