<?php
/**
 * Presence heartbeat for online status.
 * POST /api/presence/ping.php
 *
 * Updates users.last_seen_at for the current logged-in user.
 */
require dirname(__DIR__, 2) . '/session_init.php';
require dirname(__DIR__) . '/friends/_common.php';

cors_preflight_and_start('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_ok(['ok' => false, 'error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['ok' => false, 'error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];
if ($me <= 0) {
    http_response_code(400);
    json_ok(['ok' => false, 'error' => 'invalid_user']);
}

require_once dirname(__DIR__, 2) . '/db.php';

// Ensure column exists (older DBs may not have presence tracking)
$colRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'last_seen_at'");
$hasCol = $colRes && mysqli_num_rows($colRes) > 0;
if ($colRes) mysqli_free_result($colRes);
if (!$hasCol) {
    @mysqli_query($conn, "ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL");
}

$stmt = mysqli_prepare($conn, "UPDATE users SET last_seen_at = NOW() WHERE id = ?");
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'i', $me);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}

json_ok(['ok' => true]);

