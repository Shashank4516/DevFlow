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

mysqli_query($conn, "CREATE TABLE IF NOT EXISTS user_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    icon VARCHAR(64) NOT NULL DEFAULT 'bx bx-pin',
    title VARCHAR(255) NOT NULL,
    `desc` TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_created (user_id, created_at)
)");

$stmt = mysqli_prepare($conn, "SELECT id, icon, title, `desc` FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC");
mysqli_stmt_bind_param($stmt, 'i', $me);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$bookmarks = [];
while ($row = mysqli_fetch_assoc($res)) {
    $bookmarks[] = [
        'id' => (int)($row['id'] ?? 0),
        'icon' => (string)($row['icon'] ?? 'bx bx-pin'),
        'title' => (string)($row['title'] ?? ''),
        'desc' => (string)($row['desc'] ?? ''),
    ];
}
mysqli_stmt_close($stmt);

json_ok($bookmarks);

