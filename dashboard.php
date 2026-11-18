<?php
session_start();
require_once __DIR__ . '/config/config.php';
if (empty($_SESSION['user'])) { header('Location: index.php'); exit; }
$user = $_SESSION['user'];
$isStaff = in_array($user['role'], ['staff', 'admin'], true);
$roleClass = strtolower($user['role']);
$avatar = !empty($user['profile_pic']) ? htmlspecialchars($user['profile_pic']) : 'https://ui-avatars.com/api/?name=' . urlencode($user['full_name']) . '&background=7b1e2b&color=fff';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Dashboard — LNU SafeTrack</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/dashboard.css">
</head>
<body>
<!-- SIDEBAR -->
<aside class="sidebar no-print">
    <!-- ADDED data-tooltip="Home" HERE -->
    <div class="sidebar-brand" data-tooltip="Home" onclick="document.querySelector('.d-tab[data-target=\'tab-incident\']').click()" style="cursor:pointer;">
        <img src="assets/img/lnu-logo.png" alt="LNU" onerror="this.style.display='none'">
        <div>
            <h2>SafeTrack</h2>
            <p>Incident Management</p>
        </div>
    </div>

    <nav class="sidebar-nav">
        <button class="d-tab active" data-tooltip="Incident Reports" data-target="tab-incident"><span style="font-size:1.2rem;">🚨</span> <span>Incident Reports</span></button>
        <button class="d-tab" data-tooltip="Lost & Found" data-target="tab-lost"><span style="font-size:1.2rem;">🎒</span> <span>Lost &amp; Found</span></button>
        <button class="d-tab" data-tooltip="Messages" data-target="tab-messages"><span style="font-size:1.2rem;">💬</span> <span>Messages</span></button>
        <button class="d-tab" data-tooltip="Notifications" data-target="tab-notifications"><span style="font-size:1.2rem;">🔔</span> <span>Notifications</span></button>
        
        <?php if ($isStaff): ?>
            <button class="d-tab" data-tooltip="Investigation" data-target="tab-staff"><span style="font-size:1.2rem;">🛡️</span> <span>Investigation</span></button>
            <button class="d-tab" data-tooltip="Analytics" data-target="tab-analytics"><span style="font-size:1.2rem;">📊</span> <span>Analytics</span></button>
        <?php endif; ?>

        <?php if ($user['role'] === 'admin'): ?>
            <a href="admin.php" class="d-tab" data-tooltip="Admin Console" style="text-decoration:none;"><span style="font-size:1.2rem;">⚙️</span> <span>Admin Console</span></a>
        <?php endif; ?>
    </nav>

    <div class="sidebar-footer">
        <!-- ADDED data-tooltip="Profile Settings" HERE -->
        <div class="profile-widget" data-tooltip="Profile Settings" onclick="openSettingsModal()" title="Account Settings">
            <img src="<?= $avatar ?>" alt="Profile" class="profile-avatar">
            <div>
                <b><?= htmlspecialchars($user['full_name']) ?></b>
                <span class="role-pill <?= $roleClass ?>"><?= strtoupper($user['role']) ?></span>
            </div>
        </div>
        <a href="logout.php" class="btn ghost" style="width:100%; margin-top:16px;">Logout</a>
    </div>
</aside>

<!-- OVERLAY FOR MOBILE -->
<div class="sidebar-overlay" onclick="toggleMobileMenu()"></div>

<!-- MAIN WRAPPER -->
<main class="main-wrapper">
    <header class="topbar-modern no-print">
        <div style="display: flex; align-items: center; gap: 12px;">
            <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1>Dashboard</h1>
        </div>
        <div class="topbar-right">
            <div class="notif-bell" onclick="toggleNotifDropdown()">
                🔔 <span id="notifBadge" class="notif-badge hidden">0</span>
                <div id="notifDropdown" class="notif-dropdown hidden" onclick="event.stopPropagation()">
                    <h4>🔔 Notifications</h4>
                    <div id="notifList" style="max-height: 300px; overflow-y:auto;">Loading...</div>
                    <div class="notif-footer" onclick="viewAllNotifications()">View All Notifications</div>
                </div>
            </div>
            <div class="date-display" id="currentDateDisplay"></div>
        </div>
    </header>

    <div class="dashboard-content">
        <div id="printHeader" class="print-header" style="display: none;">
            <!-- Print Header Content -->
        </div>

        <!-- STAT CARDS -->
        <div class="stat-cards-container no-print">
            <div class="stat-card-modern" onclick="document.querySelector('.d-tab[data-target=\'tab-incident\']').click(); setTimeout(() => document.getElementById('incidentTable').scrollIntoView({behavior: 'smooth', block: 'center'}), 300);" title="View Recent Incidents">
                <div class="stat-card-left">
                    <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">🚨</div>
                    <div class="stat-info">
                        <h3 id="stat-recent-incidents">0</h3>
                        <p>Total Reports</p>
                    </div>
                </div>
                <div class="stat-arrow">→</div>
            </div>
            
            <div class="stat-card-modern" onclick="document.querySelector('.d-tab[data-target=\'tab-incident\']').click(); setTimeout(() => document.getElementById('pendingPanel').scrollIntoView({behavior: 'smooth', block: 'center'}), 300);" title="View Pending Queue">
                <div class="stat-card-left">
                    <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">⏳</div>
                    <div class="stat-info">
                        <h3 id="stat-pending-incidents">0</h3>
                        <p>Pending Incidents</p>
                    </div>
                </div>
                <div class="stat-arrow">→</div>
            </div>
            
            <div class="stat-card-modern" onclick="document.querySelector('.d-tab[data-target=\'tab-lost\']').click(); setTimeout(() => document.getElementById('lostTable').scrollIntoView({behavior: 'smooth', block: 'center'}), 300);" title="View Active Lost Items">
                <div class="stat-card-left">
                    <div class="stat-icon" style="background: #e0f2fe; color: #0ea5e9;">🎒</div>
                    <div class="stat-info">
                        <h3 id="stat-total-lost">0</h3>
                        <p>Active Lost Items</p>
                    </div>
                </div>
                <div class="stat-arrow">→</div>
            </div>
            
            <div class="stat-card-modern" onclick="document.querySelector('.d-tab[data-target=\'tab-lost\']').click(); setTimeout(() => document.getElementById('lostPendingPanel').scrollIntoView({behavior: 'smooth', block: 'center'}), 300);" title="View Pending Queue">
                <div class="stat-card-left">
                    <div class="stat-icon" style="background: #f3e8ff; color: #a855f7;">⌛</div>
                    <div class="stat-info">
                        <h3 id="stat-pending-lost">0</h3>
                        <p>Pending Lost Items</p>
                    </div>
                </div>
                <div class="stat-arrow">→</div>
            </div>
        </div>

        <!-- INCIDENT TAB -->
        <div id="tab-incident" class="tab-content active">
            <div class="layout-grid">
                <div class="col-main">
                    <section class="panel map-panel no-print">
                        <div class="section-head">
                            <div><h2>🗺️ Incident Map</h2><p class="muted">Click map to pin.</p></div>
                            <div class="map-scope">
                                <button type="button" class="scope-btn active" data-map="incident" data-scope="campus">Campus</button>
                                <button type="button" class="scope-btn" data-map="incident" data-scope="dagupan">Dagupan</button>
                            </div>
                        </div>
                        <div id="incident-map" class="map-container"></div>
                    </section>
                    <section class="panel no-print">
                        <div class="section-head"><h2>🚨 Report Incident</h2></div>
                        <form id="reportForm" class="form-grid">
                            <label>Category
                                <select id="incidentCategory" required>
                                    <option value="hazard">Hazard</option>
                                    <option value="crime">Crime</option>
                                    <option value="medical">Medical</option>
                                    <option value="fire">Fire</option>
                                    <option value="bullying">Bullying</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                            <label>Severity<select id="incidentSeverity" required><option value="minor">Minor</option><option value="severe">Severe</option></select></label>
                            <label class="full">Title<input id="incidentTitle" required maxlength="180"></label>
                            <label class="full">Description<textarea id="incidentDescription" rows="3" required></textarea></label>
                            <label class="full" style="position:relative;">Tag Person Involved
                                <input id="incidentTagPerson" autocomplete="off" placeholder="Type a student or guest name">
                                <div id="incidentTagDropdown" class="autocomplete-dropdown hidden"></div>
                            </label>
                            <label class="full">Upload Photo or Video<input type="file" id="incidentMedia" accept="image/*,video/*"></label>
                            <div class="full"><div id="incidentLocationStatus" class="location-box">📍 No location selected.</div></div>
                            <div class="full"><button class="btn primary" type="submit" style="width:100%;">Submit Report</button></div>
                        </form>
                    </section>
                </div>
                <div class="col-side">
                    <section class="panel"><div class="section-head"><h2>🚨 Recent Incidents</h2></div><div id="incidentTable" class="table-wrap"></div></section>
                    <?php if ($isStaff): ?>
                    <section class="panel no-print" id="pendingPanel">
                        <div class="section-head"><h2>⏳ Pending Incident Queue</h2></div>
                        <div id="reviewTable" class="table-wrap"></div>
                    </section>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- LOST TAB -->
        <div id="tab-lost" class="tab-content">
            <div class="layout-grid">
                <div class="col-main">
                    <section class="panel map-panel no-print">
                        <div class="section-head">
                            <div><h2>🗺️ Lost Item Map</h2><p class="muted">Click map to pin.</p></div>
                            <div class="map-scope">
                                <button type="button" class="scope-btn active" data-map="lost" data-scope="campus">Campus</button>
                                <button type="button" class="scope-btn" data-map="lost" data-scope="dagupan">Dagupan</button>
                            </div>
                        </div>
                        <div id="lost-map" class="map-container"></div>
                    </section>
                    <section class="panel no-print">
                        <div class="section-head"><h2>📝 Report Lost Item</h2></div>
                        <form id="lostForm" class="form-grid">
                            <label>Item name<input id="lostItemName" required></label>
                            <label>Category<select id="lostCategory" required><option value="id">ID</option><option value="phone">Phone</option><option value="wallet">Wallet</option><option value="other">Other</option></select></label>
                            <label class="full">Description<textarea id="lostDescription" rows="2" required></textarea></label>
                            <label class="full">Last seen place<input id="lostPlace" maxlength="200"></label>
                            <label class="full" style="position:relative;">Tag Owner
                                <input id="lostTagPerson" autocomplete="off" placeholder="Type a student or guest name">
                                <div id="lostTagDropdown" class="autocomplete-dropdown hidden"></div>
                            </label>
                            <label class="full">Upload Photo or Video<input type="file" id="lostMedia" accept="image/*,video/*"></label>
                            <div class="full"><div id="lostLocationStatus" class="location-box">📍 No location selected.</div></div>
                            <div class="full"><button class="btn primary" type="submit" style="width:100%;">Submit Lost Report</button></div>
                        </form>
                    </section>
                </div>
                <div class="col-side">
                    <section class="panel"><div class="section-head"><h2>🎒 Active Lost Items</h2></div><div id="lostTable" class="table-wrap"></div></section>
                    <?php if ($isStaff): ?>
                    <section class="panel no-print" id="lostPendingPanel">
                        <div class="section-head"><h2>⏳ Pending Lost & Found</h2></div>
                        <div id="lostReviewTable" class="table-wrap"></div>
                    </section>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- MESSAGES TAB -->
        <div id="tab-messages" class="tab-content">
            <?php if ($isStaff): ?>
                <div class="layout-grid">
                    <div class="col-main">
                        <section class="panel">
                            <div class="section-head">
                                <h2>💬 Reporter Messages</h2>
                                <div style="position:relative; width: 300px; max-width:100%;">
                                    <input type="text" id="msgSearchUser" autocomplete="off" placeholder="Search student or guest...">
                                    <div id="msgSearchDropdown" class="autocomplete-dropdown hidden"></div>
                                </div>
                            </div>
                            <div id="messageTableReporters" class="table-wrap"></div>
                        </section>
                    </div>
                    <div class="col-side">
                        <section class="panel">
                            <div class="section-head"><h2>👥 Staff Chat</h2><button class="mini" onclick="document.getElementById('staffDirectoryPanel').classList.toggle('hidden')">New Chat</button></div>
                            <div id="messageTableStaff" class="table-wrap"></div>
                        </section>
                        <section class="panel hidden" id="staffDirectoryPanel" style="margin-top:16px">
                            <div class="section-head"><h3>Select Colleague</h3></div>
                            <div id="staffDirectoryList" class="people"></div>
                        </section>
                    </div>
                </div>
            <?php else: ?>
                <section class="panel"><div class="section-head"><h2>💬 Messages</h2></div><div id="staffList" class="people"></div></section>
            <?php endif; ?>
        </div>

        <!-- NOTIFICATIONS TAB -->
        <div id="tab-notifications" class="tab-content">
            <section class="panel">
                <div class="section-head"><h2>🔔 All Notifications</h2></div>
                <div id="allNotifList" class="table-wrap" style="max-height: 600px; overflow-y: auto;"></div>
            </section>
        </div>

        <!-- STAFF TOOLS TAB -->
        <?php if ($isStaff): ?>
        <div id="tab-staff" class="tab-content">
            <section class="panel">
                <div class="section-head">
                    <h2>🕵️ Investigation Records</h2>
                    <button id="printBtn" class="btn secondary hidden no-print" onclick="printRecord()">🖨 Print Record</button>
                </div>
                <div class="no-print" style="display:flex; gap:10px; margin-bottom:24px;">
                    <input type="text" id="historySearch" placeholder="Search student or guest name..." style="flex:1;" onkeypress="if(event.key==='Enter') searchHistory()">
                    <button class="btn primary" onclick="searchHistory()">Search</button>
                </div>
                <div id="historyResults" class="table-wrap"></div>
                <div id="investigationArea" style="margin-top:20px;"></div>
            </section>
        </div>

        <!-- ANALYTICS TAB -->
        <div id="tab-analytics" class="tab-content">
            <section class="panel">
                <div class="section-head"><h2>📊 Campus Safety Analytics</h2></div>
                <div class="stat-cards-container" style="margin-bottom:32px;">
                    <div class="stat-card-modern" style="flex-direction:column; text-align:center; padding:32px;">
                        <h3 style="margin:0; font-size:3rem; color:var(--primary);" id="stat-incidents-dash">0</h3>
                        <p class="muted">Total Incidents</p>
                    </div>
                    <div class="stat-card-modern" style="flex-direction:column; text-align:center; padding:32px;">
                        <h3 style="margin:0; font-size:3rem; color:var(--primary);" id="stat-lost-dash">0</h3>
                        <p class="muted">Lost Items</p>
                    </div>
                    <div class="stat-card-modern" style="flex-direction:column; text-align:center; padding:32px;">
                        <h3 style="margin:0; font-size:3rem; color:var(--primary);" id="stat-guests-dash">0</h3>
                        <p class="muted">Verified Guests</p>
                    </div>
                </div>
                <h3 style="margin-top:32px; margin-bottom:16px;">Incidents by Category</h3>
                <div id="chart-container" style="margin-top:16px;"></div>
            </section>
        </div>
        <?php endif; ?>
    </div>
</main>

<!-- MODALS -->
<div id="tagModal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 400px;">
        <h3 id="tagModalTitle" style="margin-bottom:16px;">Tag Person</h3>
        <input type="hidden" id="tagContextType">
        <input type="hidden" id="tagContextId">
        <input type="hidden" id="tagContextAction" value="owner">
        <label style="position:relative;">Search Name
            <input type="text" id="modalTagSearch" autocomplete="off" placeholder="Type a name...">
            <div id="modalTagDropdown" class="autocomplete-dropdown hidden"></div>
        </label>
        <label id="tagRoleContainer">Role
            <select id="modalTagRole">
                <option value="victim">Victim</option>
                <option value="witness">Witness</option>
                <option value="suspect">Suspect</option>
            </select>
        </label>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="button" class="btn primary" style="flex:1;" onclick="confirmTagModal()" id="tagModalBtn" disabled>Tag</button>
            <button type="button" class="btn secondary" style="flex:1;" onclick="document.getElementById('tagModal').classList.add('hidden')">Cancel</button>
        </div>
    </div>
</div>

<div id="settingsModal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 500px;">
        <h2 style="margin-bottom:16px;">Account Settings</h2>
        <form id="settingsForm">
            <div style="text-align:center; margin-bottom:16px;">
                <img id="modalAvatar" src="<?= $avatar ?>" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid var(--primary);">
            </div>
            <label>Profile Picture</label>
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:1.2em; margin-top:8px;">
                <input type="file" id="setPic" accept="image/*" style="margin:0; padding:8px;">
                <button type="button" class="mini danger-btn" onclick="triggerRemovePic()">Remove</button>
            </div>
            <label>Full Name<input type="text" id="setName" value="<?= htmlspecialchars($user['full_name']) ?>" required></label>
            <label>Email<input type="email" id="setEmail" value="<?= htmlspecialchars($user['email'] ?? '') ?>"></label>
            <label>Phone<input type="text" id="setPhone" value="<?= htmlspecialchars($user['phone'] ?? '') ?>"></label>
            <div style="border-top: 1px solid var(--border); margin-top: 16px; padding-top: 16px;">
                <h4 style="margin:0 0 10px;">Change Password</h4>
                <label>Current Password<input type="password" id="setOldPass"></label>
                <label>New Password<input type="password" id="setNewPass"></label>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button type="submit" class="btn primary" style="flex:1;">Save Changes</button>
                <button type="button" class="btn secondary" onclick="document.getElementById('settingsModal').classList.add('hidden')" style="flex:1;">Cancel</button>
            </div>
        </form>
        <p id="setMsg" class="form-msg"></p>
    </div>
</div>

<script>
window.LNU_USER = <?= json_encode($user, JSON_UNESCAPED_SLASHES) ?>;
window.LNU_LAT = <?= LNU_LAT ?>; window.LNU_LNG = <?= LNU_LNG ?>;
window.LNU_DAGUPAN_LAT = <?= DAGUPAN_LAT ?>; window.LNU_DAGUPAN_LNG = <?= DAGUPAN_LNG ?>;
window.LNU_CAMPUS_POLYGON = <?= json_encode(LNU_CAMPUS_POLYGON) ?>;

function updateRealTimeClock() {
    document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit' });
}
updateRealTimeClock();
setInterval(updateRealTimeClock, 1000);
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<!-- Bumped to v=1052 to force cache refresh -->
<script src="assets/js/dashboard.js?v=1052"></script>
</body>
</html>