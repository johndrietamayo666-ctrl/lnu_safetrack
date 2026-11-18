const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const api = (endpoint, options = {}) => fetch(`api/index.php/${endpoint}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async r => { const data = await r.json().catch(() => ({ ok: false, message: 'Server Error.' })); if (!r.ok) throw data; return data; });

// MOBILE MENU TOGGLE
window.toggleMobileMenu = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const wrapper = document.querySelector('.main-wrapper');
    if (!sidebar) return;
    
    if (window.innerWidth > 1024) {
        sidebar.classList.toggle('collapsed');
        if (wrapper) wrapper.classList.toggle('collapsed');
    } else {
        const isOpen = sidebar.classList.contains('active');
        if (isOpen) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
};

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    let bg = type === 'success' ? '#ecfdf5' : type === 'error' ? '#fef2f2' : '#eff6ff';
    let border = type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb';
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const toast = document.createElement('div');
    toast.style.cssText = `background:${bg}; color:${border}; padding:12px 20px; border-radius:8px; border-left:5px solid ${border}; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:600; font-size:0.9rem; display:flex; align-items:center; gap:10px; pointer-events:auto; transition: opacity 0.3s;`;
    toast.innerHTML = `<span>${icon}</span> <span>${esc(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function showConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:flex; justify-content:center; align-items:center; z-index:999999; backdrop-filter:blur(2px);';
    modal.innerHTML = `
        <div style="background:#fff; padding:24px; border-radius:12px; width:90%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.2); text-align:center;">
            <p style="font-size:1rem; margin-bottom:24px; color:#111827; line-height:1.5; font-weight:600;">${esc(message)}</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button id="btn-cancel-confirm" style="flex:1; padding:10px; border-radius:8px; border:1px solid #d1d5db; background:#f3f4f6; cursor:pointer; font-weight:600;">Cancel</button>
                <button id="btn-yes-confirm" style="flex:1; padding:10px; border-radius:8px; background:#dc2626; color:#fff; border:none; cursor:pointer; font-weight:600;">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-cancel-confirm').onclick = () => modal.remove();
    modal.querySelector('#btn-yes-confirm').onclick = () => { modal.remove(); onConfirm(); };
}

function showPrompt(message, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:flex; justify-content:center; align-items:center; z-index:999999; backdrop-filter:blur(2px);';
    modal.innerHTML = `
        <div style="background:#fff; padding:24px; border-radius:12px; width:90%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <p style="font-size:0.95rem; margin-bottom:16px; color:#111827; font-weight:600; line-height:1.6;">${esc(message).replace(/\n/g, '<br>')}</p>
            <input type="password" id="prompt-input" style="width:100%; padding:10px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:8px; font-family:inherit; outline:none; transition:border-color 0.2s;">
            <p id="prompt-error" style="color: #dc2626; font-size: 0.8rem; margin-top: 0; margin-bottom:16px; display: none; font-weight: 600; line-height: 1.4;"></p>
            <div style="display:flex; gap:12px; justify-content:flex-end;">
                <button id="btn-cancel-confirm" style="padding:10px 16px; border-radius:8px; border:1px solid #d1d5db; background:#f3f4f6; cursor:pointer; font-weight:600;">Cancel</button>
                <button id="btn-yes-confirm" style="padding:10px 16px; border-radius:8px; background:#2563eb; color:#fff; border:none; cursor:pointer; font-weight:600;">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const input = document.getElementById('prompt-input');
    const errEl = document.getElementById('prompt-error');
    setTimeout(() => input.focus(), 100);
    input.addEventListener('input', () => { errEl.style.display = 'none'; input.style.borderColor = '#d1d5db'; });
    
    modal.querySelector('#btn-cancel-confirm').onclick = () => modal.remove();
    modal.querySelector('#btn-yes-confirm').onclick = async () => {
        const val = input.value;
        const btn = modal.querySelector('#btn-yes-confirm');
        btn.textContent = 'Saving...'; btn.disabled = true;
        try { await onConfirm(val); modal.remove(); } 
        catch (errMsg) { errEl.textContent = errMsg; errEl.style.display = 'block'; input.style.borderColor = '#dc2626'; btn.textContent = 'Confirm'; btn.disabled = false; }
    };
}

function showMedia(url) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:9999999;';
    modal.innerHTML = `
        <button style="position:absolute; top:20px; right:20px; background:#dc2626; color:white; border:none; width:40px; height:40px; border-radius:50%; font-size:1.5rem; cursor:pointer; display:flex; justify-content:center; align-items:center; box-shadow:0 2px 10px rgba(0,0,0,0.5);">✕</button>
        <img src="${esc(url)}" style="max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.5); object-fit:contain;">
    `;
    modal.querySelector('button').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

document.querySelectorAll('.d-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.d-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = $(tab.dataset.target);
        if (target) target.classList.add('active');

        // Close mobile menu on tab click
        if (window.innerWidth <= 1024) window.toggleMobileMenu();
    });
});

async function loadUsers() {
    try {
        const r = await api('admin-users');
        if (!r.ok) throw new Error(r.message || 'Failed to load');
        
        $('userTable').innerHTML = `
            <table class="data-table">
                <thead><tr><th>Name</th><th>Role</th><th>Strikes</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${r.users.map(u => {
                        let actionButtons = '';
                        
                        if (u.type === 'user') {
                            actionButtons += `<button class="mini" onclick="resetPassword(${u.id}, '${u.username}')">Reset PW</button>`;
                            actionButtons += `<button class="mini ${u.status === 'active' ? 'warning-btn' : 'success-btn'}" onclick="toggleBlock(${u.id}, '${u.type}', '${u.status}')">${u.status === 'active' ? 'Block' : 'Unblock'}</button>`;
                            if (u.role !== 'admin') actionButtons += `<button class="mini danger-btn" onclick="deleteUser(${u.id}, '${u.type}', '${u.full_name}')">Delete</button>`;
                        } else if (u.type === 'guest') {
                            if (u.status === 'pending') {
                                actionButtons += `<button class="mini success-btn" onclick="guestAct(${u.id}, 'verified')">Verify</button>`;
                                actionButtons += `<button class="mini danger-btn" onclick="guestAct(${u.id}, 'rejected')">Reject</button>`;
                            } else if (u.status === 'verified' || u.status === 'blocked') {
                                actionButtons += `<button class="mini ${u.status === 'verified' ? 'warning-btn' : 'success-btn'}" onclick="toggleBlock(${u.id}, '${u.type}', '${u.status}')">${u.status === 'verified' ? 'Block' : 'Unblock'}</button>`;
                                actionButtons += `<button class="mini danger-btn" onclick="deleteUser(${u.id}, '${u.type}', '${u.full_name}')">Delete</button>`;
                            } else if (u.status === 'rejected') {
                                actionButtons += `<button class="mini danger-btn" onclick="deleteUser(${u.id}, '${u.type}', '${u.full_name}')">Delete</button>`;
                            }
                        }

                        return `
                            <tr>
                                <td><b>${u.full_name}</b><br><small>${u.type === 'guest' ? 'ID: ' + u.username : '@' + u.username}</small></td>
                                <td><span class="role-pill ${u.role}">${u.role.toUpperCase()}</span></td>
                                <td><b style="color: ${u.strikes >= 3 ? '#dc2626' : '#374151'}">${u.strikes}</b></td>
                                <td><span class="status-badge ${u.status}">${u.status.toUpperCase()}</span></td>
                                <td style="white-space:nowrap">${actionButtons}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        const watchlistUsers = r.users.filter(u => u.strikes >= 3 && u.status !== 'blocked');
        $('watchlist').innerHTML = watchlistUsers.length ? watchlistUsers.map(u => `
            <div class="watchlist-card">
                <div>
                    <div class="watchlist-title">${u.full_name} <span style="font-size:0.8rem; background:#dc2626; color:#fff; padding:2px 8px; border-radius:12px; margin-left:8px;">${u.strikes} Strikes</span></div>
                    <div style="font-size: 0.85rem; color: #b91c1c; margin-top: 4px;">Role: ${u.role.toUpperCase()}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="mini" onclick="viewAdminHistory('${u.type}', ${u.id}, '${u.full_name}')">View History</button>
                    <button class="btn danger-btn" style="padding: 8px 16px;" onclick="toggleBlock(${u.id}, '${u.type}', '${u.status}')">Block Account</button>
                </div>
            </div>
        `).join('') : '<div class="empty">No users with 3+ strikes.</div>';

    } catch (e) {
        $('userTable').innerHTML = `<div class="empty" style="color:var(--danger)">Error loading users: ${e.message}</div>`;
        $('watchlist').innerHTML = `<div class="empty" style="color:var(--danger)">Error loading watchlist: ${e.message}</div>`;
    }
}

async function loadGuests() {
    try {
        const r = await api('guests');
        $('adminGuestTable').innerHTML = r.guests.length ? `<table class="data-table"><thead><tr><th>Guest</th><th>ID Type & Number</th><th>ID Photo</th><th>Action</th></tr></thead><tbody>${r.guests.map(g => `<tr>
            <td><b>${esc(g.full_name)}</b><br><small>${esc(g.email)}</small></td>
            <td>${esc(g.valid_id)}</td>
            <td><button class="mini" onclick="showMedia('${esc(g.id_photo_path)}')" style="white-space:nowrap;">View ID</button></td>
            <td><button class="mini success-btn" onclick="guestAct(${g.id},'verified')">Verify</button><button class="mini danger-btn" onclick="guestAct(${g.id},'rejected')">Reject</button></td>
        </tr>`).join('')}</tbody></table>` : '<div class="empty">No pending guests to verify.</div>';
    } catch (e) { 
        $('adminGuestTable').innerHTML = `<div class="empty" style="color:red;">Error loading guests: ${e.message}</div>`; 
    }
}

$('createUserForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true;
    $('nuMsg').textContent = 'Creating...'; $('nuMsg').className = 'form-msg';
    try {
        const r = await api('admin-users', { method: 'POST', body: JSON.stringify({
            action: 'create', 
            first_name: $('nuFirstName').value.trim(), 
            middle_name: $('nuMiddleName').value.trim(), 
            last_name: $('nuLastName').value.trim(), 
            email: $('nuEmail').value.trim(),
            username: $('nuUsername').value.trim(),
            password: $('nuPassword').value, 
            role: $('nuRole').value
        })});
        $('nuMsg').textContent = r.message; $('nuMsg').className = 'form-msg success';
        showToast(r.message, 'success'); e.target.reset(); await loadUsers();
    } catch (err) {
        $('nuMsg').textContent = err.message; $('nuMsg').className = 'form-msg error';
        showToast(err.message, 'error');
    } finally { btn.disabled = false; }
});

async function toggleBlock(id, type, currentStatus) {
    const isBlocking = currentStatus === 'active' || currentStatus === 'verified';
    const action = isBlocking ? 'block' : 'unblock';
    showConfirm(`Are you sure you want to ${action} this account?`, async () => {
        try { 
            const r = await api('admin-users', { method: 'POST', body: JSON.stringify({ action: 'toggle_block', user_id: id, type }) }); 
            showToast(r.message, 'success'); await loadUsers(); 
        } catch (e) { showToast(e.message, 'error'); }
    });
}

async function resetPassword(id, username) {
    showPrompt(`Create a new password for @${username}\n\nPassword must contain:\n• At least 8 characters\n• A mix of uppercase and lowercase letters\n• At least one number`, async (newPw) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!regex.test(newPw)) throw 'Password is too weak. Please follow the requirements above.'; 
        try { 
            const r = await api('admin-users', { method: 'POST', body: JSON.stringify({ action: 'reset_password', user_id: id, type: 'user', password: newPw }) }); 
            showToast(r.message, 'success');
        } catch (e) { throw e.message || 'Failed to reset password.'; }
    });
}

async function deleteUser(id, type, name) {
    showConfirm(`WARNING: Are you sure you want to permanently DELETE ${name}? This cannot be undone.`, async () => {
        try { 
            const r = await api('admin-users', { method: 'POST', body: JSON.stringify({ action: 'delete', user_id: id, type }) }); 
            showToast(r.message, 'success'); await loadUsers(); await loadGuests(); 
        } catch (e) { showToast(e.message, 'error'); }
    });
}

async function guestAct(id, status) { 
    showConfirm(`Are you sure you want to ${status === 'verified' ? 'VERIFY' : 'REJECT'} this guest account?`, async () => {
        try {
            await api('guests', { method:'POST', body:JSON.stringify({guest_id:id, status}) }); 
            await loadGuests(); 
            await loadUsers();  
            showToast(`Guest account ${status}.`, 'success');
        } catch(e) { showToast(e.message, 'error'); }
    });
}

async function viewAdminHistory(type, id, name) {
    $('adminHistoryModal').classList.remove('hidden');
    $('adminHistoryTitle').textContent = `Records: ${name}`;
    $('adminHistoryContent').innerHTML = 'Loading...';
    
    try {
        const r = await api('history', { method: 'POST', body: JSON.stringify({ type, id }) });
        let html = '';
        
        html += `<h3 style="margin-top:16px; border-bottom:1px solid #ccc; padding-bottom:8px;">Violations (Strikes)</h3>`;
        if (r.violations.length) {
            html += `<table class="data-table"><tbody>${r.violations.map(v => `<tr><td><b>${esc(v.violation_type)}</b><br><small>${esc(v.description)}</small></td><td style="text-align:right;"><small>By: ${esc(v.staff_name)}<br>${esc(v.created_at)}</small></td></tr>`).join('')}</tbody></table>`;
        } else { html += `<p class="muted">No violations on record.</p>`; }

        html += `<h3 style="margin-top:24px; border-bottom:1px solid #ccc; padding-bottom:8px;">Incident History</h3>`;
        if (r.incidents.length) {
            html += `<table class="data-table"><tbody>${r.incidents.map(i => `<tr><td><b>${esc(i.title)}</b><br><small>${esc(i.case_no)}</small></td><td><span class="severity ${i.severity}">${i.severity.toUpperCase()}</span></td><td style="text-align:right;"><small><b>${esc(i.involvement)}</b><br>${esc(i.created_at)}</small></td></tr>`).join('')}</tbody></table>`;
        } else { html += `<p class="muted">No incidents on record.</p>`; }

        html += `<h3 style="margin-top:24px; border-bottom:1px solid #ccc; padding-bottom:8px;">Lost & Found History</h3>`;
        if (r.lost.length) {
            html += `<table class="data-table"><tbody>${r.lost.map(l => `<tr><td><b>${esc(l.item_name)}</b><br><small>${esc(l.case_no)}</small></td><td><span class="status-badge status-${l.status}">${l.status.toUpperCase()}</span></td><td style="text-align:right;"><small><b>${esc(l.involvement)}</b><br>${esc(l.created_at)}</small></td></tr>`).join('')}</tbody></table>`;
        } else { html += `<p class="muted">No lost items on record.</p>`; }

        $('adminHistoryContent').innerHTML = html;
    } catch (e) {
        $('adminHistoryContent').innerHTML = `<div class="empty" style="color:red;">${e.message}</div>`;
    }
}

$('logoutBtn')?.addEventListener('click', async () => { try { await api('logout', { method: 'POST' }); } catch (_) {} location.href = 'index.php'; });

window.toggleBlock = toggleBlock; window.resetPassword = resetPassword; window.deleteUser = deleteUser;
window.guestAct = guestAct; window.viewAdminHistory = viewAdminHistory; window.showMedia = showMedia;

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab');
    
    if (targetTab === 'guests') {
        const guestTab = document.querySelector('.d-tab[data-target="admin-tab-guests"]');
        if (guestTab) guestTab.click();
    } else if (targetTab === 'watchlist') {
        const watchlistTab = document.querySelector('.d-tab[data-target="admin-tab-watchlist"]');
        if (watchlistTab) watchlistTab.click();
    }

    loadUsers();
    loadGuests();
});
// --- FLOATING TOOLTIPS FOR COLLAPSED SIDEBAR ---
const globalTooltip = document.createElement('div');
globalTooltip.className = 'custom-tooltip';
globalTooltip.style.display = 'none'; // Hide by default
document.body.appendChild(globalTooltip);

// Changed '.d-tab[data-tooltip]' to '.sidebar [data-tooltip]'
document.querySelectorAll('.sidebar [data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', function() {
        const sidebar = document.querySelector('.sidebar');
        // Only show if sidebar is collapsed and on desktop
        if (window.innerWidth > 1024 && sidebar.classList.contains('collapsed')) {
            globalTooltip.textContent = this.getAttribute('data-tooltip');
            globalTooltip.style.display = 'block';
            
            const rect = this.getBoundingClientRect();
            // Position exactly to the right of the element
            globalTooltip.style.top = `${rect.top + (rect.height / 2)}px`;
            globalTooltip.style.left = `${rect.right + 15}px`;
        }
    });

    el.addEventListener('mouseleave', function() {
        globalTooltip.style.display = 'none';
    });
});