<?php
// TEMPORARY DEBUG — remove after fixing webhook secret issue
header('Content-Type: application/json');
echo json_encode([
    'getenv'   => getenv('GITHUB_WEBHOOK_SECRET') ?: null,
    '_SERVER'  => $_SERVER['GITHUB_WEBHOOK_SECRET'] ?? null,
    '_ENV'     => $_ENV['GITHUB_WEBHOOK_SECRET'] ?? null,
    'all_env_keys' => array_keys(getenv()),
]);
