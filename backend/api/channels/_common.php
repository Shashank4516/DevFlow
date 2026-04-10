<?php
require dirname(__DIR__) . '/friends/_common.php';

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

function normalize_channel_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'meta' => ['unRead' => 0],
    ];
}
