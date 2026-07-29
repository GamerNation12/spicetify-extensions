import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from /docs for the dashboard
app.use(express.static(path.join(process.cwd(), 'docs')));

// Constants for GitHub API
const GH_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.REPO_OWNER;
const REPO = process.env.REPO_NAME;
const BRANCH = process.env.REPO_BRANCH || 'main';

if (!GH_TOKEN || !OWNER || !REPO) {
    console.error('⚠️ Missing required environment variables: GITHUB_TOKEN, REPO_OWNER, or REPO_NAME');
}

/* 
  API Endpoint: Get Extensions list
  Reads manifest.json either from local disk or GitHub
*/
app.get('/api/extensions', async (req, res) => {
    try {
        const manifestPath = path.join(process.cwd(), 'manifest.json');
        const data = fs.readFileSync(manifestPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: 'Failed to read manifest.json', details: e.message });
    }
});

/* 
  API Endpoint: Update Extension
  Updates both version.json and extension-core.js fallback via GitHub API
*/
app.post('/api/update', async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    const { folder, version, changelog } = req.body;

    if (!folder || !version || !changelog) {
        return res.status(400).json({ error: 'Missing required fields: folder, version, changelog' });
    }

    try {
        // 1. Update version.json on GitHub
        const versionPath = `${folder}/version.json`;
        const newVersionJson = { version, changelog: changelog.split('\n').filter(l => l.trim()) };
        await pushToGitHub(versionPath, JSON.stringify(newVersionJson, null, 2), `Update ${folder} to v${version} (version.json)`);

        // 2. Update extension-core.js on GitHub (Fallback mechanics)
        try {
            const corePath = `${folder}/extension-core.js`;
            const coreContent = await fetchFromGitHub(corePath);

            // Regex Replacement for fallbacks
            let updatedCore = coreContent.replace(/let\s+NPTD_VERSION\s*=\s*'[^']+'/, `let NPTD_VERSION = '${version}'`);
            const listStr = newVersionJson.changelog.map(l => `    '${l.replace(/'/g, "\\'")}'`).join(',\n');
            updatedCore = updatedCore.replace(/let\s+NPTD_CHANGELOG_LINES\s*=\s*\[[^\]]+\]/, `let NPTD_CHANGELOG_LINES = [\n${listStr}\n  ]`);

            await pushToGitHub(corePath, updatedCore, `Update ${folder} fallback to v${version} (extension-core.js)`);
        } catch (e) {
            console.log(`Skipping extension-core.js update for ${folder}:`, e.message);
        }
        
        // 3. Notify Discord (now handled by GitHub Actions auto-discord-update.yml)

        res.json({ success: true, message: `Successfully pushed updates to v${version}` });

    } catch (e) {
        console.error('Update failed:', e);
        res.status(500).json({ error: 'Push failed', details: e.message });
    }
});

/* 
  API Endpoint: Test Webhook
  Sends a dummy notification to Discord to verify the setup
*/
app.post('/api/test-webhook', async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    try {
        await sendDiscordWebhook('Test Extension', '1.0.0-test', '• This is a test notification!\n• Your Discord webhook setup is working correctly.');
        res.json({ success: true, message: 'Test notification sent to Discord!' });
    } catch (e) {
        res.status(500).json({ error: 'Webhook failed', details: e.message });
    }
});

/* --- GitHub Helpers --- */

async function fetchFromGitHub(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3.raw' }
    });
    if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.statusText}`);
    return await res.text();
}

async function pushToGitHub(path, content, message) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    
    // Get SHA of existing file to update it
    let sha = null;
    try {
        const fileRes = await fetch(url + `?ref=${BRANCH}`, {
            headers: { 'Authorization': `token ${GH_TOKEN}` }
        });
        if (fileRes.ok) {
            const fileData = await fileRes.json();
            sha = fileData.sha;
        }
    } catch (e) {
        console.log(`Creating new file or error on ${path}`);
    }

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


async function sendDiscordWebhook(folder, version, changelog) {
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
    
    // Clean up changelog for Discord
    const changelogList = changelog.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => `• ${l}`)
        .join('\n');
    
    const embed = {
        title: `🚀 Extension Updated: ${folder}`,
        description: `Version **v${version}** is now available.`,
        url: `https://github.com/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/tree/${process.env.REPO_BRANCH || 'main'}/${folder}`,
        color: 0x1ed760, // Spicetify Green
        fields: [
            { 
                name: "📝 Changelog", 
                value: changelogList || "No changes specified." 
            }
        ],
        footer: { text: "Spicetify Extension Updates (Test)" },
        timestamp: new Date().toISOString()
    };

    try {
        if (BOT_TOKEN && CHANNEL_ID) {
            await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bot ${BOT_TOKEN}`
                },
                body: JSON.stringify({ embeds: [embed] })
            });
        } else if (WEBHOOK_URL) {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
        }
        console.log(`[Webhook] Sent test notification for ${folder} v${version}`);
    } catch (e) {
        console.error('Discord Webhook failed:', e);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

