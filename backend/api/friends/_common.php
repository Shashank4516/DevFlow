<?php
require dirname(__DIR__, 2) . '/session_init.php';

header('Content-Type: application/json');

$config       = require dirname(__DIR__, 2) . '/config.php';
$frontendBase = rtrim($config['frontend_base_url'], '/');
$origin       = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';

if ($origin !== '') {
    $originNormalized = rtrim($origin, '/');
    $allow = ($originNormalized === $frontendBase);

    // Dev: allow any localhost:* origin when the configured frontend is also localhost.
    $fb = parse_url($frontendBase);
    $og = parse_url($originNormalized);
    if (!$allow && ($fb['host'] ?? '') === 'localhost' && ($og['host'] ?? '') === 'localhost') {
        $allow = true;
    }

    if ($allow) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');

/**
 * Call this at the very top of each endpoint BEFORE any other logic.
 * It sets the correct Allow-Methods header and handles the OPTIONS preflight
 * immediately (browsers never send cookies with preflight, so session checks
 * must not run for OPTIONS).
 *
 * @param string $methods e.g. "POST, OPTIONS"
 */
function cors_preflight_and_start(string $methods): void
{
    header('Access-Control-Allow-Methods: ' . $methods);
    session_start();

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function json_ok($data): void
{
    echo json_encode($data);
    exit;
}
