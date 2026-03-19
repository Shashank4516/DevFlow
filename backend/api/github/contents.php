<?php
/**
 * List root contents (files/folders) for a repo branch.
 * GET /api/github/contents.php?repo=owner/name&branch=main
 * Optional path for subfolder: &path=src
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
$branch = isset($_GET['branch']) ? trim($_GET['branch']) : 'main';
$path = isset($_GET['path']) ? trim($_GET['path']) : '';

if ($repo === '' || !preg_match('#^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$#', $repo)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_repo']);
    exit;
}

$token = $_SESSION['github_token'];
$url = 'https://api.github.com/repos/' . $repo . '/contents/' . ($path !== '' ? '?path=' . rawurlencode($path) . '&ref=' . rawurlencode($branch) : '?ref=' . rawurlencode($branch));
if ($path !== '') {
    $url = 'https://api.github.com/repos/' . $repo . '/contents/' . $path . '?ref=' . rawurlencode($branch);
} else {
    $url = 'https://api.github.com/repos/' . $repo . '/contents/?ref=' . rawurlencode($branch);
}

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

$data = json_decode($response, true);
if (!is_array($data)) {
    $data = [];
}
// If single file, API returns object; if dir, array
if (isset($data['type'])) {
    $data = [$data];
}

$list = [];
foreach ($data as $item) {
    $list[] = [
        'name' => $item['name'] ?? '',
        'path' => $item['path'] ?? '',
        'type' => $item['type'] ?? 'file',
        'size' => $item['size'] ?? 0,
    ];
}

echo json_encode(['contents' => $list]);
exit;
