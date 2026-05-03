<?php
/**
 * Returns Twilio STUN/TURN ICE servers for WebRTC (short-lived credentials).
 * Requires PHP session (same as other dashboard APIs). Twilio secrets stay server-side.
 *
 * GET — JSON { "ice_servers": [ { "urls", "username"?, "credential"? }, ... ] }
 */
declare(strict_types=1);

require dirname(__DIR__, 2) . '/session_init.php';
session_start();

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
$frontendBase = rtrim((string) ($config['frontend_base_url'] ?? ''), '/');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string) $_SERVER['HTTP_ORIGIN']) : '';
if ($origin !== '') {
    $originNormalized = rtrim($origin, '/');
    $allow = ($originNormalized === $frontendBase);
    $fb = parse_url($frontendBase !== '' ? $frontendBase : 'http://localhost');
    $og = parse_url($originNormalized);
    if (!$allow && ($fb['host'] ?? '') === 'localhost' && ($og['host'] ?? '') === 'localhost') {
        $allow = true;
    }
    if ($allow) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (empty($_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_authenticated']);
    exit;
}

$accountSid = trim((string) ($config['twilio_account_sid'] ?? ''));
$authToken = trim((string) ($config['twilio_auth_token'] ?? ''));
if ($accountSid === '' || $authToken === '') {
    http_response_code(503);
    echo json_encode(['error' => 'twilio_not_configured']);
    exit;
}

$url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($accountSid) . '/Tokens.json';
$ch = curl_init($url);
if ($ch === false) {
    http_response_code(500);
    echo json_encode(['error' => 'curl_init_failed']);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD        => $accountSid . ':' . $authToken,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_POSTFIELDS     => 'Ttl=86400',
    CURLOPT_TIMEOUT        => 15,
]);

$body = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($body === false || $curlErr !== '') {
    http_response_code(502);
    echo json_encode(['error' => 'twilio_request_failed', 'detail' => $curlErr]);
    exit;
}

$data = json_decode((string) $body, true);
if (!is_array($data)) {
    http_response_code(502);
    echo json_encode(['error' => 'twilio_invalid_json']);
    exit;
}

if ($code < 200 || $code >= 300) {
    http_response_code(502);
    $msg = $data['message'] ?? $data['msg'] ?? 'twilio_error';
    echo json_encode(['error' => 'twilio_api_error', 'status' => $code, 'detail' => $msg]);
    exit;
}

$rawServers = $data['ice_servers'] ?? [];
if (!is_array($rawServers)) {
    http_response_code(502);
    echo json_encode(['error' => 'twilio_no_ice_servers']);
    exit;
}

$iceServers = [];
foreach ($rawServers as $entry) {
    if (!is_array($entry)) {
        continue;
    }
    $urls = $entry['urls'] ?? $entry['url'] ?? null;
    if ($urls === null || $urls === '') {
        continue;
    }
    $row = ['urls' => $urls];
    if (isset($entry['username']) && $entry['username'] !== '') {
        $row['username'] = (string) $entry['username'];
    }
    if (isset($entry['credential']) && $entry['credential'] !== '') {
        $row['credential'] = (string) $entry['credential'];
    }
    $iceServers[] = $row;
}

echo json_encode(['ice_servers' => $iceServers]);
