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
$friendId = isset($body['friend_user_id']) ? (int) $body['friend_user_id'] : 0;

if ($projectId <= 0 || $friendId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_payload']);
}

if ($friendId === $me) {
    http_response_code(400);
    json_ok(['error' => 'cannot_invite_self']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

if (!users_are_friends($conn, $me, $friendId)) {
    http_response_code(400);
    json_ok(['error' => 'not_friends']);
}

$check = mysqli_prepare($conn, 'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1');
mysqli_stmt_bind_param($check, 'ii', $projectId, $friendId);
mysqli_stmt_execute($check);
$r = mysqli_stmt_get_result($check);
$exists = $r && mysqli_fetch_assoc($r);
mysqli_stmt_close($check);

if ($exists) {
    http_response_code(409);
    json_ok(['error' => 'already_member']);
}

$ins = mysqli_prepare($conn, 'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, \'member\')');
mysqli_stmt_bind_param($ins, 'ii', $projectId, $friendId);
if (!mysqli_stmt_execute($ins)) {
    mysqli_stmt_close($ins);
    http_response_code(500);
    json_ok(['error' => 'invite_failed']);
}
mysqli_stmt_close($ins);

json_ok(['ok' => true]);
