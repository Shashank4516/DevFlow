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

$stmt = mysqli_prepare($conn, "
    SELECT fr.id AS request_id, fr.requester_id, u.name, u.profile_image
    FROM   friend_requests fr
    LEFT   JOIN users u ON u.id = fr.requester_id
    WHERE  fr.addressee_id = ? AND fr.status = 'pending'
    ORDER  BY fr.created_at DESC
    LIMIT  50
");
mysqli_stmt_bind_param($stmt, 'i', $me);
mysqli_stmt_execute($stmt);
$res  = mysqli_stmt_get_result($stmt);

$rows = [];
while ($row = mysqli_fetch_assoc($res)) {
    $rows[] = [
        'request_id'    => (int)$row['request_id'],
        'user_id'       => (int)$row['requester_id'],
        'name'          => $row['name'] ?? '',
        'profile_image' => $row['profile_image'] ?? '',
    ];
}
mysqli_stmt_close($stmt);

json_ok(['pending' => $rows]);
