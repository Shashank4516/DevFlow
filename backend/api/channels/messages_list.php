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
$channelId = isset($_GET['channel_id']) ? (int)$_GET['channel_id'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
$limit = max(1, min($limit, 500));

if ($channelId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_channel_id']);
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

$stmt = mysqli_prepare($conn, "
    SELECT m.id, m.channel_id, m.sender_id, m.body, m.attachments_json, m.created_at,
           u.name as sender_name, u.profile_image as sender_profile_image
    FROM chat_channel_messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.channel_id = ?
    ORDER BY m.id DESC
    LIMIT ?
");
mysqli_stmt_bind_param($stmt, 'ii', $channelId, $limit);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$rows = [];
while ($row = mysqli_fetch_assoc($res)) {
    $rows[] = $row;
}
mysqli_stmt_close($stmt);

$rows = array_reverse($rows);
$messages = array_map(fn($r) => format_channel_message($conn, $r, $me), $rows);

json_ok([
    'conversationId' => 'channel_' . $channelId,
    'channelId' => (string)$channelId,
    'messages' => $messages,
]);

