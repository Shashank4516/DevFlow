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

// Ensure table exists (safe to run multiple times)
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

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS friend_dm_archived (
    user_id INT NOT NULL,
    peer_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, peer_id),
    KEY idx_user (user_id),
    KEY idx_peer (peer_id)
)");

// Ensure presence column exists
$colRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'last_seen_at'");
$hasLastSeen = $colRes && mysqli_num_rows($colRes) > 0;
if ($colRes) mysqli_free_result($colRes);
if (!$hasLastSeen) {
    @mysqli_query($conn, "ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL");
}

$stmt = mysqli_prepare($conn, "
    SELECT
        CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END AS friend_id,
        u.name,
        u.profile_image,
        u.auth_provider_id,
        u.last_seen_at,
        (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.sender_id = CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END
              AND m.receiver_id = ?
              AND m.is_read = 0
        ) AS unread_count
    FROM friend_requests fr
    JOIN users u ON u.id = CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END
    WHERE (fr.requester_id = ? OR fr.addressee_id = ?)
      AND fr.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM friend_dm_archived fa
        WHERE fa.user_id = ?
          AND fa.peer_id = CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END
      )
    ORDER BY u.name
");
mysqli_stmt_bind_param($stmt, 'iiiiiiii', $me, $me, $me, $me, $me, $me, $me, $me);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$friends = [];
while ($row = mysqli_fetch_assoc($res)) {
    $name = trim((string)($row['name'] ?? ''));
    $parts = preg_split('/\s+/', $name) ?: [];
    $first = $parts[0] ?? $name;
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    $img = (string)($row['profile_image'] ?? '');
    // If DB stores a relative path like "/uploads/...", prefix backend base URL.
    if ($img !== '' && $img[0] === '/' && $backendBase !== '') {
        $img = $backendBase . $img;
    }
    $status = 'Away';
    if (!empty($row['last_seen_at'])) {
        $ts = strtotime((string)$row['last_seen_at']);
        if ($ts !== false && (time() - $ts) <= 35) {
            $status = 'Active';
        }
    }
    $friends[] = [
        'id' => (int)$row['friend_id'],
        // Use this as the stable cross-client identifier (Google OAuth id).
        // WebRTC signaling must use the same ID type on both sides.
        'uid' => $row['auth_provider_id'] ?? '',
        'firstName' => $first,
        'lastName' => $last,
        'profileImage' => $img,
        // Must match `STATUS_TYPES.ACTIVE` in Admin (value is "Active")
        'status' => $status,
        'meta' => ['unRead' => (int)($row['unread_count'] ?? 0)],
    ];
}
mysqli_stmt_close($stmt);

json_ok($friends);

