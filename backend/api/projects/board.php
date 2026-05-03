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
if ($projectId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'project_id_required']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/task_helpers.php';

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

$stmt = mysqli_prepare($conn, 'SELECT id, name, owner_id FROM projects WHERE id = ? LIMIT 1');
mysqli_stmt_bind_param($stmt, 'i', $projectId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$proj = mysqli_fetch_assoc($res);
mysqli_stmt_close($stmt);

if (!$proj) {
    http_response_code(404);
    json_ok(['error' => 'not_found']);
}

$stmt2 = mysqli_prepare($conn, '
    SELECT t.id, t.title, t.description, t.column_key, t.sort_order, t.progress_done, t.progress_total,
           t.files_count, t.comments_count, t.badges_json,
           t.assignee_user_id, au.name AS assignee_name, au.profile_image AS assignee_profile_image
    FROM project_tasks t
    LEFT JOIN users au ON au.id = t.assignee_user_id
    WHERE t.project_id = ?
    ORDER BY t.column_key, t.sort_order, t.id
');
mysqli_stmt_bind_param($stmt2, 'i', $projectId);
mysqli_stmt_execute($stmt2);
$res2 = mysqli_stmt_get_result($stmt2);

$tasks = [];
while ($row = mysqli_fetch_assoc($res2)) {
    $tid = (int) $row['id'];
    $prog = tasks_sync_progress_from_todos($conn, $projectId, $tid);
    $badges = [];
    if (!empty($row['badges_json'])) {
        $decoded = json_decode((string) $row['badges_json'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $b) {
                if (is_array($b) && isset($b['label'])) {
                    $badges[] = ['label' => (string) $b['label']];
                }
            }
        }
    }
    $tasks[] = [
        'id'             => (string) $row['id'],
        'title'          => $row['title'],
        'description'    => (string) ($row['description'] ?? ''),
        'column_key'     => $row['column_key'],
        'progress'       => [
            'done'  => $prog['done'],
            'total' => $prog['total'],
        ],
        'files'          => (int) $row['files_count'],
        'comments'       => (int) $row['comments_count'],
        'badges'         => $badges,
        'assignee'       => task_assignee_from_user_row($row),
    ];
}
mysqli_stmt_close($stmt2);

json_ok([
    'project' => [
        'id'       => (int) $proj['id'],
        'name'     => $proj['name'],
        'owner_id' => (int) $proj['owner_id'],
    ],
    'tasks'   => $tasks,
]);
