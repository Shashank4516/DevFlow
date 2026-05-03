<?php
/**
 * Suggest a project member to assign next: fewest open (non-complete) tasks in this project.
 * GET /api/projects/suggest_assignee.php?project_id=
 */
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

$stmtM = mysqli_prepare(
    $conn,
    'SELECT user_id FROM project_members WHERE project_id = ?'
);
mysqli_stmt_bind_param($stmtM, 'i', $projectId);
mysqli_stmt_execute($stmtM);
$rm = mysqli_stmt_get_result($stmtM);
$memberIds = [];
while ($row = mysqli_fetch_assoc($rm)) {
    $memberIds[] = (int) $row['user_id'];
}
mysqli_stmt_close($stmtM);
if (count($memberIds) === 0) {
    json_ok(['suggested_user_id' => null, 'open_counts' => (object) [], 'reason' => 'no_members']);
    exit;
}

$counts = array_fill_keys($memberIds, 0);
$q = mysqli_prepare(
    $conn,
    "SELECT assignee_user_id AS uid, COUNT(*) AS c
     FROM project_tasks
     WHERE project_id = ? AND column_key != 'complete' AND assignee_user_id IS NOT NULL
     GROUP BY assignee_user_id"
);
mysqli_stmt_bind_param($q, 'i', $projectId);
mysqli_stmt_execute($q);
$rq = mysqli_stmt_get_result($q);
while ($rq && ($row = mysqli_fetch_assoc($rq))) {
    $u = (int) ($row['uid'] ?? 0);
    if (isset($counts[$u])) {
        $counts[$u] = (int) $row['c'];
    }
}
mysqli_stmt_close($q);

$min = min($counts);
$candidates = array_keys(array_filter($counts, function ($c) use ($min) {
    return (int) $c === $min;
}));
sort($candidates, SORT_NUMERIC);
$suggested = $candidates[0] ?? $memberIds[0];

$out = [];
foreach ($counts as $uid => $c) {
    $out[(string) $uid] = $c;
}
json_ok([
    'suggested_user_id' => $suggested,
    'open_counts'       => $out,
    'reason'            => 'fewest_open_tasks',
]);
