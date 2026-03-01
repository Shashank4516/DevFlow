<?php
/**
 * One-off debug: check that the users table exists and the INSERT works.
 * Open in browser: .../backend/db-check-users-table.php
 * Remove or restrict in production.
 */
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

$out = ['ok' => false, 'error' => null, 'table_columns' => null, 'insert_test' => null];

// 1. List columns
$result = mysqli_query($conn, "SHOW COLUMNS FROM users");
if (!$result) {
    $out['error'] = 'Table "users" missing or not accessible: ' . mysqli_error($conn);
    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}

$out['table_columns'] = [];
while ($row = mysqli_fetch_assoc($result)) {
    $out['table_columns'][] = $row['Field'] . ' (' . $row['Type'] . ')';
}

// 2. Try the same INSERT as in the callback (then delete the test row)
$stmt = mysqli_prepare($conn, "
    INSERT INTO users (email, name, profile_image, auth_provider, auth_provider_id)
    VALUES (?, ?, ?, 'google', ?)
    ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        name = VALUES(name),
        profile_image = VALUES(profile_image)
");
if (!$stmt) {
    $out['insert_test'] = 'prepare failed: ' . mysqli_error($conn);
    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}

$email = 'test-check@example.com';
$name = 'Test User';
$picture = 'https://example.com/photo.jpg';
$googleId = 'test-google-id-123';
mysqli_stmt_bind_param($stmt, 'ssss', $email, $name, $picture, $googleId);

if (!mysqli_stmt_execute($stmt)) {
    $out['insert_test'] = 'execute failed: ' . mysqli_error($conn);
    mysqli_stmt_close($stmt);
    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}

$newId = mysqli_insert_id($conn);
mysqli_stmt_close($stmt);

// Delete test row
mysqli_query($conn, "DELETE FROM users WHERE auth_provider = 'google' AND auth_provider_id = 'test-google-id-123'");

$out['ok'] = true;
$out['insert_test'] = 'success (inserted id ' . $newId . ', then deleted test row)';

echo json_encode($out, JSON_PRETTY_PRINT);
