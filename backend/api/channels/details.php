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
$channelId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($channelId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_channel_id']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_channel_tables($conn);

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
    SELECT id, name, description
    FROM chat_channels
    WHERE id = ?
    LIMIT 1
");
mysqli_stmt_bind_param($stmt, 'i', $channelId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$row = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

if (!$row) {
    http_response_code(404);
    json_ok(['error' => 'channel_not_found']);
}

$membersStmt = mysqli_prepare($conn, "
    SELECT u.id, u.name
    FROM chat_channel_members m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.channel_id = ?
    ORDER BY u.name
");
mysqli_stmt_bind_param($membersStmt, 'i', $channelId);
mysqli_stmt_execute($membersStmt);
$membersRes = mysqli_stmt_get_result($membersStmt);

$members = [];
while ($member = mysqli_fetch_assoc($membersRes)) {
    $name = trim((string)($member['name'] ?? ''));
    $parts = preg_split('/\s+/', $name) ?: [];
    $members[] = [
        'id' => (int)($member['id'] ?? 0),
        'firstName' => (string)($parts[0] ?? $name),
        'lastName' => count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '',
    ];
}
mysqli_stmt_close($membersStmt);

$payload = normalize_channel_row($row);
$payload['members'] = $members;
json_ok($payload);
