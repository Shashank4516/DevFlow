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

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

$keys = ['todo', 'inprogress', 'review', 'complete'];
$counts = array_fill_keys($keys, 0);

$stmt = mysqli_prepare($conn, '
    SELECT column_key, COUNT(*) AS c
    FROM project_tasks
    WHERE project_id = ?
    GROUP BY column_key
');
mysqli_stmt_bind_param($stmt, 'i', $projectId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
while ($row = mysqli_fetch_assoc($res)) {
    $k = $row['column_key'];
    if (isset($counts[$k])) {
        $counts[$k] = (int) $row['c'];
    }
}
mysqli_stmt_close($stmt);

json_ok(['counts' => $counts]);
