/**
 * G\u00e9n\u00e8re des pages HTML statiques publiques pour les documents l\u00e9gaux
 * (politique de confidentialit\u00e9, CGU, mentions l\u00e9gales) en FR / EN / ZH.
 *
 * Sortie : `dist/privacy.html`, `dist/terms.html`, `dist/mentions.html`
 *
 * Pourquoi ?
 *   Apple App Store et Google Play exigent une URL **publique** (sans login)
 *   pour la politique de confidentialit\u00e9 ; idem pour les CGU. Cette URL doit
 *   renvoyer une page HTML lisible imm\u00e9diatement (sans JS lourd).
 *
 * Lanc\u00e9 par `npm run build:web` apr\u00e8s `expo export -p web`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import legalFr from '../src/i18n/legal/fr';
import legalEn from '../src/i18n/legal/en';
import legalZh from '../src/i18n/legal/zh';
import { LEGAL_PUBLISHER } from '../src/config/legalPublisher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

type LegalKind = 'mentions' | 'privacy' | 'terms';
type LegalBundle = typeof legalFr;
type LangCode = 'fr' | 'en' | 'zh';

const LANGS: { code: LangCode; label: string; bundle: LegalBundle }[] = [
  { code: 'fr', label: 'Fran\u00e7ais', bundle: legalFr },
  { code: 'en', label: 'English', bundle: legalEn },
  { code: 'zh', label: '\u4e2d\u6587', bundle: legalZh },
];

/** Remplace `{{key}}` par les valeurs de `LEGAL_PUBLISHER`. */
function interpolate(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = (LEGAL_PUBLISHER as Record<string, string>)[key];
    return typeof v === 'string' ? v : `{{${key}}}`;
  });
}

/** \u00c9chappe les caract\u00e8res HTML pour s\u00e9curiser le contenu rendu. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphsToHtml(body: string): string {
  return interpolate(body)
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('\n          ');
}

const KIND_ROUTE: Record<LegalKind, string> = {
  privacy: '/privacy',
  terms: '/terms',
  mentions: '/mentions',
};

const PAGE_TITLE_BY_KIND: Record<LegalKind, Record<LangCode, string>> = {
  privacy: { fr: 'Politique de confidentialit\u00e9', en: 'Privacy Policy', zh: '\u9690\u79c1\u653f\u7b56' },
  terms: { fr: 'Conditions g\u00e9n\u00e9rales d\u2019utilisation', en: 'Terms of Service', zh: '\u670d\u52a1\u6761\u6b3e' },
  mentions: { fr: 'Mentions l\u00e9gales', en: 'Legal Notice', zh: '\u6cd5\u5f8b\u58f0\u660e' },
};

const BACK_LABEL: Record<LangCode, string> = {
  fr: 'Retour \u00e0 l\u2019application',
  en: 'Back to app',
  zh: '\u8fd4\u56de\u5e94\u7528',
};

const LANG_LABEL: Record<LangCode, string> = {
  fr: 'Langue',
  en: 'Language',
  zh: '\u8bed\u8a00',
};

function buildHtml(kind: LegalKind, lang: LangCode): string {
  const bundle = LANGS.find(l => l.code === lang)!.bundle;
  const doc = bundle.documents[kind];
  const title = doc.title;
  const bodyHtml = paragraphsToHtml(doc.body);
  const footer = interpolate(bundle.footerNotice);
  const route = KIND_ROUTE[kind];
  const langSwitcher = LANGS
    .map(l => {
      const href = lang === 'fr' ? `${route}.html` : `${route}.${lang}.html`;
      const targetHref = l.code === 'fr' ? `${route}.html` : `${route}.${l.code}.html`;
      const isCurrent = l.code === lang;
      return `<a href="${targetHref}" aria-current="${isCurrent ? 'page' : 'false'}" class="lang${isCurrent ? ' current' : ''}">${l.label}</a>`;
    })
    .join(' ');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} \u2014 ${escapeHtml(LEGAL_PUBLISHER.tradeName)}</title>
  <meta name="description" content="${escapeHtml(title)} de ${escapeHtml(LEGAL_PUBLISHER.tradeName)}." />
  <meta name="robots" content="index,follow" />
  <link rel="icon" href="/favicon.ico" />
  <style>
    :root {
      --bg: #f2f6f8;
      --ink: #242949;
      --muted: #5f6786;
      --primary: #609fb5;
      --border: rgba(36, 41, 73, 0.12);
      --card: #ffffff;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: linear-gradient(165deg, #e8edf5 0%, #f2f6f8 38%, #eef2f8 100%);
      background-attachment: fixed;
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.55;
    }
    .wrap {
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    header.bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 6px 24px rgba(36, 41, 73, 0.06);
    }
    .brand {
      font-weight: 700;
      font-size: 17px;
      letter-spacing: 0.2px;
      color: var(--ink);
      text-decoration: none;
    }
    .back {
      color: var(--primary);
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
    }
    .back:hover { text-decoration: underline; }
    .lang-switch {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
      color: var(--muted);
    }
    .lang-switch .lang {
      color: var(--muted);
      text-decoration: none;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid transparent;
    }
    .lang-switch .lang:hover { border-color: var(--border); }
    .lang-switch .lang.current {
      color: var(--ink);
      background: rgba(96, 159, 181, 0.12);
      border-color: rgba(96, 159, 181, 0.3);
      font-weight: 600;
    }
    main.card {
      margin-top: 24px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 8px 28px rgba(36, 41, 73, 0.06);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: -0.2px;
    }
    .meta {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 24px;
    }
    .body p {
      margin: 0 0 16px;
      color: #2d3357;
      font-size: 15.5px;
    }
    .footer-note {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .editor-block {
      margin-top: 24px;
      padding: 16px;
      border: 1px dashed var(--border);
      border-radius: 14px;
      background: rgba(96, 159, 181, 0.06);
      color: var(--ink);
      font-size: 13px;
    }
    .editor-block strong { display: inline-block; min-width: 140px; }
    @media (max-width: 600px) {
      .wrap { padding: 16px 14px 48px; }
      main.card { padding: 24px 20px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="bar" role="banner">
      <a class="brand" href="/">${escapeHtml(LEGAL_PUBLISHER.tradeName)}</a>
      <nav class="lang-switch" aria-label="${escapeHtml(LANG_LABEL[lang])}">
        ${langSwitcher}
      </nav>
      <a class="back" href="/">\u2190 ${escapeHtml(BACK_LABEL[lang])}</a>
    </header>
    <main class="card" role="main">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">${escapeHtml(LEGAL_PUBLISHER.companyName)} \u00b7 ${escapeHtml(LEGAL_PUBLISHER.contactEmail)}</div>
      <div class="body">
          ${bodyHtml}
      </div>
      <div class="editor-block" aria-label="\u00c9diteur">
        <div><strong>${escapeHtml(LEGAL_PUBLISHER.companyName)}</strong> (${escapeHtml(LEGAL_PUBLISHER.legalForm)})</div>
        <div>${escapeHtml(LEGAL_PUBLISHER.addressLine)}, ${escapeHtml(LEGAL_PUBLISHER.country)}</div>
        <div>${escapeHtml(LEGAL_PUBLISHER.registrationNumber)}</div>
        <div>${escapeHtml(LEGAL_PUBLISHER.vatNumber)} \u00b7 <a href="mailto:${escapeHtml(LEGAL_PUBLISHER.contactEmail)}">${escapeHtml(LEGAL_PUBLISHER.contactEmail)}</a></div>
      </div>
      <div class="footer-note">${escapeHtml(footer)}</div>
    </main>
  </div>
</body>
</html>
`;
}

async function ensureDist(): Promise<void> {
  try {
    await fs.access(DIST_DIR);
  } catch {
    throw new Error(
      `[legal-pages] dist/ introuvable au chemin ${DIST_DIR}. Lancez d'abord 'expo export -p web'.`
    );
  }
}

async function main(): Promise<void> {
  await ensureDist();
  const kinds: LegalKind[] = ['privacy', 'terms', 'mentions'];

  let written = 0;
  for (const kind of kinds) {
    for (const { code } of LANGS) {
      const html = buildHtml(kind, code);
      const fileName =
        code === 'fr'
          ? `${kind}.html`
          : `${kind}.${code}.html`;
      const outPath = path.join(DIST_DIR, fileName);
      await fs.writeFile(outPath, html, 'utf8');
      written += 1;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[legal-pages] ${written} pages g\u00e9n\u00e9r\u00e9es dans ${DIST_DIR}`);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[legal-pages] \u00c9chec :', err);
  process.exit(1);
});
