
<?php
declare(strict_types=1);

require_once __DIR__ . '/conexao.php';

header('Content-Type: application/json; charset=utf-8');

$schema = [
    'clubes' => [
        'table' => 'clubes',
        'pk' => 'clube_id',
        'columns' => [
            'nome', 'pais', 'cidade', 'estadio', 'ano_fundacao', 'escudo_url'
        ]
    ],
    'jogadores' => [
        'table' => 'jogadores',
        'pk' => 'jogador_id',
        'columns' => [
            'nome', 'clube_id', 'posicao', 'numero_camisa',
            'nacionalidade', 'data_nascimento', 'altura', 'peso',
            'pe_dominante', 'valor_mercado', 'status'
        ]
    ],
    'competicoes' => [
        'table' => 'competicoes',
        'pk' => 'competicao_id',
        'columns' => [
            'nome', 'tipo', 'pais', 'organizacao', 'descricao'
        ]
    ],
    'temporadas' => [
        'table' => 'temporadas',
        'pk' => 'temporada_id',
        'columns' => [
            'competicao_id', 'nome', 'data_inicio', 'data_fim', 'status'
        ]
    ],
    'partidas' => [
        'table' => 'partidas',
        'pk' => 'partida_id',
        'columns' => [
            'temporada_id', 'competicao_id', 'rodada',
            'mandante_id', 'visitante_id', 'data_hora', 'estadio',
            'gols_mandante', 'gols_visitante', 'status'
        ]
    ],
    'eventos_partida' => [
        'table' => 'eventos_partida',
        'pk' => 'evento_id',
        'columns' => [
            'partida_id', 'jogador_id', 'jogador_substituido_id',
            'tipo', 'minuto', 'descricao'
        ]
    ],
    'usuarios' => [
        'table' => 'usuarios',
        'pk' => 'usuario_id',
        'columns' => [
            'nome', 'email', 'senha', 'perfil'
        ]
    ]
];

function respond(array $data, int $status = 200): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

function getInput(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        respond([
            'success' => false,
            'message' => 'O corpo da solicitação não contém JSON válido.'
        ], 400);
    }

    return $data;
}

function getResource(array $input, array $schema): array
{
    $resource = $input['resource'] ?? '';

    if (!is_string($resource) || !isset($schema[$resource])) {
        respond([
            'success' => false,
            'message' => 'Seção inválida ou não permitida.'
        ], 400);
    }

    return [$resource, $schema[$resource]];
}

function getRecordData(array $input, array $config): array
{
    $data = $input['data'] ?? null;

    if (!is_array($data)) {
        respond([
            'success' => false,
            'message' => 'Os dados do formulário não foram recebidos corretamente.'
        ], 400);
    }

    $clean = [];

    foreach ($config['columns'] as $column) {
        if (array_key_exists($column, $data)) {
            $value = $data[$column];

            if (is_array($value) || is_object($value)) {
                respond([
                    'success' => false,
                    'message' => "Valor inválido para o campo {$column}."
                ], 400);
            }

            $clean[$column] = $value === '' ? null : $value;
        }
    }

    if (!$clean) {
        respond([
            'success' => false,
            'message' => 'Nenhum campo válido foi enviado.'
        ], 400);
    }

    return $clean;
}

try {
    $input = getInput();
    $action = $input['action'] ?? '';

    if ($action === 'health') {
        $pdo->query('SELECT 1');

        respond([
            'success' => true,
            'message' => 'Conexão com o banco estabelecida.'
        ]);
    }

    [$resource, $config] = getResource($input, $schema);

    $table = $config['table'];
    $pk = $config['pk'];

    if ($action === 'list') {
        $stmt = $pdo->query("SELECT * FROM `{$table}` ORDER BY `{$pk}` DESC");

        respond([
            'success' => true,
            'data' => $stmt->fetchAll()
        ]);
    }

    if ($action === 'create') {
        $data = getRecordData($input, $config);

        // O hash é compatível com password_verify() no PHP.
        // Caso seu sistema de login use outra estratégia, alinhe os dois lados.
        if ($resource === 'usuarios' && !empty($data['senha'])) {
            $data['senha'] = password_hash(
                (string)$data['senha'],
                PASSWORD_DEFAULT
            );
        }

        $columns = array_keys($data);
        $quotedColumns = array_map(
            fn($column) => "`{$column}`",
            $columns
        );
        $placeholders = array_fill(0, count($columns), '?');

        $sql = "INSERT INTO `{$table}` (" .
            implode(', ', $quotedColumns) .
            ') VALUES (' .
            implode(', ', $placeholders) .
            ')';

        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($data));

        respond([
            'success' => true,
            'message' => 'Cadastro realizado com sucesso.',
            'id' => $pdo->lastInsertId()
        ], 201);
    }

    if ($action === 'update') {
        $id = $input['id'] ?? $input[$pk] ?? null;

        if (!is_scalar($id) || (string)$id === '') {
            respond([
                'success' => false,
                'message' => 'ID do registro não informado.'
            ], 400);
        }

        $data = getRecordData($input, $config);

        // Senha em branco significa manter a senha atual.
        if ($resource === 'usuarios') {
            if (empty($data['senha'])) {
                unset($data['senha']);
            } else {
                $data['senha'] = password_hash(
                    (string)$data['senha'],
                    PASSWORD_DEFAULT
                );
            }
        }

        if (!$data) {
            respond([
                'success' => false,
                'message' => 'Nenhuma alteração foi informada.'
            ], 400);
        }

        $assignments = [];

        foreach (array_keys($data) as $column) {
            $assignments[] = "`{$column}` = ?";
        }

        $sql = "UPDATE `{$table}` SET " .
            implode(', ', $assignments) .
            " WHERE `{$pk}` = ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([...array_values($data), $id]);

        respond([
            'success' => true,
            'message' => 'Registro atualizado com sucesso.'
        ]);
    }

    if ($action === 'delete') {
        $id = $input['id'] ?? $input[$pk] ?? null;

        if (!is_scalar($id) || (string)$id === '') {
            respond([
                'success' => false,
                'message' => 'ID do registro não informado.'
            ], 400);
        }

        $stmt = $pdo->prepare(
            "DELETE FROM `{$table}` WHERE `{$pk}` = ?"
        );
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respond([
                'success' => false,
                'message' => 'Registro não encontrado ou já excluído.'
            ], 404);
        }

        respond([
            'success' => true,
            'message' => 'Registro excluído com sucesso.'
        ]);
    }

    respond([
        'success' => false,
        'message' => 'Ação não reconhecida.'
    ], 400);

} catch (PDOException $e) {
    error_log('FootballHub PDO: ' . $e->getMessage());

    $message = 'Erro no banco de dados. Verifique os campos obrigatórios, os tipos e os relacionamentos.';

    if ($e->getCode() === '23000') {
        $message = 'Não foi possível salvar: há um relacionamento inválido ou um valor duplicado.';
    }

    respond([
        'success' => false,
        'message' => $message
    ], 500);

} catch (Throwable $e) {
    error_log('FootballHub: ' . $e->getMessage());

    respond([
        'success' => false,
        'message' => 'Ocorreu um erro interno ao processar a solicitação.'
    ], 500);
}
