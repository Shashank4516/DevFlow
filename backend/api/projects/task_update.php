<?php
/**
 * Update a task (assignee, title, description).
 * POST { project_id, task_id, assignee_user_id?: null|int, title?: string, description?: string }
 * assignee must be a project member or null to unassign.
 */
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

if ($projectId <= 0 || $taskId <= 0) {
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

$chk2 = mysqli_prepare($conn, 'SELECT 1 AS x FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
mysqli_stmt_bind_param($chk2, 'ii', $taskId, $projectId);
mysqli_stmt_execute($chk2);
$res2 = mysqli_stmt_get_result($chk2);
$exists = $res2 && mysqli_fetch_assoc($res2);
mysqli_stmt_close($chk2);
if (!$exists) {
    http_response_code(404);
    json_ok(['error' => 'not_found']);
}

if (array_key_exists('assignee_user_id', $body)) {
    $a = $body['assignee_user_id'];
    $newAssignee = null;
    if ($a === null) {
        $newAssignee = 0;
    } elseif (is_numeric($a)) {
        $ai = (int) $a;
        if ($ai < 0) {
            http_response_code(400);
            json_ok(['error' => 'invalid_assignee']);
        }
        if ($ai > 0 && !project_is_member($conn, $projectId, $ai)) {
            http_response_code(400);
            json_ok(['error' => 'invalid_assignee']);
        }
        $newAssignee = $ai;
    } else {
        http_response_code(400);
        json_ok(['error' => 'invalid_assignee']);
    }
    $u = mysqli_prepare(
        $conn,
        'UPDATE project_tasks SET assignee_user_id = NULLIF(?, 0) WHERE id = ? AND project_id = ? LIMIT 1'
    );
    mysqli_stmt_bind_param($u, 'iii', $newAssignee, $taskId, $projectId);
    mysqli_stmt_execute($u);
    mysqli_stmt_close($u);
}

if (isset($body['title']) || isset($body['description'])) {
    $tStmt = mysqli_prepare($conn, 'SELECT title, description FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
    mysqli_stmt_bind_param($tStmt, 'ii', $taskId, $projectId);
    mysqli_stmt_execute($tStmt);
    $r = mysqli_stmt_get_result($tStmt);
    $row = $r ? mysqli_fetch_assoc($r) : null;
    mysqli_stmt_close($tStmt);
    if ($row) {
        $nt = array_key_exists('title', $body) ? trim((string) $body['title']) : (string) $row['title'];
        $nd = array_key_exists('description', $body) ? trim((string) $body['description']) : (string) ($row['description'] ?? '');
        if ($nt === '') {
            http_response_code(400);
            json_ok(['error' => 'title_required']);
        }
        $up = mysqli_prepare(
            $conn,
            'UPDATE project_tasks SET title = ?, description = ? WHERE id = ? AND project_id = ? LIMIT 1'
        );
        mysqli_stmt_bind_param($up, 'ssii', $nt, $nd, $taskId, $projectId);
        mysqli_stmt_execute($up);
        mysqli_stmt_close($up);
    }
}

$sel = mysqli_prepare($conn, '
    SELECT t.id, t.title, t.description, t.column_key, t.progress_done, t.progress_total,
           t.files_count, t.comments_count, t.badges_json,
           t.assignee_user_id, au.name AS assignee_name, au.profile_image AS assignee_profile_image
    FROM project_tasks t
    LEFT JOIN users au ON au.id = t.assignee_user_id
    WHERE t.id = ? AND t.project_id = ?
    LIMIT 1
');
mysqli_stmt_bind_param($sel, 'ii', $taskId, $projectId);
mysqli_stmt_execute($sel);
$tr = mysqli_stmt_get_result($sel);
$taskRow = $tr ? mysqli_fetch_assoc($tr) : null;
mysqli_stmt_close($sel);
if (!$taskRow) {
    http_response_code(500);
    json_ok(['error' => 'read_failed']);
}

$badgesOut = [];
if (!empty($taskRow['badges_json'])) {
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
    'ok'   => true,
    'task' => [
        'id'          => (string) $taskRow['id'],
        'title'       => (string) $taskRow['title'],
        'description' => (string) ($taskRow['description'] ?? ''),
        'column_key'  => (string) $taskRow['column_key'],
        'progress'    => [
            'done'  => (int) $taskRow['progress_done'],
            'total' => max(1, (int) $taskRow['progress_total']),
        ],
        'files'       => (int) $taskRow['files_count'],
        'comments'    => (int) $taskRow['comments_count'],
        'badges'      => $badgesOut,
        'assignee'    => task_assignee_from_user_row($taskRow),
    ],
]);
