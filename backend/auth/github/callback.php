<?php
/**
 * GitHub OAuth callback: exchange code for token, get user, store in session.
 * If user already logged in (e.g. via Google) -> connect GitHub (add token to session).
 * If not logged in -> login with GitHub (create session from GitHub user).
 */
session_start();

$config = require dirname(__DIR__, 2) . '/config.php';
$clientId = $config['github_client_id'] ?? '';
$clientSecret = $config['github_client_secret'] ?? '';
$backendBase = rtrim($config['backend_base_url'], '/');
$frontendBase = rtrim($config['frontend_base_url'], '/');
$redirectUri = $backendBase . '/auth/github/callback.php';

$code = isset($_GET['code']) ? trim($_GET['code']) : '';
$state = isset($_GET['state']) ? trim($_GET['state']) : '';
$error = isset($_GET['error']) ? trim($_GET['error']) : '';

if ($error !== '') {
    header('Location: ' . $frontendBase . '/auth-login?error=github_' . urlencode($error));
    exit;
}

if (empty($_SESSION['github_oauth_state']) || $state !== $_SESSION['github_oauth_state']) {
    header('Location: ' . $frontendBase . '/auth-login?error=github_invalid_state');
    exit;
}
unset($_SESSION['github_oauth_state']);

if ($code === '') {
    header('Location: ' . $frontendBase . '/auth-login?error=github_no_code');
    exit;
}

// Exchange code for token
$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST          => true,
    CURLOPT_POSTFIELDS    => json_encode([
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'code'          => $code,
        'redirect_uri'  => $redirectUri,
    ]),
    CURLOPT_HTTPHEADER    => [
        'Accept: application/json',
        'Content-Type: application/json',
    ],
]);
$tokenResponse = curl_exec($ch);
$tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$tokenData = json_decode($tokenResponse, true);
$accessToken = $tokenData['access_token'] ?? '';

if ($accessToken === '') {
    header('Location: ' . $frontendBase . '/auth-login?error=github_token_failed');
    exit;
}

// Get GitHub user (GitHub API requires User-Agent)
$ch = curl_init('https://api.github.com/user');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: token ' . $accessToken,
        'Accept: application/vnd.github.v3+json',
        'User-Agent: DevFlow-App',
    ],
]);
$userResponse = curl_exec($ch);
$userHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($userHttpCode !== 200) {
    header('Location: ' . $frontendBase . '/auth-login?error=github_user_failed');
    exit;
}

$ghUser = json_decode($userResponse, true);
if (!is_array($ghUser)) {
    header('Location: ' . $frontendBase . '/auth-login?error=github_user_invalid');
    exit;
}

$githubUsername = $ghUser['login'] ?? '';
$githubAvatar = $ghUser['avatar_url'] ?? '';
$githubName = $ghUser['name'] ?? $githubUsername;
$githubEmail = $ghUser['email'] ?? '';

// If email not public, fetch from emails API
if ($githubEmail === '' && $accessToken) {
    $ch = curl_init('https://api.github.com/user/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: token ' . $accessToken,
            'Accept: application/vnd.github.v3+json',
            'User-Agent: DevFlow-App',
        ],
    ]);
    $emailsResponse = curl_exec($ch);
    curl_close($ch);
    $emails = json_decode($emailsResponse, true);
    if (is_array($emails)) {
        foreach ($emails as $e) {
            if (!empty($e['primary']) && !empty($e['email'])) {
                $githubEmail = $e['email'];
                break;
            }
        }
        if ($githubEmail === '' && isset($emails[0]['email'])) {
            $githubEmail = $emails[0]['email'];
        }
    }
}

// Store GitHub token and username in session (for both "connect" and "login" flows)
$_SESSION['github_token'] = $accessToken;
$_SESSION['github_username'] = $githubUsername;

$alreadyLoggedIn = !empty($_SESSION['logged_in']) && !empty($_SESSION['auth_user']);

if ($alreadyLoggedIn) {
    // Connect flow: user already logged in (e.g. via Google), just added GitHub
    header('Location: ' . $frontendBase . '/?github=connected');
    exit;
}

// Login flow: create session from GitHub user
$nameParts = preg_split('/\s+/', trim($githubName), 2);
$firstName = $nameParts[0] ?? $githubUsername;
$lastName = $nameParts[1] ?? '';

// Persist user to database (login flow only). Use placeholder email if GitHub did not provide one.
$dbUserId = 0;
$emailForDb = $githubEmail !== '' ? $githubEmail : ('github-' . $ghUser['id'] . '@placeholder.local');
require_once dirname(__DIR__, 2) . '/db.php';
$stmt = mysqli_prepare($conn, "
    INSERT INTO users (email, name, profile_image, auth_provider, auth_provider_id)
    VALUES (?, ?, ?, 'github', ?)
    ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        name = VALUES(name),
        profile_image = VALUES(profile_image)
");
if ($stmt) {
    $ghIdStr = (string) ($ghUser['id'] ?? '');
    mysqli_stmt_bind_param($stmt, 'ssss', $emailForDb, $githubName, $githubAvatar, $ghIdStr);
    if (mysqli_stmt_execute($stmt)) {
        $dbUserId = (int) mysqli_insert_id($conn);
    }
    mysqli_stmt_close($stmt);
}

$user = [
    'id'           => $dbUserId,
    'uid'          => 'github-' . $ghUser['id'],
    'email'        => $githubEmail,
    'displayName'  => $githubName,
    'photoURL'     => $githubAvatar,
    'firstName'    => $firstName,
    'lastName'     => $lastName,
    'profileImage' => $githubAvatar,
];
$basicDetails = [
    'firstName' => $firstName,
    'lastName'  => $lastName,
    'fullName'  => $githubName,
    'profile'   => $githubAvatar,
    'email'     => $githubEmail,
    'location'  => '',
];

$_SESSION['user_id']       = $dbUserId;
$_SESSION['auth_user']     = $user;
$_SESSION['basic_details'] = $basicDetails;
$_SESSION['logged_in']    = true;

header('Location: ' . $frontendBase . '/login/callback');
exit;
