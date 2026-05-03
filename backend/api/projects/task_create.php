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
$rawAssignee = $body['assignee_user_id'] ?? null;
$assigneeId = 0;
if ($rawAssignee !== null && $rawAssignee !== '' && (int) $rawAssignee > 0) {
    $assigneeId = (int) $rawAssignee;
}

$allowed = ['todo', 'inprogress', 'review', 'complete'];
if ($projectId <= 0 || $title === '' || !in_array($columnKey, $allowed, true)) {
    http_response_code(400);
    json_ok(['error' => 'invalid_payload']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/task_helpers.php';

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

if ($assigneeId > 0 && !project_is_member($conn, $projectId, $assigneeId)) {
    http_response_code(400);
    json_ok(['error' => 'invalid_assignee']);
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
$progressTotal = 0;
$files = 0;
$comments = 0;

$ins = mysqli_prepare($conn, '
    INSERT INTO project_tasks
    (project_id, title, description, column_key, sort_order, progress_done, progress_total, files_count, comments_count, badges_json, assignee_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, 0))
');
mysqli_stmt_bind_param(
    $ins,
    'isssiiiiisi',
    $projectId,
    $title,
    $description,
    $columnKey,
    $nextOrder,
    $progressDone,
    $progressTotal,
    $files,
    $comments,
    $badgesJson,
    $assigneeId
);
mysqli_stmt_execute($ins);
$newId = (int) mysqli_insert_id($conn);
mysqli_stmt_close($ins);

$sel = mysqli_prepare($conn, '
    SELECT t.id, t.title, t.description, t.column_key, t.progress_done, t.progress_total,
           t.files_count, t.comments_count, t.badges_json,
           t.assignee_user_id, au.name AS assignee_name, au.profile_image AS assignee_profile_image
    FROM project_tasks t
    LEFT JOIN users au ON au.id = t.assignee_user_id
    WHERE t.id = ? AND t.project_id = ?
    LIMIT 1
');
mysqli_stmt_bind_param($sel, 'ii', $newId, $projectId);
mysqli_stmt_execute($sel);
$tr = mysqli_stmt_get_result($sel);
$taskRow = $tr ? mysqli_fetch_assoc($tr) : null;
mysqli_stmt_close($sel);

$badgesOut = [];
if ($taskRow && !empty($taskRow['badges_json'])) {
    $decoded = json_decode((string) $taskRow['badges_json'], true);
    if (is_array($decoded)) {
        foreach ($decoded as $b) {
            if (is_array($b) && isset($b['label'])) {
                $badgesOut[] = ['label' => (string) $b['label']];
            }
        }
    }
}

json_ok([
    'task' => [
        'id'          => (string) $newId,
        'title'       => (string) ($taskRow['title'] ?? $title),
        'description' => (string) ($taskRow['description'] ?? $description),
        'column_key'  => (string) ($taskRow['column_key'] ?? $columnKey),
        'progress'    => [
            'done'  => (int) ($taskRow['progress_done'] ?? $progressDone),
            'total' => (int) ($taskRow['progress_total'] ?? $progressTotal),
        ],
        'files'       => (int) ($taskRow['files_count'] ?? $files),
        'comments'    => (int) ($taskRow['comments_count'] ?? $comments),
        'badges'      => $badgesOut,
        'assignee'    => $taskRow ? task_assignee_from_user_row($taskRow) : null,
    ],
]);
