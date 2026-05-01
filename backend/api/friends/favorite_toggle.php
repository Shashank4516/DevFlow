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
$target = isset($body['target_user_id']) ? (int)$body['target_user_id'] : 0;

if ($target <= 0 || $target === $me) {
    http_response_code(400);
    json_ok(['error' => 'invalid_target']);
}

require_once dirname(__DIR__, 2) . '/db.php';

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

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS friend_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_friend (user_id, friend_id),
    KEY idx_user (user_id),
    KEY idx_friend (friend_id)
)");

// Can only favourite accepted friends.
$friendStmt = mysqli_prepare($conn, "
    SELECT id
    FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (requester_id = ? AND addressee_id = ?)
        OR
        (addressee_id = ? AND requester_id = ?)
      )
    LIMIT 1
");
mysqli_stmt_bind_param($friendStmt, 'iiii', $me, $target, $me, $target);
mysqli_stmt_execute($friendStmt);
$friendRes = mysqli_stmt_get_result($friendStmt);
$isFriend = $friendRes && mysqli_num_rows($friendRes) > 0;
mysqli_stmt_close($friendStmt);

if (!$isFriend) {
    http_response_code(403);
    json_ok(['error' => 'not_friends']);
}

$existsStmt = mysqli_prepare($conn, "SELECT id FROM friend_favorites WHERE user_id = ? AND friend_id = ? LIMIT 1");
mysqli_stmt_bind_param($existsStmt, 'ii', $me, $target);
mysqli_stmt_execute($existsStmt);
$existsRes = mysqli_stmt_get_result($existsStmt);
$row = $existsRes ? mysqli_fetch_assoc($existsRes) : null;
mysqli_stmt_close($existsStmt);

if ($row) {
    $delStmt = mysqli_prepare($conn, "DELETE FROM friend_favorites WHERE user_id = ? AND friend_id = ?");
    mysqli_stmt_bind_param($delStmt, 'ii', $me, $target);
    mysqli_stmt_execute($delStmt);
    mysqli_stmt_close($delStmt);
    json_ok(['status' => 'removed', 'friend_id' => $target, 'is_favourite' => false]);
}

$insStmt = mysqli_prepare($conn, "INSERT INTO friend_favorites (user_id, friend_id) VALUES (?, ?)");
mysqli_stmt_bind_param($insStmt, 'ii', $me, $target);
mysqli_stmt_execute($insStmt);
mysqli_stmt_close($insStmt);

json_ok(['status' => 'added', 'friend_id' => $target, 'is_favourite' => true]);
