import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    const folder = String(req.query?.folder || '');
    if (!folder || !/^[A-Za-z0-9_-]+$/.test(folder)) {
        return res.status(400).json({ error: 'Missing or invalid folder parameter' });
    }
    try {
        const versionPath = path.join(process.cwd(), folder, 'version.json');
        const data = fs.readFileSync(versionPath, 'utf8');
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.status(200).json(JSON.parse(data));
    } catch (e) {
        res.status(404).json({ error: `No version.json for folder: ${folder}` });
    }
}
