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
$title = isset($body['title']) ? trim((string) $body['title']) : '';
$description = isset($body['description']) ? trim((string) $body['description']) : '';
$columnKey = isset($body['column_key']) ? trim((string) $body['column_key']) : 'todo';

$allowed = ['todo', 'inprogress', 'review', 'complete'];
if ($projectId <= 0 || $title === '' || !in_array($columnKey, $allowed, true)) {
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

$maxStmt = mysqli_prepare($conn, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM project_tasks WHERE project_id = ? AND column_key = ?');
mysqli_stmt_bind_param($maxStmt, 'is', $projectId, $columnKey);
mysqli_stmt_execute($maxStmt);
$maxRes = mysqli_stmt_get_result($maxStmt);
$maxRow = mysqli_fetch_assoc($maxRes);
$nextOrder = (int) ($maxRow['m'] ?? 0) + 1;
mysqli_stmt_close($maxStmt);

$badgesJson = json_encode([]);
$progressDone = 0;
$progressTotal = 4;
$files = 0;
$comments = 0;

$ins = mysqli_prepare($conn, '
    INSERT INTO project_tasks
    (project_id, title, description, column_key, sort_order, progress_done, progress_total, files_count, comments_count, badges_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');
mysqli_stmt_bind_param(
    $ins,
    'isssiiiiis',
    $projectId,
    $title,
    $description,
    $columnKey,
    $nextOrder,
    $progressDone,
    $progressTotal,
    $files,
    $comments,
    $badgesJson
);
mysqli_stmt_execute($ins);
$newId = (int) mysqli_insert_id($conn);
mysqli_stmt_close($ins);

json_ok([
    'task' => [
        'id'          => (string) $newId,
        'title'       => $title,
        'description' => $description,
        'column_key'  => $columnKey,
        'progress'    => ['done' => $progressDone, 'total' => $progressTotal],
        'files'       => $files,
        'comments'    => $comments,
        'badges'      => [],
    ],
]);
