<?php
require __DIR__ . '/_common.php';
cors_preflight_and_start('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int)$_SESSION['user_id'];
$body = read_json_body();
$withUserId = isset($body['with_user_id']) ? (int)$body['with_user_id'] : 0;

if ($withUserId <= 0 || $withUserId === $me) {
    http_response_code(400);
    json_ok(['error' => 'invalid_with_user_id']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_chat_tables($conn);

if (!are_friends($conn, $me, $withUserId)) {
    http_response_code(403);
    json_ok(['error' => 'not_friends']);
}

$conversationId = get_conversation_id($conn, $me, $withUserId, false);
if ($conversationId <= 0) {
    json_ok([
        'ok' => true,
        'message' => 'Messages are Deleted!',
    ]);
}

$delStmt = mysqli_prepare($conn, "DELETE FROM messages WHERE conversation_id = ?");
mysqli_stmt_bind_param($delStmt, 'i', $conversationId);
mysqli_stmt_execute($delStmt);
mysqli_stmt_close($delStmt);

json_ok([
    'ok' => true,
    'message' => 'Messages are Deleted!',
]);
