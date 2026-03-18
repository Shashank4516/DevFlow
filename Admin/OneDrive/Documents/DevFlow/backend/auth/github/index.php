<?php
/**
 * Start GitHub OAuth: redirect user to GitHub.
 * Use for "Connect GitHub" (when already logged in) or "Sign in with GitHub" (from auth page).
 */
session_start();

$config = require dirname(__DIR__, 2) . '/config.php';
$clientId = $config['github_client_id'] ?? '';
$backendBase = rtrim($config['backend_base_url'], '/');
$redirectUri = $backendBase . '/auth/github/callback.php';

if (empty($clientId)) {
    header('Location: ' . ($config['frontend_base_url'] ?? 'http://localhost:3000') . '/auth-login?error=github_not_configured');
    exit;
}

$state = bin2hex(random_bytes(16));
$_SESSION['github_oauth_state'] = $state;

$params = [
    'client_id'    => $clientId,
    'redirect_uri' => $redirectUri,
    'scope'        => 'repo read:user user:email',
    'state'        => $state,
];
$authUrl = 'https://github.com/login/oauth/authorize?' . http_build_query($params);

header('Location: ' . $authUrl);
exit;
