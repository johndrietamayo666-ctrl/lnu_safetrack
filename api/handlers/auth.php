<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($endpoint === 'login' && $method === 'POST') {
    $data = input_json();
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND role = ? LIMIT 1");
    $stmt->execute([trim($data['username'] ?? ''), $data['role'] ?? '']);
    $user = $stmt->fetch();

    if (!$user) json_response(['ok' => false, 'message' => 'Invalid credentials.'], 401);
    if ($user['status'] === 'blocked') json_response(['ok' => false, 'message' => 'Your account has been blocked. Please visit the SAO office.'], 403);
    if (!password_verify($data['password'] ?? '', $user['password_hash'])) json_response(['ok' => false, 'message' => 'Invalid credentials.'], 401);
    
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id' => (int)$user['id'], 'full_name' => $user['full_name'], 'email' => $user['email'], 
        'phone' => $user['phone'], 'role' => $user['role'], 'profile_pic' => $user['profile_pic']
    ];
    json_response(['ok' => true, 'user' => $_SESSION['user']]);
}

if ($endpoint === 'logout' && $method === 'POST') {
    $_SESSION = [];
    session_destroy();
    json_response(['ok' => true]);
}

if ($endpoint === 'guest-register' && $method === 'POST') {
    $validId = trim($_POST['valid_id'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $first = trim($_POST['first_name'] ?? '');
    $middle = trim($_POST['middle_name'] ?? '');
    $last = trim($_POST['last_name'] ?? '');
    
    $fullName = trim("$first $middle $last"); // Combine names

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['ok' => false, 'message' => 'Please enter a valid email address.'], 422);
    }

    if (strlen($validId) < 6) json_response(['ok' => false, 'message' => 'Invalid ID format.'], 422);
    if (!isset($_FILES['id_photo']) || $_FILES['id_photo']['error'] !== UPLOAD_ERR_OK) json_response(['ok' => false, 'message' => 'Upload valid ID photo.'], 422);
    
    // Generate a custom Guest ID (e.g., GST-17154234)
    $guestNo = 'GST-' . substr(time(), -6) . rand(10, 99);

    $dir = __DIR__ . '/../../uploads/ids/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $filename = 'guest_' . time() . '.' . strtolower(pathinfo($_FILES['id_photo']['name'], PATHINFO_EXTENSION));
    move_uploaded_file($_FILES['id_photo']['tmp_name'], $dir . $filename);

    $stmt = $conn->prepare("INSERT INTO guest_accounts (guest_no, first_name, middle_name, last_name, full_name, email, phone, valid_id, id_photo_path, reason) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$guestNo, $first, $middle, $last, $fullName, $email, trim($_POST['phone']), $validId, 'uploads/ids/'.$filename, trim($_POST['reason'])]);
    $guestId = $conn->lastInsertId();

    $admins = $conn->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll();
    foreach ($admins as $a) {
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'guest', ?)")
             ->execute([$a['id'], "New guest pending verification: $fullName", $guestId]);
    }

    json_response(['ok' => true, 'message' => 'Guest request submitted.']);
}

if ($endpoint === 'guest-login' && $method === 'POST') {
    $data = input_json();
    $stmt = $conn->prepare("SELECT * FROM guest_accounts WHERE (email = ? OR phone = ?) AND valid_id = ? LIMIT 1");
    $stmt->execute([trim($data['email_or_phone']), trim($data['email_or_phone']), trim($data['valid_id'])]);
    $guest = $stmt->fetch();

    if (!$guest) json_response(['ok' => false, 'message' => 'Guest record not found.'], 401);
    if ($guest['status'] === 'blocked') json_response(['ok' => false, 'message' => 'Your guest account has been blocked. Please visit the SAO office.'], 403);
    if ($guest['status'] !== 'verified') json_response(['ok' => false, 'message' => 'Account pending verification.'], 403);
    
    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => 0, 'guest_id' => (int)$guest['id'], 'full_name' => $guest['full_name'], 'role' => 'guest', 'profile_pic' => null];
    json_response(['ok' => true, 'user' => $_SESSION['user']]);
}

if ($endpoint === 'change-password' && $method === 'POST') {
    $user = require_login();
    if ($user['role'] === 'guest') json_response(['ok' => false, 'message' => 'Guests cannot change passwords.'], 403);
    $data = input_json();
    $new = $data['new_password'] ?? '';
    
    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $new)) {
        json_response(['ok' => false, 'message' => 'Password must be at least 8 characters long and include a mix of uppercase, lowercase, and numbers.'], 422);
    }
    
    $stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    if (!password_verify($data['old_password'] ?? '', $stmt->fetchColumn())) json_response(['ok' => false, 'message' => 'Incorrect current password.'], 401);
    
    $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
    json_response(['ok' => true, 'message' => 'Password updated successfully.']);
}

if ($endpoint === 'update-profile' && $method === 'POST') {
    $user = require_login();
    if ($user['role'] === 'guest') json_response(['ok' => false, 'message' => 'Guests cannot edit profiles.'], 403);
    
    $name = trim($_POST['full_name']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    
    $stmt = $conn->prepare("UPDATE users SET full_name=?, email=?, phone=? WHERE id=?");
    $stmt->execute([$name, $email, $phone, $user['id']]);
    $_SESSION['user']['full_name'] = $name;
    $_SESSION['user']['email'] = $email;
    $_SESSION['user']['phone'] = $phone;

    // NEW: Handle removal of profile pic
    if (isset($_POST['remove_pic']) && $_POST['remove_pic'] === '1') {
        $stmt = $conn->prepare("SELECT profile_pic FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $oldPic = $stmt->fetchColumn();
        if ($oldPic && file_exists(__DIR__ . '/../../' . $oldPic)) {
            unlink(__DIR__ . '/../../' . $oldPic); // Delete file from server
        }
        $conn->prepare("UPDATE users SET profile_pic = NULL WHERE id = ?")->execute([$user['id']]);
        $_SESSION['user']['profile_pic'] = null;
    } 
    // Handle new profile pic upload
    else if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
        $dir = __DIR__ . '/../../uploads/profiles/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = 'user_' . $user['id'] . '_' . time() . '.' . strtolower(pathinfo($_FILES['profile_pic']['name'], PATHINFO_EXTENSION));
        move_uploaded_file($_FILES['profile_pic']['tmp_name'], $dir . $filename);
        $dbPath = 'uploads/profiles/' . $filename;
        $conn->prepare("UPDATE users SET profile_pic = ? WHERE id = ?")->execute([$dbPath, $user['id']]);
        $_SESSION['user']['profile_pic'] = $dbPath;
    }
    json_response(['ok' => true, 'message' => 'Profile updated.', 'user' => $_SESSION['user']]);
}