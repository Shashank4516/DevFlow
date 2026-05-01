<?php
require __DIR__ . '/_common.php';
cors_preflight_and_start('PUT, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int)$_SESSION['user_id'];
$parts = explode('/', trim((string)($_SERVER['REQUEST_URI'] ?? ''), '/'));
$id = (int)end($parts);

$body = read_json_body();
$title = trim((string)($body['title'] ?? ''));
$desc = trim((string)($body['desc'] ?? ''));
$icon = trim((string)($body['icon'] ?? 'bx bx-pin'));

if ($id <= 0 || $title === '') {
    http_response_code(400);
    json_ok(['error' => 'invalid_payload']);
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

$stmt = mysqli_prepare($conn, "UPDATE user_bookmarks SET icon = ?, title = ?, `desc` = ? WHERE id = ? AND user_id = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, 'sssii', $icon, $title, $desc, $id, $me);
mysqli_stmt_execute($stmt);
$affected = mysqli_stmt_affected_rows($stmt);
mysqli_stmt_close($stmt);

if ($affected < 0) {
    http_response_code(500);
    json_ok(['error' => 'update_failed']);
}

json_ok(['message' => 'Bookmark updated']);

