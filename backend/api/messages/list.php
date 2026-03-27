<?php
require __DIR__ . '/_common.php';
cors_preflight_and_start('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int)$_SESSION['user_id'];
$withUserId = isset($_GET['with_user_id']) ? (int)$_GET['with_user_id'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
$limit = max(1, min($limit, 500));

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
    [, , $conversationKey] = canonical_dm_pair($me, $withUserId);
    json_ok([
        'conversationId' => $conversationKey,
        'userId' => (string)$withUserId,
        'messages' => [],
    ]);
}

$stmt = mysqli_prepare($conn, "
    SELECT id, sender_id, receiver_id, body, is_read, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY id DESC
    LIMIT ?
");
mysqli_stmt_bind_param($stmt, 'ii', $conversationId, $limit);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$rows = [];
while ($row = mysqli_fetch_assoc($res)) {
    $rows[] = $row;
}
mysqli_stmt_close($stmt);

$rows = array_reverse($rows);
$messages = array_map(fn($r) => format_dm_message($r, $me), $rows);

// Mark all incoming messages in this conversation as read for current user.
$upd = mysqli_prepare($conn, "
    UPDATE messages
    SET is_read = 1
    WHERE conversation_id = ?
      AND receiver_id = ?
      AND is_read = 0
");
mysqli_stmt_bind_param($upd, 'ii', $conversationId, $me);
mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

[, , $conversationKey] = canonical_dm_pair($me, $withUserId);
json_ok([
    'conversationId' => $conversationKey,
    'userId' => (string)$withUserId,
    'messages' => $messages,
]);
