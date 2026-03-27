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
$toUserId = isset($body['to_user_id']) ? (int)$body['to_user_id'] : 0;
$text = trim((string)($body['text'] ?? ''));

if ($toUserId <= 0 || $toUserId === $me) {
    http_response_code(400);
    json_ok(['error' => 'invalid_recipient']);
}
if ($text === '') {
    http_response_code(400);
    json_ok(['error' => 'empty_message']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_chat_tables($conn);

$userStmt = mysqli_prepare($conn, "SELECT id FROM users WHERE id = ? LIMIT 1");
mysqli_stmt_bind_param($userStmt, 'i', $toUserId);
mysqli_stmt_execute($userStmt);
$userRes = mysqli_stmt_get_result($userStmt);
if (!$userRes || mysqli_num_rows($userRes) === 0) {
    mysqli_stmt_close($userStmt);
    http_response_code(404);
    json_ok(['error' => 'recipient_not_found']);
}
mysqli_stmt_close($userStmt);

if (!are_friends($conn, $me, $toUserId)) {
    http_response_code(403);
    json_ok(['error' => 'not_friends']);
}

$conversationId = get_conversation_id($conn, $me, $toUserId, true);
if ($conversationId <= 0) {
    http_response_code(500);
    json_ok(['error' => 'conversation_create_failed']);
}

$ins = mysqli_prepare($conn, "
    INSERT INTO messages (conversation_id, sender_id, receiver_id, body, is_read)
    VALUES (?, ?, ?, ?, 0)
");
mysqli_stmt_bind_param($ins, 'iiis', $conversationId, $me, $toUserId, $text);
mysqli_stmt_execute($ins);
$messageId = (int)mysqli_insert_id($conn);
mysqli_stmt_close($ins);

$rowStmt = mysqli_prepare($conn, "
    SELECT id, sender_id, receiver_id, body, is_read, created_at
    FROM messages
    WHERE id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($rowStmt, 'i', $messageId);
mysqli_stmt_execute($rowStmt);
$rowRes = mysqli_stmt_get_result($rowStmt);
$row = $rowRes ? mysqli_fetch_assoc($rowRes) : null;
mysqli_stmt_close($rowStmt);

if (!$row) {
    http_response_code(500);
    json_ok(['error' => 'message_not_found_after_insert']);
}

json_ok([
    'conversationId' => $conversationId,
    'userId' => (string)$toUserId,
    'message' => format_dm_message($row, $me),
]);
