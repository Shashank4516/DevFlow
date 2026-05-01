<?php
require __DIR__ . '/_common.php';
cors_preflight_and_start('DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
if ($id <= 0) {
    http_response_code(400);
    json_ok(['error' => 'invalid_id']);
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

$stmt = mysqli_prepare($conn, "DELETE FROM user_bookmarks WHERE id = ? AND user_id = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, 'ii', $id, $me);
mysqli_stmt_execute($stmt);
$affected = mysqli_stmt_affected_rows($stmt);
mysqli_stmt_close($stmt);

if ($affected === 0) {
    http_response_code(404);
    json_ok(['error' => 'bookmark_not_found']);
}

json_ok(['message' => 'Bookmark deleted']);

