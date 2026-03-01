<?php
/**
 * MySQL connection for the project.
 * Usage: require_once __DIR__ . '/db.php';  → $conn is available (mysqli).
 */
$config = require __DIR__ . '/config.php';

$conn = mysqli_connect(
    $config['db_host'],
    $config['db_user'],
    $config['db_password'],
    $config['db_name'],
    (int) $config['db_port']
);

if (!$conn) {
    die('Connection failed: ' . mysqli_connect_error());
}
