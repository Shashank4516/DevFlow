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

$me       = (int)$_SESSION['user_id'];
$idsParam = isset($_GET['ids']) ? trim((string)$_GET['ids']) : '';
if ($idsParam === '') {
    json_ok(['statuses' => []]);
}

$ids = array_filter(array_map('intval', explode(',', $idsParam)), function ($v) use ($me) {
    return $v > 0 && $v !== $me;
});
$ids = array_values(array_unique($ids));
if (count($ids) === 0) {
    json_ok(['statuses' => []]);
}

require_once dirname(__DIR__, 2) . '/db.php';

$in    = implode(',', array_fill(0, count($ids), '?'));
$types = str_repeat('i', count($ids) * 2 + 2);

$sql = "SELECT id, requester_id, addressee_id, status
        FROM friend_requests
        WHERE ((requester_id = ? AND addressee_id IN ($in))
           OR  (addressee_id = ? AND requester_id IN ($in)))";

$stmt   = mysqli_prepare($conn, $sql);
$params = [$me];
foreach ($ids as $id) $params[] = $id;
$params[] = $me;
foreach ($ids as $id) $params[] = $id;

mysqli_stmt_bind_param($stmt, $types, ...$params);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$statuses = [];
foreach ($ids as $id) {
    $statuses[(string)$id] = ['status' => 'none', 'request_id' => null];
}

while ($row = mysqli_fetch_assoc($res)) {
    $other = ((int)$row['requester_id'] === $me) ? (int)$row['addressee_id'] : (int)$row['requester_id'];
    if ($row['status'] === 'accepted') {
        $state = 'accepted';
    } elseif ($row['status'] === 'pending') {
        $state = ((int)$row['requester_id'] === $me) ? 'outgoing_pending' : 'incoming_pending';
    } else {
        $state = ((int)$row['requester_id'] === $me) ? 'outgoing_rejected' : 'incoming_rejected';
    }
    $statuses[(string)$other] = [
        'status'     => $state,
        'request_id' => (int)$row['id'],
    ];
}
mysqli_stmt_close($stmt);

json_ok(['statuses' => $statuses]);
