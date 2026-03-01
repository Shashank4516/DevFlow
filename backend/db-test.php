<?php
/**
 * Quick DB connection test. Use for testing only; remove or restrict in production.
 * Run: php db-test.php   or open in browser: .../backend/db-test.php
 */
require_once __DIR__ . '/db.php';

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    header('Content-Type: application/json');
}

$ok = (bool) $conn;
$info = $ok ? [
    'status'   => 'ok',
    'message'  => 'Database connected successfully.',
    'host'     => $conn->host_info,
    'server'   => $conn->server_info,
] : [
    'status'  => 'error',
    'message' => 'Connection failed: ' . mysqli_connect_error(),
];

if ($isCli) {
    echo $ok ? "OK: {$info['message']}\n" . "Host: {$info['host']}\n" : "ERROR: {$info['message']}\n";
    exit($ok ? 0 : 1);
}

echo json_encode($info, JSON_PRETTY_PRINT);
