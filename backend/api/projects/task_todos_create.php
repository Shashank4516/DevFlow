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
$text = isset($body['text']) ? trim((string) $body['text']) : '';
if ($projectId <= 0 || $taskId <= 0 || $text === '') {
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

$maxStmt = mysqli_prepare($conn, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM project_task_todos WHERE task_id = ?');
mysqli_stmt_bind_param($maxStmt, 'i', $taskId);
mysqli_stmt_execute($maxStmt);
$maxRes = mysqli_stmt_get_result($maxStmt);
$maxRow = mysqli_fetch_assoc($maxRes);
$nextOrder = (int) ($maxRow['m'] ?? 0) + 1;
mysqli_stmt_close($maxStmt);

$ins = mysqli_prepare($conn, 'INSERT INTO project_task_todos (task_id, text, is_done, sort_order) VALUES (?, ?, 0, ?)');
mysqli_stmt_bind_param($ins, 'isi', $taskId, $text, $nextOrder);
mysqli_stmt_execute($ins);
$newId = (string) mysqli_insert_id($conn);
mysqli_stmt_close($ins);

tasks_sync_progress_from_todos($conn, $projectId, $taskId);

// Return updated totals.
$stmt3 = mysqli_prepare($conn, 'SELECT progress_done, progress_total FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
mysqli_stmt_bind_param($stmt3, 'ii', $taskId, $projectId);
mysqli_stmt_execute($stmt3);
$res3 = mysqli_stmt_get_result($stmt3);
$p = mysqli_fetch_assoc($res3) ?: ['progress_done' => 0, 'progress_total' => 4];
mysqli_stmt_close($stmt3);

json_ok([
    'todo' => [
        'id' => $newId,
        'text' => $text,
        'is_done' => false,
    ],
    'progress' => [
        'done' => (int) $p['progress_done'],
        'total' => max(1, (int) $p['progress_total']),
    ],
]);

