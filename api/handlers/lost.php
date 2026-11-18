<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($endpoint === 'lost-property' && $method === 'GET') {
    try {
        $stmt = $conn->query("
            SELECT lp.*, 
                   COALESCE(u.full_name, g.full_name, 'Unknown') AS reporter_name,
                   COALESCE(ou.full_name, og.full_name) AS owner_name,
                   COALESCE(cu.full_name, cg.full_name) AS claimed_by_name
            FROM lost_property lp 
            LEFT JOIN users u ON u.id=lp.reporter_id 
            LEFT JOIN guest_accounts g ON g.id=lp.guest_id 
            LEFT JOIN users ou ON ou.id=lp.owner_id 
            LEFT JOIN guest_accounts og ON og.id=lp.owner_guest_id 
            LEFT JOIN users cu ON cu.id=lp.claimed_by_id
            LEFT JOIN guest_accounts cg ON cg.id=lp.claimed_by_guest_id
            WHERE lp.status <> 'closed' AND lp.status <> 'rejected'
            ORDER BY lp.created_at DESC
        ");
        json_response(['ok' => true, 'items' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        json_response(['ok' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
}

if ($endpoint === 'lost-property' && $method === 'POST') {
    $user = require_login();
    $photoPath = null;
    
    if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
        $dir = __DIR__ . '/../../uploads/evidence/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = 'lost_' . time() . '.' . strtolower(pathinfo($_FILES['media']['name'], PATHINFO_EXTENSION));
        move_uploaded_file($_FILES['media']['tmp_name'], $dir . $filename);
        $photoPath = 'uploads/evidence/' . $filename;
    }

    $year = date('Y');
    $base = (int)$conn->query("SELECT COUNT(*) FROM lost_property WHERE YEAR(created_at)=$year")->fetchColumn() + 1;
    $caseNo = "LNU-LP-$year-" . sprintf('%06d', $base);

    $isGuest = $user['role'] === 'guest';
    
    $stmt = $conn->prepare("INSERT INTO lost_property (case_no, reporter_id, guest_id, reporter_type, item_name, category, description, last_seen_lat, last_seen_lng, last_seen_place, photo_path, status) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'submitted')");
    $stmt->execute([$caseNo, $isGuest?null:$user['id'], $isGuest?$user['guest_id']:null, $user['role'], $_POST['item_name'], $_POST['category'], $_POST['description'], $_POST['latitude'], $_POST['longitude'], $_POST['last_seen_place'], $photoPath]);
    $itemId = $conn->lastInsertId();

    $tagged = trim($_POST['tagged_person'] ?? '');
    if ($tagged) {
        $stmt = $conn->prepare("SELECT id, 'user' as type FROM users WHERE full_name LIKE ? LIMIT 1"); 
        $stmt->execute(["%$tagged%"]);
        $owner = $stmt->fetch();
        if (!$owner) { 
            $stmt = $conn->prepare("SELECT id, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? LIMIT 1"); 
            $stmt->execute(["%$tagged%"]); 
            $owner = $stmt->fetch(); 
        }
        if ($owner) {
            $col = $owner['type'] === 'user' ? 'owner_id' : 'owner_guest_id';
            $conn->prepare("UPDATE lost_property SET $col = ? WHERE id = ?")->execute([$owner['id'], $itemId]);
        }
    }

    $msg = "New lost item reported: " . $_POST['item_name'];
    $staff = $conn->query("SELECT id FROM users WHERE role IN ('staff', 'admin')")->fetchAll();
    foreach ($staff as $s) {
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'lost', ?)")->execute([$s['id'], $msg, $itemId]);
    }
    
    json_response(['ok' => true, 'case_no' => $caseNo]);
}

if ($endpoint === 'review-lost' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $itemId = (int)$data['item_id'];
    $status = $data['status']; 
    
    if (!in_array($status, ['lost', 'rejected'], true)) json_response(['ok'=>false, 'message'=>'Invalid status.'], 422);
    
    $conn->prepare("UPDATE lost_property SET status=? WHERE id=?")->execute([$status, $itemId]);
    $conn->prepare("DELETE FROM notifications WHERE action_type = 'lost' AND action_id = ?")->execute([$itemId]);
    
    json_response(['ok' => true]);
}

if ($endpoint === 'update-lost-status' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $conn->prepare("UPDATE lost_property SET status=? WHERE id=?")->execute([$data['status'], $data['item_id']]);
    json_response(['ok' => true]);
}

if ($endpoint === 'tag-lost-owner' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $itemId = (int)$data['item_id']; 
    $searchName = trim($data['name']);
    $action = $data['action'] ?? 'owner';

    $stmt = $conn->prepare("SELECT id, 'user' as type FROM users WHERE full_name LIKE ? LIMIT 1"); 
    $stmt->execute(["%$searchName%"]);
    $person = $stmt->fetch();
    if (!$person) { 
        $stmt = $conn->prepare("SELECT id, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? LIMIT 1"); 
        $stmt->execute(["%$searchName%"]); 
        $person = $stmt->fetch(); 
    }
    if (!$person) json_response(['ok' => false, 'message' => 'User/Guest not found.'], 404);

    if ($action === 'claimer') {
        $col = $person['type'] === 'user' ? 'claimed_by_id' : 'claimed_by_guest_id';
    } else {
        $col = $person['type'] === 'user' ? 'owner_id' : 'owner_guest_id';
    }
    
    $conn->prepare("UPDATE lost_property SET $col = ? WHERE id = ?")->execute([$person['id'], $itemId]);
    json_response(['ok' => true, 'message' => ucfirst($action) . ' tagged successfully.']);
}