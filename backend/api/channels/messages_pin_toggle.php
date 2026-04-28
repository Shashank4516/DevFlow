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
$channelId = isset($body['channel_id']) ? (int)$body['channel_id'] : 0;
$messageId = isset($body['message_id']) ? (int)$body['message_id'] : 0;

if ($channelId <= 0 || $messageId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_params']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_channel_tables($conn);
ensure_channel_message_tables($conn);

$memberCheck = mysqli_prepare($conn, "
    SELECT channel_id
    FROM chat_channel_members
    WHERE channel_id = ? AND user_id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($memberCheck, 'ii', $channelId, $me);
mysqli_stmt_execute($memberCheck);
$memberRes = mysqli_stmt_get_result($memberCheck);
$isMember = $memberRes && mysqli_num_rows($memberRes) > 0;
mysqli_stmt_close($memberCheck);

if (!$isMember) {
    http_response_code(403);
    json_ok(['error' => 'not_channel_member']);
}

$sel = mysqli_prepare($conn, "
    SELECT id, is_pinned
    FROM chat_channel_messages
    WHERE id = ? AND channel_id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($sel, 'ii', $messageId, $channelId);
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
    UPDATE chat_channel_messages
    SET is_pinned = ?, pinned_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = ? AND channel_id = ?
");
mysqli_stmt_bind_param($upd, 'iiii', $nextPinned, $nextPinned, $messageId, $channelId);
mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

$rowStmt = mysqli_prepare($conn, "
    SELECT m.id, m.channel_id, m.sender_id, m.body, m.attachments_json, m.is_pinned, m.pinned_at, m.created_at,
           u.name as sender_name, u.profile_image as sender_profile_image
    FROM chat_channel_messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
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
    'conversationId' => 'channel_' . $channelId,
    'channelId' => (string)$channelId,
    'message' => format_channel_message($conn, $messageRow, $me),
]);
