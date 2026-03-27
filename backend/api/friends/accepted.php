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

$stmt = mysqli_prepare($conn, "
    SELECT
        CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END AS friend_id,
        u.name,
        u.profile_image,
        u.auth_provider_id
    FROM friend_requests fr
    JOIN users u ON u.id = CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END
    WHERE (fr.requester_id = ? OR fr.addressee_id = ?)
      AND fr.status = 'accepted'
    ORDER BY u.name
");
mysqli_stmt_bind_param($stmt, 'iiii', $me, $me, $me, $me);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$friends = [];
while ($row = mysqli_fetch_assoc($res)) {
    $name = trim((string)($row['name'] ?? ''));
    $parts = preg_split('/\s+/', $name) ?: [];
    $first = $parts[0] ?? $name;
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    $friends[] = [
        'id' => (int)$row['friend_id'],
        // Use this as the stable cross-client identifier (Google OAuth id).
        // WebRTC signaling must use the same ID type on both sides.
        'uid' => $row['auth_provider_id'] ?? '',
        'firstName' => $first,
        'lastName' => $last,
        'profileImage' => $row['profile_image'] ?? '',
        // Must match `STATUS_TYPES.ACTIVE` in Admin (value is "Active")
        'status' => 'Active',
        'meta' => ['unRead' => 0],
    ];
}
mysqli_stmt_close($stmt);

json_ok($friends);

