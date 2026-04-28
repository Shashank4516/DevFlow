<?php
/**
 * GitHub Webhook receiver for Stack automation.
 *
 * Verifies GitHub signature (X-Hub-Signature-256) using env var:
 *   GITHUB_WEBHOOK_SECRET
 *
 * Automation (forward-only):
 * - push that references DF-<taskId> -> move task to inprogress
 * - pull_request opened/ready_for_review -> draft => inprogress, else review
 * - pull_request closed+merged -> complete
 *
 * Task identification: any of these fields may contain DF-<id>
 * - push: ref name, commit messages
 * - pull_request: title, body, head.ref
 *
 * Security:
 * - No session/cookies. This endpoint is server-to-server only.
 * - Requires valid signature.
 */
declare(strict_types=1);

header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$secret = getenv('GITHUB_WEBHOOK_SECRET') ?: '';
if ($secret === '') {
    http_response_code(500);
    echo json_encode(['error' => 'webhook_not_configured']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false) {
    $raw = '';
}

$sigHeader = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
if (!preg_match('/^sha256=(.+)$/', $sigHeader, $m)) {
    http_response_code(401);
    echo json_encode(['error' => 'missing_signature']);
    exit;
}
$expected = 'sha256=' . hash_hmac('sha256', $raw, $secret);
if (!hash_equals($expected, $sigHeader)) {
    http_response_code(401);
    echo json_encode(['error' => 'bad_signature']);
    exit;
}

$event = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? '';
$delivery = $_SERVER['HTTP_X_GITHUB_DELIVERY'] ?? '';

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_json']);
    exit;
}

require_once dirname(__DIR__, 2) . '/db.php';
require_once dirname(__DIR__, 1) . '/projects/_bootstrap.php';

projects_ensure_tables($conn);

/**
 * Extract unique DF-<id> references from text.
 * @return int[]
 */
function df_extract_task_ids(string $text): array
{
    if ($text === '') return [];
    preg_match_all('/\bDF-(\d+)\b/i', $text, $mm);
    $ids = [];
    foreach (($mm[1] ?? []) as $idStr) {
        $n = (int) $idStr;
        if ($n > 0) $ids[] = $n;
    }
    $ids = array_values(array_unique($ids));
    sort($ids, SORT_NUMERIC);
    return $ids;
}

/**
 * Find task in a project that links this repo.
 * @return array{project_id:int,column_key:string}|null
 */
function df_find_task_for_repo(mysqli $conn, int $taskId, string $repoFullName): ?array
{
    $stmt = mysqli_prepare($conn, '
        SELECT t.project_id, t.column_key
        FROM project_tasks t
        INNER JOIN project_repos pr
            ON pr.project_id = t.project_id
           AND pr.repo_full_name = ?
        WHERE t.id = ?
        LIMIT 1
    ');
    mysqli_stmt_bind_param($stmt, 'si', $repoFullName, $taskId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    if (!$row) return null;
    return [
        'project_id' => (int) ($row['project_id'] ?? 0),
        'column_key' => (string) ($row['column_key'] ?? ''),
    ];
}

function df_col_rank(string $col): int
{
    return match ($col) {
        'todo' => 0,
        'inprogress' => 1,
        'review' => 2,
        'complete' => 3,
        default => -1,
    };
}

/**
 * Move task forward if target is ahead.
 * @return array{ok:bool, moved:bool, from:string, to:string}
 */
function df_move_task_forward(mysqli $conn, int $projectId, int $taskId, string $targetCol): array
{
    $allowed = ['todo', 'inprogress', 'review', 'complete'];
    if (!in_array($targetCol, $allowed, true)) {
        return ['ok' => false, 'moved' => false, 'from' => '', 'to' => $targetCol];
    }

    $stmt = mysqli_prepare($conn, 'SELECT column_key FROM project_tasks WHERE id = ? AND project_id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'ii', $taskId, $projectId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    if (!$row) {
        return ['ok' => false, 'moved' => false, 'from' => '', 'to' => $targetCol];
    }

    $from = (string) ($row['column_key'] ?? '');
    $rFrom = df_col_rank($from);
    $rTo = df_col_rank($targetCol);
    if ($rFrom < 0 || $rTo < 0) {
        return ['ok' => false, 'moved' => false, 'from' => $from, 'to' => $targetCol];
    }
    if ($rFrom >= $rTo) {
        return ['ok' => true, 'moved' => false, 'from' => $from, 'to' => $targetCol];
    }

    $maxStmt = mysqli_prepare($conn, 'SELECT COALESCE(MAX(sort_order), 0) AS m FROM project_tasks WHERE project_id = ? AND column_key = ?');
    mysqli_stmt_bind_param($maxStmt, 'is', $projectId, $targetCol);
    mysqli_stmt_execute($maxStmt);
    $maxRes = mysqli_stmt_get_result($maxStmt);
    $maxRow = $maxRes ? mysqli_fetch_assoc($maxRes) : null;
    $nextOrder = (int) ($maxRow['m'] ?? 0) + 1;
    mysqli_stmt_close($maxStmt);

    $upd = mysqli_prepare($conn, 'UPDATE project_tasks SET column_key = ?, sort_order = ? WHERE id = ? AND project_id = ?');
    mysqli_stmt_bind_param($upd, 'siii', $targetCol, $nextOrder, $taskId, $projectId);
    mysqli_stmt_execute($upd);
    mysqli_stmt_close($upd);

    return ['ok' => true, 'moved' => true, 'from' => $from, 'to' => $targetCol];
}

$repoFull = '';
if (isset($payload['repository']) && is_array($payload['repository'])) {
    $repoFull = (string) ($payload['repository']['full_name'] ?? '');
}

if ($repoFull === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_repo']);
    exit;
}

$results = [];

if ($event === 'push') {
    $ref = (string) ($payload['ref'] ?? '');
    $texts = [$ref];
    $commits = $payload['commits'] ?? [];
    if (is_array($commits)) {
        foreach ($commits as $c) {
            if (is_array($c)) {
                $texts[] = (string) ($c['message'] ?? '');
            }
        }
    }
    $allText = implode("\n", $texts);
    $ids = df_extract_task_ids($allText);
    foreach ($ids as $taskId) {
        $hit = df_find_task_for_repo($conn, $taskId, $repoFull);
        if (!$hit) continue;
        $results[] = [
            'task_id' => $taskId,
            'project_id' => $hit['project_id'],
            'action' => 'push->inprogress',
            'move' => df_move_task_forward($conn, $hit['project_id'], $taskId, 'inprogress'),
        ];
    }
} elseif ($event === 'pull_request') {
    $action = (string) ($payload['action'] ?? '');
    $pr = isset($payload['pull_request']) && is_array($payload['pull_request']) ? $payload['pull_request'] : [];
    $title = (string) ($pr['title'] ?? '');
    $body = (string) ($pr['body'] ?? '');
    $head = isset($pr['head']) && is_array($pr['head']) ? $pr['head'] : [];
    $headRef = (string) ($head['ref'] ?? '');
    $draft = (bool) ($pr['draft'] ?? false);
    $merged = (bool) ($pr['merged'] ?? false);

    $ids = df_extract_task_ids($title . "\n" . $body . "\n" . $headRef);

    $target = null;
    if ($action === 'opened' || $action === 'reopened' || $action === 'synchronize' || $action === 'ready_for_review') {
        $target = $draft ? 'inprogress' : 'review';
    }
    if ($action === 'closed' && $merged) {
        $target = 'complete';
    }

    if ($target !== null) {
        foreach ($ids as $taskId) {
            $hit = df_find_task_for_repo($conn, $taskId, $repoFull);
            if (!$hit) continue;
            $results[] = [
                'task_id' => $taskId,
                'project_id' => $hit['project_id'],
                'action' => 'pull_request:' . $action . '->' . $target,
                'move' => df_move_task_forward($conn, $hit['project_id'], $taskId, $target),
            ];
        }
    }
} else {
    // Ignore other events (ping, etc.)
}

echo json_encode([
    'ok' => true,
    'event' => $event,
    'delivery' => $delivery,
    'repo' => $repoFull,
    'results' => $results,
]);
exit;

