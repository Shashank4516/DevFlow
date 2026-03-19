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

    // MySQL (Railway / local) – set in config.local.php or env vars for production
    'db_host'     => getenv('DB_HOST')     ?: 'localhost',
    'db_user'     => getenv('DB_USER')     ?: 'root',
    'db_password' => getenv('DB_PASSWORD') ?: '',
    'db_name'     => getenv('DB_NAME')     ?: 'php_project',
    'db_port'     => getenv('DB_PORT')     ?: 3306,
];

// `config.local.php` should be a local-dev override only.
// On Railway, environment variables must take precedence (otherwise redirects/CORS can point to localhost).
if (is_file(__DIR__ . '/config.local.php')) {
    $local = require __DIR__ . '/config.local.php';

    // Map config keys -> env var names so env overrides always win.
    $envMap = [
        'google_client_id'     => 'GOOGLE_CLIENT_ID',
        'google_client_secret' => 'GOOGLE_CLIENT_SECRET',
        'github_client_id'     => 'GITHUB_CLIENT_ID',
        'github_client_secret' => 'GITHUB_CLIENT_SECRET',
        'backend_base_url'     => 'BACKEND_BASE_URL',
        'frontend_base_url'    => 'FRONTEND_BASE_URL',
        'db_host'              => 'DB_HOST',
        'db_user'              => 'DB_USER',
        'db_password'          => 'DB_PASSWORD',
        'db_name'              => 'DB_NAME',
        'db_port'              => 'DB_PORT',
    ];

    foreach ($local as $key => $value) {
        $envKey = $envMap[$key] ?? null;
        if ($envKey) {
            $envVal = getenv($envKey);
            // If env is set (Railway), keep env value.
            if ($envVal !== false && $envVal !== '') {
                continue;
            }
        }
        $config[$key] = $value;
    }
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
