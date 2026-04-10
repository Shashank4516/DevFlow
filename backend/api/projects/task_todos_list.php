<?php
require __DIR__ . '/../friends/_common.php';
cors_preflight_and_start('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];
$projectId = isset($_GET['project_id']) ? (int) $_GET['project_id'] : 0;
$taskId = isset($_GET['task_id']) ? (int) $_GET['task_id'] : 0;
if ($projectId <= 0 || $taskId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'project_id_and_task_id_required']);
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

$stmt2 = mysqli_prepare($conn, '
    SELECT id, text, is_done, sort_order
    FROM project_task_todos
    WHERE task_id = ?
    ORDER BY sort_order, id
');
mysqli_stmt_bind_param($stmt2, 'i', $taskId);
mysqli_stmt_execute($stmt2);
$res2 = mysqli_stmt_get_result($stmt2);

$todos = [];
while ($t = mysqli_fetch_assoc($res2)) {
    $todos[] = [
        'id' => (string) $t['id'],
        'text' => (string) $t['text'],
        'is_done' => (bool) ((int) $t['is_done']),
    ];
}
mysqli_stmt_close($stmt2);

tasks_sync_progress_from_todos($conn, $projectId, $taskId);

// Return the recomputed totals for the UI.
$stmt3 = mysqli_prepare($conn, 'SELECT progress_done, progress_total FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
mysqli_stmt_bind_param($stmt3, 'ii', $taskId, $projectId);
mysqli_stmt_execute($stmt3);
$res3 = mysqli_stmt_get_result($stmt3);
$p = mysqli_fetch_assoc($res3) ?: ['progress_done' => 0, 'progress_total' => 4];
mysqli_stmt_close($stmt3);

json_ok([
    'todos' => $todos,
    'progress' => [
        'done' => (int) $p['progress_done'],
        'total' => max(1, (int) $p['progress_total']),
    ],
]);

