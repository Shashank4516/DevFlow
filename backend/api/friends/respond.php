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

$me        = (int)$_SESSION['user_id'];
$body      = read_json_body();
$requestId = isset($body['request_id']) ? (int)$body['request_id'] : 0;
$action    = isset($body['action']) ? strtolower(trim((string)$body['action'])) : '';

if ($requestId <= 0 || !in_array($action, ['accept', 'reject'], true)) {
    http_response_code(400);
    json_ok(['error' => 'invalid_payload']);
}

require_once dirname(__DIR__, 2) . '/db.php';

$stmt = mysqli_prepare($conn, "SELECT id, addressee_id, status FROM friend_requests WHERE id = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, 'i', $requestId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$row = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

if (!$row) {
    http_response_code(404);
    json_ok(['error' => 'request_not_found']);
}
if ((int)$row['addressee_id'] !== $me) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

$newStatus = $action === 'accept' ? 'accepted' : 'rejected';
$upd       = mysqli_prepare($conn, "UPDATE friend_requests SET status = ? WHERE id = ?");
mysqli_stmt_bind_param($upd, 'si', $newStatus, $requestId);
mysqli_stmt_execute($upd);
mysqli_stmt_close($upd);

json_ok(['status' => $newStatus, 'request_id' => $requestId]);
