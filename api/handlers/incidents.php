<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($endpoint === 'incidents' && $method === 'GET') {
    $scope = $_GET['scope'] ?? 'campus';
    $stmt = $conn->prepare("SELECT i.*, COALESCE(u.full_name, g.full_name, 'Unknown') AS reporter_name, (SELECT GROUP_CONCAT(CONCAT(p.role, ': ', COALESCE(pu.full_name, pg.full_name)) SEPARATOR ', ') FROM incident_parties p LEFT JOIN users pu ON pu.id = p.user_id LEFT JOIN guest_accounts pg ON pg.id = p.guest_id WHERE p.incident_id = i.id) AS involved_people FROM incidents i LEFT JOIN users u ON u.id=i.reporter_id LEFT JOIN guest_accounts g ON g.id=i.guest_id WHERE i.status <> 'rejected' AND i.location_scope = ? ORDER BY i.created_at DESC");
    $stmt->execute([$scope]);
    json_response(['ok' => true, 'incidents' => $stmt->fetchAll()]);
}

if ($endpoint === 'incidents' && $method === 'POST') {
    $user = require_login();
    $lat = (float)$_POST['latitude']; $lng = (float)$_POST['longitude']; $scope = $_POST['location_scope'];
    
    if ($scope === 'campus' && !is_inside_campus($lat, $lng)) {
        json_response(['ok' => false, 'message' => 'Location is outside the LNU campus boundary.'], 422);
    }

    $photoPath = null; $videoPath = null;
    if (isset($_FILES['media']) && $_FILES['media']['error'] === UPLOAD_ERR_OK) {
        $dir = __DIR__ . '/../../uploads/evidence/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $ext = strtolower(pathinfo($_FILES['media']['name'], PATHINFO_EXTENSION));
        $filename = 'inc_' . time() . '.' . $ext;
        move_uploaded_file($_FILES['media']['tmp_name'], $dir . $filename);
        $path = 'uploads/evidence/' . $filename;
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) $photoPath = $path; else $videoPath = $path;
    }

    $year = date('Y');
    $base = (int)$conn->query("SELECT COUNT(*) FROM incidents WHERE YEAR(created_at)=$year")->fetchColumn() + 1;
    $caseNo = "LNU-INC-$year-" . sprintf('%06d', $base);

    $isGuest = $user['role'] === 'guest';
    $stmt = $conn->prepare("INSERT INTO incidents (case_no, reporter_id, guest_id, reporter_type, category, title, description, latitude, longitude, location_scope, severity, photo_path, video_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$caseNo, $isGuest?null:$user['id'], $isGuest?$user['guest_id']:null, $user['role'], $_POST['category'], $_POST['title'], $_POST['description'], $lat, $lng, $scope, $_POST['severity'], $photoPath, $videoPath]);
    $incId = $conn->lastInsertId();

    // Handle tagged person
    $tagged = trim($_POST['tagged_person'] ?? '');
    if ($tagged) {
        $stmt = $conn->prepare("SELECT id, 'user' as type FROM users WHERE full_name LIKE ? AND role = 'student' LIMIT 1"); $stmt->execute(["%$tagged%"]);
        $person = $stmt->fetch();
        if (!$person) { $stmt = $conn->prepare("SELECT id, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? LIMIT 1"); $stmt->execute(["%$tagged%"]); $person = $stmt->fetch(); }
        if ($person) {
            $uCol = $person['type'] === 'user' ? 'user_id' : 'guest_id';
            $conn->prepare("INSERT INTO incident_parties (incident_id, $uCol, role) VALUES (?, ?, 'victim')")->execute([$incId, $person['id']]);
        }
    }

    // Notify Staff/Admins
       // Notify Staff/Admins
    $severity = $_POST['severity'];
    $msg = "New $severity incident reported: " . $_POST['title'];
    $staff = $conn->query("SELECT id FROM users WHERE role IN ('staff', 'admin')")->fetchAll();
    foreach ($staff as $s) {
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id, severity) VALUES (?, ?, 'incident', ?, ?)")
             ->execute([$s['id'], $msg, $incId, $severity]);
    }
    
    json_response(['ok' => true, 'case_no' => $caseNo]);
}

if ($endpoint === 'tag-party' && $method === 'POST') {
    require_login(); 
    $data = input_json();
    $incidentId = (int)$data['incident_id']; $role = $data['role']; $searchName = trim($data['name']);

    $stmt = $conn->prepare("SELECT id, 'user' as type FROM users WHERE full_name LIKE ? AND role = 'student' LIMIT 1"); $stmt->execute(["%$searchName%"]);
    $person = $stmt->fetch();
    if (!$person) { $stmt = $conn->prepare("SELECT id, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? LIMIT 1"); $stmt->execute(["%$searchName%"]); $person = $stmt->fetch(); }
    if (!$person) json_response(['ok' => false, 'message' => 'Student/Guest not found.'], 404);

    $uCol = $person['type'] === 'user' ? 'user_id' : 'guest_id';
    $check = $conn->prepare("SELECT id FROM incident_parties WHERE incident_id = ? AND $uCol = ?");
    $check->execute([$incidentId, $person['id']]);
    if ($check->fetch()) json_response(['ok' => false, 'message' => 'Person already tagged.'], 422);

    $conn->prepare("INSERT INTO incident_parties (incident_id, $uCol, role) VALUES (?, ?, ?)")->execute([$incidentId, $person['id'], $role]);
    json_response(['ok' => true, 'message' => 'Person successfully tagged.']);
}

if ($endpoint === 'review' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $conn->prepare("UPDATE incidents SET status='reviewed', severity=? WHERE id=?")->execute([$data['severity'], $data['incident_id']]);
    
    // NEW: Delete the notification for this incident
    $conn->prepare("DELETE FROM notifications WHERE action_type = 'incident' AND action_id = ?")->execute([$data['incident_id']]);

    $stmt = $conn->prepare("SELECT reporter_id, guest_id, case_no FROM incidents WHERE id=?"); 
    $stmt->execute([$data['incident_id']]); $inc = $stmt->fetch();
    if ($inc) {
        $msg = "Your incident report {$inc['case_no']} has been reviewed by staff.";
        if ($inc['reporter_id']) $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'incident', ?)")->execute([$inc['reporter_id'], $msg, $data['incident_id']]);
        else if ($inc['guest_id']) $conn->prepare("INSERT INTO notifications (guest_id, message, action_type, action_id) VALUES (?, ?, 'incident', ?)")->execute([$inc['guest_id'], $msg, $data['incident_id']]);
    }
    json_response(['ok' => true]);
}

if ($endpoint === 'remove-incident' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $conn->prepare("UPDATE incidents SET status='rejected' WHERE id=?")->execute([$data['incident_id']]);
    
    // NEW: Delete the notification for this incident
    $conn->prepare("DELETE FROM notifications WHERE action_type = 'incident' AND action_id = ?")->execute([$data['incident_id']]);
    
    json_response(['ok' => true]);
}

if ($endpoint === 'update-incident-status' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $conn->prepare("UPDATE incidents SET status=? WHERE id=?")->execute([$data['status'], $data['incident_id']]);
    
    // Notify the reporter
    $stmt = $conn->prepare("SELECT reporter_id, guest_id, case_no FROM incidents WHERE id=?"); 
    $stmt->execute([$data['incident_id']]); $inc = $stmt->fetch();
    if ($inc) {
        $msg = "Your incident report {$inc['case_no']} has been marked as " . strtoupper($data['status']) . ".";
        if ($inc['reporter_id']) $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'incident', ?)")->execute([$inc['reporter_id'], $msg, $data['incident_id']]);
        else if ($inc['guest_id']) $conn->prepare("INSERT INTO notifications (guest_id, message, action_type, action_id) VALUES (?, ?, 'incident', ?)")->execute([$inc['guest_id'], $msg, $data['incident_id']]);
    }
    json_response(['ok' => true]);
}