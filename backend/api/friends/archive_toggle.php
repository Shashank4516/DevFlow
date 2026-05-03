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

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS friend_dm_archived (
    user_id INT NOT NULL,
    peer_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, peer_id),
    KEY idx_user (user_id),
    KEY idx_peer (peer_id)
)");

$friendStmt = mysqli_prepare($conn, "
    SELECT id FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
    LIMIT 1
");
mysqli_stmt_bind_param($friendStmt, 'iiii', $me, $target, $target, $me);
mysqli_stmt_execute($friendStmt);
$friendRes = mysqli_stmt_get_result($friendStmt);
$isFriend = $friendRes && mysqli_num_rows($friendRes) > 0;
mysqli_stmt_close($friendStmt);

if (!$isFriend) {
    http_response_code(403);
    json_ok(['error' => 'not_friends']);
}

$existsStmt = mysqli_prepare($conn, "SELECT user_id FROM friend_dm_archived WHERE user_id = ? AND peer_id = ? LIMIT 1");
mysqli_stmt_bind_param($existsStmt, 'ii', $me, $target);
mysqli_stmt_execute($existsStmt);
$existsRes = mysqli_stmt_get_result($existsStmt);
$row = $existsRes ? mysqli_fetch_assoc($existsRes) : null;
mysqli_stmt_close($existsStmt);

if ($row) {
    $delStmt = mysqli_prepare($conn, "DELETE FROM friend_dm_archived WHERE user_id = ? AND peer_id = ?");
    mysqli_stmt_bind_param($delStmt, 'ii', $me, $target);
    mysqli_stmt_execute($delStmt);
    mysqli_stmt_close($delStmt);
    json_ok([
        'status' => 'unarchived',
        'friend_id' => $target,
        'isArchived' => false,
        'message' => 'User has been removed from your archives',
    ]);
}

$insStmt = mysqli_prepare($conn, "INSERT INTO friend_dm_archived (user_id, peer_id) VALUES (?, ?)");
mysqli_stmt_bind_param($insStmt, 'ii', $me, $target);
mysqli_stmt_execute($insStmt);
mysqli_stmt_close($insStmt);

json_ok([
    'status' => 'archived',
    'friend_id' => $target,
    'isArchived' => true,
    'message' => 'User has been added to your archives',
]);
