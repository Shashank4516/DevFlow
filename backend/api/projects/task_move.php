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
$projectId = isset($body['project_id']) ? (int) $body['project_id'] : 0;
$taskId = isset($body['task_id']) ? (int) $body['task_id'] : 0;
$columnKey = isset($body['column_key']) ? trim((string) $body['column_key']) : '';

$allowed = ['todo', 'inprogress', 'review', 'complete'];
if ($projectId <= 0 || $taskId <= 0 || !in_array($columnKey, $allowed, true)) {
    http_response_code(400);
    json_ok(['error' => 'invalid_payload']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

$stmt = mysqli_prepare($conn, 'SELECT id FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
mysqli_stmt_bind_param($stmt, 'ii', $taskId, $projectId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$row = mysqli_fetch_assoc($res);
mysqli_stmt_close($stmt);

if (!$row) {
    http_response_code(404);
    json_ok(['error' => 'task_not_found']);
}

$maxStmt = mysqli_prepare($conn, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM project_tasks WHERE project_id = ? AND column_key = ?');
mysqli_stmt_bind_param($maxStmt, 'is', $projectId, $columnKey);
mysqli_stmt_execute($maxStmt);
$maxRes = mysqli_stmt_get_result($maxStmt);
$maxRow = mysqli_fetch_assoc($maxRes);
$nextOrder = (int) ($maxRow['m'] ?? 0) + 1;
mysqli_stmt_close($maxStmt);

$upd = mysqli_prepare($conn, 'UPDATE project_tasks SET column_key = ?, sort_order = ? WHERE id = ? AND project_id = ?');
mysqli_stmt_bind_param($upd, 'siii', $columnKey, $nextOrder, $taskId, $projectId);
mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

json_ok(['ok' => true]);
