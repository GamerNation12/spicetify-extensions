document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('extensions-grid');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('error-alert');

    // Detect environment
    const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
    
    // GitHub Raw fallback base URL
    const BASE_URL = IS_LOCAL 
        ? '..' 
        : 'https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main';

    const MANIFEST_PATH = `${BASE_URL}/manifest.json`;

    try {
        const res = await fetch(`${MANIFEST_PATH}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const manifest = await res.json();

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
            const vRes = await fetch(`${BASE_URL}/${folder}/version.json?t=${Date.now()}`);
            if (vRes.ok) versionData = await vRes.json();
        } catch (e) {
            console.log(`Failed to fetch version for ${folder}`);
        }

        const card = document.createElement('div');
        card.className = 'card';

        const bannerPath = `${BASE_URL}/${item.preview}`;
        
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
