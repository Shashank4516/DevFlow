<?php
/**
 * List or replace Git repositories linked to a project.
 * GET  /api/projects/repos_config.php?project_id=
 * POST /api/projects/repos_config.php
 *   body: { "project_id": 1, "repos": [ { "repo_full_name": "o/r", "default_branch": "main" } ] }
 */
require __DIR__ . '/../friends/_common.php';
cors_preflight_and_start('GET, POST, OPTIONS');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';

projects_ensure_tables($conn);

if ($method === 'GET') {
    $projectId = isset($_GET['project_id']) ? (int) $_GET['project_id'] : 0;
    if ($projectId <= 0) {
        http_response_code(400);
        json_ok(['error' => 'project_id_required']);
    }
    if (!project_user_has_access($conn, $me, $projectId)) {
        http_response_code(403);
        json_ok(['error' => 'forbidden']);
    }
    $stmt = mysqli_prepare($conn, '
        SELECT id, repo_full_name, default_branch, sort_order
        FROM project_repos
        WHERE project_id = ?
        ORDER BY sort_order ASC, id ASC
    ');
    mysqli_stmt_bind_param($stmt, 'i', $projectId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $list = [];
    while ($res && ($row = mysqli_fetch_assoc($res))) {
        $list[] = [
            'id'              => (int) $row['id'],
            'repo_full_name'  => (string) $row['repo_full_name'],
            'default_branch'  => (string) $row['default_branch'],
            'sort_order'      => (int) $row['sort_order'],
        ];
    }
    mysqli_stmt_close($stmt);
    $ghToken = isset($_SESSION['github_token']) ? (string) $_SESSION['github_token'] : '';
    $githubConnected = $ghToken !== '';
    json_ok([
        'repos'             => $list,
        'can_edit'          => project_user_can_manage_repos($conn, $me, $projectId),
        'github_connected'  => $githubConnected,
    ]);
    exit;
}

$body = read_json_body();
$projectId = isset($body['project_id']) ? (int) $body['project_id'] : 0;
$reposIn = isset($body['repos']) && is_array($body['repos']) ? $body['repos'] : null;

if ($projectId <= 0 || $reposIn === null) {
    http_response_code(400);
    json_ok(['error' => 'project_id_and_repos_required']);
}

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

if (!project_user_can_manage_repos($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden', 'message' => 'only_project_owners_may_link_repos']);
}

$validRepos = [];
foreach ($reposIn as $idx => $r) {
    if (!is_array($r)) {
        continue;
    }
    $name = isset($r['repo_full_name']) ? trim((string) $r['repo_full_name']) : '';
    $branch = isset($r['default_branch']) ? trim((string) $r['default_branch']) : 'main';
    if ($name === '' || !preg_match('#^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$#', $name)) {
        http_response_code(400);
        json_ok(['error' => 'invalid_repo_full_name', 'value' => $name]);
    }
    if (strlen($branch) > 120 || $branch === '') {
        $branch = 'main';
    }
    if (count($validRepos) >= 12) {
        break;
    }
    $validRepos[] = ['repo_full_name' => $name, 'default_branch' => $branch, 'sort_order' => (int) $idx];
}

mysqli_begin_transaction($conn);
try {
    $del = mysqli_prepare($conn, 'DELETE FROM project_repos WHERE project_id = ?');
    mysqli_stmt_bind_param($del, 'i', $projectId);
    mysqli_stmt_execute($del);
    mysqli_stmt_close($del);

    $ins = mysqli_prepare(
        $conn,
        'INSERT INTO project_repos (project_id, repo_full_name, default_branch, sort_order) VALUES (?, ?, ?, ?)'
    );
    foreach ($validRepos as $r) {
        mysqli_stmt_bind_param(
            $ins,
            'issi',
            $projectId,
            $r['repo_full_name'],
            $r['default_branch'],
            $r['sort_order']
        );
        mysqli_stmt_execute($ins);
    }
    mysqli_stmt_close($ins);
    mysqli_commit($conn);
} catch (Throwable $e) {
    mysqli_rollback($conn);
    http_response_code(500);
    json_ok(['error' => 'save_failed']);
    exit;
}

$stmt2 = mysqli_prepare($conn, '
    SELECT id, repo_full_name, default_branch, sort_order
    FROM project_repos
    WHERE project_id = ?
    ORDER BY sort_order ASC, id ASC
');
mysqli_stmt_bind_param($stmt2, 'i', $projectId);
mysqli_stmt_execute($stmt2);
$res2 = mysqli_stmt_get_result($stmt2);
$out = [];
while ($res2 && ($row = mysqli_fetch_assoc($res2))) {
    $out[] = [
        'id'             => (int) $row['id'],
        'repo_full_name' => (string) $row['repo_full_name'],
        'default_branch' => (string) $row['default_branch'],
        'sort_order'     => (int) $row['sort_order'],
    ];
}
mysqli_stmt_close($stmt2);

json_ok(['ok' => true, 'repos' => $out]);
