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

require_once dirname(__DIR__, 2) . '/db.php';
$config = require dirname(__DIR__, 2) . '/config.php';
$backendBase = rtrim((string)($config['backend_base_url'] ?? ''), '/');
ensure_channel_tables($conn);

$stmt = mysqli_prepare($conn, "
    SELECT c.id, c.name, c.description
    FROM chat_channels c
    INNER JOIN chat_channel_members m ON m.channel_id = c.id
    WHERE m.user_id = ?
    ORDER BY c.updated_at DESC, c.id DESC
");
mysqli_stmt_bind_param($stmt, 'i', $me);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$channels = [];
while ($row = mysqli_fetch_assoc($res)) {
    $normalized = normalize_channel_row($row);
    $channelId = (int)($row['id'] ?? 0);

    $memberStmt = mysqli_prepare($conn, "
        SELECT u.profile_image
        FROM chat_channel_members m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.channel_id = ?
        ORDER BY m.joined_at DESC
        LIMIT 3
    ");
    mysqli_stmt_bind_param($memberStmt, 'i', $channelId);
    mysqli_stmt_execute($memberStmt);
    $memberRes = mysqli_stmt_get_result($memberStmt);

    $memberAvatars = [];
    while ($member = mysqli_fetch_assoc($memberRes)) {
        $img = trim((string)($member['profile_image'] ?? ''));
        if ($img === '') {
            continue;
        }
        if ($img[0] === '/' && $backendBase !== '') {
            $img = $backendBase . $img;
        }
        $memberAvatars[] = $img;
    }
    mysqli_stmt_close($memberStmt);

    $normalized['memberAvatars'] = $memberAvatars;
    $normalized['memberCount'] = count($memberAvatars);
    $channels[] = $normalized;
}
mysqli_stmt_close($stmt);

json_ok($channels);
