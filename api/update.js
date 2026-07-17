export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    const { folder, version, changelog } = req.body;
    const { GITHUB_TOKEN: GH_TOKEN, REPO_OWNER: OWNER, REPO_NAME: REPO } = process.env;
    const BRANCH = process.env.REPO_BRANCH || 'main';

    if (!GH_TOKEN || !OWNER || !REPO) {
        return res.status(500).json({ error: 'Server misconfigured. Missing environment variables.' });
    }

    try {
        // 1. Update version.json on GitHub
        const versionPath = `${folder}/version.json`;
        const newVersionJson = { version, changelog: changelog.split('\n').filter(l => l.trim()) };
        await pushToGitHub({ path: versionPath, content: JSON.stringify(newVersionJson, null, 2), message: `Update ${folder} to v${version} (version.json)`, GH_TOKEN, OWNER, REPO, BRANCH });

        // 2. Update extension-core.js on GitHub (Fallback mechanics)
        try {
            const corePath = `${folder}/extension-core.js`;
            const coreContent = await fetchFromGitHub({ path: corePath, GH_TOKEN, OWNER, REPO, BRANCH });

            // Regex Replacement for fallbacks
            let updatedCore = coreContent.replace(/let\s+NPTD_VERSION\s*=\s*'[^']+'/, `let NPTD_VERSION = '${version}'`);
            const listStr = newVersionJson.changelog.map(l => `    '${l.replace(/'/g, "\\'")}'`).join(',\n');
            updatedCore = updatedCore.replace(/let\s+NPTD_CHANGELOG_LINES\s*=\s*\[[^\]]+\]/, `let NPTD_CHANGELOG_LINES = [\n${listStr}\n  ]`);

            await pushToGitHub({ path: corePath, content: updatedCore, message: `Update ${folder} fallback to v${version} (extension-core.js)`, GH_TOKEN, OWNER, REPO, BRANCH });
        } catch (e) {
            console.log(`Skipping extension-core.js update for ${folder}:`, e.message);
        }

        // 3. Notify Discord
        await sendDiscordBotMessage(folder, version, changelog);

        res.status(200).json({ success: true, message: `Successfully pushed updates to v${version}` });

    } catch (e) {
        res.status(500).json({ error: 'Push failed', details: e.message });
    }
}

async function fetchFromGitHub({ path, GH_TOKEN, OWNER, REPO, BRANCH }) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3.raw' }
    });
    if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.statusText}`);
    return await res.text();
}

async function pushToGitHub({ path, content, message, GH_TOKEN, OWNER, REPO, BRANCH }) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    let sha = null;
    try {
        const fileRes = await fetch(url + `?ref=${BRANCH}`, {
            headers: { 'Authorization': `token ${GH_TOKEN}` }
        });
        if (fileRes.ok) {
            const fileData = await fileRes.json();
            sha = fileData.sha;
        }
    } catch (e) { }

    const body = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch: BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errType = await res.text();
        throw new Error(`Push ${path} failed: ${res.status} - ${errType}`);
    }
}

async function sendDiscordBotMessage(folder, version, changelog) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

    if (!BOT_TOKEN || !CHANNEL_ID) {
        console.warn('Discord Bot config missing - skipping notification.');
        return;
    }

    // Clean up changelog for Discord (and prevent double-bullets)
    const changelogList = changelog.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => `• ${l.replace(/^\s*[•·\-]\s*/, '')}`)
        .join('\n');

    const embed = {
        author: {
            name: "Spicetify Extension Updates",
            icon_url: "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/spicetify.png"
        },
        title: `🚀 Extension Updated: ${folder}`,
        description: `Version **v${version}** is now available.`,
        url: `https://github.com/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/tree/${process.env.REPO_BRANCH || 'main'}/${encodeURIComponent(folder)}`,
        color: 0xff6600, // Spicetify Orange
        fields: [
            {
                name: "📝 Changelog",
                value: changelogList || "No changes specified."
            }
        ],
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bot ${BOT_TOKEN}`
            },
            body: JSON.stringify({
                embeds: [embed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                label: "🖥️ Dashboard",
                                style: 5,
                                url: "https://spicetify-extensions.vercel.app"
                            },
                            {
                                type: 2,
                                label: "🔗 Source Code",
                                style: 5,
                                url: `https://github.com/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/tree/${process.env.REPO_BRANCH || 'main'}/${encodeURIComponent(folder)}`
                            }
                        ]
                    }
                ]
            })
        });
        if (!res.ok) {
            const body = await res.text();
            console.error(`Discord rejected hook: ${res.status} - ${body}`);
        }
    } catch (e) {
        console.error('Discord Webhook failed:', e);
    }
}
