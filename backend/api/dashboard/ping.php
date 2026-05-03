<?php
/**
 * GET /api/dashboard/ping.php — no auth; verifies Apache/PHP reachable from the browser.
 */
require dirname(__DIR__, 2) . '/session_init.php';

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'ok'        => true,
    'service'   => 'devflow-dashboard-api',
    'timestamp' => gmdate('c'),
]);
exit;
