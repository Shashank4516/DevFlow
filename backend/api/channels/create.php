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

$name = trim((string)($body['name'] ?? ''));
$description = trim((string)($body['description'] ?? ''));
$members = isset($body['members']) && is_array($body['members']) ? $body['members'] : [];

if ($name === '') {
    http_response_code(400);
    json_ok(['error' => 'name_required']);
}

require_once dirname(__DIR__, 2) . '/db.php';
ensure_channel_tables($conn);

$memberSet = [];
$memberSet[(string)$me] = $me;
foreach ($members as $rawId) {
    $id = (int)$rawId;
    if ($id <= 0 || $id === $me) {
        continue;
    }
    if (!are_friends($conn, $me, $id)) {
        continue;
    }
    $memberSet[(string)$id] = $id;
}

if (count($memberSet) <= 1) {
    http_response_code(400);
    json_ok(['error' => 'at_least_one_friend_required']);
}

mysqli_begin_transaction($conn);

try {
    $insChannel = mysqli_prepare($conn, "
        INSERT INTO chat_channels (name, description, created_by)
        VALUES (?, ?, ?)
    ");
    mysqli_stmt_bind_param($insChannel, 'ssi', $name, $description, $me);
    mysqli_stmt_execute($insChannel);
    $channelId = (int)mysqli_insert_id($conn);
    mysqli_stmt_close($insChannel);

    if ($channelId <= 0) {
        throw new Exception('channel_create_failed');
    }

    $insMember = mysqli_prepare($conn, "
        INSERT IGNORE INTO chat_channel_members (channel_id, user_id)
        VALUES (?, ?)
    ");
    foreach ($memberSet as $memberId) {
        mysqli_stmt_bind_param($insMember, 'ii', $channelId, $memberId);
        mysqli_stmt_execute($insMember);
    }
    mysqli_stmt_close($insMember);

    mysqli_commit($conn);
} catch (Throwable $e) {
    mysqli_rollback($conn);
    http_response_code(500);
    json_ok(['error' => 'channel_create_failed']);
}

json_ok('Channel Created!');
