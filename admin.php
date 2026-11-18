<?php
session_start();
require_once __DIR__ . '/config/config.php';
if (empty($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    header('Location: dashboard.php');
    exit;
}
$user = $_SESSION['user'];
$avatar = !empty($user['profile_pic']) ? htmlspecialchars($user['profile_pic']) : 'https://ui-avatars.com/api/?name=' . urlencode($user['full_name']) . '&background=7b1e2b&color=fff';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Admin Console — LNU SafeTrack</title>
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/dashboard.css">
</head>
<body>
<aside class="sidebar no-print">
    <!-- ADDED data-tooltip="Dashboard" HERE -->
    <div class="sidebar-brand" data-tooltip="Dashboard" onclick="window.location.href='dashboard.php'" style="cursor:pointer;" title="Back to Dashboard">
        <img src="assets/img/lnu-logo.png" alt="LNU" onerror="this.style.display='none'">
        <div>
            <h2>SafeTrack</h2>
            <p>Admin Console</p>
        </div>
    </div>

    <nav class="sidebar-nav">
        <button class="d-tab active" data-tooltip="User Management" data-target="admin-tab-users"><span style="font-size:1.2rem;">👥</span> <span>User Management</span></button>
        <button class="d-tab" data-tooltip="Guest Verification" data-target="admin-tab-guests"><span style="font-size:1.2rem;">🛡️</span> <span>Guest Verification</span></button>
        <button class="d-tab" data-tooltip="Strike Watchlist" data-target="admin-tab-watchlist"><span style="font-size:1.2rem;">⚠️</span> <span>Strike Watchlist</span></button>
        <a href="dashboard.php" class="d-tab" data-tooltip="Back to Dashboard" style="text-decoration:none;"><span style="font-size:1.2rem;">↩️</span> <span>Back to Dashboard</span></a>
    </nav>

    <div class="sidebar-footer">
        <!-- ADDED data-tooltip="Profile Settings" HERE -->
        <div class="profile-widget" data-tooltip="Profile Settings">
            <img src="<?= $avatar ?>" alt="Profile" class="profile-avatar">
            <div>
                <b><?= htmlspecialchars($user['full_name']) ?></b>
                <span class="role-pill admin">ADMIN</span>
            </div>
        </div>
        <button id="logoutBtn" class="btn ghost" style="width:100%; margin-top:16px;">Logout</button>
    </div>
</aside>

<div class="sidebar-overlay" onclick="toggleMobileMenu()"></div>

<main class="main-wrapper">
    <header class="topbar-modern no-print">
        <div style="display: flex; align-items: center; gap: 12px;">
            <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1>Admin Console</h1>
        </div>
        <div class="topbar-right">
            <div class="date-display" id="currentDateDisplay"></div>
        </div>
    </header>

    <div class="dashboard-content">
        <div id="admin-tab-users" class="tab-content active">
            <div class="admin-layout">
                <section class="panel">
                    <div class="section-head"><h2>Create Account</h2></div>
                    <form id="createUserForm" class="form-grid" style="grid-template-columns: 1fr;">
                        <div class="name-grid">
                            <label>First Name<input id="nuFirstName" placeholder="e.g. John" required pattern="^[A-Za-z\s]+$"></label>
                            <label>Middle Name<input id="nuMiddleName" placeholder="e.g. Dela"></label>
                            <label>Last Name<input id="nuLastName" placeholder="e.g. Cruz" required pattern="^[A-Za-z\s]+$"></label>
                        </div>
                        <label>Email<input id="nuEmail" type="email" placeholder="e.g. john.cruz@lnu.edu.ph" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"></label>
                        <label>Username<input id="nuUsername" required autocomplete="off" pattern="^@[a-zA-Z0-9_.-]{3,20}$" title="Must start with @ and contain 3-20 letters, numbers, underscores, or dashes." placeholder="e.g. @student1"></label>
                        <label>Password<input id="nuPassword" type="password" required minlength="8" pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Must be 8+ chars with uppercase, lowercase, and numbers." autocomplete="new-password" placeholder="e.g. Password123"></label>
                        <label>Role
                            <select id="nuRole" required>
                                <option value="student">Student</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        <button class="btn primary" type="submit" style="margin-top:10px;">Create User</button>
                    </form>
                    <p id="nuMsg" class="form-msg"></p>
                </section>

                <section class="panel">
                    <div class="section-head"><h2>Account Directory</h2></div>
                    <div id="userTable" class="table-wrap" style="max-height: 700px;">
                        <div class="empty">Loading users...</div>
                    </div>
                </section>
            </div>
        </div>

        <div id="admin-tab-guests" class="tab-content">
            <section class="panel">
                <div class="section-head"><h2>Pending Guest Verification</h2></div>
                <p class="muted" style="margin-bottom: 16px;">Review guest details and valid ID photos.</p>
                <div id="adminGuestTable" class="table-wrap">
                    <div class="empty">Loading guests...</div>
                </div>
            </section>
        </div>

        <div id="admin-tab-watchlist" class="tab-content">
            <section class="panel" style="background: #fffafb; border-color: #fecaca;">
                <div class="section-head"><h2 style="color: #991b1b;">Strike Watchlist</h2></div>
                <p class="muted" style="margin-bottom: 16px;">Users with 3 or more verified strikes.</p>
                <div id="watchlist">
                    <div class="empty">No users with 3+ strikes.</div>
                </div>
            </section>
        </div>
    </div>
</main>

<div id="adminHistoryModal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;" id="adminHistoryTitle">User History</h2>
            <button class="mini" onclick="document.getElementById('adminHistoryModal').classList.add('hidden')">Close</button>
        </div>
        <div id="adminHistoryContent">Loading...</div>
    </div>
</div>

<script>
window.LNU_USER = <?= json_encode($user, JSON_UNESCAPED_SLASHES) ?>;
function updateRealTimeClock() {
    document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit' });
}
updateRealTimeClock();
setInterval(updateRealTimeClock, 1000);
</script>
<!-- Bumped to v=1031 to force cache refresh -->
<script src="assets/js/admin.js?v=1031"></script>
</body>
</html>