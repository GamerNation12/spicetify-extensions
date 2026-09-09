document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('extensions-grid');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('error-alert');

    const GH_RAW = 'https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main';

    // Try same-origin API first (no rate limits, always fresh), fall back to GitHub Raw.
    async function fetchJson(urls) {
        let lastErr = null;
        for (const u of urls) {
            try {
                const res = await fetch(u);
                if (res.ok) return await res.json();
                lastErr = new Error(`Fetch failed: ${res.status} for ${u}`);
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('All sources failed');
    }

    try {
        const manifest = await fetchJson([
            `/api/extensions`,
            `${GH_RAW}/manifest.json?t=${Date.now()}`
        ]);

        loading.style.display = 'none';

        for (const item of manifest) {
            const card = await buildCard(item);
            grid.appendChild(card);
        }

    } catch (e) {
        console.error('Fetch error:', e);
        loading.style.display = 'none';
        errorAlert.style.display = 'flex';
        // Add hardcoded fallback demo card if fails in local file://
        loadFallbackDemo();
    }

    async function buildCard(item) {
        const folder = item.main?.split('/')?.[0] || 'subfolder';
        let versionData = { version: '0.0.0', changelog: ['Updates pending...'] };

        try {
            versionData = await fetchJson([
                `/api/version?folder=${encodeURIComponent(folder)}`,
                `${GH_RAW}/${folder}/version.json?t=${Date.now()}`
            ]);
            if (!versionData.version) versionData.version = '0.0.0';
            if (!Array.isArray(versionData.changelog)) versionData.changelog = ['Updates pending...'];
        } catch (e) {
            console.log(`Failed to fetch version for ${folder}`);
        }

        const card = document.createElement('div');
        card.className = 'card';

        const bannerPath = `${GH_RAW}/${item.preview}`;

        card.innerHTML = `
            <div class="card-banner">
                <img src="${bannerPath}" alt="${item.name}" onerror="this.src='https://placehold.co/600x300/13151c/94a3b8?text=Extension'">
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3>${item.name}</h3>
                    <span class="badge">v${versionData.version}</span>
                </div>
                <p class="card-desc">${item.description}</p>

                <div class="changelog-section">
                    <div class="changelog-title">Latest Changes</div>
                    <ul class="changelog-list">
                        ${versionData.changelog.map(line => `<li>${line}</li>`).join('')}
                    </ul>
                </div>

                <div class="tags">
                    ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
        return card;
    }

    function loadFallbackDemo() {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-banner">
                <img src="../now-playing-release-date/preview.jpg" alt="Fallback demo" onerror="this.src='https://placehold.co/600x300/13151c/94a3b8?text=Use+HTTP+Server'">
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3>Now Playing Release Date</h3>
                    <span class="badge">v1.2.1</span>
                </div>
                <p class="card-desc">Displays the original release date of the currently playing track next to the artist.</p>
                <div class="changelog-section">
                    <div class="changelog-title">Latest Changes</div>
                    <ul class="changelog-list">
                        <li>Removed Calendar icon feature</li>
                    </ul>
                </div>
            </div>
        `;
        grid.appendChild(card);
    }
});
