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

$title = trim((string)($body['title'] ?? ''));
$desc = trim((string)($body['desc'] ?? ''));
$icon = trim((string)($body['icon'] ?? 'bx bx-pin'));

if ($title === '') {
    http_response_code(400);
    json_ok(['error' => 'title_required']);
}

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

$stmt = mysqli_prepare($conn, "INSERT INTO user_bookmarks (user_id, icon, title, `desc`) VALUES (?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, 'isss', $me, $icon, $title, $desc);
mysqli_stmt_execute($stmt);
$id = (int)mysqli_insert_id($conn);
mysqli_stmt_close($stmt);

json_ok([
    'id' => $id,
    'icon' => $icon,
    'title' => $title,
    'desc' => $desc,
    'message' => 'Bookmark created',
]);

