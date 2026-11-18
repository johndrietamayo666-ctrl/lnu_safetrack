<?php
session_start();
if (!empty($_SESSION['user'])) { header('Location: dashboard.php'); exit; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Login — LNU SafeTrack</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">
<div class="auth-shell">
    <section class="brand-panel">
        <div class="brand-mark"><img src="assets/img/lnu-logo.png" alt="LNU" onerror="this.style.display='none'"></div>
        <p class="eyebrow">LYCEUM-NORTHWESTERN UNIVERSITY</p>
        <h1>SafeTrack</h1>
        <p class="brand-sub">Lost Item &amp; Incident Reporting System</p>
        <p class="brand-desc">A unified, secure platform for the LNU community. Report lost property, flag safety hazards, and stay informed about campus incidents.</p>
        <ul class="feature-list">
            <li>📍 Interactive Campus Map</li>
            <li>🔍 Track Lost &amp; Found Items</li>
            <li>🚨 Report Incidents &amp; Hazards</li>
            <li>💬 Direct Staff Communication</li>
            <li>🛡️ Secure Guest Verification</li>
        </ul>
    </section>

    <section class="auth-card">
        <div class="tabs">
            <button class="tab active" data-tab="login">Student / Staff</button>
            <button class="tab" data-tab="guest">Guest</button>
        </div>

        <div id="loginTab">
            <h2>Sign in</h2>
            <form id="loginForm">
                <label>Account type
                    <select id="role" required>
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                </label>
                <label>Username
    <input id="username" autocomplete="username" required pattern="^[a-zA-Z0-9_.-]{3,20}$" title="3-20 characters: letters, numbers, underscores, or dashes.">
                </label>
                <label>Password<input id="password" type="password" autocomplete="current-password" required></label>
                <button class="btn primary" type="submit">Sign in</button>
            </form>
            <p id="loginMsg" class="form-msg"></p>
        </div>

        <div id="guestTab" class="hidden">
            
            <!-- GUEST LOGIN VIEW (Default) -->
            <div id="guestLoginView">
                <h2>Guest Login</h2>
                <p class="muted" style="margin-bottom: 20px;">Enter your registered Email/Phone and your Valid ID Number to access.</p>
                <form id="guestLoginForm">
                    <label>Email or Phone<input id="verifiedGuestEmail" required></label>
                    <label>Valid ID Number<input id="verifiedGuestValidId" required></label>
                    <button class="btn primary" type="submit" style="width: 100%;">Enter as verified guest</button>
                </form>
                <p id="guestLoginMsg" class="form-msg"></p>
                
                <div style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
                    Not verified yet? <a href="#" id="showGuestRegister" style="font-weight: bold; text-decoration: underline;">Create a guest account</a>
                </div>
            </div>

            <!-- GUEST REGISTRATION VIEW (Hidden by default) -->
            <div id="guestRegisterView" class="hidden">
                <h2>Guest Registration</h2>
                <p class="muted" style="margin-bottom: 20px;">Guests must be verified by staff before they can report.</p>
                <form id="guestForm">
                    <div class="name-grid">
    <label>First Name
        <input id="guestFirstName" placeholder="e.g. John" required pattern="^[A-Za-z\s]+$" title="Letters only">
    </label>
    <label>Middle Name
        <input id="guestMiddleName" placeholder="e.g. Dela" pattern="^[A-Za-z\s]*$" title="Letters only (Optional)">
    </label>
    <label>Last Name
        <input id="guestLastName" placeholder="e.g. Cruz" required pattern="^[A-Za-z\s]+$" title="Letters only">
    </label>
</div>

<label>Email
    <input id="guestEmail" type="email" required placeholder="e.g. john.cruz@gmail.com" 
           pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" 
           title="Please enter a valid email address.">
</label>
                    <label>Username
    <input id="username" autocomplete="username" required placeholder="e.g. guest1234" pattern="^[a-zA-Z0-9_.-]{3,20}$" title="3-20 characters: letters, numbers, underscores, or dashes.">
</label>
                    <label>Phone
    <input id="guestPhone" type="tel" 
           placeholder="e.g. 09123456789" 
           pattern="^[0-9+\-\s]{7,15}$" 
           title="Please enter a valid phone number (numbers, spaces, +, and - only).">
</label>
                    
                    <label>Valid ID Type (Select or type)
                        <input list="ph-ids" id="guestIdType" placeholder="e.g. UMID, Driver's License, Passport" required>
                        <datalist id="ph-ids">
                            <option value="National ID (PhilSys)">
                            <option value="Philippine Passport">
                            <option value="Driver's License">
                            <option value="UMID">
                            <option value="PRC ID">
                            <option value="PhilHealth ID">
                            <option value="Postal ID">
                            <option value="Voter's ID">
                            <option value="Student ID">
                            <option value="Senior Citizen ID">
                        </datalist>
                    </label>

                    <label>Valid ID Number
                        <input id="guestId" required pattern="[A-Za-z0-9\- ]{6,30}" title="6-30 characters, letters, numbers, dashes, or spaces." placeholder="e.g. N01-23-456789 or LTO-123-456">
                    </label>

                    <label>Upload Valid ID Photo
                        <input id="guestIdPhoto" type="file" accept="image/jpeg, image/png, image/webp" required>
                    </label>

                    <label>Reason for access<textarea id="guestReason" rows="3" required></textarea></label>
                    <button class="btn primary" type="submit" style="width: 100%;">Submit guest request</button>
                </form>
                <p id="guestRegMsg" class="form-msg"></p>
                
                <div style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
                    Already verified? <a href="#" id="showGuestLogin" style="font-weight: bold; text-decoration: underline;">Login here</a>
                </div>
            </div>
            
        </div>

        <!-- Replaced Demo Accounts with Emergency Hotlines -->
<!-- NEW & IMPROVED Emergency Hotlines -->
<div style="margin-top: 30px; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <h4 style="margin: 0 0 16px 0; color: #991b1b; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #fecaca; padding-bottom: 12px;">
        🚨 Emergency Hotlines
    </h4>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        
        <!-- LNU SAO (Full Width) -->
        <div style="grid-column: 1 / -1; background: #fdf2f4; border: 1px solid #fca5a5; padding: 16px; border-radius: 8px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">LNU Student Affairs Office</div>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.9rem; color: var(--text); font-weight: 600;">
                <span>📞 (075) 515-4375</span>
                <span>✉️ osa@lyceum.edu.ph</span>
                <span>📱 @lnusaarofficial</span>
            </div>
        </div>

        <!-- National Emergency (Full Width, Red) -->
        <div style="grid-column: 1 / -1; background: #fef2f2; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.9rem; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">National Emergency</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: #dc2626;">911</div>
        </div>

        <!-- Police -->
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--text); margin-bottom: 4px;">Police (PNP Dagupan)</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">(075) 529-5604</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">0916-525-6802</div>
        </div>

        <!-- Fire -->
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--text); margin-bottom: 4px;">Fire (BFP Dagupan)</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">(075) 522-2772</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">0917-184-2611</div>
        </div>

        <!-- Hospitals (Full Width) -->
        <div style="grid-column: 1 / -1; background: #f8fafc; border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">Hospitals</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">R1MC</div>
                    <div style="font-size: 0.9rem; color: var(--text); font-weight: 600;">(075) 515-8916</div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">TMC Pangasinan</div>
                    <div style="font-size: 0.9rem; color: var(--text); font-weight: 600;">(075) 615-2273</div>
                </div>
            </div>
        </div>

    </div>
</div>
    </section>
</div>
<!-- ADDED ?v=1012 TO FORCE BROWSER CACHE REFRESH -->
<script src="assets/js/auth.js?v=1012"></script>
</body>
</html>