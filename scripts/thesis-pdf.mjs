/**
 * Renders docs/thesis-booking-system.md to a print-ready PDF for the supervisor.
 *
 * Internal planning sections (scope tiers, the week schedule) are stripped: they are
 * for deciding how much to build, not for the person evaluating the proposal.
 *
 * Drives the locally installed Chrome via puppeteer-core, so no browser is downloaded.
 * Run: npm run thesis:pdf
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import MarkdownIt from 'markdown-it';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'docs', 'thesis-booking-system.md');
const BUILD_DIR = join(ROOT, 'docs', '.pdf-build');
const OUT_PDF = join(ROOT, 'docs', 'thesis-proposal.pdf');

const DROPPED_SECTIONS = [/^##\s+\d+\.\s+Scope tiers/, /^##\s+\d+\.\s+One-week execution plan/];

const BROWSERS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

const FONTS = [
  { family: 'Onest Variable', pkg: 'onest', subset: 'cyrillic' },
  { family: 'Onest Variable', pkg: 'onest', subset: 'latin' },
  { family: 'Inter Variable', pkg: 'inter', subset: 'cyrillic' },
  { family: 'Inter Variable', pkg: 'inter', subset: 'latin' },
];

const UNICODE_RANGE = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

function stripInternalPlanning(markdown) {
  let text = markdown;

  // The title-strategy note explains how to cut scope, which is not the supervisor's concern.
  text = text.replace(/^The title is deliberately broad\.[\s\S]*?revisiting the title\.\n\n/m, '');

  text = text.replace(/\s*\*\(Tier 0[^)]*\)\*/g, '');
  text = text.replace(/^Items 1 and 2 come almost free[\s\S]*?Tier B or later\.\n/m, '');

  const kept = [];
  let dropping = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) dropping = DROPPED_SECTIONS.some((re) => re.test(line));
    if (!dropping) kept.push(line);
  }

  return kept
    .join('\n')
    .replace(/(^---\n\n)+(?=^---\n)/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function renumberSections(markdown) {
  let n = 0;
  return markdown.replace(/^##\s+\d+\.\s+(.*)$/gm, (_, title) => `## ${++n}. ${title}`);
}

async function fontFace({ family, pkg, subset }) {
  const file = join(
    ROOT,
    'node_modules',
    '@fontsource-variable',
    pkg,
    'files',
    `${pkg}-${subset}-wght-normal.woff2`
  );
  const data = await readFile(file);
  return `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 100 900;
  font-display: block;
  src: url(data:font/woff2;base64,${data.toString('base64')}) format('woff2-variations');
  unicode-range: ${UNICODE_RANGE[subset]};
}`;
}

function buildMarkdownRenderer() {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  const defaultFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === 'mermaid') {
      return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  return md;
}

function page(bodyHtml, fontCss, mermaidJs) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Diploma Project Proposal</title>
<style>
${fontCss}

@page { size: A4; margin: 20mm 18mm; }

* { box-sizing: border-box; }

body {
  font-family: 'Inter Variable', system-ui, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #14161a;
  margin: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

h1, h2, h3, h4 {
  font-family: 'Onest Variable', system-ui, sans-serif;
  line-height: 1.25;
  color: #0b0d10;
  break-after: avoid;
}

h1 { font-size: 21pt; margin: 0 0 0.6rem; letter-spacing: -0.02em; }
h2 { font-size: 14pt; margin: 1.9rem 0 0.7rem; padding-bottom: 0.3rem; border-bottom: 1.5px solid #d8dce2; }
h3 { font-size: 11.5pt; margin: 1.3rem 0 0.5rem; }

h2 { break-before: page; }
h2:first-of-type { break-before: avoid; }

p { margin: 0 0 0.7rem; orphans: 3; widows: 3; }

ul, ol { margin: 0 0 0.8rem; padding-left: 1.3rem; }
li { margin-bottom: 0.28rem; }

a { color: #14161a; text-decoration: none; }

code {
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
  font-size: 0.86em;
  background: #f1f3f6;
  border: 1px solid #e2e6ec;
  border-radius: 3px;
  padding: 0.08em 0.34em;
}

pre {
  background: #f7f8fa;
  border: 1px solid #e2e6ec;
  border-left: 3px solid #b9c0cb;
  border-radius: 4px;
  padding: 0.75rem 0.9rem;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  break-inside: avoid;
  font-size: 8.8pt;
  line-height: 1.45;
}

pre code { background: none; border: 0; padding: 0; font-size: inherit; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1rem;
  font-size: 9.2pt;
  break-inside: avoid;
}

th, td { border: 1px solid #d8dce2; padding: 0.4rem 0.55rem; text-align: left; vertical-align: top; }
th { background: #eef1f5; font-weight: 650; }
tbody tr:nth-child(even) { background: #fafbfc; }

blockquote {
  margin: 0 0 1rem;
  padding: 0.6rem 1rem;
  border-left: 3px solid #8b93a1;
  background: #f5f7f9;
  break-inside: avoid;
}

blockquote p:last-child { margin-bottom: 0; }

hr { display: none; }

pre.mermaid {
  background: none;
  border: 0;
  padding: 0.5rem 0;
  text-align: center;
  break-inside: avoid;
}

pre.mermaid svg { max-width: 100%; height: auto; }

.cover { break-after: page; padding-top: 2.5rem; }
.cover .meta { margin-top: 1.6rem; font-size: 10pt; color: #4a515c; }
.cover .meta div { margin-bottom: 0.3rem; }
.cover .titles { margin: 2.2rem 0; }
.cover .titles p { font-size: 13.5pt; font-family: 'Onest Variable', sans-serif; line-height: 1.35; }
.cover .titles .en { color: #4a515c; font-size: 11.5pt; }
</style>
</head>
<body>
${bodyHtml}
<script>${mermaidJs}</script>
<script>
  window.diagramsDone = false;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    fontFamily: "'Inter Variable', sans-serif",
    themeVariables: { fontSize: '13px', lineColor: '#5a626e' },
    flowchart: { useMaxWidth: true, htmlLabels: true },
    er: { useMaxWidth: true },
  });
  mermaid
    .run({ querySelector: 'pre.mermaid' })
    .catch((error) => console.error('mermaid:', error))
    .finally(() => {
      window.diagramsDone = true;
    });
</script>
</body>
</html>`;
}

function coverHtml(source) {
  const bg = source.match(/\*\*Title \(BG\):\*\*\s*([\s\S]*?)\n\n/)?.[1].replace(/\n/g, ' ').trim();
  const en = source.match(/\*\*Title \(EN\):\*\*\s*([\s\S]*?)\n\n/)?.[1].replace(/\n/g, ' ').trim();

  return `<section class="cover">
  <h1>Предложение за дипломна работа</h1>
  <div class="meta">
    <div>Технически университет &mdash; София</div>
    <div>ОКС &bdquo;магистър&ldquo;, специалност &bdquo;Софтуерно инженерство&ldquo;</div>
  </div>
  <div class="titles">
    <p>${bg ?? ''}</p>
    <p class="en">${en ?? ''}</p>
  </div>
  <div class="meta">
    <div>Дипломант: ______________________________</div>
    <div>Факултетен номер: ______________________</div>
    <div>Дипломен ръководител: __________________</div>
    <div>Дата: ${new Date().toLocaleDateString('bg-BG')}</div>
  </div>
</section>`;
}

function findBrowser() {
  const browser = BROWSERS.find((path) => existsSync(path));
  if (!browser) {
    throw new Error(`No Chrome-based browser found. Looked in:\n  ${BROWSERS.join('\n  ')}`);
  }
  return browser;
}

async function main() {
  const source = await readFile(SOURCE, 'utf8');

  const body = renumberSections(stripInternalPlanning(source))
    // The cover page carries the title block, so drop it from the flowing text.
    .replace(/^# .*\n[\s\S]*?^---\n/m, '');

  const [fontCss, mermaidJs] = await Promise.all([
    Promise.all(FONTS.map(fontFace)).then((faces) => faces.join('\n')),
    readFile(join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), 'utf8'),
  ]);

  const html = page(coverHtml(source) + buildMarkdownRenderer().render(body), fontCss, mermaidJs);

  await mkdir(BUILD_DIR, { recursive: true });
  const htmlPath = join(BUILD_DIR, 'thesis.html');
  await writeFile(htmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
  });

  try {
    const tab = await browser.newPage();
    tab.on('console', (msg) => {
      if (msg.type() === 'error') console.warn(`page: ${msg.text()}`);
    });
    await tab.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 60_000 });
    await tab.waitForFunction('window.diagramsDone === true', { timeout: 60_000 });
    await tab.evaluate(() => document.fonts.ready);
    await tab.pdf({
      path: OUT_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    });
  } finally {
    await browser.close();
  }

  if (!process.env.KEEP_HTML) await rm(BUILD_DIR, { recursive: true, force: true });
  console.log(`Wrote ${OUT_PDF}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
