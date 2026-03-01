<?php
/**
 * One-off fix: set users.id to AUTO_INCREMENT so INSERT works without providing id.
 * Open once in browser, then delete this file.
 */
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

$result = mysqli_query($conn, "ALTER TABLE users MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT");

if ($result) {
    echo json_encode(['ok' => true, 'message' => 'users.id is now AUTO_INCREMENT. Run db-check-users-table.php again to confirm.']);
} else {
    echo json_encode(['ok' => false, 'error' => mysqli_error($conn)]);
}
