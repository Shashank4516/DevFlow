<?php
/**
 * List GitHub repos for the connected user.
 * GET /api/github/repos.php
 * Requires session with github_token.
 */
session_start();

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
$frontendBase = rtrim($config['frontend_base_url'], '/');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin === $frontendBase) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (empty($_SESSION['github_token'])) {
    http_response_code(401);
    echo json_encode(['error' => 'github_not_connected']);
    exit;
}

$token = $_SESSION['github_token'];
$ch = curl_init('https://api.github.com/user/repos?per_page=100&sort=updated');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: token ' . $token,
        'Accept: application/vnd.github.v3+json',
        'User-Agent: DevFlow-App',
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code($httpCode >= 400 ? $httpCode : 500);
    echo json_encode(['error' => 'github_api_failed', 'details' => $response]);
    exit;
}

$repos = json_decode($response, true);
if (!is_array($repos)) {
    $repos = [];
}

// Normalize for frontend
$list = [];
foreach ($repos as $r) {
    $list[] = [
        'id'          => $r['id'] ?? 0,
        'name'        => $r['name'] ?? '',
        'full_name'   => $r['full_name'] ?? '',
        'private'     => $r['private'] ?? false,
        'html_url'    => $r['html_url'] ?? '',
        'description' => $r['description'] ?? '',
        'default_branch' => $r['default_branch'] ?? 'main',
    ];
}

echo json_encode(['repos' => $list]);
exit;
