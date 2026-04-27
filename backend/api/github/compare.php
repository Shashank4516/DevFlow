<?php
/**
 * Compare two refs/commits in a repo.
 * GET /api/github/compare.php?repo=owner/name&base=sha1&head=sha2
 * Fallback: provide branch to auto-compare latest 2 commits
 * GET /api/github/compare.php?repo=owner/name&branch=main
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
$base = isset($_GET['base']) ? trim((string) $_GET['base']) : '';
$head = isset($_GET['head']) ? trim((string) $_GET['head']) : '';
$branch = isset($_GET['branch']) ? trim((string) $_GET['branch']) : '';

if ($repo === '' || !preg_match('#^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$#', $repo)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_repo']);
    exit;
}

$token = (string) $_SESSION['github_token'];
$headers = [
    'Authorization: token ' . $token,
    'Accept: application/vnd.github+json',
    'User-Agent: DevFlow-App',
];

if ($base === '' || $head === '') {
    $commitUrl = 'https://api.github.com/repos/' . $repo . '/commits?per_page=2';
    if ($branch !== '') {
        $commitUrl .= '&sha=' . rawurlencode($branch);
    }

    $commitCh = curl_init($commitUrl);
    curl_setopt_array($commitCh, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $commitResponse = curl_exec($commitCh);
    $commitCode = curl_getinfo($commitCh, CURLINFO_HTTP_CODE);
    curl_close($commitCh);

    if ($commitCode !== 200) {
        http_response_code($commitCode >= 400 ? $commitCode : 500);
        echo json_encode(['error' => 'github_api_failed', 'details' => $commitResponse]);
        exit;
    }

    $commits = json_decode((string) $commitResponse, true);
    if (!is_array($commits) || count($commits) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'not_enough_commits']);
        exit;
    }
    $head = (string) ($commits[0]['sha'] ?? '');
    $base = (string) ($commits[1]['sha'] ?? '');
}

if ($base === '' || $head === '') {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_compare_range']);
    exit;
}

$url = 'https://api.github.com/repos/' . $repo . '/compare/' . rawurlencode($base) . '...' . rawurlencode($head);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => $headers,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code($httpCode >= 400 ? $httpCode : 500);
    echo json_encode(['error' => 'github_api_failed', 'details' => $response]);
    exit;
}

$data = json_decode((string) $response, true);
if (!is_array($data)) {
    http_response_code(500);
    echo json_encode(['error' => 'invalid_compare_response']);
    exit;
}

$files = [];
foreach (($data['files'] ?? []) as $file) {
    if (!is_array($file)) {
        continue;
    }
    $files[] = [
        'filename' => (string) ($file['filename'] ?? ''),
        'status' => (string) ($file['status'] ?? ''),
        'additions' => (int) ($file['additions'] ?? 0),
        'deletions' => (int) ($file['deletions'] ?? 0),
        'changes' => (int) ($file['changes'] ?? 0),
        'patch' => (string) ($file['patch'] ?? ''),
        'previous_filename' => (string) ($file['previous_filename'] ?? ''),
        'blob_url' => (string) ($file['blob_url'] ?? ''),
    ];
}

$commitsOut = [];
foreach (($data['commits'] ?? []) as $c) {
    if (!is_array($c)) {
        continue;
    }
    $commit = is_array($c['commit'] ?? null) ? $c['commit'] : [];
    $author = is_array($commit['author'] ?? null) ? $commit['author'] : [];
    $ghAuthor = is_array($c['author'] ?? null) ? $c['author'] : [];
    $message = (string) ($commit['message'] ?? '');
    $commitsOut[] = [
        'sha' => (string) ($c['sha'] ?? ''),
        'short_sha' => substr((string) ($c['sha'] ?? ''), 0, 7),
        'title' => trim((string) strtok($message, "\n")),
        'message' => $message,
        'author_name' => (string) ($author['name'] ?? ''),
        'author_date' => (string) ($author['date'] ?? ''),
        'github_login' => (string) ($ghAuthor['login'] ?? ''),
    ];
}

echo json_encode([
    'base' => $base,
    'head' => $head,
    'status' => (string) ($data['status'] ?? ''),
    'ahead_by' => (int) ($data['ahead_by'] ?? 0),
    'behind_by' => (int) ($data['behind_by'] ?? 0),
    'total_commits' => (int) ($data['total_commits'] ?? count($commitsOut)),
    'files' => $files,
    'commits' => $commitsOut,
]);
exit;
