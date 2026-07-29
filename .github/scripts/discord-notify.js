import fs from 'fs';

async function main() {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
    const REPO_OWNER = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
    const REPO_NAME = process.env.REPO_NAME || process.env.GITHUB_REPOSITORY.split('/')[1];
    const REPO_BRANCH = process.env.REPO_BRANCH || 'main';

    if (!BOT_TOKEN || !CHANNEL_ID) {
        console.warn('Discord Bot config missing (DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID). Skipping notification.');
        return;
    }

    const changedFiles = process.argv.slice(2);
    
    for (const file of changedFiles) {
        if (!file.endsWith('version.json')) continue;
        
        const folder = file.split('/')[0];
        
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            const version = data.version;
            let changelogList = "No changes specified.";
            
            if (data.changelog && Array.isArray(data.changelog)) {
                changelogList = data.changelog
                    .map(l => l.trim())
                    .filter(l => l.length > 0)
                    .map(l => `• ${l.replace(/^\s*[•·\-]\s*/, '')}`)
                    .join('\n');
            } else if (typeof data.changelog === 'string') {
                changelogList = data.changelog.split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 0)
                    .map(l => `• ${l.replace(/^\s*[•·\-]\s*/, '')}`)
                    .join('\n');
            }

            const embed = {
                author: {
                    name: "Spicetify Extension Updates",
                    icon_url: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/spicetify.png`
                },
                title: `🚀 Extension Updated: ${folder}`,
                description: `Version **v${version}** is now available.`,
                url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${REPO_BRANCH}/${encodeURIComponent(folder)}`,
                color: 0xff6600, // Spicetify Orange
                fields: [
                    {
                        name: "📝 Changelog",
                        value: changelogList
                    }
                ],
                timestamp: new Date().toISOString()
            };

            console.log(`Sending notification for ${folder} v${version}...`);
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
                                    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${REPO_BRANCH}/${encodeURIComponent(folder)}`
                                }
                            ]
                        }
                    ]
                })
            });

            if (!res.ok) {
                const body = await res.text();
                console.error(`Discord rejected hook for ${folder}: ${res.status} - ${body}`);
            } else {
                console.log(`Successfully notified Discord for ${folder}.`);
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
}

main();
