<?php
/**
 * GET /api/dashboard/index.php — JSON manifest of dashboard (Stack) PHP endpoints.
 * No authentication required.
 */
require dirname(__DIR__, 2) . '/session_init.php';

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$base = rtrim($config['backend_base_url'] ?? '', '/');

$manifest = [
    'service'   => 'devflow-dashboard-api',
    'version'   => 1,
    'backend'   => $base,
    'dashboard' => [
        'description' => 'Stack / Kanban projects API (MySQL + PHP session).',
        'endpoints'   => [
            'GET ' . $base . '/api/projects/list.php' => 'List projects for logged-in user',
            'POST ' . $base . '/api/projects/create.php' => 'Create project JSON {name}',
            'GET ' . $base . '/api/projects/board.php?project_id=' => 'Kanban tasks',
            'GET ' . $base . '/api/projects/category_counts.php?project_id=' => 'Column counts',
            'GET ' . $base . '/api/projects/members.php?project_id=' => 'Project members',
            'POST ' . $base . '/api/projects/invite.php' => 'Invite friend JSON {project_id, friend_user_id}',
            'POST ' . $base . '/api/projects/task_move.php' => 'Move task JSON {project_id, task_id, column_key}',
            'POST ' . $base . '/api/projects/task_create.php' => 'New task JSON {project_id, title, description?, column_key?}',
        ],
    ],
    'health' => [
        'GET ' . $base . '/api/dashboard/ping.php' => 'Connectivity check (no login)',
    ],
];

echo json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit;
