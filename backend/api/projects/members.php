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

$stmt = mysqli_prepare($conn, '
    SELECT pm.user_id, pm.role, u.name, u.profile_image
    FROM project_members pm
    INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY u.name
');
mysqli_stmt_bind_param($stmt, 'i', $projectId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$members = [];
while ($row = mysqli_fetch_assoc($res)) {
    $full = trim((string) ($row['name'] ?? ''));
    $parts = preg_split('/\s+/', $full) ?: [];
    $first = $parts[0] ?? $full;
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    $initials = strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    if ($initials === '' || mb_strlen($initials) < 2) {
        $initials = strtoupper(mb_substr($full, 0, 2));
    }
    $members[] = [
        'user_id'       => (int) $row['user_id'],
        'role'          => $row['role'],
        'name'          => $full,
        'firstName'     => $first,
        'lastName'      => $last,
        'profileImage'  => $row['profile_image'] ?? '',
        'initials'      => $initials,
    ];
}
mysqli_stmt_close($stmt);

json_ok(['members' => $members]);
