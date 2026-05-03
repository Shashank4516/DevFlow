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
$messageId = isset($body['message_id']) ? (int)$body['message_id'] : 0;

if ($withUserId <= 0 || $withUserId === $me || $messageId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_params']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_chat_tables($conn);

if (!are_friends($conn, $me, $withUserId)) {
    http_response_code(403);
    json_ok(['error' => 'not_friends']);
}

$conversationId = get_conversation_id($conn, $me, $withUserId, false);
if ($conversationId <= 0) {
    http_response_code(404);
    json_ok(['error' => 'conversation_not_found']);
}

$sel = mysqli_prepare($conn, "
    SELECT id, is_pinned
    FROM messages
    WHERE id = ? AND conversation_id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($sel, 'ii', $messageId, $conversationId);
mysqli_stmt_execute($sel);
$selRes = mysqli_stmt_get_result($sel);
$row = $selRes ? mysqli_fetch_assoc($selRes) : null;
mysqli_stmt_close($sel);

if (!$row) {
    http_response_code(404);
    json_ok(['error' => 'message_not_found']);
}

$nextPinned = ((int)$row['is_pinned'] === 1) ? 0 : 1;
$upd = mysqli_prepare($conn, "
    UPDATE messages
    SET is_pinned = ?, pinned_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = ? AND conversation_id = ?
");
mysqli_stmt_bind_param($upd, 'iiii', $nextPinned, $nextPinned, $messageId, $conversationId);
mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

$rowStmt = mysqli_prepare($conn, "
    SELECT id, sender_id, receiver_id, body, attachments_json, is_read, is_pinned, pinned_at, created_at
    FROM messages
    WHERE id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($rowStmt, 'i', $messageId);
mysqli_stmt_execute($rowStmt);
$rowRes = mysqli_stmt_get_result($rowStmt);
$messageRow = $rowRes ? mysqli_fetch_assoc($rowRes) : null;
mysqli_stmt_close($rowStmt);

if (!$messageRow) {
    http_response_code(500);
    json_ok(['error' => 'message_not_found_after_update']);
}

json_ok([
    'conversationId' => $conversationId,
    'userId' => (string)$withUserId,
    'message' => format_dm_message($messageRow, $me),
]);
