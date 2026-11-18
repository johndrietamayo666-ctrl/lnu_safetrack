<?php
$method = $_SERVER['REQUEST_METHOD'];
$user = require_login();
if ($user['role'] !== 'admin') json_response(['ok' => false, 'message' => 'Admin access required.'], 403);

if ($endpoint === 'admin-users' && $method === 'GET') {
    $users = $conn->query("
        SELECT u.id, u.full_name, u.username, u.role, u.status, u.created_at, 'user' AS type,
        (SELECT COUNT(*) FROM violations v WHERE v.user_id = u.id) AS strikes
        FROM users u
    ")->fetchAll();

    $guests = $conn->query("
        SELECT g.id, g.full_name, g.valid_id AS username, 'guest' AS role, g.status, g.created_at, 'guest' AS type,
        (SELECT COUNT(*) FROM violations v WHERE v.guest_id = g.id) AS strikes
        FROM guest_accounts g
    ")->fetchAll();

    $all = array_merge($users, $guests);

    // Custom sorting: Admin -> Staff -> Student -> Verified Guest -> Pending Guest
    usort($all, function($a, $b) {
        $roleOrder = ['admin' => 1, 'staff' => 2, 'student' => 3, 'guest' => 4];
        
        $aRole = $a['type'] === 'guest' ? 'guest' : $a['role'];
        $bRole = $b['type'] === 'guest' ? 'guest' : $b['role'];
        
        // If both are guests, pending goes last
        if ($aRole === 'guest' && $bRole === 'guest') {
            $aStatus = $a['status'] === 'pending' ? 5 : 4;
            $bStatus = $b['status'] === 'pending' ? 5 : 4;
            if ($aStatus !== $bStatus) return $aStatus <=> $bStatus;
            return strcmp($a['full_name'], $b['full_name']);
        }
        
        if ($roleOrder[$aRole] !== $roleOrder[$bRole]) {
            return $roleOrder[$aRole] <=> $roleOrder[$bRole];
        }
        
        return strcmp($a['full_name'], $b['full_name']);
    });

    json_response(['ok' => true, 'users' => $all]);
}

if ($endpoint === 'admin-users' && $method === 'POST') {
    $data = input_json();
    $action = $data['action'] ?? '';
    $id = (int)($data['user_id'] ?? 0);
    $type = $data['type'] ?? 'user';
    $table = $type === 'guest' ? 'guest_accounts' : 'users';

    if ($action === 'create') {
        $first = trim($data['first_name'] ?? '');
        $middle = trim($data['middle_name'] ?? '');
        $last = trim($data['last_name'] ?? '');
        $instId = trim($data['institutional_id'] ?? '');
        $email = trim($data['email'] ?? ''); 
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'student';

        $name = trim("$first $middle $last"); 

        if (strpos($username, '@') !== 0) {
            json_response(['ok' => false, 'message' => 'Username must start with @.'], 422);
        }
        
        $username = ltrim($username, '@'); 
        
        if (strlen($username) < 3) {
            json_response(['ok' => false, 'message' => 'Username must be at least 3 characters long.'], 422);
        }

        if (!$name || !$instId || !$email || !preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $password)) {
            json_response(['ok' => false, 'message' => 'Please fill all fields and create a valid password.'], 422);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        try {
            $stmt = $conn->prepare("INSERT INTO users (full_name, first_name, middle_name, last_name, institutional_id, email, username, password_hash, role) VALUES (?,?,?,?,?,?,?,?,?)");
            $stmt->execute([$name, $first, $middle, $last, $instId, $email, $username, $hash, $role]);
            json_response(['ok' => true, 'message' => 'User created successfully.']);
        } catch (PDOException $e) {
            json_response(['ok' => false, 'message' => 'Username, Email, or Institutional ID already exists.'], 422);
        }
    }

    if ($action === 'toggle_block') {
        $stmt = $conn->prepare("SELECT status FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        $curr = $stmt->fetchColumn();
        $new = $curr === 'active' || $curr === 'verified' ? 'blocked' : 'active';
        if ($new === 'active' && $type === 'guest') $new = 'verified';
        
        $conn->prepare("UPDATE $table SET status = ? WHERE id = ?")->execute([$new, $id]);
        json_response(['ok' => true, 'message' => "Status changed to $new."]);
    }

    if ($action === 'reset_password') {
        if ($type === 'guest') json_response(['ok' => false, 'message' => 'Guests do not have passwords.'], 403);
        $newPass = $data['password'] ?? '';
        
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $newPass)) {
            json_response(['ok' => false, 'message' => 'Password must be at least 8 characters long and include a mix of uppercase, lowercase, and numbers.'], 422);
        }
        
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $id]);
        json_response(['ok' => true, 'message' => 'Password reset successfully.']);
    }

    if ($action === 'delete') {
        if ($type === 'user') {
            $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() === 'admin') {
                json_response(['ok' => false, 'message' => 'Cannot delete an Admin account.'], 403);
            }
        }
        $conn->prepare("DELETE FROM $table WHERE id = ?")->execute([$id]);
        json_response(['ok' => true, 'message' => 'Account deleted permanently.']);
    }
}