document.addEventListener('DOMContentLoaded', async () => {
    const loginOverlay = document.getElementById('login-overlay');
    const adminPasswordInput = document.getElementById('admin-password');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');
    const dashboardControls = document.getElementById('dashboard-controls');
    const extensionsList = document.getElementById('extensions-list');

    let ADMIN_PASSWORD = localStorage.getItem('admin_pwd') || '';

    // Auto-login if password saved
    if (ADMIN_PASSWORD) {
        loginOverlay.style.display = 'none';
        dashboardControls.style.display = 'block';
        loadExtensions();
        setupTestWebhook(); // Initialize test button
    }

    btnLogin.onclick = () => {
        const pwd = adminPasswordInput.value;
        if (pwd) {
            localStorage.setItem('admin_pwd', pwd);
            ADMIN_PASSWORD = pwd;
            loginOverlay.style.display = 'none';
            dashboardControls.style.display = 'block';
            loadExtensions();
            setupTestWebhook(); // Initialize test button
        } else {
            loginError.textContent = "Please enter a password";
            loginError.style.display = 'block';
        }
    };

    function setupTestWebhook() {
        const btnTest = document.getElementById('btn-test-webhook');
        const testStatus = document.getElementById('test-status');

        if (!btnTest || !testStatus) return;

        btnTest.onclick = async () => {
            btnTest.disabled = true;
            btnTest.innerText = 'Sending Ping...';
            testStatus.innerText = '';

            try {
                const res = await fetch('/api/test-webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ADMIN_PASSWORD}`
                    }
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.details || data.error || 'Test failed.');

                testStatus.innerText = '✅ Webhook Successful!';
                testStatus.style.color = '#22c55e';
                setTimeout(() => { testStatus.innerText = ''; }, 5000);

            } catch (e) {
                testStatus.innerText = '❌ Failed: ' + e.message;
                testStatus.style.color = '#f87171';
            } finally {
                btnTest.disabled = false;
                btnTest.innerText = 'Test Discord Webhook';
            }
        };
    }

    async function loadExtensions() {
        try {
            const res = await fetch('/api/extensions');
            if (!res.ok) throw new Error('Failed to load extensions list.');
            const manifest = await res.json();

            extensionsList.innerHTML = ''; // Clear

            for (const item of manifest) {
                const el = await buildAdminRow(item);
                extensionsList.appendChild(el);
            }

        } catch (e) {
            alert('Load failed: ' + e.message);
        }
    }

    async function buildAdminRow(item) {
        const folder = item.main?.split('/')?.[0] || 'subfolder';
        const div = document.createElement('div');
        div.className = 'accordion';

        let currentVersion = '0.0.0';
        try {
            // Fetch directly from GitHub Raw to avoid Vercel static routing issues
            const vRes = await fetch(`https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/${folder}/version.json?v=${Math.random()}`);
            if (vRes.ok) {
                const data = await vRes.json();
                currentVersion = data.version;
            }
        } catch (e) { }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
                <h3 style="font-size:1.4rem;">${item.name} <span class="badge">v${currentVersion}</span></h3>
                <span style="opacity:0.5; font-size:0.8rem;">Folder: ${folder}</span>
            </div>

            <div class="admin-controls">
                <div class="form-group">
                    <label>New Version Number</label>
                    <input type="text" id="v-${folder}" value="${incrementVersion(currentVersion)}" placeholder="e.g., 1.2.2">
                </div>

                <div class="form-group">
                    <label>Changelog (One item per line)</label>
                    <textarea id="ch-${folder}" rows="3" placeholder="Removed item X...\nAdded functionality Y..."></textarea>
                </div>

                <button class="action-btn" id="submit-${folder}">Push Update to GitHub</button>
                <p id="status-${folder}" style="font-size:0.85rem; text-align:center; margin-top:5px; transition:color 0.2s;"></p>
            </div>
        `;

        const btn = div.querySelector(`#submit-${folder}`);
        const status = div.querySelector(`#status-${folder}`);

        btn.onclick = async () => {
            const version = div.querySelector(`#v-${folder}`).value.trim();
            const changelog = div.querySelector(`#ch-${folder}`).value.trim();

            if (!version || !changelog) {
                status.innerText = '❌ Fill in version and changelog.';
                status.style.color = '#f87171';
                return;
            }

            btn.innerText = 'Pushing to GitHub...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ADMIN_PASSWORD}`  // Pass password to server
                    },
                    body: JSON.stringify({ folder, version, changelog })
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        alert('Your Admin Password was rejected by server. Resetting auth.');
                        localStorage.removeItem('admin_pwd');
                        window.location.reload();
                    }
                    const err = await res.json();
                    throw new Error(err.details || 'Push failed');
                }

                status.innerText = '✅ Update pushed successfully! (Note: GitHub Raw takes ~5 mins to cache-clear & appear live)';
                status.style.color = '#22c55e';
                div.querySelector('.badge').innerText = `v${version}`;

            } catch (e) {
                status.innerText = '❌ Error: ' + e.message;
                status.style.color = '#f87171';
            } finally {
                btn.innerText = 'Push Update to GitHub';
                btn.disabled = false;
            }
        };

        return div;
    }

    function incrementVersion(v) {
        if (!v || v === '0.0.0') return '1.0.0';
        const parts = v.split('.');
        if (parts.length < 3) return v;
        const patch = parseInt(parts[2]);
        if (isNaN(patch)) return v;
        return `${parts[0]}.${parts[1]}.${patch + 1}`;
    }
});
