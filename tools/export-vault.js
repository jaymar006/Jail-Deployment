#!/usr/bin/env node
/**
 * export-vault.js
 * Mirrors this codebase into an Obsidian vault as markdown notes.
 *
 * Usage:
 *   node tools/export-vault.js [--vault <path>]
 *
 * Default vault target: C:\Users\MARTINJayMar\Documents\CodeVault\Coderist\Jail-Deployment
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_VAULT = 'C:\\Users\\MARTINJayMar\\Documents\\CodeVault\\Coderist\\Jail-Deployment';
const MARKER = '.jis-export-marker.json';
const MAX_SOURCE_BYTES = 200 * 1024; // truncate giant lockfiles

const argIdx = process.argv.indexOf('--vault');
const VAULT_TARGET = path.resolve(argIdx > -1 ? process.argv[argIdx + 1] : DEFAULT_VAULT);

const EXCLUDED_DIR_NAMES = new Set(['node_modules', '.git', '.obsidian', '.vercel', '.cache']);
const EXCLUDED_SEGMENTS = new Set(['frontend/build']);
const TEXT_EXTS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'markdown', 'sql', 'yml', 'yaml',
  'bat', 'sh', 'cmd', 'ps1', 'html', 'htm', 'css', 'scss', 'txt', 'xml',
  'conf', 'example', 'env', 'gitignore', 'dockerignore', 'gitattributes', 'log',
]);
const SECRET_BASENAMES = /^(\.env|\.env\..*|.*service-account.*\.json|google-drive-token\.json)$/i;

const LANG = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', md: 'markdown', sql: 'sql', yml: 'yaml', yaml: 'yaml',
  bat: 'batch', cmd: 'batch', sh: 'bash', ps1: 'powershell',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', xml: 'xml', conf: 'nginx',
};

const stats = { scanned: 0, exported: 0, redacted: [], truncated: 0, skippedDirs: 0 };

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const relSeg = path.relative(REPO_ROOT, path.join(dir, entry.name)).replace(/\\/g, '/');
      if (EXCLUDED_DIR_NAMES.has(entry.name) || EXCLUDED_SEGMENTS.has(relSeg)) { stats.skippedDirs++; continue; }
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      const abs = path.join(dir, entry.name);
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      const base = path.basename(entry.name);
      const isText = TEXT_EXTS.has(ext) || base.startsWith('.env') ||
        ['.gitignore', '.dockerignore', '.gitattributes'].includes(base);
      if (!isText) continue;
      out.push(abs);
    }
  }
}

// ---------------------------------------------------------------------------
// Secret redaction
// ---------------------------------------------------------------------------
function redactContent(relPath, content) {
  const base = path.basename(relPath);
  if (/^\.env/.test(base)) {
    return content.split(/\r?\n/).map((line) => {
      const m = line.match(/^(\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=)(.*)$/);
      return m ? `${m[1]}***REDACTED***` : line;
    }).join('\n');
  }
  // JSON secrets (service account / oauth token): keep structure, nuke values
  try {
    const obj = JSON.parse(content);
    const scrub = (node) => {
      if (Array.isArray(node)) return node.map(scrub);
      if (node && typeof node === 'object') {
        const o = {};
        for (const [k, v] of Object.entries(node)) o[k] = scrub(v);
        return o;
      }
      return typeof node === 'string' ? '***REDACTED***' : node;
    };
    return JSON.stringify(scrub(obj), null, 2);
  } catch {
    return content.replace(/"([^"]+)"\s*:\s*"([^"]*)"/g, '"$1": "***REDACTED***"');
  }
}

// ---------------------------------------------------------------------------
// Note naming: plain basename; colliding names get path-qualified wikilinks
// ---------------------------------------------------------------------------
function buildNoteNames(files) {
  const counts = {};
  for (const f of files) {
    const base = path.basename(f.absPath);
    counts[base] = (counts[base] || 0) + 1;
  }
  const used = new Set();
  for (const f of files) {
    let base = path.basename(f.absPath);
    while (used.has(base.toLowerCase())) base += ' ';
    used.add(base.toLowerCase());
    f.noteName = base.replace(/[/\\:*?"<>|#^\[\]]/g, '-');
    f.unique = counts[path.basename(f.absPath)] === 1;
  }
}

// ---------------------------------------------------------------------------
// Dependency extraction + resolution
// ---------------------------------------------------------------------------
function extractSpecifiers(content) {
  const specs = new Set();
  const reqRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const fromRe = /(?:^|\n)\s*(?:import|export)[^;'"]*?(?:from\s*['"]([^'"]+)['"])/g;
  const sideRe = /import\s*['"]([^'"]+)['"]/g;
  for (const re of [reqRe, fromRe, sideRe]) {
    let m; while ((m = re.exec(content))) specs.add(m[1]);
  }
  return [...specs];
}

function resolveSpecifier(spec, fromFile, exportedByAbs) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, base + '.js', base + '.jsx', base + '.json',
    path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  for (const c of candidates) {
    const key = c.replace(/\\/g, '/');
    if (exportedByAbs.has(key)) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route / API extraction
// ---------------------------------------------------------------------------
function parseMounts(serverJs) {
  const mounts = [];
  const re = /app\.use\(\s*['"`]([^'"`]*)['"`]\s*,\s*(\w+)(?:Routes)?\s*\)/g;
  let m; while ((m = re.exec(serverJs))) {
    if (m[2].endsWith('Routes')) mounts.push({ mount: m[1], varName: m[2], file: m[2] });
  }
  return mounts;
}

function parseRouterEndpoints(routerSource, routerFileName) {
  // collect destructured controller fn names -> controller file
  const destructureMap = {}; // fnName -> controllerNoteBase
  const dre = /const\s*\{([^}]+)\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let dm; while ((dm = dre.exec(routerSource))) {
    const names = dm[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    if (dm[2].includes('Controller')) {
      let ctrlNote = path.basename(dm[2]);
      if (!ctrlNote.endsWith('.js')) ctrlNote += '.js';
      for (const n of names) destructureMap[n] = ctrlNote;
    }
  }
  const objVarMap = {}; // varName -> controller file base
  const vre = /const\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let vm; while ((vm = vre.exec(routerSource))) {
    if (vm[2].includes('Controller')) {
      let n = path.basename(vm[2]);
      if (!n.endsWith('.js')) n += '.js';
      objVarMap[vm[1]] = n;
    }
  }

  const endpoints = [];
  const ere = /router\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]*)['"`]/g;
  let em;
  const lines = routerSource.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const mm = ere.exec(lines[li]);
    if (!mm) { continue; }
    // scan following lines (until next router.<verb>) for handler identifiers
    let handler = 'inline', controllerNote = null;
    for (let j = li; j < Math.min(lines.length, li + 8); j++) {
      if (j !== li && ere.test(lines[j])) break;
      const tokens = lines[j].match(/[A-Za-z_$][\w$]*(?=\s*[,)])|(\w+\.\w+)/g) || [];
      for (const t of tokens) {
        const clean = t.trim();
        if (objVarMap[clean.split('.')[0]]) {
          controllerNote = objVarMap[clean.split('.')[0]];
          handler = clean; break;
        }
        if (destructureMap[clean]) {
          controllerNote = destructureMap[clean];
          handler = clean; break;
        }
      }
      if (controllerNote) break;
    }
    endpoints.push({ method: mm[1].toUpperCase(), subPath: mm[2], handler, controllerNote, routerFile: routerFileName });
  }
  // reset lastIndex safety
  ere.lastIndex = 0;
  return endpoints;
}

// ---------------------------------------------------------------------------
// SQL schema extraction
// ---------------------------------------------------------------------------
function parseSqlSchema(sql) {
  const tables = {};
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?(\w+)[`"\]]?\s*\(([\s\S]*?)\)\s*(?:ENGINE|;|$)/gi;
  let m; while ((m = re.exec(sql))) {
    const cols = m[2].split(',').map((c) => c.trim().replace(/\s+/g, ' '))
      .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CONSTRAINT|KEY|INDEX|CHECK)\b/i.test(c))
      .map((c) => '`' + c.split(' ').slice(0, 3).join(' ') + '`');
    tables[m[1]] = cols;
  }
  return tables;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function linkTo(noteName, label) {
  return label && label !== noteName ? `[[${noteName}|${label}]]` : `[[${noteName}]]`;
}
let fileByRel = {};
function wikiRef(f, label) {
  if (f.unique) return label && label !== f.noteName ? `[[${f.noteName}|${label}]]` : `[[${f.noteName}]]`;
  return `[[${f.relPath}|${label || f.noteName}]]`;
}
function depLink(d) {
  const tf = fileByRel[d.targetRel];
  return tf ? wikiRef(tf, d.spec) : `\`${d.targetRel}\``;
}
function refLink(r) {
  const sf = fileByRel[r.sourceRel];
  return sf ? wikiRef(sf, r.sourceRel) : `\`${r.sourceRel}\``;
}
function fenceFor(content, lang) {
  let ticks = '```';
  while (content.includes(ticks)) ticks += '`';
  return `${ticks}${lang}\n${content}\n${ticks}`;
}
function fm(fields) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) { lines.push(`${k}:`); v.forEach((x) => lines.push(`  - ${x}`)); }
    else if (v != null) lines.push(`${k}: ${String(v).replace(/"/g, "'")}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log(`Repo root   : ${REPO_ROOT}`);
  console.log(`Vault target: ${VAULT_TARGET}`);

  // Safety wipe: only clear if marker present or dir empty/absent.
  // User-authored folders listed here survive every regeneration.
  const PRESERVED_DIRS = ['_Changes', '_Sessions'];
  const backupRoot = path.join(path.dirname(VAULT_TARGET), '.jis-preserved-backup');

  if (fs.existsSync(VAULT_TARGET)) {
    const markerPath = path.join(VAULT_TARGET, MARKER);
    const hasMarker = fs.existsSync(markerPath);
    const isEmptyDir = fs.readdirSync(VAULT_TARGET).length === 0;
    if (!hasMarker && !isEmptyDir) {
      console.error(`REFUSING to wipe ${VAULT_TARGET}: missing ${MARKER}. Delete manually if intended.`);
      process.exit(1);
    }
    fs.rmSync(backupRoot, { recursive: true, force: true });
    for (const dir of PRESERVED_DIRS) {
      const src = path.join(VAULT_TARGET, dir);
      if (fs.existsSync(src)) {
        fs.mkdirSync(backupRoot, { recursive: true });
        fs.renameSync(src, path.join(backupRoot, dir));
      }
    }
    fs.rmSync(VAULT_TARGET, { recursive: true, force: true });
  }
  fs.mkdirSync(VAULT_TARGET, { recursive: true });

  const absFiles = [];
  walk(REPO_ROOT, absFiles);

  const files = absFiles.map((abs) => ({
    absPath: abs,
    relPath: path.relative(REPO_ROOT, abs).replace(/\\/g, '/'),
    isSecret: false,
  }));
  stats.scanned = files.length;

  // Read + redact
  for (const f of files) {
    let content = fs.readFileSync(f.absPath, 'utf8');
    if (SECRET_BASENAMES.test(path.basename(f.relPath)) || /\.env$/.test(f.relPath)) {
      content = redactContent(f.relPath, content);
      f.isSecret = true;
      stats.redacted.push(f.relPath);
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_SOURCE_BYTES) {
      content = content.slice(0, MAX_SOURCE_BYTES) +
        `\n\n/* ...TRUNCATED at ${MAX_SOURCE_BYTES} bytes by export-vault... */`;
      f.truncated = true; stats.truncated++;
    }
    f.content = content;
  }

  buildNoteNames(files);
  const exportedByAbs = new Set(files.map((f) => f.absPath.replace(/\\/g, '/')));
  const noteByAbs = Object.fromEntries(files.map((f) => [f.absPath.replace(/\\/g, '/'), f.noteName]));
  fileByRel = Object.fromEntries(files.map((f) => [f.relPath, f]));

  // Resolve dependencies both directions
  const deps = {}, usedBy = {};
  for (const f of files) {
    if (!/\.(js|jsx)$/.test(f.relPath)) continue;
    deps[f.relPath] = [];
    for (const spec of extractSpecifiers(f.content)) {
      const resolved = resolveSpecifier(spec, f.absPath, exportedByAbs);
      if (resolved) {
        const targetRel = resolved.slice(REPO_ROOT.length + 1).replace(/\\/g, '/');
        deps[f.relPath].push({ spec, targetRel, noteName: noteByAbs[resolved] });
        (usedBy[targetRel] ||= []).push({ sourceRel: f.relPath, noteName: f.noteName });
      }
    }
  }

  // ------------------------------------------------------------------
  // Write code/file notes
  // ------------------------------------------------------------------
  const moduleOf = (rel) => path.dirname(rel).split('/')[0] === '.' ? '(root)' : path.dirname(rel);
  const modules = {};
  for (const f of files) {
    const mod = moduleOf(f.relPath);
    (modules[mod] ||= []).push(f);
    const top = f.relPath.includes('/') ? f.relPath.split('/')[0] : 'root';
    const tags = ['jail-system', top.replace(/[^a-z0-9-]/gi, '-').toLowerCase()];
    if (mod !== '(root)' && mod !== top) {
      tags.push(mod.replace(/[^a-z0-9/-]/gi, '-').toLowerCase());
    }
    const mocName = modMocName(mod);
    const depList = deps[f.relPath] || [];
    const refList = usedBy[f.relPath] || [];

    let body = '';
    body += `> [!info] Source\n> **Path:** \`${f.relPath}\`\n> **Module:** ${linkTo(mocName, mod)}\n${f.isSecret ? '> [!warning] SECRETS REDACTED in this mirror.\n' : ''}${f.truncated ? '> [!note] File truncated for vault size.\n' : ''}\n`;

    if (depList.length) {
      body += `## Dependencies\n${depList.map((d) => `- ${depLink(d)}`).join('\n')}\n\n`;
    }
    if (refList.length) {
      body += `## Referenced by\n${refList.map((r) => `- ${refLink(r)}`).join('\n')}\n\n`;
    }
    body += `## Source\n`;
    if (path.extname(f.relPath) === '.md') {
      body += `\n${f.content}\n`;
    } else {
      body += '\n' + fenceFor(f.content, LANG[path.extname(f.relPath).slice(1)] || '') + '\n';
    }

    const note =
      fm({
        type: 'code-file', project: 'Jail-Deployment', path: f.relPath,
        module: mod, language: LANG[path.extname(f.relPath).slice(1)] || 'text', tags,
      }) + `\n\n# ${f.noteName}\n\n` + body;

    const outPath = path.join(VAULT_TARGET, f.relPath + '.md');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, note, 'utf8');
    stats.exported++;
  }

  // ------------------------------------------------------------------
  // Module MOCs
  // ------------------------------------------------------------------
  function modMocName(mod) {
    if (mod === '(root)' || mod === '.') return 'MOC root-config';
    return 'MOC ' + mod.replace(/\//g, '-');
  }
  for (const [mod, flist] of Object.entries(modules)) {
    const groups = {};
    for (const f of flist) {
      const sub = path.dirname(f.relPath);
      (groups[sub] ||= []).push(f);
    }
    let body = `Notes for **\`${mod}\`** module. Back to [[Jail System Home]].\n`;
    for (const [sub, gf] of Object.entries(groups).sort()) {
      body += `\n### ${sub}\n${gf.map((f) => `- ${wikiRef(f)} — \`${f.relPath}\``).join('\n')}\n`;
    }
    const crossRefs = flist.flatMap((f) => (deps[f.relPath] || [])
      .filter((d) => moduleOf(d.targetRel) !== mod)
      .map((d) => ({ fromNote: f, ...d })));
    if (crossRefs.length) {
      body += `\n### External connections\n${crossRefs.map((c) =>
        `- ${wikiRef(c.fromNote)} → ${depLink(c)}`).join('\n')}\n`;
    }
    const outPath = path.join(VAULT_TARGET, modMocName(mod) + '.md');
    fs.writeFileSync(outPath,
      fm({ type: 'moc', project: 'Jail-Deployment', module: mod, tags: ['jail-system', 'moc'] }) +
      `\n\n# MOC: ${mod}\n\n` + body, 'utf8');
  }

  // ------------------------------------------------------------------
  // Backend API Map
  // ------------------------------------------------------------------
  const serverFile = files.find((f) => f.relPath === 'backend/server.js');
  const routeFiles = files.filter((f) => /^backend\/routes\/.+\.js$/.test(f.relPath));
  const allEndpoints = [];
  const mounts = serverFile ? parseMounts(serverFile.content) : [];
  for (const rf of routeFiles) {
    const varInfo = mounts.find((m) => m.file === path.basename(rf.relPath, '.js'));
    const prefix = varInfo ? varInfo.mount : '?';
    for (const ep of parseRouterEndpoints(rf.content, rf.noteName)) {
      allEndpoints.push({ ...ep, routeWiki: wikiRef(rf), fullPath: (prefix + ep.subPath).replace(/\/\//g, '/') || '/' });
    }
  }
  {
    let body = `REST surface extracted from [[${serverFile ? serverFile.noteName : 'server.js'}]] mounts and route files.\n\n`;
    body += '| Method | Full Path | Handler | Route File | Controller |\n|---|---|---|---|---|\n';
    for (const e of allEndpoints.sort((a, b) => a.fullPath.localeCompare(b.fullPath))) {
      const ctrl = e.controllerNote
        ? linkTo(e.controllerNote, e.controllerNote) : '—';
      body += `| ${e.method} | \`${e.fullPath}\` | ${e.handler} | ${e.routeWiki} | ${ctrl} |\n`;
    }
    body += `\n## Middleware chain\n- [[authMiddleware.js]] → [[roleMiddleware.js]] (requireAdmin) → [[rateLimiter.js]] → [[errorHandler.js]]\n`;
    body += `\n## Services layer\n${(modules['backend/services'] || [])
      .map((f) => `- ${wikiRef(f)}`).join('\n')}\n`;
    fs.writeFileSync(path.join(VAULT_TARGET, 'Backend API Map.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'api'] }) +
      '\n\n# Backend API Map\n\n' + body, 'utf8');
  }

  // ------------------------------------------------------------------
  // Frontend Map (+ App.js routes)
  // ------------------------------------------------------------------
  {
    const appFile = files.find((f) => f.relPath === 'frontend/src/App.js');
    let routeTable = '';
    if (appFile) {
      const rre = /<Route\s+path=["'`](.*?)["'`][\s\S]*?element=\{[\s\S]*?<([A-Z]\w+)/g;
      let rm; const seen = new Set();
      const rows = [];
      let src = appFile.content;
      while ((rm = rre.exec(src))) {
        if (seen.has(rm[1])) continue;
        seen.add(rm[1]);
        const pageNote = files.find((f) => path.basename(f.relPath) === rm[2] + '.js');
        rows.push(`| \`${rm[1] || '/'}\` | ${pageNote ? wikiRef(pageNote) : rm[2]} |`);
      }
      routeTable = `## Client routes (from App.js)\n| Path | Component |\n|---|---|\n${rows.join('\n')}\n`;
    }
    let body = routeTable + '\n';
    for (const seg of ['pages', 'components', 'context', 'services', 'utils']) {
      const flist = (modules[`frontend/src/${seg}`] || []);
      if (flist.length) {
        body += `\n### ${seg}\n${flist.map((f) => `- ${wikiRef(f)}`).join('\n')}\n`;
      }
    }
    fs.writeFileSync(path.join(VAULT_TARGET, 'Frontend Map.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'frontend'] }) +
      '\n\n# Frontend Map\n\nBack to [[Jail System Home]]\n\n' + body, 'utf8');
  }

  // ------------------------------------------------------------------
  // Database Schema
  // ------------------------------------------------------------------
  {
    const sqlFiles = files.filter((f) => f.relPath.endsWith('.sql'));
    let body = '';
    for (const sf of sqlFiles) {
      const tables = parseSqlSchema(sf.content);
      body += `\n## From ${wikiRef(sf, sf.relPath)}\n`;
      for (const [t, cols] of Object.entries(tables)) {
        body += `\n**Table \`${
          t}\`**${cols.length ? `\n${cols.map((c) => `- ${c}`).join('\n')}` : ' _(columns not parsed)_'}\n`;
      }
      if (!Object.keys(tables).length) body += '_No CREATE TABLE parsed._\n';
    }
    body += `\nRelated models: ${(modules['backend/models'] || [])
      .map((f) => wikiRef(f)).join(' · ')}\n`;
    fs.writeFileSync(path.join(VAULT_TARGET, 'Database Schema.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'database'] }) +
      '\n\n# Database Schema\n\n' + body, 'utf8');
  }

  // ------------------------------------------------------------------
  // Deployment & Infra
  // ------------------------------------------------------------------
  {
    const infraPats = /^(Dockerfile.*|docker-compose.*\.ya?ml|nginx\.conf|railway\.json|render\.yaml|\.dockerignore|setup_env\.js|docker-start\..*|start_.*\.(bat|sh)|cleanup-repo\..*|check-telegram-webhook\.js)$/i;
    const infra = files.filter((f) => !f.relPath.includes('/') && infraPats.test(path.basename(f.relPath)));
    const body = infra.map((f) =>
      `- ${wikiRef(f)} — ${describeInfra(path.basename(f.relPath))}`).join('\n');
    fs.writeFileSync(path.join(VAULT_TARGET, 'Deployment & Infra.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'devops'] }) +
      '\n\n# Deployment & Infra\n\n' + body + '\n', 'utf8');
  }

  // ------------------------------------------------------------------
  // Architecture Overview
  // ------------------------------------------------------------------
  {
    const pageNames = (modules['frontend/src/pages'] || []).filter((f) => f.relPath.endsWith('.js'))
      .map((f) => f.noteName.replace('.js', ''));
    const mermaid = [
      '```mermaid',
      'flowchart LR',
      '  subgraph FE["React SPA (frontend/)"]',
      '    APP[[App.js]] --> PAGES[' + JSON.stringify(pageNames.join(', ') || 'Pages') + ']',
      '    PAGES --> CTX[context/: Auth · Visitor · PageMeta]',
      '  end',
      '  subgraph BE["Express API (backend/)"]',
      ...mounts.map((m, i) => `    M${i}["${m.mount || '/'}"] --> R${i}[["routes/${m.file}.js"]]`),
      '    CTRL[controllers/] --> MDL[models/]',
      '    MW[middleware: auth · roles · rateLimit · validator]',
      '  end',
      '  DB[(SQLite dev / Postgres prod)]',
      '  SVC[services: backup · email/telegram integrations]',
      `  FE -- axios /api --> BE`,
      ...mounts.map((_, i) => `  M${i} -.-> MW`),
      '  MDL --> DB',
      '  BE --> SVC',
      '```',
    ].join('\n');

    const stack = [
      '**Frontend:** React 19, React Router, Axios, MUI, QR libraries, Excel.js',
      '**Backend:** Node.js, Express, SQLite (local) / Neon Postgres (deployed), JWT, bcrypt',
      '**Infra:** Docker Compose, Render/Railway configs, nginx reverse proxy',
      '',
      'Detailed surfaces:',
      '- API: [[Backend API Map]]',
      '- UI: [[Frontend Map]]',
      '- Data: [[Database Schema]]',
      '- Ops: [[Deployment & Infra]]',
    ].join('\n');

    fs.writeFileSync(path.join(VAULT_TARGET, 'Architecture Overview.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'architecture'] }) +
      `\n\n# Architecture Overview\n\n${mermaid}\n\n## Tech Stack\n${stack}\n`, 'utf8');
  }

  // ------------------------------------------------------------------
  // Docs Index
  // ------------------------------------------------------------------
  {
    const docsFiles = (modules['docs'] || []);
    const body = docsFiles.map((f) => `- ${wikiRef(f, path.basename(f.relPath, '.md'))}`)
      .sort().join('\n');
    fs.writeFileSync(path.join(VAULT_TARGET, 'Docs Index.md'),
      fm({ type: 'moc', project: 'Jail-Deployment', tags: ['jail-system', 'moc', 'docs'] }) +
      '\n\n# Docs Index\n\n' + body + '\n', 'utf8');
  }

  // ------------------------------------------------------------------
  // _Changes workflow
  // ------------------------------------------------------------------
  fs.mkdirSync(path.join(VAULT_TARGET, '_Changes'), { recursive: true });
  fs.writeFileSync(path.join(VAULT_TARGET, '_Changes', 'Changelog.md'),
    fm({ type: 'changelog', project: 'Jail-Deployment', tags: ['jail-system', 'changelog'] }) +
    `\n\n# Changelog\n\nMajor changes & improvements. Newest first.\n\n<!-- Entry format: YYYY-MM-DD - Title, linking every affected code note -->\n\n_No entries yet._\n`, 'utf8');

  // Restore user-authored folders (_Changes, _Sessions, ...) that were
  // backed up before the wipe. Runs BEFORE hub generation so the Home
  // note can list session logs.
  if (fs.existsSync(backupRoot)) {
    for (const dir of PRESERVED_DIRS) {
      const bdir = path.join(backupRoot, dir);
      if (!fs.existsSync(bdir)) continue;
      const destDir = path.join(VAULT_TARGET, dir);
      fs.mkdirSync(destDir, { recursive: true });
      for (const entry of fs.readdirSync(bdir, { withFileTypes: true })) {
        const src = path.join(bdir, entry.name);
        const dest = path.join(destDir, entry.name);
        if (entry.isDirectory()) fs.cpSync(src, dest, { recursive: true });
        else fs.copyFileSync(src, dest);
      }
    }
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }

  fs.writeFileSync(path.join(VAULT_TARGET, '_Changes', '_TEMPLATE - Change Note.md'),
    fm({ type: 'change-note', project: 'Jail-Deployment', date: 'YYYY-MM-DD', status: 'proposed', tags: ['jail-system', 'change'] }) +
    `
# YYYY-MM-DD - Change Title

## Summary
What changed and why.

## Affected nodes
<!-- wiki-links to every touched code note -->
- 

## Impact
Risks, migrations, rollout notes.

## Verification
How it was tested.
`, 'utf8');

  // ------------------------------------------------------------------
  // Home hub
  // ------------------------------------------------------------------
  {
    const mocLinks = Object.keys(modules).map((m) => linkTo(modMocName(m), m)).sort();
    const sessionsDir = path.join(VAULT_TARGET, '_Sessions');
    const sessionNotes = fs.existsSync(sessionsDir)
      ? fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.md') && f !== 'Changelog.md').sort().reverse()
      : [];
    const home = fm({
      type: 'hub', project: 'Jail-Deployment',
      generated: new Date().toISOString().slice(0, 10),
      source: REPO_ROOT, tags: ['jail-system', 'hub'],
    }) + `

# 🏛️ Jail Information System — Code Vault

Obsidian mirror of \`C:\\Users\\MARTINJayMar\\Documents\\CodesVer\\Jail-Deployment\`.
Regenerate anytime with \`node tools/export-vault.js\`.

## Start here
- 🗺️ [[Architecture Overview]]
- 🔌 [[Backend API Map]]
- 🖥️ [[Frontend Map]]
- 🗄️ [[Database Schema]]
- 🚀 [[Deployment & Infra]]
- 📚 [[Docs Index]]

## Module MOCs
${mocLinks.map((l) => `- ${l}`).join('\n')}

## Change management
- 📜 [[Changelog]] (_Changes/)
- New major changes get a dated note in \`_Changes/\` linking every affected code node.

## Session logs (_Sessions/)
${sessionNotes.length ? sessionNotes.map((s) => `- 💬 [[${s.replace(/\.md$/, '')}]]`).join('\n') : '- _No sessions logged yet._'}

---
_Generated by tools/export-vault.js on ${new Date().toISOString()}_  
_Files: ${stats.exported} exported · ${stats.scanned} scanned · secrets redacted: ${stats.redacted.length}_
`;
    fs.writeFileSync(path.join(VAULT_TARGET, 'Jail System Home.md'), home, 'utf8');
  }

  fs.writeFileSync(path.join(VAULT_TARGET, MARKER), JSON.stringify({
    generator: 'tools/export-vault.js', repoRoot: REPO_ROOT,
    generatedAt: new Date().toISOString(), exported: stats.exported,
  }, null, 2));

  console.log(`\nExported notes : ${stats.exported}`);
  console.log(`Files scanned  : ${stats.scanned}`);
  console.log(`Skipped dirs   : ${stats.skippedDirs}`);
  console.log(`Truncated      : ${stats.truncated}`);
  console.log(`Redacted       :\n  ${stats.redacted.join('\n  ') || '(none)'}`);
  console.log(`\nDone → ${VAULT_TARGET}`);
}

function describeInfra(base) {
  if (base.startsWith('Dockerfile.')) return 'Container image definition';
  if (base === 'Dockerfile') return 'Main container image';
  if (base.startsWith('docker-compose')) return 'Multi-container orchestration variant';
  if (base === 'nginx.conf') return 'Reverse proxy config';
  if (base === 'railway.json') return 'Railway deploy config';
  if (base === 'render.yaml') return 'Render blueprint';
  if (base === 'setup_env.js') return 'Environment bootstrap helper';
  if (base.startsWith('start_')) return 'Local launch script';
  if (base.startsWith('docker-start')) return 'Docker launch helper';
  if (base.startsWith('cleanup-repo')) return 'Repo maintenance script';
  return 'Utility script';
}

main();
