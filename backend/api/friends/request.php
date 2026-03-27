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

$me   = (int)$_SESSION['user_id'];
$body = read_json_body();
$target = isset($body['target_user_id']) ? (int)$body['target_user_id'] : 0;

if ($target <= 0 || $target === $me) {
    http_response_code(400);
    json_ok(['error' => 'invalid_target']);
}

require_once dirname(__DIR__, 2) . '/db.php';

// Ensure table exists
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

$stmt = mysqli_prepare($conn, "SELECT id FROM users WHERE id = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, 'i', $target);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
if (!$res || mysqli_num_rows($res) === 0) {
    mysqli_stmt_close($stmt);
    http_response_code(404);
    json_ok(['error' => 'user_not_found']);
}
mysqli_stmt_close($stmt);

// If target already sent us a request → auto-accept it
$reverse = mysqli_prepare($conn, "SELECT id, status FROM friend_requests WHERE requester_id = ? AND addressee_id = ? LIMIT 1");
mysqli_stmt_bind_param($reverse, 'ii', $target, $me);
mysqli_stmt_execute($reverse);
$reverseRes = mysqli_stmt_get_result($reverse);
$reverseRow = $reverseRes ? mysqli_fetch_assoc($reverseRes) : null;
mysqli_stmt_close($reverse);

if ($reverseRow && $reverseRow['status'] === 'pending') {
    $accept = mysqli_prepare($conn, "UPDATE friend_requests SET status = 'accepted' WHERE id = ?");
    $rid    = (int)$reverseRow['id'];
    mysqli_stmt_bind_param($accept, 'i', $rid);
    mysqli_stmt_execute($accept);
    mysqli_stmt_close($accept);
    json_ok(['status' => 'accepted', 'request_id' => $rid, 'message' => 'Friend request accepted']);
}

// Check existing outgoing request
$existing = mysqli_prepare($conn, "SELECT id, status FROM friend_requests WHERE requester_id = ? AND addressee_id = ? LIMIT 1");
mysqli_stmt_bind_param($existing, 'ii', $me, $target);
mysqli_stmt_execute($existing);
$existingRes = mysqli_stmt_get_result($existing);
$row         = $existingRes ? mysqli_fetch_assoc($existingRes) : null;
mysqli_stmt_close($existing);

if ($row) {
    if ($row['status'] === 'rejected') {
        $upd = mysqli_prepare($conn, "UPDATE friend_requests SET status = 'pending' WHERE id = ?");
        $rid = (int)$row['id'];
        mysqli_stmt_bind_param($upd, 'i', $rid);
        mysqli_stmt_execute($upd);
        mysqli_stmt_close($upd);
        json_ok(['status' => 'pending', 'request_id' => $rid, 'message' => 'Friend request sent']);
    }
    json_ok(['status' => $row['status'], 'request_id' => (int)$row['id']]);
}

$ins = mysqli_prepare($conn, "INSERT INTO friend_requests (requester_id, addressee_id, status) VALUES (?, ?, 'pending')");
mysqli_stmt_bind_param($ins, 'ii', $me, $target);
mysqli_stmt_execute($ins);
$id = (int)mysqli_insert_id($conn);
mysqli_stmt_close($ins);

json_ok(['status' => 'pending', 'request_id' => $id, 'message' => 'Friend request sent']);
