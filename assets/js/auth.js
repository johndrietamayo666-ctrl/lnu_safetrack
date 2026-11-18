const api = async (endpoint, options = {}) => {
    const r = await fetch(`api/index.php/${endpoint}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    if (!data) {
        const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
        throw { message: `Server error (HTTP ${r.status}): ${snippet || 'empty response'}` };
    }
    if (!r.ok) throw data;
    return data;
};

const $ = id => document.getElementById(id);

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            tab.classList.add('active');
            $('loginTab').classList.toggle('hidden', tab.dataset.tab !== 'login');
            $('guestTab').classList.toggle('hidden', tab.dataset.tab !== 'guest');
        });
    });

    $('showGuestRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        $('guestLoginView').classList.add('hidden');
        $('guestRegisterView').classList.remove('hidden');
        $('guestRegMsg').textContent = ''; 
    });

    $('showGuestLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        $('guestRegisterView').classList.add('hidden');
        $('guestLoginView').classList.remove('hidden');
        $('guestLoginMsg').textContent = ''; 
    });

    $('loginForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const msgEl = $('loginMsg');
        btn.disabled = true;
        msgEl.textContent = 'Signing in...';
        msgEl.className = 'form-msg';
        
        try {
            await api('login', { method: 'POST', body: JSON.stringify({
                role: $('role').value, username: $('username').value.trim(), password: $('password').value
            })});
            const s = await api('session');
            if (!s.user) { msgEl.textContent = 'Session lost — check cookies.'; msgEl.className = 'form-msg error'; return; }
            location.href = 'dashboard.php';
        } catch (err) { 
            // FIXED: Removed showToast here. It only updates the inline red text.
            msgEl.textContent = err.message || 'Login failed.';
            msgEl.className = 'form-msg error';
        } finally {
            btn.disabled = false;
        }
    });

    $('guestForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const fileInput = $('guestIdPhoto');
        const msgEl = $('guestRegMsg');
        
        if (fileInput.files.length === 0) { 
            msgEl.textContent = 'Please upload an ID.';
            msgEl.className = 'form-msg error';
            return; 
        }

        const formData = new FormData();
        formData.append('first_name', $('guestFirstName').value.trim());
        formData.append('middle_name', $('guestMiddleName').value.trim());
        formData.append('last_name', $('guestLastName').value.trim());
        formData.append('email', $('guestEmail').value.trim());
        formData.append('phone', $('guestPhone').value.trim());
        formData.append('valid_id', $('guestIdType').value.trim() + ': ' + $('guestId').value.trim());
        formData.append('reason', $('guestReason').value.trim());
        formData.append('id_photo', fileInput.files[0]);

        const btn = e.target.querySelector('button');
        btn.disabled = true;
        msgEl.textContent = 'Submitting...';
        msgEl.className = 'form-msg';

        try {
            const r = await fetch('api/index.php/guest-register', { method: 'POST', body: formData });
            const data = await r.json();
            if (!r.ok) throw data;
            
            msgEl.textContent = data.message;
            msgEl.className = 'form-msg success';
            showToast(data.message, 'success');
            e.target.reset();
        } catch (err) { 
            msgEl.textContent = err.message || 'Registration failed.';
            msgEl.className = 'form-msg error';
        } finally {
            btn.disabled = false;
        }
    });

    $('guestLoginForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const msgEl = $('guestLoginMsg');
        const btn = e.target.querySelector('button');
        
        btn.disabled = true;
        msgEl.textContent = 'Logging in...';
        msgEl.className = 'form-msg';

        try {
            await api('guest-login', { method: 'POST', body: JSON.stringify({
                email_or_phone: $('verifiedGuestEmail').value.trim(),
                valid_id: $('verifiedGuestValidId').value.trim()
            })});
            location.href = 'dashboard.php';
        } catch (err) { 
            msgEl.textContent = err.message || 'Login failed.';
            msgEl.className = 'form-msg error';
        } finally {
            btn.disabled = false;
        }
    });

});