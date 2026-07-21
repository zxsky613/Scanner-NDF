/**
 * Expo web export charge le bundle via `<script defer>` (pas `type="module"`).
 * Si du `import.meta` reste dans le JS, le navigateur affiche une page blanche.
 * Ce script force `type="module"` sur les scripts du index.html après `expo export`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');

async function main() {
  let html = await fs.readFile(indexPath, 'utf8');
  const before = html;
  html = html.replace(
    /<script(\s+)src="(\/_expo\/static\/js\/[^"]+\.js)"(\s+defer)?><\/script>/g,
    '<script type="module" src="$2"></script>'
  );
  if (html === before) {
    console.warn('[fix-web-index] Aucun <script> Expo modifié (déjà OK ou HTML inattendu).');
  } else {
    await fs.writeFile(indexPath, html, 'utf8');
    console.log('[fix-web-index] index.html : scripts en type="module".');
  }
}

main().catch(err => {
  console.error('[fix-web-index]', err);
  process.exit(1);
});
