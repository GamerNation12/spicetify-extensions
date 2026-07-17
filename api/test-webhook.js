export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    try {
        await sendDiscordBotMessage('Test Extension', '1.0.0-test', 'This is a test notification!\nYour Discord Bot setup is working correctly.');
        res.status(200).json({ success: true, message: 'Test message sent via Discord Bot!' });
    } catch (e) {
        res.status(500).json({ error: 'Bot message failed', details: e.message });
    }
}

async function sendDiscordBotMessage(folder, version, changelog) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

    if (!BOT_TOKEN || !CHANNEL_ID) {
        throw new Error('DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID must be configured.');
    }

    const changelogList = changelog.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => `• ${l}`)
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
            { name: "📝 Changelog", value: changelogList || "No changes specified." }
        ],
        timestamp: new Date().toISOString()
    };

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
                            url: `https://github.com/${process.env.REPO_OWNER}/${process.env.REPO_NAME}`
                        }
                    ]
                }
            ]
        })
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Discord rejected hook: ${res.status} - ${body}`);
    }
}
