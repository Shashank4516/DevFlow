<?php
/**
 * Aggregated Git activity for a project (commits, PRs, diff summary, latest CI on default branch).
 * GET /api/projects/workgraph.php?project_id=1
 * Requires: logged in, project membership, and GitHub OAuth in session (for live GitHub data).
 */
require __DIR__ . '/../friends/_common.php';
cors_preflight_and_start('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];
$projectId = isset($_GET['project_id']) ? (int) $_GET['project_id'] : 0;
if ($projectId <= 0) {
    http_response_code(400);
    json_ok(['error' => 'project_id_required']);
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__, 1) . '/github/_http.php';

projects_ensure_tables($conn);

if (!project_user_has_access($conn, $me, $projectId)) {
    http_response_code(403);
    json_ok(['error' => 'forbidden']);
}

$ghToken = isset($_SESSION['github_token']) ? (string) $_SESSION['github_token'] : '';
$githubConnected = $ghToken !== '';

$stmt = mysqli_prepare($conn, '
    SELECT id, repo_full_name, default_branch, sort_order
    FROM project_repos
    WHERE project_id = ?
    ORDER BY sort_order ASC, id ASC
');
mysqli_stmt_bind_param($stmt, 'i', $projectId);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$rows = [];
while ($res && ($row = mysqli_fetch_assoc($res))) {
    $rows[] = [
        'id'             => (int) $row['id'],
        'repo_full_name' => (string) $row['repo_full_name'],
        'default_branch' => (string) $row['default_branch'],
    ];
}
mysqli_stmt_close($stmt);

$byRepo = [];
if (!$githubConnected) {
    json_ok([
        'repos'             => $rows,
        'github_connected'  => false,
        'by_repo'           => new stdClass(),
        'can_edit'          => project_user_can_manage_repos($conn, $me, $projectId),
    ]);
    exit;
}

/**
 * @param array<int, array<string, mixed>> $commits
 */
function map_commits_list(array $commits): array
{
    $list = [];
    foreach ($commits as $c) {
        if (!is_array($c)) {
            continue;
        }
        $commit = is_array($c['commit'] ?? null) ? $c['commit'] : [];
        $author = is_array($commit['author'] ?? null) ? $commit['author'] : [];
        $ghAuthor = is_array($c['author'] ?? null) ? $c['author'] : [];
        $message = (string) ($commit['message'] ?? '');
        $first = trim((string) strtok($message, "\n"));
        $list[] = [
            'sha'            => (string) ($c['sha'] ?? ''),
            'short_sha'      => substr((string) ($c['sha'] ?? ''), 0, 7),
            'message'        => $message,
            'title'          => $first,
            'author_name'    => (string) ($author['name'] ?? ''),
            'author_date'    => (string) ($author['date'] ?? ''),
            'github_login'   => (string) ($ghAuthor['login'] ?? ''),
            'html_url'       => (string) ($c['html_url'] ?? ''),
        ];
    }
    return $list;
}

foreach ($rows as $row) {
    $repo = $row['repo_full_name'];
    $branch = $row['default_branch'] ?: 'main';
    $eRepo = $repo;

    $entry = [
        'repo_full_name' => $repo,
        'default_branch' => $branch,
        'error'          => null,
        'commits'        => [],
        'open_prs'       => [],
        'diff'           => null,
        'ci'             => null,
    ];

    $commitUrl = 'https://api.github.com/repos/' . $eRepo . '/commits?per_page=5&sha=' . rawurlencode($branch);
    $cRes = devflow_github_get($ghToken, $commitUrl);
    if ($cRes['code'] !== 200 || !is_array($cRes['json'])) {
        $entry['error'] = 'commits_unavailable';
        $byRepo[$repo] = $entry;
        continue;
    }
    $commits = $cRes['json'];
    $entry['commits'] = map_commits_list($commits);

    $pUrl = 'https://api.github.com/repos/' . $eRepo . '/pulls?state=open&per_page=5&sort=updated&direction=desc';
    $pRes = devflow_github_get($ghToken, $pUrl);
    $prList = [];
    if ($pRes['code'] === 200 && is_array($pRes['json'])) {
        foreach ($pRes['json'] as $pr) {
            if (!is_array($pr) || count($prList) >= 5) {
                break;
            }
            $user = is_array($pr['user'] ?? null) ? $pr['user'] : [];
            $prList[] = [
                'number'    => (int) ($pr['number'] ?? 0),
                'title'     => (string) ($pr['title'] ?? ''),
                'html_url'  => (string) ($pr['html_url'] ?? ''),
                'draft'     => (bool) ($pr['draft'] ?? false),
                'user_login' => (string) ($user['login'] ?? ''),
                'updated_at' => (string) ($pr['updated_at'] ?? ''),
            ];
        }
    }
    $entry['open_prs'] = $prList;

    if (is_array($commits) && count($commits) >= 2) {
        $head = (string) ($commits[0]['sha'] ?? '');
        $base = (string) ($commits[1]['sha'] ?? '');
        if ($head !== '' && $base !== '') {
            $cmpUrl = 'https://api.github.com/repos/' . $eRepo . '/compare/' . rawurlencode($base) . '...' . rawurlencode($head);
            $cmpRes = devflow_github_get($ghToken, $cmpUrl);
            if ($cmpRes['code'] === 200 && is_array($cmpRes['json'])) {
                $data = $cmpRes['json'];
                $add = 0;
                $del = 0;
                $files = $data['files'] ?? [];
                if (is_array($files)) {
                    foreach ($files as $f) {
                        if (is_array($f)) {
                            $add += (int) ($f['additions'] ?? 0);
                            $del += (int) ($f['deletions'] ?? 0);
                        }
                    }
                }
                $entry['diff'] = [
                    'base'          => $base,
                    'head'          => $head,
                    'base_short'    => substr($base, 0, 7),
                    'head_short'    => substr($head, 0, 7),
                    'status'        => (string) ($data['status'] ?? ''),
                    'file_count'    => is_array($files) ? count($files) : 0,
                    'additions'     => $add,
                    'deletions'     => $del,
                    'compare_url'   => 'https://github.com/' . $eRepo . '/compare/' . rawurlencode(substr($base, 0, 12)) . '...' . rawurlencode(substr($head, 0, 12)),
                ];
            }
        }
    } elseif (is_array($commits) && count($commits) === 1) {
        $entry['diff'] = [
            'head'     => (string) ($commits[0]['sha'] ?? ''),
            'message'  => 'single_commit',
            'file_count' => 0,
            'additions'  => 0,
            'deletions'  => 0,
        ];
    }

    $runsUrl = 'https://api.github.com/repos/' . $eRepo . '/actions/runs?branch=' . rawurlencode($branch) . '&per_page=1&exclude_pull_requests=true';
    $aRes = devflow_github_get($ghToken, $runsUrl);
    if ($aRes['code'] === 200 && is_array($aRes['json'])) {
        $wr = is_array($aRes['json']['workflow_runs'] ?? null) ? $aRes['json']['workflow_runs'] : [];
        if (isset($wr[0]) && is_array($wr[0])) {
            $run = $wr[0];
            $entry['ci'] = [
                'name'         => (string) ($run['name'] ?? ''),
                'conclusion'   => $run['conclusion'] !== null ? (string) $run['conclusion'] : null,
                'status'       => (string) ($run['status'] ?? ''),
                'html_url'     => (string) ($run['html_url'] ?? ''),
                'run_attempt'  => (int) ($run['run_attempt'] ?? 1),
            ];
        }
    }

    if ($entry['ci'] === null) {
        $dUrl = 'https://api.github.com/repos/' . $eRepo . '/deployments?per_page=1';
        $dRes = devflow_github_get($ghToken, $dUrl);
        $dJson = $dRes['json'];
        if ($dRes['code'] === 200 && is_array($dJson) && isset($dJson[0]) && is_array($dJson[0])) {
            $dep = $dJson[0];
            $id = (int) ($dep['id'] ?? 0);
            if ($id > 0) {
                $stUrl = 'https://api.github.com/repos/' . $eRepo . '/deployments/' . $id . '/statuses?per_page=1';
                $sRes = devflow_github_get($ghToken, $stUrl);
                $st = 'unknown';
                if ($sRes['code'] === 200 && is_array($sRes['json']) && isset($sRes['json'][0]) && is_array($sRes['json'][0])) {
                    $st = (string) ($sRes['json'][0]['state'] ?? 'unknown');
                }
                $depEnv = (string) ($dep['environment'] ?? '');
                $entry['ci'] = [
                    'name'         => $depEnv !== '' ? $depEnv : 'Deployment',
                    'conclusion'   => $st,
                    'status'       => 'completed',
                    'html_url'     => 'https://github.com/' . $eRepo . '/deployments',
                    'source'       => 'deployments',
                ];
            }
        }
    }

    $byRepo[$repo] = $entry;
}

json_ok([
    'repos'            => $rows,
    'github_connected' => true,
    'by_repo'          => $byRepo,
    'can_edit'         => project_user_can_manage_repos($conn, $me, $projectId),
]);
