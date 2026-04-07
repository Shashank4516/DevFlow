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

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';

projects_ensure_tables($conn);

$stmt = mysqli_prepare($conn, '
    SELECT p.id, p.name, p.owner_id, p.created_at
    FROM projects p
    INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    ORDER BY p.created_at DESC
');
mysqli_stmt_bind_param($stmt, 'i', $me);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$projects = [];
while ($row = mysqli_fetch_assoc($res)) {
    $projects[] = [
        'id'       => (int) $row['id'],
        'name'     => $row['name'],
        'owner_id' => (int) $row['owner_id'],
    ];
}
mysqli_stmt_close($stmt);

json_ok(['projects' => $projects]);
