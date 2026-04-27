<?php
/**
 * List commits for a repo branch.
 * GET /api/github/commits.php?repo=owner/name&branch=main&per_page=20
 */
require dirname(__DIR__, 2) . '/session_init.php';
require dirname(__DIR__, 2) . '/cors_helpers.php';
session_start();

header('Content-Type: application/json');
devflow_cors_set_allow_origin(require dirname(__DIR__, 2) . '/config.php');
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

$repo = isset($_GET['repo']) ? trim((string) $_GET['repo']) : '';
$branch = isset($_GET['branch']) ? trim((string) $_GET['branch']) : '';
$perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 20;
$perPage = max(1, min($perPage, 50));

if ($repo === '' || !preg_match('#^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$#', $repo)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_repo']);
    exit;
}

$token = (string) $_SESSION['github_token'];
$query = '?per_page=' . $perPage;
if ($branch !== '') {
    $query .= '&sha=' . rawurlencode($branch);
}

$url = 'https://api.github.com/repos/' . $repo . '/commits' . $query;
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: token ' . $token,
        'Accept: application/vnd.github+json',
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

$commits = json_decode((string) $response, true);
if (!is_array($commits)) {
    $commits = [];
}

$list = [];
foreach ($commits as $c) {
    $commit = is_array($c['commit'] ?? null) ? $c['commit'] : [];
    $author = is_array($commit['author'] ?? null) ? $commit['author'] : [];
    $ghAuthor = is_array($c['author'] ?? null) ? $c['author'] : [];
    $message = (string) ($commit['message'] ?? '');
    $firstLine = trim((string) strtok($message, "\n"));
    $list[] = [
        'sha' => (string) ($c['sha'] ?? ''),
        'short_sha' => substr((string) ($c['sha'] ?? ''), 0, 7),
        'message' => $message,
        'title' => $firstLine,
        'author_name' => (string) ($author['name'] ?? ''),
        'author_email' => (string) ($author['email'] ?? ''),
        'author_date' => (string) ($author['date'] ?? ''),
        'github_login' => (string) ($ghAuthor['login'] ?? ''),
        'html_url' => (string) ($c['html_url'] ?? ''),
    ];
}

echo json_encode(['commits' => $list]);
exit;
