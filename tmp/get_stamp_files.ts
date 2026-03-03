import fs from 'fs';
import path from 'path';

const STAMPS_DIR = path.join(process.cwd(), 'public', 'stamps');

const biomes = ['Montanya', 'Mar', 'Interior', 'City', 'Blossom'];
const mapping: any = {};

biomes.forEach(biome => {
    const dir = path.join(STAMPS_DIR, biome);
    if (fs.existsSync(dir)) {
        mapping[biome.toLowerCase()] = fs.readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    }
});

console.log(JSON.stringify(mapping, null, 2));
