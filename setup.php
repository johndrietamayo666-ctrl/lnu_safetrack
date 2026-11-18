<?php
session_start();
require_once __DIR__ . '/config/config.php';
try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME, DB_USER, DB_PASS);
    echo "✅ Database connected successfully to <b>" . DB_NAME . "</b>.";
} catch (Throwable $e) {
    echo "❌ Database connection failed: " . $e->getMessage();
}
?>