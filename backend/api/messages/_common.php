<?php
require_once dirname(__DIR__) . '/friends/_common.php';

function ensure_chat_tables(mysqli $conn): void
{
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS conversations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        conversation_key VARCHAR(100) NOT NULL UNIQUE,
        user_a_id BIGINT UNSIGNED NOT NULL,
        user_b_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_user_a (user_a_id),
        KEY idx_user_b (user_b_id)
    )");

    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        receiver_id BIGINT UNSIGNED NOT NULL,
        body TEXT NOT NULL,
        attachments_json LONGTEXT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        pinned_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_conv_created (conversation_id, created_at),
        KEY idx_receiver_created (receiver_id, created_at),
        CONSTRAINT fk_messages_conversation
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )");

    $colRes = mysqli_query($conn, "SHOW COLUMNS FROM messages LIKE 'attachments_json'");
    $hasAttachmentsJson = $colRes && mysqli_num_rows($colRes) > 0;
    if ($colRes) mysqli_free_result($colRes);
    if (!$hasAttachmentsJson) {
        @mysqli_query($conn, "ALTER TABLE messages ADD COLUMN attachments_json LONGTEXT NULL AFTER body");
    }

    $colPinned = mysqli_query($conn, "SHOW COLUMNS FROM messages LIKE 'is_pinned'");
    $hasPinned = $colPinned && mysqli_num_rows($colPinned) > 0;
    if ($colPinned) mysqli_free_result($colPinned);
    if (!$hasPinned) {
        @mysqli_query($conn, "ALTER TABLE messages ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_read");
    }

    $colPinnedAt = mysqli_query($conn, "SHOW COLUMNS FROM messages LIKE 'pinned_at'");
    $hasPinnedAt = $colPinnedAt && mysqli_num_rows($colPinnedAt) > 0;
    if ($colPinnedAt) mysqli_free_result($colPinnedAt);
    if (!$hasPinnedAt) {
        @mysqli_query($conn, "ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL AFTER is_pinned");
    }

    // Friendship table is shared with the friends APIs.
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS friend_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        addressee_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_pair (requester_id, addressee_id),
        KEY idx_addressee_status (addressee_id, status),
        KEY idx_requester_status (requester_id, status)
    )");
}

function canonical_dm_pair(int $a, int $b): array
{
    $userA = min($a, $b);
    $userB = max($a, $b);
    return [$userA, $userB, "dm_{$userA}__{$userB}"];
}

function are_friends(mysqli $conn, int $a, int $b): bool
{
    $stmt = mysqli_prepare($conn, "
        SELECT id
        FROM friend_requests
        WHERE status = 'accepted'
          AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        LIMIT 1
    ");
    mysqli_stmt_bind_param($stmt, 'iiii', $a, $b, $b, $a);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $ok = $res && mysqli_num_rows($res) > 0;
    mysqli_stmt_close($stmt);
    return $ok;
}

function get_conversation_id(mysqli $conn, int $a, int $b, bool $createIfMissing = true): int
{
    [$userA, $userB, $key] = canonical_dm_pair($a, $b);

    $sel = mysqli_prepare($conn, "SELECT id FROM conversations WHERE conversation_key = ? LIMIT 1");
    mysqli_stmt_bind_param($sel, 's', $key);
    mysqli_stmt_execute($sel);
    $res = mysqli_stmt_get_result($sel);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($sel);

    if ($row && isset($row['id'])) {
        return (int)$row['id'];
    }
    if (!$createIfMissing) {
        return 0;
    }

    $ins = mysqli_prepare($conn, "
        INSERT INTO conversations (conversation_key, user_a_id, user_b_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    ");
    mysqli_stmt_bind_param($ins, 'sii', $key, $userA, $userB);
    mysqli_stmt_execute($ins);
    mysqli_stmt_close($ins);

    $sel2 = mysqli_prepare($conn, "SELECT id FROM conversations WHERE conversation_key = ? LIMIT 1");
    mysqli_stmt_bind_param($sel2, 's', $key);
    mysqli_stmt_execute($sel2);
    $res2 = mysqli_stmt_get_result($sel2);
    $row2 = $res2 ? mysqli_fetch_assoc($res2) : null;
    mysqli_stmt_close($sel2);

    return $row2 && isset($row2['id']) ? (int)$row2['id'] : 0;
}

function format_dm_message(array $row, int $me): array
{
    $sender = (string)($row['sender_id'] ?? '');
    $receiver = (string)($row['receiver_id'] ?? '');
    $isFromMe = $sender === (string)$me;
    $isRead = ((int)($row['is_read'] ?? 0) === 1);

    $payload = [
        'mId' => (string)($row['id'] ?? ''),
        'text' => (string)($row['body'] ?? ''),
        'time' => isset($row['created_at']) ? gmdate('c', strtotime((string)$row['created_at'])) : gmdate('c'),
        'meta' => [
            'sender' => $sender,
            'receiver' => $receiver,
            'sent' => true,
            'received' => true,
            // Only mark read when receiver has read it (is_read=1), even on sender side.
            'read' => $isRead,
        ],
        'isPinned' => ((int)($row['is_pinned'] ?? 0) === 1),
        'pinnedAt' => !empty($row['pinned_at']) ? gmdate('c', strtotime((string)$row['pinned_at'])) : null,
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

function format_file_size(int $bytes): string
{
    if ($bytes < 1024) return $bytes . ' B';
    $units = ['KB', 'MB', 'GB'];
    $size = $bytes / 1024;
    foreach ($units as $unit) {
        if ($size < 1024) {
            return round($size, 1) . ' ' . $unit;
        }
        $size /= 1024;
    }
    return round($size, 1) . ' TB';
}
