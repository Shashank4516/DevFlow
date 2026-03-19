<?php
/**
 * List branches for a repo. GET /api/github/branches.php?repo=owner/name
 * Requires session with github_token.
 */
require dirname(__DIR__, 2) . '/session_init.php';
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

$repo = isset($_GET['repo']) ? trim($_GET['repo']) : '';
if ($repo === '' || !preg_match('#^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$#', $repo)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_repo']);
    exit;
}

$token = $_SESSION['github_token'];
$url = 'https://api.github.com/repos/' . $repo . '/branches?per_page=100';
$ch = curl_init($url);
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
    echo json_encode(['error' => 'github_api_failed']);
    exit;
}

$branches = json_decode($response, true);
if (!is_array($branches)) {
    $branches = [];
}

$list = [];
foreach ($branches as $b) {
    $list[] = [
        'name'   => $b['name'] ?? '',
        'commit' => $b['commit']['sha'] ?? '',
    ];
}

echo json_encode(['branches' => $list]);
exit;
