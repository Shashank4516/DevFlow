<?php
require __DIR__ . '/_common.php';
cors_preflight_and_start('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_ok(['error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['error' => 'not_authenticated']);
}

if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    http_response_code(400);
    json_ok(['error' => 'missing_file']);
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    json_ok(['error' => 'upload_failed', 'code' => $file['error'] ?? null]);
}

$maxBytes = 25 * 1024 * 1024;
$size = (int)($file['size'] ?? 0);
if ($size <= 0 || $size > $maxBytes) {
    http_response_code(400);
    json_ok(['error' => 'invalid_file_size']);
}

$tmp = (string)($file['tmp_name'] ?? '');
$originalName = basename((string)($file['name'] ?? 'file'));
$mime = 'application/octet-stream';
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $detected = finfo_file($finfo, $tmp);
        if (is_string($detected) && $detected !== '') {
            $mime = $detected;
        }
        finfo_close($finfo);
    }
}

$allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/zip', 'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'video/webm', 'video/mp4',
];
if (!in_array($mime, $allowedMimes, true)) {
    http_response_code(400);
    json_ok(['error' => 'file_type_not_allowed', 'mime' => $mime]);
}

$kind = (string)($_POST['kind'] ?? '');
if ($kind === '') {
    $kind = strpos($mime, 'image/') === 0 ? 'image' : (strpos($mime, 'audio/') === 0 ? 'voice' : 'file');
}
if (!in_array($kind, ['image', 'file', 'voice'], true)) {
    $kind = 'file';
}

$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
if ($ext === '') {
    $extMap = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'audio/webm' => 'webm',
        'audio/ogg' => 'ogg',
        'audio/mpeg' => 'mp3',
        'audio/mp4' => 'm4a',
        'audio/wav' => 'wav',
        'audio/x-wav' => 'wav',
        'application/pdf' => 'pdf',
        'text/plain' => 'txt',
    ];
    $ext = $extMap[$mime] ?? 'bin';
}

$uploadDir = dirname(__DIR__, 2) . '/uploads/messages';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
    http_response_code(500);
    json_ok(['error' => 'upload_dir_create_failed']);
}

$safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '-', pathinfo($originalName, PATHINFO_FILENAME));
$safeName = trim((string)$safeName, '-');
if ($safeName === '') $safeName = 'message';
$storedName = date('YmdHis') . '-' . bin2hex(random_bytes(8)) . '-' . $safeName . '.' . $ext;
$target = $uploadDir . '/' . $storedName;

if (!move_uploaded_file($tmp, $target)) {
    http_response_code(500);
    json_ok(['error' => 'move_upload_failed']);
}

$config = require dirname(__DIR__, 2) . '/config.php';
$backendBase = rtrim((string)($config['backend_base_url'] ?? ''), '/');
$url = ($backendBase !== '' ? $backendBase : '') . '/uploads/messages/' . rawurlencode($storedName);
$duration = isset($_POST['duration']) ? (float)$_POST['duration'] : null;

json_ok([
    'attachment' => [
        'url' => $url,
        'type' => $kind,
        'name' => $originalName,
        'size' => $size,
        'mimeType' => $mime,
        'duration' => $duration,
    ],
]);
