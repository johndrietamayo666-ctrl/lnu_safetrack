const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const api = (endpoint, options = {}) => fetch(`api/index.php/${endpoint}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async r => { const data = await r.json().catch(() => ({ ok: false, message: 'Invalid response.' })); if (!r.ok) throw data; return data; });

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// --- GLOBAL VARIABLES ---
let currentUser = null;
let incidentMap, lostMap, incidentMarker = null, lostMarker = null;
let incidentMarkers = [], lostMarkers = []; 
let incidentScope = 'campus', lostScope = 'campus';
let selectedIncidentLatLng = null, selectedLostLatLng = null;
let selectedTagTarget = null;
let isRemovingPic = false; 
let chatThreads = new Map(); 
let openChats = []; 
let staffCache = []; 
let staffNames = {};
let stagedFiles = {}; 
let currentSelectedIncidentId = null;
let currentSelectedLostId = null;

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

// Staged File Feature
window.stageChatFile = function(key, input) {
    if (input.files && input.files[0]) {
        stagedFiles[key] = input.files[0];
        const btn = document.getElementById(`chatFileBtn_${key}`);
        if(btn) {
            btn.style.backgroundColor = '#059669';
            btn.style.color = '#fff';
            btn.innerHTML = '✅';
        }
        showToast('File attached. Click Send to transmit.', 'info');
    }
};

// Remove Profile Picture Feature
window.triggerRemovePic = function() {
    showConfirm('Are you sure you want to remove your profile picture?', () => {
        isRemovingPic = true;
        $('setPic').value = ''; 
        const initialAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.full_name) + '&background=7b1e2b&color=fff';
        $('modalAvatar').src = initialAvatar;
        showToast('Profile picture will be removed when you save.', 'info');
    });
};

window.closeHistoryDetail = function() {
    $('historyResults').innerHTML = '';
    $('investigationArea').innerHTML = '';
    $('printBtn').classList.add('hidden');
    $('historySearch').value = '';
};

// --- UI POPUPS ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    let bg = type === 'success' ? '#ecfdf5' : type === 'error' ? '#fef2f2' : type === 'warning' ? '#fffbeb' : '#eff6ff';
    let border = type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb';
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
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

// Enhanced File Preview for Messages
window.showFilePreview = function(url, filename) {
    const ext = url.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
    const isPdf = ext === 'pdf';
    const isText = ['txt', 'csv', 'json', 'md', 'xml', 'log'].includes(ext);
    
    let content = '';
    if (isImage) {
        content = `<img src="${esc(url)}" style="max-width:100%; max-height:75vh; border-radius:8px; object-fit:contain;">`;
    } else if (isVideo) {
        content = `<video src="${esc(url)}" controls autoplay style="max-width:100%; max-height:75vh; border-radius:8px;"></video>`;
    } else if (isPdf || isText) {
        content = `<iframe src="${esc(url)}" style="width:100%; height:75vh; border:none; border-radius:8px; background:#fff;"></iframe>`;
    } else {
        content = `
            <div style="text-align:center; padding: 40px 20px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; width: 100%; max-width: 400px; margin: 0 auto;">
                <div style="font-size: 4rem; margin-bottom: 16px;">📄</div>
                <p style="font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 1.1rem;">${esc(filename)}</p>
                <p style="color: #64748b; margin-bottom: 24px; font-size: 0.9rem;">This file type cannot be previewed directly in the browser. Please download it to view the contents.</p>
                <a href="${esc(url)}" download="${esc(filename)}" class="btn primary" style="text-decoration:none; padding:12px 24px; display:inline-flex; align-items:center; gap:8px; border-radius:8px; font-weight:600;">⬇️ Download File</a>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.85); display:flex; justify-content:center; align-items:center; z-index:9999999; backdrop-filter:blur(4px); padding: 20px;';
    modal.innerHTML = `
        <div style="position:relative; background:#fff; border-radius:12px; width:100%; max-width:900px; display:flex; flex-direction:column; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:12px 12px 0 0;">
                <h3 style="margin:0; font-size:1.1rem; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">${esc(filename)}</h3>
                <div style="display:flex; gap:12px;">
                    <a href="${esc(url)}" download="${esc(filename)}" title="Download File" style="display:flex; justify-content:center; align-items:center; width:36px; height:36px; border-radius:50%; background:#e2e8f0; color:#334155; text-decoration:none; font-size:1.2rem; transition:background 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">⬇️</a>
                    <button onclick="this.closest('.preview-modal-container').remove()" title="Close Preview" style="display:flex; justify-content:center; align-items:center; width:36px; height:36px; border-radius:50%; background:#fee2e2; color:#dc2626; border:none; font-size:1.2rem; cursor:pointer; transition:background 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">✕</button>
                </div>
            </div>
            <div style="padding: 24px; overflow-y: auto; max-height: calc(90vh - 70px); display: flex; justify-content: center; align-items: center; flex-direction: column; background: #f1f5f9;">
                ${content}
            </div>
        </div>
    `;
    modal.className = 'preview-modal-container';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};

function showMedia(url) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:9999999;';
    let content = '';
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        content = `<video src="${esc(url)}" controls autoplay style="max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.5);"></video>`;
    } else {
        content = `<img src="${esc(url)}" style="max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.5); object-fit:contain;">`;
    }
    modal.innerHTML = `<button style="position:absolute; top:20px; right:20px; background:#dc2626; color:white; border:none; width:40px; height:40px; border-radius:50%; font-size:1.5rem; cursor:pointer; display:flex; justify-content:center; align-items:center; box-shadow:0 2px 10px rgba(0,0,0,0.5);">✕</button>${content}`;
    modal.querySelector('button').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// --- MAP SETUP ---
const campusPolygonCoords = window.LNU_CAMPUS_POLYGON;
const views = { campus: { zoom: 17, minZoom: 15, maxZoom: 19 }, dagupan: { zoom: 14, minZoom: 12, maxZoom: 19 } };
const campusCenter = [window.LNU_LAT, window.LNU_LNG];
const dagupanCenter = [window.LNU_DAGUPAN_LAT, window.LNU_DAGUPAN_LNG];
const isStaff = () => currentUser?.role === 'staff' || currentUser?.role === 'admin';
const isMine = m => { if (m.sender_id) return Number(m.sender_id) === Number(currentUser.id); return isStaff() ? m.from_staff == 1 : m.from_staff == 0; };

function iconCircle(color) { return L.divIcon({ className: 'lnu-pin', html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);pointer-events:none;"></span>`, iconSize: [16, 16], iconAnchor: [8, 8] }); }
function iconTriangle(color) { return L.divIcon({ className: 'lnu-pin', html: `<span style="display:block;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:16px solid ${color};filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));pointer-events:none;"></span>`, iconSize: [18, 16], iconAnchor: [9, 8] }); }
function iconSquare(color) { return L.divIcon({ className: 'lnu-pin', html: `<span style="display:block;width:14px;height:14px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);pointer-events:none;"></span>`, iconSize: [14, 14], iconAnchor: [7, 7] }); }

function isInsideCampus(lat, lng) {
    if (!campusPolygonCoords) return false;
    let inside = false;
    for (let i = 0, j = campusPolygonCoords.length - 1; i < campusPolygonCoords.length; j = i++) {
        let xi = campusPolygonCoords[i][1], yi = campusPolygonCoords[i][0];
        let xj = campusPolygonCoords[j][1], yj = campusPolygonCoords[j][0];
        let intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function buildPendingIncidentPopup(inc) {
    let mediaHtml = '';
    if (inc.photo_path) mediaHtml += `<img src="${esc(inc.photo_path)}" onclick="event.stopPropagation(); showMedia('${esc(inc.photo_path)}')" style="width:100%; border-radius:4px; margin-top:8px; max-height:160px; object-fit:contain; background:#000; cursor:pointer;">`;
    if (inc.video_path) mediaHtml += `<video src="${esc(inc.video_path)}" controls style="width:100%; border-radius:4px; margin-top:8px; max-height:160px; background:#000;"></video>`;
    
    return `<div class="map-popup">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
            <div class="popup-badges">
                <span class="severity ${inc.severity}">${inc.severity.toUpperCase()}</span>
                <span class="status-badge pending">PENDING</span>
            </div>
            <div class="popup-time">🕒 ${formatDate(inc.created_at)}</div>
        </div>
        <div class="popup-title">${esc(inc.title)}</div>
        <div class="popup-meta">${esc(inc.case_no)} · ${esc(inc.category)}</div>
        <hr>
        <div class="popup-desc">${esc(inc.description)}</div>
        ${mediaHtml ? `<hr>${mediaHtml}` : ''}
        <hr>
        <div class="popup-actions" style="flex-direction:column;">
            <button class="mini warning-btn" style="width:100%;" onclick="event.stopPropagation(); reviewInc(${inc.id},'minor')">Approve (Minor)</button>
            <button class="mini danger-btn" style="width:100%;" onclick="event.stopPropagation(); reviewInc(${inc.id},'severe')">Approve (Severe)</button>
            <button class="mini" style="width:100%;" onclick="event.stopPropagation(); delInc(${inc.id})">Reject</button>
        </div>
    </div>`;
}

function buildPendingLostPopup(item) {
    let mediaHtml = '';
    if (item.photo_path) {
        const isVid = item.photo_path.match(/\.(mp4|webm|ogg)$/i);
        mediaHtml = isVid ? `<video src="${esc(item.photo_path)}" controls style="width:100%; border-radius:4px; margin-top:8px; max-height:160px; background:#000;"></video>` : `<img src="${esc(item.photo_path)}" onclick="event.stopPropagation(); showMedia('${esc(item.photo_path)}')" style="width:100%; border-radius:4px; margin-top:8px; max-height:160px; object-fit:contain; background:#000; cursor:pointer;">`;
    }
    
    return `<div class="map-popup">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
            <div class="popup-badges">
                <span class="status-badge pending">PENDING</span>
            </div>
            <div class="popup-time">🕒 ${formatDate(item.created_at)}</div>
        </div>
        <div class="popup-title">Lost: ${esc(item.item_name)}</div>
        <div class="popup-meta">${esc(item.case_no)} · ${esc(item.category)}</div>
        <hr>
        <div class="popup-desc">${esc(item.description)}</div>
        ${mediaHtml ? `<hr>${mediaHtml}` : ''}
        <hr>
        <div class="popup-actions" style="flex-direction:column;">
            <button class="mini success-btn" style="width:100%;" onclick="event.stopPropagation(); reviewLost(${item.id},'lost')">Approve Report</button>
            <button class="mini danger-btn" style="width:100%;" onclick="event.stopPropagation(); reviewLost(${item.id},'rejected')">Reject</button>
        </div>
    </div>`;
}

// --- AUTOCOMPLETE ---
let searchTimeout = null;
function setupAutocomplete(inputId, dropdownId, isMsgSearch = false) {
    const input = $(inputId); const dropdown = $(dropdownId);
    if (!input || !dropdown) return;
    input.addEventListener('input', function() {
        clearTimeout(searchTimeout); const q = this.value.trim();
        if (q.length < 2) { dropdown.classList.add('hidden'); return; }
        searchTimeout = setTimeout(async () => {
            try {
                const r = await api('search-people?q=' + encodeURIComponent(q));
                if (r.results && r.results.length > 0) {
                    dropdown.innerHTML = r.results.map(u => `<div class="autocomplete-item" data-name="${esc(u.full_name)}" data-id="${u.id}" data-type="${u.type}" data-pic="${esc(u.profile_pic || '')}" onmousedown="selectAutocomplete('${inputId}', '${dropdownId}', this, ${isMsgSearch})"><b>${esc(u.full_name)}</b> <span class="type-badge">${u.type}</span></div>`).join('');
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.innerHTML = '<div class="autocomplete-item disabled">No matching names found</div>'; dropdown.classList.remove('hidden');
                }
            } catch(e) { console.error(e); }
        }, 300);
    });
    input.addEventListener('blur', () => setTimeout(() => dropdown.classList.add('hidden'), 200));
}

window.selectAutocomplete = function(inputId, dropdownId, el, isMsgSearch) {
    $(inputId).value = el.dataset.name; $(dropdownId).classList.add('hidden');
    if (isMsgSearch) {
        openChat(el.dataset.type, el.dataset.id, el.dataset.name, el.dataset.pic);
        $(inputId).value = ''; 
    } else if (inputId === 'modalTagSearch') { 
        selectedTagTarget = { id: el.dataset.id, type: el.dataset.type }; 
        $('tagModalBtn').disabled = false; 
    }
};

// --- BOOT & INIT ---
async function boot() {
    try { 
        const s = await api('session'); 
        if (!s.user) return location.href = 'index.php'; 
        currentUser = s.user;
    } catch (e) { 
        if (e.message && e.message.includes('log in')) location.href = 'index.php';
        else showToast('Session error. Please refresh.', 'error');
        return; 
    }

    wireTabs(); 
    
    try { 
        if (typeof L === 'undefined') throw new Error("Leaflet library not loaded.");
        initMaps(); 
    } catch(err) { 
        console.error('Map failed to load:', err); 
        showToast('Map could not load, but other features are active.', 'warning');
    }
    
    wireForms(); loadNotifications();
    setupAutocomplete('incidentTagPerson', 'incidentTagDropdown');
    setupAutocomplete('lostTagPerson', 'lostTagDropdown');
    setupAutocomplete('modalTagSearch', 'modalTagDropdown');
    setupAutocomplete('msgSearchUser', 'msgSearchDropdown', true); 
    
    if (!isStaff()) await loadStaffDirectory();
    await loadIncidents(); 
    await loadLostItems();
    if (isStaff()) await loadStaffData();

    // Live refresh so staff sees new reports/messages without full page reload
    setInterval(() => {
        if (document.hidden) return;
        loadNotifications();
        loadIncidents();
        loadLostItems();
        if (isStaff()) loadStaffData();
        else loadStaffDirectory();
    }, 15000);
}

function wireTabs() {
    document.querySelectorAll('.d-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.d-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = $(tab.dataset.target);
            if (target) target.classList.add('active');
            
            // Close mobile menu on tab click
            if (window.innerWidth <= 1024) window.toggleMobileMenu();

            if (tab.dataset.target === 'tab-incident' && incidentMap) setTimeout(() => incidentMap.invalidateSize(), 100);
            if (tab.dataset.target === 'tab-lost' && lostMap) setTimeout(() => lostMap.invalidateSize(), 100);
            if (tab.dataset.target === 'tab-analytics') loadAnalytics();
        });
    });
}

function initMaps() {
    incidentMap = L.map('incident-map', { center: campusCenter, zoom: views.campus.zoom, minZoom: views.dagupan.minZoom, maxZoom: views.campus.maxZoom });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OSM' }).addTo(incidentMap);
    if (campusPolygonCoords) {
        L.polygon(campusPolygonCoords, { color: '#7b1e2b', weight: 3, fillColor: '#7b1e2b', fillOpacity: 0.1, interactive: false }).addTo(incidentMap);
    }
    incidentMap.setMinZoom(views.campus.minZoom);

    incidentMap.on('click', e => {
        if (incidentMarker) incidentMarker.setLatLng(e.latlng); else incidentMarker = L.marker(e.latlng, { icon: iconCircle('#2563eb'), draggable: true }).addTo(incidentMap);
        selectedIncidentLatLng = e.latlng;
        const inCampus = isInsideCampus(e.latlng.lat, e.latlng.lng);
        const statusEl = $('incidentLocationStatus');
        statusEl.textContent = `📍 Pinned at ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}. ${inCampus ? '(Inside Campus)' : '(Outside Campus)'}`;
        statusEl.classList.add('set');
        if (inCampus && incidentScope !== 'campus') document.querySelector('.scope-btn[data-map="incident"][data-scope="campus"]').click();
        else if (!inCampus && incidentScope !== 'dagupan') document.querySelector('.scope-btn[data-map="incident"][data-scope="dagupan"]').click();
    });

    lostMap = L.map('lost-map', { center: campusCenter, zoom: views.campus.zoom, minZoom: views.dagupan.minZoom, maxZoom: views.campus.maxZoom });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OSM' }).addTo(lostMap);
    if (campusPolygonCoords) {
        L.polygon(campusPolygonCoords, { color: '#7b1e2b', weight: 3, fillColor: '#7b1e2b', fillOpacity: 0.1, interactive: false }).addTo(lostMap);
    }
    lostMap.setMinZoom(views.campus.minZoom);

    lostMap.on('click', e => {
        if (lostMarker) lostMarker.setLatLng(e.latlng); else lostMarker = L.marker(e.latlng, { icon: iconCircle('#2563eb'), draggable: true }).addTo(lostMap);
        selectedLostLatLng = e.latlng;
        const inCampus = isInsideCampus(e.latlng.lat, e.latlng.lng);
        const statusEl = $('lostLocationStatus');
        statusEl.textContent = `📍 Pinned at ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}. ${inCampus ? '(Inside Campus)' : '(Outside Campus)'}`;
        statusEl.classList.add('set');
        if (inCampus && lostScope !== 'campus') document.querySelector('.scope-btn[data-map="lost"][data-scope="campus"]').click();
        else if (!inCampus && lostScope !== 'dagupan') document.querySelector('.scope-btn[data-map="lost"][data-scope="dagupan"]').click();
    });

    document.querySelectorAll('.scope-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.map, scope = btn.dataset.scope;
            if (type === 'incident') { 
                incidentScope = scope; 
                document.querySelectorAll('.scope-btn[data-map="incident"]').forEach(b => b.classList.toggle('active', b.dataset.scope === scope)); 
                incidentMap.setMinZoom(views[scope].minZoom); incidentMap.setMaxZoom(views[scope].maxZoom);
                incidentMap.flyTo(scope === 'campus' ? campusCenter : dagupanCenter, views[scope].zoom); 
                loadIncidents(); 
            }
            if (type === 'lost') { 
                lostScope = scope; 
                document.querySelectorAll('.scope-btn[data-map="lost"]').forEach(b => b.classList.toggle('active', b.dataset.scope === scope)); 
                lostMap.setMinZoom(views[scope].minZoom); lostMap.setMaxZoom(views[scope].maxZoom);
                lostMap.flyTo(scope === 'campus' ? campusCenter : dagupanCenter, views[scope].zoom); 
            }
        });
    });
}

// --- FORMS ---
function wireForms() {
    $('reportForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedIncidentLatLng) return showToast('Click the map to pin a location first.', 'warning');
        const inCampus = isInsideCampus(selectedIncidentLatLng.lat, selectedIncidentLatLng.lng);
        if (incidentScope === 'campus' && !inCampus) return showToast('This pin is outside the campus boundary.', 'error');
        const btn = e.target.querySelector('button'); btn.disabled = true;
        const fd = new FormData();
        fd.append('category', $('incidentCategory').value); fd.append('severity', $('incidentSeverity').value);
        fd.append('title', $('incidentTitle').value.trim()); fd.append('description', $('incidentDescription').value.trim());
        fd.append('latitude', selectedIncidentLatLng.lat); fd.append('longitude', selectedIncidentLatLng.lng);
        fd.append('location_scope', incidentScope);
        fd.append('tagged_person', $('incidentTagPerson').value.trim());
        if($('incidentMedia').files[0]) fd.append('media', $('incidentMedia').files[0]);
        try {
            const r = await fetch('api/index.php/incidents', { method: 'POST', body: fd }).then(res=>res.json());
            if(!r.ok) throw r;
            showToast(`Report submitted! Case: ${r.case_no}`, 'success');
            e.target.reset(); 
            if(incidentMarker && incidentMap) { incidentMap.removeLayer(incidentMarker); incidentMarker=null; selectedIncidentLatLng=null; $('incidentLocationStatus').textContent='📍 No location selected.'; $('incidentLocationStatus').classList.remove('set'); }
            await loadIncidents(); if(isStaff()) await loadStaffData();
        } catch (err) { showToast(err.message, 'error'); } finally { btn.disabled = false; }
    });

    $('lostForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedLostLatLng) return showToast('Click the map to pin a location first.', 'warning');
        const btn = e.target.querySelector('button'); btn.disabled = true;
        const fd = new FormData();
        fd.append('item_name', $('lostItemName').value.trim()); fd.append('category', $('lostCategory').value);
        fd.append('description', $('lostDescription').value.trim()); fd.append('last_seen_place', $('lostPlace').value.trim());
        fd.append('latitude', selectedLostLatLng.lat); fd.append('longitude', selectedLostLatLng.lng);
        fd.append('tagged_person', $('lostTagPerson').value.trim());
        if($('lostMedia').files[0]) fd.append('media', $('lostMedia').files[0]);
        try {
            const r = await fetch('api/index.php/lost-property', { method: 'POST', body: fd }).then(res=>res.json());
            if(!r.ok) throw r;
            showToast(`Lost report submitted! Case: ${r.case_no}`, 'success');
            e.target.reset(); 
            if(lostMarker && lostMap) { lostMap.removeLayer(lostMarker); lostMarker=null; selectedLostLatLng=null; $('lostLocationStatus').textContent='📍 No location selected.'; $('lostLocationStatus').classList.remove('set'); }
            await loadLostItems();
        } catch (err) { showToast(err.message, 'error'); } finally { btn.disabled = false; }
    });

    $('settingsForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
        $('setMsg').textContent = 'Saving...'; $('setMsg').className = 'form-msg';
        const oldPass = $('setOldPass').value; const newPass = $('setNewPass').value;
        if (oldPass || newPass) {
            if (!oldPass || !newPass) { showToast('Both current and new password are required.', 'warning'); btn.disabled = false; $('setMsg').textContent = ''; return; }
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPass)) { showToast('Password must be at least 8 characters and include a mix of uppercase, lowercase, and numbers.', 'error'); btn.disabled = false; $('setMsg').textContent = ''; return; }
        }
        
        const fd = new FormData();
        fd.append('full_name', $('setName').value.trim()); fd.append('email', $('setEmail').value.trim()); fd.append('phone', $('setPhone').value.trim());
        
        if (isRemovingPic) {
            fd.append('remove_pic', '1');
        } else if ($('setPic').files[0]) {
            fd.append('profile_pic', $('setPic').files[0]);
        }

        try {
            const r = await fetch('api/index.php/update-profile', { method: 'POST', body: fd }).then(res=>res.json());
            if(!r.ok) throw r;
            if (oldPass && newPass) await api('change-password', { method: 'POST', body: JSON.stringify({old_password: oldPass, new_password: newPass}) });
            showToast('Settings updated successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            $('setMsg').textContent = err.message; $('setMsg').className = 'form-msg error'; showToast(err.message, 'error');
        } finally { btn.disabled = false; }
    });
}

// --- DATA LOADING ---
async function loadIncidents() {
    const tableEl = $('incidentTable');
    try {
        if(tableEl) tableEl.innerHTML = '<div class="empty">Loading data...</div>';
        
        const reqs = [api('incidents?scope=campus'), api('incidents?scope=dagupan')];
        const results = await Promise.all(reqs);
        
        const campusIncs = results[0] && results[0].incidents ? results[0].incidents : [];
        const dagupanIncs = results[1] && results[1].incidents ? results[1].incidents : [];
        const all = [...campusIncs, ...dagupanIncs];
        
        window.allIncidents = all; 

        const reviewed = all.filter(i => i.status === 'reviewed').sort((a, b) => {
            if (a.severity === 'severe' && b.severity !== 'severe') return -1;
            if (a.severity !== 'severe' && b.severity === 'severe') return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        const resolved = all.filter(i => i.status === 'resolved'); 
        const pending = all.filter(i=>i.status==='submitted').sort((a, b) => {
            if (a.severity === 'severe' && b.severity !== 'severe') return -1;
            if (a.severity !== 'severe' && b.severity === 'severe') return 1;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        if($('stat-recent-incidents')) $('stat-recent-incidents').textContent = reviewed.length + resolved.length;
        if($('stat-pending-incidents')) $('stat-pending-incidents').textContent = pending.length;

        if (incidentMap) {
            window.incidentMapMarkers = window.incidentMapMarkers || new Map();
            window.incidentMapMarkers.forEach(m => m.remove()); incidentMarkers.forEach(m => m.remove());
            window.incidentMapMarkers.clear(); incidentMarkers = [];

            const activeIncidents = [...reviewed, ...resolved];
            activeIncidents.forEach(i => {
                let m;
                let pinColor = '#d97706'; 
                let iconType = iconCircle;
                
                if (i.status === 'resolved') {
                    pinColor = '#10b981'; 
                    iconType = iconCircle;
                } else if (i.severity === 'severe') {
                    pinColor = '#dc2626'; 
                    iconType = iconTriangle;
                }

                m = L.marker([i.latitude, i.longitude], { icon: iconType(pinColor) }).addTo(incidentMap);
                
                let mediaHtml = '';
                if (i.photo_path) mediaHtml += `<img src="${esc(i.photo_path)}" onclick="event.stopPropagation(); showMedia('${esc(i.photo_path)}')" style="width:100%; border-radius:4px; margin-top:8px; cursor:pointer;">`;
                if (i.video_path) mediaHtml += `<video src="${esc(i.video_path)}" controls style="width:100%; border-radius:4px; margin-top:8px;"></video>`;
                let involvedHtml = i.involved_people ? `<div style="font-size:0.8rem;"><b>Involved:</b> ${esc(i.involved_people)}</div>` : '';
                
                let statusBadge = i.status === 'resolved' ? `<span class="status-badge resolved">RESOLVED</span>` : `<span class="status-badge reviewed">REVIEWED</span>`;
                
                let popupHtml = `<div class="map-popup">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                        <div class="popup-badges">
                            <span class="severity ${i.severity}">${i.severity.toUpperCase()}</span>
                            ${statusBadge}
                        </div>
                        <div class="popup-time">🕒 ${formatDate(i.created_at)}</div>
                    </div>
                    <div class="popup-title">${esc(i.title)}</div>
                    <div class="popup-meta">${esc(i.case_no)} · ${esc(i.category)}</div>
                    <hr>
                    <div class="popup-desc">${esc(i.description)}</div>
                    ${mediaHtml ? `<hr>${mediaHtml}` : ''}
                    ${involvedHtml ? `<hr>${involvedHtml}` : ''}
                    <hr>
                    <div class="popup-actions">
                        <button class="mini" onclick="event.stopPropagation(); openTagModal('incident', ${i.id})" title="Tag Victim/Witness" style="flex: none !important;">+ Tag Person</button>
                        ${isStaff() ? `${i.status === 'reviewed' ? `<button class="mini success-btn" onclick="event.stopPropagation(); resolveInc(${i.id})" style="flex: none !important;">Resolve</button>` : ''}<button class="mini danger-btn" onclick="event.stopPropagation(); delInc(${i.id})" style="flex: none !important;">Remove</button>` : ''}
                    </div>
                </div>`;
                
                m.bindPopup(popupHtml); 
                m.on('popupopen', () => {
                    currentSelectedIncidentId = i.id;
                    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                    const row = document.getElementById(`incident-row-${i.id}`);
                    if (row) { row.classList.add('selected-row'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
                });
                m.on('popupclose', () => {
                    currentSelectedIncidentId = null;
                    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                });
                incidentMarkers.push(m); window.incidentMapMarkers.set(i.id, m);
            });

            if (isStaff()) {
                pending.forEach(i => {
                    let m = L.marker([i.latitude, i.longitude], { icon: iconCircle('#9ca3af') }).addTo(incidentMap);
                    m.bindPopup(buildPendingIncidentPopup(i)); 
                    m.on('popupopen', () => {
                        currentSelectedIncidentId = i.id;
                        document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                        const row = document.getElementById(`incident-row-${i.id}`);
                        if (row) { row.classList.add('selected-row'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
                    });
                    m.on('popupclose', () => {
                        currentSelectedIncidentId = null;
                        document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                    });
                    incidentMarkers.push(m); window.incidentMapMarkers.set(i.id, m);
                });
            }
        }
        
        if (tableEl) {
            const displayList = [...reviewed, ...resolved];
            tableEl.innerHTML = displayList.length ? `<table class="data-table"><thead><tr><th>Incident</th><th>Status</th>${isStaff() ? '<th>Action</th>' : ''}</tr></thead><tbody>${displayList.map(i => {
                let rowStyle = '';
                if (i.status === 'resolved') {
                    rowStyle = 'background: #f0fdf4; box-shadow: inset 5px 0 0 #10b981;';
                } else if (i.severity === 'severe') {
                    rowStyle = 'background: #fef2f2; box-shadow: inset 5px 0 0 #dc2626;';
                } else {
                    rowStyle = 'background: #fffbeb; box-shadow: inset 5px 0 0 #d97706;';
                }

                let isSelectedClass = (currentSelectedIncidentId == i.id) ? 'selected-row' : '';
                let stat = i.status === 'resolved' ? 'RESOLVED' : 'REVIEWED';
                return `<tr id="incident-row-${i.id}" class="${isSelectedClass}" onclick="focusIncident(${i.id})" style="cursor: pointer; ${rowStyle}" title="Click to view on map"><td><b>${esc(i.title)}</b><br><small>${esc(i.case_no)}</small><br><span class="timestamp">🕒 ${formatDate(i.created_at)}</span></td><td><span class="severity ${i.severity}">${i.severity.toUpperCase()}</span><br><span class="status-badge ${i.status}">${stat}</span></td>${isStaff() ? `<td onclick="event.stopPropagation();">${i.status === 'reviewed' ? `<button class="mini success-btn" onclick="resolveInc(${i.id})" style="margin-bottom:4px;">Resolve</button><br>` : ''}<button class="mini danger-btn" onclick="delInc(${i.id})">Remove</button></td>` : ''}</tr>`;
            }).join('')}</tbody></table>` : '<div class="empty">No verified incidents yet.</div>';
        }
        
        if (isStaff() && $('reviewTable')) {
            $('reviewTable').innerHTML = pending.length ? `<table class="data-table review-table"><thead><tr><th>Report</th><th>Media & Tags</th><th>Action</th></tr></thead><tbody>${pending.map(i => {
                let mediaBtn = '';
                if (i.photo_path || i.video_path) { const mediaUrl = i.photo_path || i.video_path; mediaBtn = `<button class="mini" style="padding:6px 10px; margin-bottom:4px;" onclick="event.stopPropagation(); showMedia('${esc(mediaUrl)}')">View Media</button>`; }
                let tags = i.involved_people ? `<span class="tags"><b>Involved:</b> ${esc(i.involved_people)}</span>` : '';
                let rowStyle = i.severity === 'severe' ? 'background: #fef2f2;' : 'background: #fffbeb;';
                let isSelectedClass = (currentSelectedIncidentId == i.id) ? 'selected-row' : '';
                return `<tr id="incident-row-${i.id}" class="${isSelectedClass}" onclick="focusIncident(${i.id})" style="cursor:pointer; ${rowStyle}" title="Click to view on map">
                    <td>
                        <span class="report-title">${esc(i.title)}</span>
                        <span class="report-case">${esc(i.case_no)}</span><br>
                        <span class="timestamp">🕒 ${formatDate(i.created_at)}</span><br>
                        <span class="severity ${i.severity}" style="font-size:0.65rem; padding:2px 6px; margin-top:4px; display:inline-block;">${i.severity.toUpperCase()}</span>
                    </td>
                    <td style="text-align:center;">
                        ${mediaBtn}
                        ${tags}
                    </td>
                    <td onclick="event.stopPropagation();">
                        <div class="action-btns">
                            <button class="mini warning-btn" onclick="reviewInc(${i.id},'minor')">Minor</button>
                            <button class="mini danger-btn" onclick="reviewInc(${i.id},'severe')">Severe</button>
                            <button class="mini" onclick="delInc(${i.id})">Reject</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}</tbody></table>` : '<div class="empty">Empty queue.</div>';
        }
    } catch (e) {
        console.error(e);
        if(tableEl) tableEl.innerHTML = `<div class="empty" style="color:red; padding:20px;">⚠️ API Error: ${e.message || 'Database connection failed.'}</div>`;
    }
}

async function loadLostItems() {
    const lostTableEl = $('lostTable');
    try {
        if(lostTableEl) lostTableEl.innerHTML = '<div class="empty">Loading data...</div>';
        
        const r = await api('lost-property');
        if (!r.ok || !r.items) throw new Error(r.message || 'Failed to load lost items.');
        window.allLostItems = r.items; 

        const verified = r.items.filter(i => ['lost', 'found', 'claimed'].includes(i.status));
        const pending = r.items.filter(i => i.status === 'submitted');

        if($('stat-total-lost')) $('stat-total-lost').textContent = verified.length;
        if($('stat-pending-lost')) $('stat-pending-lost').textContent = pending.length;

        if (lostMap) {
            window.lostItemMapMarkers = window.lostItemMapMarkers || new Map();
            window.lostItemMapMarkers.forEach(m => m.remove()); lostMarkers.forEach(m => m.remove());
            window.lostItemMapMarkers.clear(); lostMarkers = [];

            verified.forEach(i => {
                let pinColor = '#2563eb'; 
                if (i.status === 'found') pinColor = '#059669'; 
                if (i.status === 'claimed') pinColor = '#d97706'; 

                const m = L.marker([i.last_seen_lat, i.last_seen_lng], { icon: iconSquare(pinColor) }).addTo(lostMap);
                let mediaHtml = '';
                if (i.photo_path) {
                    const isVid = i.photo_path.match(/\.(mp4|webm|ogg)$/i);
                    mediaHtml = isVid ? `<video src="${esc(i.photo_path)}" controls style="width:100%; border-radius:4px; margin-top:8px;"></video>` : `<img src="${esc(i.photo_path)}" onclick="event.stopPropagation(); showMedia('${esc(i.photo_path)}')" style="width:100%; border-radius:4px; margin-top:8px; cursor:pointer;">`;
                }
                let ownerHtml = i.owner_name ? `<div style="font-size:0.8rem;"><b>Owner:</b> ${esc(i.owner_name)}</div>` : '';
                let claimedByHtml = '';
                if (i.status === 'claimed') {
                     claimedByHtml = `<div style="font-size:0.8rem; margin-top:4px;"><b>Claimed By:</b> ${esc(i.claimed_by_name || 'Not Tagged')}</div>`;
                }
                
                let popupHtml = `<div class="map-popup">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                        <div class="popup-badges">
                            <span class="status-badge status-${i.status}">${i.status.toUpperCase()}</span>
                        </div>
                        <div class="popup-time">🕒 ${formatDate(i.created_at)}</div>
                    </div>
                    <div class="popup-title">Lost: ${esc(i.item_name)}</div>
                    <div class="popup-meta">${esc(i.case_no)} · ${esc(i.category)}</div>
                    <hr>
                    <div class="popup-desc">${esc(i.description)}</div>
                    ${mediaHtml ? `<hr>${mediaHtml}` : ''}
                    ${ownerHtml ? `<hr>${ownerHtml}` : ''}
                    ${claimedByHtml ? `${claimedByHtml}` : ''}
                    <hr>
                    <div class="popup-actions">
                        <button class="mini" onclick="event.stopPropagation(); openTagModal('lost', ${i.id}, 'owner')" style="flex: none !important;">Tag Owner</button>
                        ${i.status === 'claimed' ? `<button class="mini warning-btn" onclick="event.stopPropagation(); openTagModal('lost', ${i.id}, 'claimer')" style="flex: none !important;">Tag Claimer</button>` : ''}
                        ${isStaff() ? `${i.status === 'lost' ? `<button class="mini success-btn" onclick="event.stopPropagation(); updateLost(${i.id},'found')" style="flex: none !important;">Found</button>` : ''}${i.status === 'found' ? `<button class="mini warning-btn" onclick="event.stopPropagation(); updateLost(${i.id},'claimed')" style="flex: none !important;">Claimed</button>` : ''}${i.status === 'claimed' ? `<button class="mini" disabled>Claimed</button>` : ''}<button class="mini danger-btn" onclick="event.stopPropagation(); updateLost(${i.id},'closed')" style="flex: none !important;">Archive</button>` : ''}
                    </div>
                </div>`;
                
                m.bindPopup(popupHtml); 
                m.on('popupopen', () => {
                    currentSelectedLostId = i.id;
                    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                    const row = document.getElementById(`lost-row-${i.id}`);
                    if (row) { row.classList.add('selected-row'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
                });
                m.on('popupclose', () => {
                    currentSelectedLostId = null;
                    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                });
                lostMarkers.push(m); window.lostItemMapMarkers.set(i.id, m);
            });

            if (isStaff()) {
                pending.forEach(i => {
                    let m = L.marker([i.last_seen_lat, i.last_seen_lng], { icon: iconSquare('#9ca3af') }).addTo(lostMap);
                    m.bindPopup(buildPendingLostPopup(i)); 
                    m.on('popupopen', () => {
                        currentSelectedLostId = i.id;
                        document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                        const row = document.getElementById(`lost-row-${i.id}`);
                        if (row) { row.classList.add('selected-row'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
                    });
                    m.on('popupclose', () => {
                        currentSelectedLostId = null;
                        document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
                    });
                    lostMarkers.push(m); window.lostItemMapMarkers.set(i.id, m);
                });
            }
        }

        if (lostTableEl) {
            lostTableEl.innerHTML = verified.length ? `<table class="data-table"><thead><tr><th>Item</th><th>Status</th>${isStaff() ? '<th>Action</th>' : ''}</tr></thead><tbody>${verified.map(i => {
                let rowStyle = i.status === 'lost' ? 'background: #eff6ff;' : i.status === 'found' ? 'background: #ecfdf5;' : 'background: #fffbeb;';
                let isSelectedClass = (currentSelectedLostId == i.id) ? 'selected-row' : '';
                return `<tr id="lost-row-${i.id}" class="${isSelectedClass}" onclick="focusLostItem(${i.id})" style="cursor: pointer; ${rowStyle}" title="Click to view on map">
                    <td><b>${esc(i.item_name)}</b><br><small>${esc(i.case_no)}</small><br><span class="timestamp">🕒 ${formatDate(i.created_at)}</span></td>
                    <td><span class="status-badge status-${i.status}">${i.status.toUpperCase()}</span></td>
                    ${isStaff() ? `<td onclick="event.stopPropagation();"><div style="display:flex; flex-wrap:wrap; gap:4px;">${i.status === 'lost' ? `<button class="mini success-btn" onclick="updateLost(${i.id},'found')">Found</button>` : ''}${i.status === 'found' ? `<button class="mini warning-btn" onclick="updateLost(${i.id},'claimed')">Claimed</button>` : ''}${i.status === 'claimed' ? `<button class="mini" disabled>Claimed</button>` : ''}<button class="mini danger-btn" onclick="updateLost(${i.id},'closed')">Archive</button></div></td>` : ''}
                </tr>`;
            }).join('')}</tbody></table>` : '<div class="empty">No active lost items.</div>';
        }

        if (isStaff() && $('lostReviewTable')) {
            $('lostReviewTable').innerHTML = pending.length ? `<table class="data-table review-table"><thead><tr><th>Item</th><th>Media & Tags</th><th>Action</th></tr></thead><tbody>${pending.map(i => {
                let mediaBtn = '';
                if (i.photo_path) mediaBtn = `<button class="mini" style="padding:6px 10px; margin-bottom:4px;" onclick="event.stopPropagation(); showMedia('${esc(i.photo_path)}')">View Media</button>`;
                let tags = i.owner_name ? `<span class="tags"><b>Owner:</b> ${esc(i.owner_name)}</span>` : '';
                let isSelectedClass = (currentSelectedLostId == i.id) ? 'selected-row' : '';
                return `<tr id="lost-row-${i.id}" class="${isSelectedClass}" onclick="focusLostItem(${i.id})" style="cursor:pointer; background: #f8fafc;" title="Click to view on map">
                    <td>
                        <span class="report-title">${esc(i.item_name)}</span>
                        <span class="report-case">${esc(i.case_no)}</span><br>
                        <span class="timestamp">🕒 ${formatDate(i.created_at)}</span>
                    </td>
                    <td style="text-align:center;">
                        ${mediaBtn}
                        ${tags}
                    </td>
                    <td onclick="event.stopPropagation();">
                        <div class="action-btns">
                            <button class="mini success-btn" onclick="reviewLost(${i.id},'lost')">Approve</button>
                            <button class="mini danger-btn" onclick="reviewLost(${i.id},'rejected')">Reject</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}</tbody></table>` : '<div class="empty">Empty queue.</div>';
        }
    } catch (e) { 
        console.error(e); 
        if(lostTableEl) lostTableEl.innerHTML = `<div class="empty" style="color:red; padding:20px;">⚠️ API Error: ${e.message || 'Database connection failed.'}</div>`;
    }
}

async function focusIncident(id) { 
    const inc = window.allIncidents.find(x => x.id == id); if (!inc) return;
    currentSelectedIncidentId = id; 
    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
    const row = document.getElementById(`incident-row-${id}`); if (row) row.classList.add('selected-row');
    
    const mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
        const yOffset = -80; 
        const y = mapPanel.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }

    const latlng = [Number(inc.latitude), Number(inc.longitude)]; 
    const inCampus = isInsideCampus(latlng[0], latlng[1]); 
    const targetScope = inCampus ? 'campus' : 'dagupan';
    if (incidentScope !== targetScope) { 
        incidentScope = targetScope; 
        document.querySelectorAll('.scope-btn[data-map="incident"]').forEach(b => b.classList.toggle('active', b.dataset.scope === targetScope)); 
        await loadIncidents(); 
        const newRow = document.getElementById(`incident-row-${id}`); 
        if (newRow) newRow.classList.add('selected-row');
    }
    if (incidentMap) {
        incidentMap.setMinZoom(views[targetScope].minZoom); incidentMap.setMaxZoom(views[targetScope].maxZoom); incidentMap.invalidateSize(); 
        setTimeout(() => { incidentMap.flyTo(latlng, 18, { duration: 1.5 }); const marker = window.incidentMapMarkers.get(id); if (marker) setTimeout(() => marker.openPopup(), 1600); }, 150); 
    }
}

async function focusLostItem(id) { 
    const item = window.allLostItems.find(x => x.id == id); if (!item) return;
    currentSelectedLostId = id;
    document.querySelectorAll('.data-table tr').forEach(tr => tr.classList.remove('selected-row'));
    const row = document.getElementById(`lost-row-${id}`); if (row) row.classList.add('selected-row');
    
    const mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
        const yOffset = -80; 
        const y = mapPanel.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }

    const latlng = [Number(item.last_seen_lat), Number(item.last_seen_lng)]; 
    const inCampus = isInsideCampus(latlng[0], latlng[1]); 
    const targetScope = inCampus ? 'campus' : 'dagupan';
    if (lostScope !== targetScope) { 
        lostScope = targetScope; 
        document.querySelectorAll('.scope-btn[data-map="lost"]').forEach(b => b.classList.toggle('active', b.dataset.scope === targetScope)); 
        lostMap.setMinZoom(views[targetScope].minZoom); lostMap.setMaxZoom(views[targetScope].maxZoom); 
        lostMap.flyTo(targetScope === 'campus' ? campusCenter : dagupanCenter, views[targetScope].zoom); 
    }
    if (lostMap) {
        lostMap.invalidateSize(); 
        setTimeout(() => { lostMap.flyTo(latlng, 18, { duration: 1.5 }); const marker = window.lostItemMapMarkers.get(id); if (marker) setTimeout(() => marker.openPopup(), 1600); }, 150);
    }
}

function openTagModal(type, id, action = 'owner') {
    $('tagContextType').value = type; 
    $('tagContextId').value = id; 
    $('tagContextAction').value = action; 
    $('modalTagSearch').value = ''; 
    $('modalTagDropdown').classList.add('hidden'); 
    $('tagModalBtn').disabled = true; 
    selectedTagTarget = null;
    
    if (type === 'incident') { 
        $('tagModalTitle').textContent = 'Tag Person (Incident)'; 
        $('tagRoleContainer').classList.remove('hidden'); 
    } else { 
        $('tagModalTitle').textContent = action === 'claimer' ? 'Tag Claimer (Lost & Found)' : 'Tag Owner (Lost & Found)'; 
        $('tagRoleContainer').classList.add('hidden'); 
    }
    $('tagModal').classList.remove('hidden'); setTimeout(() => $('modalTagSearch').focus(), 100);
}

async function confirmTagModal() {
    if (!selectedTagTarget) return showToast('Please select a person from the dropdown.', 'warning');
    const type = $('tagContextType').value; 
    const id = $('tagContextId').value; 
    const action = $('tagContextAction') ? $('tagContextAction').value : 'owner'; 
    const name = $('modalTagSearch').value;
    
    if (type === 'incident') {
        const role = $('modalTagRole').value;
        try { const r = await api('tag-party', { method: 'POST', body: JSON.stringify({ incident_id: id, name: name, role }) }); showToast(r.message, 'success'); $('tagModal').classList.add('hidden'); await loadIncidents(); } catch (e) { showToast(e.message, 'error'); }
    } else {
        try { const r = await api('tag-lost-owner', { method: 'POST', body: JSON.stringify({ item_id: id, name: name, action: action }) }); showToast(r.message, 'success'); $('tagModal').classList.add('hidden'); await loadLostItems(); } catch (e) { showToast(e.message, 'error'); }
    }
}

async function reviewInc(id, sev) {
    showConfirm(`Approve this incident as ${sev.toUpperCase()}?`, async () => {
        try {
            await api('review', { method:'POST', body:JSON.stringify({incident_id:id, severity:sev}) });
            await Promise.all([loadIncidents(), isStaff() ? loadStaffData() : Promise.resolve()]);
            showToast(`Incident approved as ${sev}.`, 'success');
        } catch (e) { showToast(e.message || 'Failed to approve.', 'error'); await loadIncidents(); }
    });
}
async function resolveInc(id) {
    showConfirm('Mark this incident as RESOLVED?', async () => {
        try {
            await api('update-incident-status', { method:'POST', body:JSON.stringify({incident_id:id, status:'resolved'}) });
            await Promise.all([loadIncidents(), isStaff() ? loadStaffData() : Promise.resolve()]);
            showToast('Incident marked as resolved.', 'success');
        } catch (e) { showToast(e.message || 'Failed to resolve.', 'error'); await loadIncidents(); }
    });
}
async function delInc(id) {
    showConfirm('Reject and remove this incident?', async () => {
        try {
            await api('remove-incident', { method:'POST', body:JSON.stringify({incident_id:id}) });
            await Promise.all([loadIncidents(), isStaff() ? loadStaffData() : Promise.resolve()]);
            showToast('Incident removed.', 'success');
        } catch (e) { showToast(e.message || 'Failed to remove.', 'error'); await loadIncidents(); }
    });
}
async function reviewLost(id, status) { showConfirm(`Are you sure you want to ${status === 'lost' ? 'APPROVE' : 'REJECT'} this report?`, async () => { try { await api('review-lost', { method: 'POST', body: JSON.stringify({ item_id: id, status }) }); await loadLostItems(); showToast(`Lost item ${status === 'lost' ? 'approved' : 'rejected'}.`, 'success'); } catch (e) { showToast(e.message, 'error'); } }); }
async function updateLost(id, status) { 
    let msg = '';
    if (status === 'found') msg = 'Are you sure you want to mark this item as FOUND?';
    else if (status === 'claimed') msg = 'Are you sure you want to mark this item as CLAIMED?';
    else if (status === 'closed') msg = 'Are you sure you want to ARCHIVE this record? (It will be removed from the map permanently)';
    showConfirm(msg, async () => { await api('update-lost-status', { method:'POST', body:JSON.stringify({item_id:id, status}) }); await loadLostItems(); showToast(`Record marked as ${status}.`, 'success'); });
}

async function loadStaffData() {
    try {
        const [messages, staffList] = await Promise.all([api('messages'), api('staff-list')]);
        staffCache = staffList.staff;
        staffCache.forEach(st => { staffNames[st.id] = st.full_name; });
        renderStaffList(); 
        updateStaffMessages(messages.messages);
    } catch (e) { console.error(e); }
}

async function loadAnalytics() {
    if (!isStaff()) return;
    try {
        const r = await api('analytics');
        if($('stat-incidents-dash')) $('stat-incidents-dash').textContent = r.totalIncidents; 
        if($('stat-lost-dash')) $('stat-lost-dash').textContent = r.totalLost; 
        if($('stat-guests-dash')) $('stat-guests-dash').textContent = r.totalGuests;
        const max = Math.max(...r.categories.map(c => Number(c.count)), 1);
        if($('chart-container')) $('chart-container').innerHTML = r.categories.map(c => `
            <div style="display:flex; align-items:center; margin-bottom:8px;">
                <div style="width:100px; font-size:0.85rem; text-transform:capitalize;">${esc(c.category)}</div>
                <div style="flex:1; background:#e5e7eb; height:20px; border-radius:4px; overflow:hidden;"><div style="width:${(c.count/max)*100}%; background:var(--primary); height:100%;"></div></div>
                <div style="width:40px; text-align:right; font-weight:bold; font-size:0.85rem;">${c.count}</div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function searchHistory() {
    const q = $('historySearch').value.trim(); if (!q) return;
    try {
        const r = await api('history?q=' + encodeURIComponent(q));
        $('historyResults').innerHTML = r.results.length ? `<table class="data-table"><tbody>${r.results.map(u => `
            <tr onclick="loadHistoryDetail('${u.type}', ${u.id})" style="cursor:pointer;">
                <td><b>${esc(u.full_name)}</b><br><small>${u.type === 'guest' ? 'GUEST' : 'STUDENT'}</small></td>
                <td style="text-align:right; color:var(--primary); font-weight:bold;">View Record &rarr;</td>
            </tr>`).join('')}</tbody></table>` : '<div class="empty">No users found.</div>';
    } catch (e) { showToast(e.message, 'error'); }
}

async function loadHistoryDetail(type, id) {
    try {
        const r = await api('history', { method: 'POST', body: JSON.stringify({ type, id }) });
        $('historyResults').innerHTML = '';
        
        const p = r.profile;
        const initial = p.full_name.charAt(0).toUpperCase();
        const statusColor = p.status === 'active' || p.status === 'verified' ? 'success' : 'danger';
        
        const avatarHtml = p.profile_pic 
            ? `<img src="${esc(p.profile_pic)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); box-shadow: var(--shadow-sm);">` 
            : `<div class="profile-avatar-large">${initial}</div>`;

        let guestIdBtn = '';
        if (type === 'guest' && p.id_photo_path) {
            guestIdBtn = `<button class="mini" onclick="showMedia('${esc(p.id_photo_path)}')" style="margin-top: 12px; background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; font-size: 0.8rem; padding: 6px 12px;">🪪 View Submitted Valid ID</button>`;
        }

        let html = `
        <div class="profile-card">
            ${avatarHtml}
            <div class="profile-details">
                <h2>
                    ${esc(p.full_name)} 
                    <span class="role-pill ${p.role.toLowerCase()}">${esc(p.role.toUpperCase())}</span>
                    <span class="status-badge ${statusColor}">${esc(p.status.toUpperCase())}</span>
                </h2>
                <div class="profile-grid">
                    <div class="profile-item"><span>Username / ID</span><b>${esc(p.username || 'N/A')}</b></div>
                    <div class="profile-item"><span>Email Address</span><b>${esc(p.email || 'N/A')}</b></div>
                    <div class="profile-item"><span>Phone Number</span><b>${esc(p.phone || 'N/A')}</b></div>
                    <div class="profile-item"><span>Date Registered</span><b>${new Date(p.created_at).toLocaleDateString()}</b></div>
                </div>
                ${guestIdBtn}
            </div>
            <div style="grid-column: 1 / -1; text-align: right; border-top: 1px solid var(--border); padding-top: 16px;">
                <button class="btn secondary" onclick="closeHistoryDetail()">Close Record</button>
            </div>
        </div>`;
        
        html += `<div style="display: flex; gap: 24px; flex-wrap: wrap;">`;
        
        html += `<div style="flex: 1; min-width: 300px;">
            <h3 style="border-bottom:2px solid var(--border); padding-bottom:8px;">Violations (Strikes)</h3>`;
        if (r.violations.length) {
            html += `<div class="table-wrap" style="max-height:300px; margin-top:12px;"><table class="data-table"><tbody>${r.violations.map(v => `<tr><td><b>${esc(v.violation_type)}</b><br><small>${esc(v.description)}</small></td><td style="text-align:right;"><small>By: ${esc(v.staff_name)}<br>🕒 ${formatDate(v.created_at)}</small></td></tr>`).join('')}</tbody></table></div>`;
        } else {
            html += `<p class="muted" style="margin-top:12px;">No violations on record.</p>`;
        }
        
        html += `<div style="margin: 16px 0; border: 1px solid #fee2e2; padding: 16px; border-radius: 8px; background: #fef2f2;">
            <h4 style="margin:0 0 10px; color:#dc2626;">Issue New Strike</h4>
            <select id="strikeType" style="margin-bottom:8px; width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;"><option value="Minor Violation">Minor Violation</option><option value="Major Violation">Major Violation</option><option value="False Report / Troll">False Report / Troll</option></select>
            <textarea id="strikeDesc" placeholder="Reason for strike..." style="width:100%; margin-bottom:8px; padding:8px; border-radius:4px; border:1px solid #ccc;"></textarea>
            <button class="btn danger-btn" onclick="issueStrike('${type}', ${id})" style="width:100%;">Record Strike</button>
        </div>`;
        
        html += `</div>`; 

        html += `<div style="flex: 1; min-width: 300px;">
            <h3 style="border-bottom:2px solid var(--border); padding-bottom:8px;">Incident & Lost History</h3>
            <div class="table-wrap" style="max-height: 400px; margin-top:12px;">
                <table class="data-table"><tbody>`;
        if (r.incidents.length) {
            html += r.incidents.map(i => `<tr><td><b>${esc(i.title)}</b><br><small>${esc(i.case_no)}</small></td><td><span class="severity ${i.severity}">${i.severity.toUpperCase()}</span></td><td style="text-align:right;"><small><b>${esc(i.involvement)}</b><br>🕒 ${formatDate(i.created_at)}</small></td></tr>`).join('');
        }
        if (r.lost.length) {
            html += r.lost.map(l => `<tr><td><b>${esc(l.item_name)}</b><br><small>${esc(l.case_no)}</small></td><td><span class="status-badge status-${l.status}">${l.status.toUpperCase()}</span></td><td style="text-align:right;"><small><b>${esc(l.involvement)}</b><br>🕒 ${formatDate(l.created_at)}</small></td></tr>`).join('');
        }
        if (!r.incidents.length && !r.lost.length) {
            html += `<tr><td colspan="3"><p class="muted">No historical records.</p></td></tr>`;
        }
        
        html += `</tbody></table></div></div>`; 
        html += `</div>`; 
        
        $('investigationArea').innerHTML = html; 
        $('printBtn').classList.remove('hidden');
    } catch (e) { showToast(e.message, 'error'); }
}

async function issueStrike(type, id) {
    const vType = $('strikeType').value; const desc = $('strikeDesc').value.trim();
    if (!desc) return showToast('Please enter a reason.', 'warning');
    showConfirm('Issue this formal strike?', async () => {
        try { await api('violations', { method: 'POST', body: JSON.stringify({ type, id, violation_type: vType, description: desc }) }); showToast('Strike recorded.', 'success'); await loadHistoryDetail(type, id); } catch (e) { showToast(e.message, 'error'); }
    });
}

function printRecord() { document.getElementById('printDate').textContent = new Date().toLocaleString(); window.print(); }

window.searchHistory = searchHistory; window.loadHistoryDetail = loadHistoryDetail; window.issueStrike = issueStrike; window.printRecord = printRecord; window.openTagModal = openTagModal; window.confirmTagModal = confirmTagModal;
window.toggleNotifDropdown = toggleNotifDropdown; window.openSettingsModal = openSettingsModal; window.handleNotifClick = handleNotifClick; window.viewAllNotifications = viewAllNotifications;
window.openChat = openChat; window.focusIncident = focusIncident; window.focusLostItem = focusLostItem;
window.reviewInc = reviewInc; window.resolveInc = resolveInc; window.delInc = delInc; window.updateLost = updateLost; window.reviewLost = reviewLost;
window.dismissNotification = dismissNotification; window.clearAllNotifications = clearAllNotifications;
window.showMedia = showMedia; window.archiveThread = archiveThread;

async function loadNotifications() {
    try {
        const r = await api('notifications');
        const badge = $('notifBadge'); const list = $('notifList'); const allList = $('allNotifList');
        if (badge) {
            if (r.unread > 0) { badge.textContent = r.unread; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
        }
        const renderNotif = (n, showArchiveBtn) => {
            let bg = n.is_read ? 'transparent' : '#fdf2f4'; let borderColor = 'transparent'; let textCol = '#111827'; let icon = '🔔';
            if (n.action_type === 'incident') { 
                icon = '🚨'; 
                const msg = String(n.message).toLowerCase();
                let isSevere = msg.includes('minor') ? false : (msg.includes('severe') ? true : String(n.severity).toLowerCase() === 'severe');
                if (isSevere) { bg = n.is_read ? '#fef2f2' : '#fecaca'; borderColor = '#dc2626'; } else { bg = n.is_read ? '#fff7ed' : '#ffedd5'; borderColor = '#f97316'; }
            }
            else if (n.action_type === 'lost') { icon = '🔍'; if(!n.is_read) bg = '#e0f2fe'; borderColor = '#0ea5e9'; }
            else if (n.action_type === 'guest') { icon = '👤'; if(!n.is_read) bg = '#f1f5f9'; borderColor = '#64748b'; }
            else if (n.action_type.startsWith('message') || n.action_type.startsWith('msg_')) { icon = '💬'; if(!n.is_read) bg = '#f3e8ff'; borderColor = '#a855f7'; }
            else if (n.action_type === 'strike') { icon = '⚠️'; if(!n.is_read) bg = '#fef08a'; borderColor = '#eab308'; }

            let clickAction = '';
            if (n.action_type === 'incident') clickAction = `onclick="handleNotifClick('incident', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'lost') clickAction = `onclick="handleNotifClick('lost', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'guest') clickAction = `onclick="handleNotifClick('guest', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'msg_student') clickAction = `onclick="handleNotifClick('msg_student', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'msg_guest') clickAction = `onclick="handleNotifClick('msg_guest', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'message') clickAction = `onclick="handleNotifClick('message', ${n.action_id}, ${n.id})"`;
            if (n.action_type === 'strike') clickAction = `onclick="handleNotifClick('strike', ${n.action_id}, ${n.id})"`;
            
            let archiveBtnHtml = showArchiveBtn ? `<button onclick="event.stopPropagation(); dismissNotification(${n.id})" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; font-size:1.1rem; color:#666; cursor:pointer;" title="Archive">🗑️</button>` : '';

            return `<div style="position:relative; padding:10px ${showArchiveBtn ? '30px' : '10px'} 10px 10px; border-bottom: 1px solid #eee; border-left: 5px solid ${borderColor}; font-size:0.85rem; background:${bg}; cursor:${clickAction?'pointer':'default'}; color:${textCol}; transition:background 0.2s;" ${clickAction} onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">
                ${archiveBtnHtml}
                <div style="display:flex; gap:8px;"><div>${icon}</div><div><b>${esc(n.message)}</b><br><small class="muted" style="display:block; margin-top:4px;">🕒 ${formatDate(n.created_at)}</small></div></div>
            </div>`;
        };
        if (list) list.innerHTML = r.notifications.length ? r.notifications.slice(0, 3).map(n => renderNotif(n, false)).join('') : '<div style="padding:20px; text-align:center; color:#666;">No new notifications.</div>';
        if (allList) { 
            const chronologicalNotifs = [...r.notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            allList.innerHTML = chronologicalNotifs.length ? chronologicalNotifs.map(n => renderNotif(n, true)).join('') : '<div class="empty" style="padding:40px;">No notifications yet.</div>'; 
        }
    } catch (e) { console.error(e); }
}

async function showStrikeModal(violationId) {
    try {
        const r = await api('get-violation?id=' + violationId);
        if (!r.ok) throw new Error('Violation not found.');
        const v = r.violation;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; border-top: 8px solid #d97706; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 12px;">⚠️</div>
                <h2 style="margin-bottom: 8px; color: #b45309;">Official Strike Notice</h2>
                <p class="muted" style="margin-bottom: 20px;">You have received a formal violation record on your account.</p>
                
                <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
                    <p style="margin: 0 0 8px; font-weight: 800; color: #92400e; font-size: 1.1rem;">${esc(v.violation_type)}</p>
                    <p style="margin: 0; color: #78350f; line-height: 1.5; font-size: 0.95rem;">"${esc(v.description)}"</p>
                </div>
                
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 24px;">
                    Issued by: <b>${esc(v.staff_name)}</b><br>
                    Date: ${new Date(v.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                
                <button class="btn primary" style="width: 100%;" onclick="this.closest('.modal-overlay').remove()">I Understand</button>
            </div>
        `;
        
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);

    } catch (e) {
        showToast('This strike record is too old to display details. Please check with the SAO office.', 'warning');
    }
}

async function dismissNotification(id) {
    showConfirm('Are you sure you want to archive this notification?', async () => {
        try { await api('dismiss-notification', { method: 'POST', body: JSON.stringify({ notif_id: id }) }); loadNotifications(); showToast('Notification archived.', 'success'); } catch (e) { showToast(e.message, 'error'); }
    });
}

async function clearAllNotifications() {
    showConfirm('Are you sure you want to archive all your notifications?', async () => {
        try { await api('clear-all-notifications', { method: 'POST' }); loadNotifications(); showToast('All notifications archived.', 'success'); } catch (e) { showToast(e.message, 'error'); }
    });
}

function toggleNotifDropdown() { $('notifDropdown').classList.toggle('hidden'); }

function viewAllNotifications() { $('notifDropdown').classList.add('hidden'); document.querySelector('.d-tab[data-target="tab-notifications"]').click(); }

async function handleNotifClick(type, id, notifId) {
    $('notifDropdown').classList.add('hidden');
    try { await api('mark-single-read', { method: 'POST', body: JSON.stringify({ notif_id: notifId }) }); loadNotifications(); } catch(e) { console.error(e); }

    if (type === 'incident') { document.querySelector('.d-tab[data-target="tab-incident"]').click(); setTimeout(() => { if(incidentMap) incidentMap.invalidateSize(); focusIncident(id); }, 300); } 
    else if (type === 'lost') { document.querySelector('.d-tab[data-target="tab-lost"]').click(); setTimeout(() => { if(lostMap) lostMap.invalidateSize(); focusLostItem(id); }, 300); } 
    else if (type === 'guest') { window.location.href = 'admin.php?tab=guests'; } 
    else if (type === 'msg_student' || type === 'msg_guest') { document.querySelector('.d-tab[data-target="tab-messages"]').click(); setTimeout(() => { openChat(type === 'msg_guest' ? 'guest' : 'student', id); }, 300); }
    else if (type === 'message') { 
        document.querySelector('.d-tab[data-target="tab-messages"]').click();
        setTimeout(async () => { 
            await loadStaffData(); 
            openChat('staff', id); 
        }, 300);
    }
    else if (type === 'strike') { showStrikeModal(id); }
}

async function loadStaffDirectory() { try { const r = await api('staff-list'); staffCache = r.staff; r.staff.forEach(st => staffNames[st.id] = st.full_name); renderStaffList(); } catch(e){} }

function renderStaffList() {
    if($('staffList')) $('staffList').innerHTML = staffCache.map(st => {
        const preview = st.last_message ? (st.last_message.length > 30 ? st.last_message.slice(0,30)+'...' : st.last_message) : 'Click to chat';
        const avatarHtml = st.profile_pic ? `<img src="${esc(st.profile_pic)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">` : `<span class="avatar">${esc(st.full_name[0])}</span>`;
        return `<button class="person" onclick="openChat('staff',${st.id}, '${esc(st.full_name)}', '${esc(st.profile_pic || '')}')">${avatarHtml}<span class="pinfo"><b>${esc(st.full_name)}</b><small>${esc(preview)}</small></span></button>`;
    }).join('');
    
    if($('staffDirectoryList')) $('staffDirectoryList').innerHTML = staffCache.map(st => {
        const avatarHtml = st.profile_pic ? `<img src="${esc(st.profile_pic)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">` : `<span class="avatar">${esc(st.full_name[0])}</span>`;
        return `
        <button class="person" onclick="openChat('staff',${st.id}, '${esc(st.full_name)}', '${esc(st.profile_pic || '')}'); document.getElementById('staffDirectoryPanel').classList.add('hidden')">
            ${avatarHtml}
            <span class="pinfo"><b>${esc(st.full_name)}</b><small>${esc(st.last_message ? 'Click to chat' : 'Start a new conversation')}</small></span>
        </button>
    `}).join('');
}

function updateStaffMessages(list) {
    chatThreads = new Map();
    list.forEach(m => { 
        const id = m.partner_id; 
        const key = `${m.thread_type}-${id}`; 
        if (!chatThreads.has(key)) chatThreads.set(key, {key, type:m.thread_type, id:Number(id), name:m.thread_name, pic: m.partner_pic, msgs:[], is_archived: m.is_archived == 1}); 
        chatThreads.get(key).msgs.push(m); 
    });
    renderPeopleList(); 
    renderDock();
}

function renderPeopleList() {
    if (!isStaff()) return;
    const reporters = [...chatThreads.values()].filter(t=>t.type!=='staff' && !t.is_archived); 
    const staffMsgs = [...chatThreads.values()].filter(t=>t.type==='staff' && !t.is_archived);
    
    const renderP = t => { 
        const unread = t.msgs.filter(m => !isMine(m) && !m.read_at).length; 
        const lastMsg = t.msgs.length ? t.msgs[t.msgs.length-1].message : 'No messages yet';
        const avatarHtml = t.pic ? `<img src="${esc(t.pic)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">` : `<span class="avatar">${esc(t.name[0])}</span>`;
        return `<div style="display:flex; align-items:center; width:100%;">
            <button class="person ${openChats.includes(t.key)?'active':''}" style="flex:1; margin:0;" onclick="openChat('${t.type}',${t.id}, '${esc(t.name)}', '${esc(t.pic || '')}')">
                ${avatarHtml}
                <span class="pinfo"><b>${esc(t.name)}</b><small>${esc(lastMsg.length > 30 ? lastMsg.slice(0,30)+'...' : lastMsg)}</small></span>
                ${unread ? `<span class="notif">${unread > 99 ? '99+' : unread}</span>` : ''}
            </button>
            <button class="mini danger-btn" onclick="archiveThread('${t.type}', ${t.id})" title="Archive Thread" style="margin-left:8px; padding:8px 10px;">📁</button>
        </div>`; 
    };
    
    if($('messageTableReporters')) $('messageTableReporters').innerHTML = reporters.length ? `<table class="data-table"><tbody>${reporters.map(t => `<tr><td style="padding:8px; border:none;">${renderP(t)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">None</div>';
    if($('messageTableStaff')) $('messageTableStaff').innerHTML = staffMsgs.length ? `<table class="data-table"><tbody>${staffMsgs.map(t => `<tr><td style="padding:8px; border:none;">${renderP(t)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">None</div>';
}

async function openChat(type, id, name = null, pic = null) {
    const key = `${type}-${id}`; 
    if (!chatThreads.has(key)) {
        const displayName = name || (type === 'staff' ? staffNames[id] : 'Unknown User');
        chatThreads.set(key, {key, type:type, id:Number(id), name:displayName, pic:pic, msgs:[], is_archived: false});
    }
    
    if (!openChats.includes(key)) { openChats.push(key); while (openChats.length > 3) openChats.shift(); }
    renderDock(); 
    if (type === 'staff' && !isStaff()) await loadStudentChat(key);
}

function renderDock() {
    let dock = $('chatDock'); 
    if (!dock) { dock = document.createElement('div'); dock.id='chatDock'; document.body.appendChild(dock); }
    [...dock.children].forEach(w => { if (!openChats.includes(w.dataset.key)) w.remove(); });
    openChats.forEach(key => {
        const t = chatThreads.get(key); if (!t) return; let w = [...dock.children].find(x => x.dataset.key === key);
        if (!w) { 
            w = document.createElement('div'); w.className='chat-win'; w.dataset.key=key; 
            const avatarHtml = t.pic ? `<img src="${esc(t.pic)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">` : '';
            w.innerHTML = `
                <div class="chat-head">
                    <div style="display:flex; align-items:center; gap:8px;">${avatarHtml}<b>${esc(t.name)}</b></div>
                    <button class="chat-close" onclick="this.closest('.chat-win').remove(); openChats = openChats.filter(k => k !== '${key}')">✕</button>
                </div>
                <div class="chat-body"></div>
                <div class="chat-send">
                    <input type="file" id="chatFile_${key}" style="display:none;" onchange="stageChatFile('${key}', this)">
                    <button id="chatFileBtn_${key}" class="btn secondary" style="padding:0 12px;" onclick="document.getElementById('chatFile_${key}').click()" title="Attach File">📎</button>
                    <textarea rows="1" placeholder="Write..."></textarea>
                    <button class="btn secondary" onclick="sendMsg('${key}')">Send</button>
                </div>
            `; 
            dock.appendChild(w); 
        }
        const body = w.querySelector('.chat-body'); const sig = t.msgs.length + ':' + (t.msgs[t.msgs.length-1]?.id||0);
        if (body.dataset.sig !== sig) { 
            body.innerHTML = t.msgs.map(m => {
                const mediaHtml = m.attachment_path ? (() => {
                    const path = m.attachment_path;
                    const filename = path.split('/').pop();
                    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        return `<img src="${esc(path)}" onclick="showFilePreview('${esc(path)}', '${esc(filename)}')" style="max-width:100%; border-radius:8px; margin-top:8px; cursor:pointer;">`;
                    } else if (path.match(/\.(mp4|webm|ogg)$/i)) {
                        return `<video src="${esc(path)}" controls style="max-width:100%; border-radius:8px; margin-top:8px;"></video>`;
                    } else {
                        return `<div onclick="showFilePreview('${esc(path)}', '${esc(filename)}')" style="display:inline-flex; align-items:center; gap:8px; margin-top:8px; padding:8px 12px; background:rgba(0,0,0,0.08); border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:0.85rem; font-weight:600; color:inherit; cursor:pointer; max-width:100%;">
                            <span>📄</span> 
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:underline;">Preview: ${esc(filename)}</span>
                        </div>`;
                    }
                })() : '';
                return `<div class="bubble ${isMine(m)?'mine':'theirs'}">
                    <b class="who">${esc(isMine(m)?'You':t.name)}</b>
                    <span>${esc(m.message)}</span>
                    ${mediaHtml}
                    <span class="bubble-time">${formatDate(m.created_at)}</span>
                </div>`;
            }).join(''); 
            body.dataset.sig = sig; body.scrollTop = body.scrollHeight; 
        }
        if (t.msgs.some(m => !isMine(m) && !m.read_at)) markThreadRead(key, t);
    });
}

async function markThreadRead(key, t) { try { await api('mark-read', { method: 'POST', body: JSON.stringify(isStaff() ? {thread_type:t.type, thread_id:t.id} : {staff_id:t.id}) }); t.msgs.forEach(m => { if (!isMine(m)) m.read_at = new Date().toISOString(); }); renderPeopleList(); } catch(e) {} }
async function loadStudentChat(key) { const t=chatThreads.get(key); try{ t.msgs = (await api('my-messages?staff_id='+t.id)).messages; renderDock(); }catch(e){} }

async function sendMsg(key) {
    const t = chatThreads.get(key);
    const w = [...$('chatDock').children].find(x => x.dataset.key === key);
    const ta = w.querySelector('textarea');
    const msg = ta.value.trim();
    const file = stagedFiles[key];

    if (!msg && !file) return; 

    const fd = new FormData();
    fd.append('message', msg);
    if (file) fd.append('attachment', file);

    try {
        let r;
        if(isStaff()) {
            fd.append('thread_type', t.type); fd.append('thread_id', t.id);
            r = await fetch('api/index.php/message-reply', { method:'POST', body:fd }).then(res=>res.json());
        } else {
            fd.append('staff_id', t.id);
            r = await fetch('api/index.php/message', { method:'POST', body:fd }).then(res=>res.json());
        }
        
        if (!r.ok) throw r;

        ta.value = ''; 
        delete stagedFiles[key];
        const fileInput = document.getElementById(`chatFile_${key}`);
        if (fileInput) fileInput.value = '';
        const btn = document.getElementById(`chatFileBtn_${key}`);
        if (btn) {
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.innerHTML = '📎';
        }

        if(!isStaff()) await loadStudentChat(key); else await loadStaffData(); 
    } catch(e){ showToast(e.message || 'Failed to send message.', 'error'); }
}

async function archiveThread(type, id) {
    showConfirm('Hide this chat from your active list? (It will reappear if the user sends a new message).', async () => {
        try {
            await api('archive-thread', { method: 'POST', body: JSON.stringify({ thread_type: type, thread_id: id }) });
            showToast('Thread archived.', 'success');
            await loadStaffData(); 
        } catch(e) { showToast(e.message, 'error'); }
    });
}

function openSettingsModal() {
    if (currentUser.role === 'guest') return showToast('Guests cannot edit their profile.', 'warning');
    isRemovingPic = false; 
    $('settingsModal').classList.remove('hidden');
}

// Close notification dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = $('notifDropdown');
    const bell = document.querySelector('.notif-bell');
    
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (bell && !bell.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    }
});

window.addEventListener('DOMContentLoaded', boot);



// Close the mobile menu automatically when a tab is clicked
document.querySelectorAll('.d-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && sidebar.classList.contains('active')) {
                window.toggleMobileMenu();
            }
        }
    });
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