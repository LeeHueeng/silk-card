// Regenerates src/silk-card.ts so every card module in src/cards is registered.
// Run: node scripts/gen-entry.mjs [version]
import fs from 'node:fs';

const version = process.argv[2] || '0.6.0';
const files = fs
  .readdirSync('src/cards')
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();

const alias = (f) => f.toUpperCase().replace(/[^A-Z0-9]/g, '_');
const seen = new Set();
for (const f of files) {
  const a = alias(f);
  if (seen.has(a)) throw new Error(`alias collision: ${a}`);
  seen.add(a);
}

const imports = files.map((f) => `import { META as ${alias(f)} } from './cards/${f}';`).join('\n');
const rows = [];
for (let i = 0; i < files.length; i += 8) {
  rows.push('  ' + files.slice(i, i + 8).map(alias).join(', ') + ',');
}

const out = `import './shared/slider';
${imports}

const VERSION = '${version}';

const CARDS = [
${rows.join('\n')}
];

declare global {
  interface Window {
    customCards?: unknown[];
  }
}

window.customCards = window.customCards || [];
for (const card of CARDS) {
  window.customCards.push({
    ...card,
    preview: true,
    documentationURL: 'https://github.com/LeeHueeng/silk-card',
  });
}

console.info(
  \`%c SILK %c v\${VERSION} · \${CARDS.length} cards \`,
  'background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700',
  'background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0'
);
`;

fs.writeFileSync('src/silk-card.ts', out);
console.log(`wired ${files.length} cards into src/silk-card.ts (v${version})`);
