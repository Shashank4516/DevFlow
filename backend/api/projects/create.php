<?php
require __DIR__ . '/../friends/_common.php';
cors_preflight_and_start('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];
$body = read_json_body();
$name = isset($body['name']) ? trim((string) $body['name']) : '';
if ($name === '') {
    http_response_code(400);
    json_ok(['error' => 'name_required']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';

projects_ensure_tables($conn);

mysqli_begin_transaction($conn);
try {
    $stmt = mysqli_prepare($conn, 'INSERT INTO projects (owner_id, name) VALUES (?, ?)');
    mysqli_stmt_bind_param($stmt, 'is', $me, $name);
    mysqli_stmt_execute($stmt);
    $projectId = (int) mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);

    $stmt2 = mysqli_prepare($conn, 'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, \'owner\')');
    mysqli_stmt_bind_param($stmt2, 'ii', $projectId, $me);
    mysqli_stmt_execute($stmt2);
    mysqli_stmt_close($stmt2);

    mysqli_commit($conn);
} catch (Throwable $e) {
    mysqli_rollback($conn);
    http_response_code(500);
    json_ok(['error' => 'create_failed']);
}

json_ok([
    'project' => [
        'id'       => $projectId,
        'name'     => $name,
        'owner_id' => $me,
    ],
]);
