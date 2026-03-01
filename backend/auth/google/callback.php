<?php
/**
 * Google OAuth callback: exchange code for tokens, get user info, create session, redirect to React.
 * This URL must be set as "Authorized redirect URI" in Google Cloud Console.
 */
session_start();

$config = require dirname(__DIR__, 2) . '/config.php';
$clientId     = $config['google_client_id'];
$clientSecret = $config['google_client_secret'];
$backendBase  = rtrim($config['backend_base_url'], '/');
$frontendBase = rtrim($config['frontend_base_url'], '/');
$redirectUri  = $backendBase . '/auth/google/callback.php';

$code = isset($_GET['code']) ? trim($_GET['code']) : '';
$error = isset($_GET['error']) ? trim($_GET['error']) : '';

if ($error !== '') {
    header('Location: ' . $frontendBase . '/auth-login?error=' . urlencode($error));
    exit;
}

if ($code === '') {
    header('Location: ' . $frontendBase . '/auth-login?error=no_code');
    exit;
}

// Exchange code for tokens
$tokenUrl = 'https://oauth2.googleapis.com/token';
$tokenBody = [
    'code'          => $code,
    'client_id'     => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri'  => $redirectUri,
    'grant_type'    => 'authorization_code',
];

$ch = curl_init($tokenUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST          => true,
    CURLOPT_POSTFIELDS    => http_build_query($tokenBody),
    CURLOPT_HTTPHEADER    => ['Content-Type: application/x-www-form-urlencoded'],
]);
$tokenResponse = curl_exec($ch);
$tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($tokenHttpCode !== 200) {
    header('Location: ' . $frontendBase . '/auth-login?error=token_exchange_failed');
    exit;
}

$tokenData = json_decode($tokenResponse, true);
$accessToken = isset($tokenData['access_token']) ? $tokenData['access_token'] : '';

if ($accessToken === '') {
    header('Location: ' . $frontendBase . '/auth-login?error=no_access_token');
    exit;
}

// Get user info
$userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
$ch = curl_init($userInfoUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER    => ['Authorization: Bearer ' . $accessToken],
]);
$userInfoResponse = curl_exec($ch);
$userInfoHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($userInfoHttpCode !== 200) {
    header('Location: ' . $frontendBase . '/auth-login?error=userinfo_failed');
    exit;
}

$profile = json_decode($userInfoResponse, true);
if (!is_array($profile)) {
    header('Location: ' . $frontendBase . '/auth-login?error=invalid_userinfo');
    exit;
}

// Build user object to match what the React app expects (basicDetails + authUser shape)
$firstName  = isset($profile['given_name'])  ? $profile['given_name']  : '';
$lastName   = isset($profile['family_name']) ? $profile['family_name'] : '';
$fullName   = isset($profile['name'])        ? trim($profile['name'])  : trim($firstName . ' ' . $lastName);
$email      = isset($profile['email'])      ? $profile['email']       : '';
$picture    = isset($profile['picture'])    ? $profile['picture']     : '';
$googleId   = isset($profile['id'])         ? $profile['id']          : '';

// Persist user to database
$dbUserId = 0;
require_once dirname(__DIR__, 2) . '/db.php';
$stmt = mysqli_prepare($conn, "
    INSERT INTO users (email, name, profile_image, auth_provider, auth_provider_id)
    VALUES (?, ?, ?, 'google', ?)
    ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        name = VALUES(name),
        profile_image = VALUES(profile_image)
");
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'ssss', $email, $fullName, $picture, $googleId);
    if (mysqli_stmt_execute($stmt)) {
        $dbUserId = (int) mysqli_insert_id($conn);
    }
    mysqli_stmt_close($stmt);
}

$user = [
    'id'          => $dbUserId,
    'uid'         => $googleId,
    'email'       => $email,
    'displayName' => $fullName,
    'photoURL'    => $picture,
    'firstName'   => $firstName,
    'lastName'    => $lastName,
    'profileImage'=> $picture,
];
$basicDetails = [
    'firstName' => $firstName,
    'lastName'  => $lastName,
    'fullName'  => $fullName,
    'profile'   => $picture,
    'email'     => $email,
    'location'  => '',
];

$_SESSION['user_id']        = $dbUserId;
$_SESSION['auth_user']      = $user;
$_SESSION['basic_details']  = $basicDetails;
$_SESSION['logged_in']      = true;

// Redirect to frontend (optionally to a callback route so React can sync state)
$redirectTo = $frontendBase . '/login/callback';
header('Location: ' . $redirectTo);
exit;
