<?php
require_once dirname(__DIR__) . '/friends/_common.php';
require_once dirname(__DIR__) . '/messages/_common.php';

function ensure_channel_tables(mysqli $conn): void
{
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS chat_channels (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        description TEXT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_created_by (created_by)
    )");

    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS chat_channel_members (
        channel_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (channel_id, user_id),
        KEY idx_user_id (user_id)
    )");
}

function ensure_channel_message_tables(mysqli $conn): void
{
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS chat_channel_messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        channel_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        body TEXT NOT NULL,
        attachments_json LONGTEXT NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        pinned_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_channel_created (channel_id, created_at),
        KEY idx_sender_created (sender_id, created_at)
    )");

    $colRes = mysqli_query($conn, "SHOW COLUMNS FROM chat_channel_messages LIKE 'attachments_json'");
    $hasAttachmentsJson = $colRes && mysqli_num_rows($colRes) > 0;
    if ($colRes) mysqli_free_result($colRes);
    if (!$hasAttachmentsJson) {
        @mysqli_query($conn, "ALTER TABLE chat_channel_messages ADD COLUMN attachments_json LONGTEXT NULL AFTER body");
    }

    $colPinned = mysqli_query($conn, "SHOW COLUMNS FROM chat_channel_messages LIKE 'is_pinned'");
    $hasPinned = $colPinned && mysqli_num_rows($colPinned) > 0;
    if ($colPinned) mysqli_free_result($colPinned);
    if (!$hasPinned) {
        @mysqli_query($conn, "ALTER TABLE chat_channel_messages ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER attachments_json");
    }

    $colPinnedAt = mysqli_query($conn, "SHOW COLUMNS FROM chat_channel_messages LIKE 'pinned_at'");
    $hasPinnedAt = $colPinnedAt && mysqli_num_rows($colPinnedAt) > 0;
    if ($colPinnedAt) mysqli_free_result($colPinnedAt);
    if (!$hasPinnedAt) {
        @mysqli_query($conn, "ALTER TABLE chat_channel_messages ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL AFTER is_pinned");
    }
}

function split_name_parts(string $name): array
{
    $name = trim($name);
    if ($name === '') return ['first' => 'User', 'last' => ''];
    $parts = preg_split('/\s+/', $name) ?: [];
    if (count($parts) === 0) return ['first' => $name, 'last' => ''];
    $first = (string)($parts[0] ?? $name);
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    return ['first' => $first, 'last' => $last];
}

function format_channel_message(mysqli $conn, array $row, int $me): array
{
    $senderId = (string)($row['sender_id'] ?? '');
    $channelId = (string)($row['channel_id'] ?? '');

    $payload = [
        'mId' => (string)($row['id'] ?? ''),
        'text' => (string)($row['body'] ?? ''),
        'time' => isset($row['created_at']) ? gmdate('c', strtotime((string)$row['created_at'])) : gmdate('c'),
        'meta' => [
            'sender' => $senderId,
            'receiver' => $channelId,
            'sent' => true,
            'received' => true,
            'read' => true,
        ],
        'isPinned' => ((int)($row['is_pinned'] ?? 0) === 1),
        'pinnedAt' => !empty($row['pinned_at']) ? gmdate('c', strtotime((string)$row['pinned_at'])) : null,
    ];

    $senderName = (string)($row['sender_name'] ?? '');
    $parts = split_name_parts($senderName);

    $config = require dirname(__DIR__, 2) . '/config.php';
    $backendBase = rtrim((string)($config['backend_base_url'] ?? ''), '/');
    $profileImage = trim((string)($row['sender_profile_image'] ?? ''));
    if ($profileImage !== '' && $profileImage[0] === '/' && $backendBase !== '') {
        $profileImage = $backendBase . $profileImage;
    }

    $payload['meta']['userData'] = [
        'id' => (int)($row['sender_id'] ?? 0),
        'firstName' => $parts['first'],
        'lastName' => $parts['last'],
        'profileImage' => $profileImage !== '' ? $profileImage : null,
    ];

    $attachmentsRaw = (string)($row['attachments_json'] ?? '');
    if ($attachmentsRaw !== '') {
        $decoded = json_decode($attachmentsRaw, true);
        if (is_array($decoded)) {
            $images = [];
            $attachments = [];
            foreach ($decoded as $idx => $item) {
                if (!is_array($item)) continue;
                $type = (string)($item['type'] ?? 'file');
                $url = (string)($item['url'] ?? $item['downloadLink'] ?? '');
                if ($url === '') continue;
                $common = [
                    'id' => (int)($idx + 1),
                    'name' => (string)($item['name'] ?? basename(parse_url($url, PHP_URL_PATH) ?: 'file')),
                    'downloadLink' => $url,
                    'desc' => isset($item['size']) ? format_file_size((int)$item['size']) : '',
                    'type' => $type,
                    'mimeType' => (string)($item['mimeType'] ?? ''),
                    'duration' => isset($item['duration']) ? (float)$item['duration'] : null,
                ];
                if ($type === 'image') {
                    $images[] = [
                        'id' => $common['id'],
                        'downloadLink' => $url,
                    ];
                } else {
                    $attachments[] = $common;
                }
            }
            if ($images) $payload['image'] = $images;
            if ($attachments) $payload['attachments'] = $attachments;
        }
    }

    return $payload;
}

function normalize_channel_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'meta' => ['unRead' => 0],
    ];
}
