<?php
require dirname(__DIR__, 2) . '/session_init.php';

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');

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

