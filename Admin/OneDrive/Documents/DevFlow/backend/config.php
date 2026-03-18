<?php
/**
 * Backend config for Google OAuth and app URLs.
 * Copy config.local.php.example to config.local.php and set your real values (do not commit config.local.php).
 */
$config = [
    // Google OAuth – from Google Cloud Console → APIs & Services → Credentials
    'google_client_id'     => getenv('GOOGLE_CLIENT_ID')     ?: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    'google_client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: 'YOUR_GOOGLE_CLIENT_SECRET',

    // GitHub OAuth – from GitHub → Settings → Developer settings → OAuth Apps
    'github_client_id'     => getenv('GITHUB_CLIENT_ID')     ?: '',
    'github_client_secret' => getenv('GITHUB_CLIENT_SECRET') ?: '',

    // Base URL of this PHP backend (no trailing slash). e.g. http://localhost:8080 or http://localhost/devflow-backend/backend
    'backend_base_url'     => getenv('BACKEND_BASE_URL')     ?: 'http://localhost:8080',

    // Frontend (React) URL for redirects after login/logout (no trailing slash). e.g. http://localhost:5173
    'frontend_base_url'    => getenv('FRONTEND_BASE_URL')    ?: 'http://localhost:5173',
];

if (is_file(__DIR__ . '/config.local.php')) {
    $local = require __DIR__ . '/config.local.php';
    $config = array_merge($config, $local);
}

// Auto-detect backend base URL from request when running under Apache (e.g. XAMPP)
if (PHP_SAPI !== 'cli' && isset($_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'])) {
    $reqPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
    // e.g. /devflow-backend/backend/auth/google/index.php -> base = /devflow-backend/backend
    if (preg_match('#^(.+?/backend)(?:/|$)#', $reqPath, $m)) {
        $path = rtrim($m[1], '/');
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $config['backend_base_url'] = $protocol . '://' . $_SERVER['HTTP_HOST'] . $path;
    }
}

return $config;
