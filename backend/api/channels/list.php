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
    $channels[] = normalize_channel_row($row);
}
mysqli_stmt_close($stmt);

json_ok($channels);
