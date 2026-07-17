import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    try {
        const manifestPath = path.join(process.cwd(), 'manifest.json');
        const data = fs.readFileSync(manifestPath, 'utf8');
        res.status(200).json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: 'Failed to read manifest.json', details: e.message });
    }
}
