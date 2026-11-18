<?php
require_once 'config/config.php';
try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME, DB_USER, DB_PASS);
    $newHash = password_hash('Password123', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password_hash = ?");
    $stmt->execute([$newHash]);
    echo "<h2>✅ Success!</h2><p>All accounts have been updated.</p><p><b>Password:</b> Password123</p><p><a href='index.php'>Go to Login</a></p>";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>