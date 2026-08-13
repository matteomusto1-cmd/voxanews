// ============================================================
// VoxaNews — generatore di pagine statiche (pre-rendering)
//
// Legge gli articoli pubblicati da Supabase e scrive nelle pagine
// HTML il contenuto già pronto, così motori di ricerca e anteprime
// social (WhatsApp, Facebook) lo vedono senza eseguire JavaScript.
//
// Viene eseguito automaticamente da Netlify a ogni pubblicazione.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://dvzoysgzpshztlcbijmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em95c2d6cHNoenRsY2Jpam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzM3OTEsImV4cCI6MjA5OTg0OTc5MX0.i9vQYsBWP-zyTqnhq3RQrtpd8k-38SgEbGr-4g5V53U';
const SITE_URL = 'https://voxanews.net';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORY_LABELS = {
  politica: 'Politica',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
  cultura: 'Cultura',
  sport: 'Sport',
  opinioni: 'Opinioni',
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBodyParagraphs(content) {
  if (!content) return '';
  const applyInlineBold = (text) => text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith('## ')) {
        return `<h3 class="font-serif text-xl font-bold text-ink mt-10 mb-4">${escapeHtml(p.slice(3).trim())}</h3>`;
      }
      return `<p class="mb-6">${applyInlineBold(escapeHtml(p))}</p>`;
    })
    .join('');
}

function articleHref(article) {
  return `articolo.html?id=${encodeURIComponent(article.id)}`;
}

function renderCardHTML(article) {
  const img = article.image_url || '';
  const href = articleHref(article);
  const excerptHTML = article.excerpt
    ? `<p class="text-sm text-ink/60 leading-relaxed max-h-0 group-hover:max-h-24 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out mb-0 group-hover:mb-2">${escapeHtml(article.excerpt)}</p>`
    : '';
  return `
    <article class="card-group group">
      <a href="${href}" class="block img-zoom rounded-sm mb-4">
        <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-48 object-cover">
      </a>
      <p class="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">${CATEGORY_LABELS[article.category] || article.category}</p>
      <a href="${href}">
        <h3 class="font-serif text-lg leading-snug font-semibold text-ink title-hover mb-2">${escapeHtml(article.title)}</h3>
      </a>
      ${excerptHTML}
      <div class="flex items-center gap-2 text-xs text-ink/60">
        <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
        <span>·</span>
        <span>${article.read_minutes} min read</span>
      </div>
    </article>
  `;
}

function renderSecondaryHTML(article) {
  const img = article.image_url || '';
  const href = articleHref(article);
  const excerptHTML = article.excerpt
    ? `<p class="text-sm text-ink/60 leading-relaxed max-h-0 group-hover:max-h-24 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out mb-0 group-hover:mb-2">${escapeHtml(article.excerpt)}</p>`
    : '';
  return `
    <article class="group pb-8 border-b border-hairline last:border-0 last:pb-0">
      <a href="${href}" class="block img-zoom rounded-sm mb-4">
        <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-44 object-cover">
      </a>
      <p class="text-[12px] font-semibold uppercase tracking-widest text-accent mb-2">${CATEGORY_LABELS[article.category] || article.category}</p>
      <a href="${href}">
        <h2 class="font-serif text-xl leading-snug font-semibold text-ink title-hover transition-colors duration-300 group-hover:text-accent mb-2">${escapeHtml(article.title)}</h2>
      </a>
      ${excerptHTML}
      <div class="flex items-center gap-2 text-xs text-ink/60">
        <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
        <span>·</span>
        <span>${article.read_minutes} min read</span>
      </div>
    </article>
  `;
}

function renderHeroHTML(article) {
  const img = article.image_url || '';
  const href = articleHref(article);
  return `
    <a href="${href}" class="block img-zoom rounded-sm mb-6 lg:mb-8">
      <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-[320px] lg:h-[480px] object-cover">
    </a>
    <p class="text-[13px] font-semibold uppercase tracking-widest text-accent mb-3">${CATEGORY_LABELS[article.category] || article.category}</p>
    <a href="${href}" class="block">
      <h1 class="font-serif text-3xl lg:text-[44px] leading-[1.15] font-bold text-ink title-hover transition-colors duration-300 hover:text-accent mb-4">${escapeHtml(article.title)}</h1>
    </a>
    <p class="text-lg text-ink/70 leading-relaxed mb-5 max-w-2xl">${escapeHtml(article.excerpt || '')}</p>
    <div class="flex items-center gap-3 text-sm text-ink/60">
      <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
      <span>·</span>
      <span>${article.read_minutes} min read</span>
    </div>
  `;
}

// Sostituisce il contenuto di un contenitore identificato dal suo id
function replaceContainerContent(html, containerId, newContent) {
  const regex = new RegExp(
    `(<[^>]*id=["']${containerId}["'][^>]*>)([\\s\\S]*?)(</(?:div|article|section)>)`,
    'i'
  );
  return html.replace(regex, `$1${newContent}$3`);
}

function setMetaTag(html, attr, name, value) {
  const regex = new RegExp(`(<meta\\s+${attr}=["']${name}["']\\s+content=["'])([^"']*)(["'][^>]*>)`, 'i');
  if (regex.test(html)) {
    return html.replace(regex, `$1${escapeHtml(value)}$3`);
  }
  return html;
}

async function build() {
  const distDir = path.resolve('dist');

  // Copia tutti i file del sito nella cartella di pubblicazione
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const skip = new Set(['dist', 'node_modules', 'scripts', '.git', 'package.json', 'package-lock.json', 'netlify.toml']);
  for (const entry of fs.readdirSync('.')) {
    if (skip.has(entry)) continue;
    fs.cpSync(entry, path.join(distDir, entry), { recursive: true });
  }

  // Scarica gli articoli già pubblicati (non quelli programmati nel futuro)
  const { data: articles, error } = await sb
    .from('articles')
    .select('*')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: false });

  if (error) {
    console.error('Errore nel caricamento articoli:', error);
    process.exit(1);
  }

  console.log(`Trovati ${articles.length} articoli pubblicati.`);

  // ---------- HOMEPAGE ----------
  let indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  if (articles.length) {
    const featuredIndex = articles.findIndex((a) => a.featured);
    const hero = featuredIndex >= 0 ? articles[featuredIndex] : articles[0];
    const rest = articles.filter((a) => a.id !== hero.id);

    indexHtml = replaceContainerContent(indexHtml, 'hero-container', renderHeroHTML(hero));
    indexHtml = replaceContainerContent(indexHtml, 'secondary-container', rest.slice(0, 2).map(renderSecondaryHTML).join(''));
    indexHtml = replaceContainerContent(indexHtml, 'grid-container', rest.slice(2, 10).map(renderCardHTML).join(''));
  }
  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);
  console.log('✓ index.html generata');

  // ---------- PAGINE DI CATEGORIA ----------
  for (const category of Object.keys(CATEGORY_LABELS)) {
    const filePath = path.join(distDir, `${category}.html`);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf-8');
    const categoryArticles = articles.filter((a) => a.category === category);
    const content = categoryArticles.length
      ? categoryArticles.map(renderCardHTML).join('')
      : '<p class="text-sm text-ink/50 col-span-full py-10">Nessun articolo pubblicato in questa sezione per ora.</p>';
    html = replaceContainerContent(html, 'grid-container', content);
    fs.writeFileSync(filePath, html);
    console.log(`✓ ${category}.html generata (${categoryArticles.length} articoli)`);
  }

  // ---------- PAGINE ARTICOLO (una per ogni articolo) ----------
  const articleTemplate = fs.readFileSync(path.join(distDir, 'articolo.html'), 'utf-8');
  const articlesDir = path.join(distDir, 'articoli');
  fs.mkdirSync(articlesDir, { recursive: true });

  for (const article of articles) {
    let html = articleTemplate;
    const img = article.image_url || '';
    const categoryLabel = CATEGORY_LABELS[article.category] || article.category;
    const bodyHTML = article.content
      ? renderBodyParagraphs(article.content)
      : `<p class="text-ink/70">${escapeHtml(article.excerpt || '')}</p>`;

    const articleContent = `
      <p class="text-[13px] font-semibold uppercase tracking-widest text-accent mb-3">
        <a href="../${article.category}.html" class="hover:text-ink transition-colors duration-300">${categoryLabel}</a>
      </p>
      <h1 class="font-serif text-3xl lg:text-[42px] leading-[1.15] font-bold text-ink mb-5">${escapeHtml(article.title)}</h1>
      <div class="flex items-center gap-3 text-sm text-ink/60 mb-8">
        <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
        <span>·</span>
        <span>${article.read_minutes} min read</span>
      </div>
      <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-[280px] lg:h-[440px] object-cover rounded-sm mb-10">
      <div class="prose-article text-lg text-ink/80 leading-relaxed max-w-2xl">${bodyHTML}</div>
    `;

    html = replaceContainerContent(html, 'article-container', articleContent);

    // Meta tag specifici per questo articolo (anteprime social e SEO)
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(article.title)} — VoxaNews</title>`);
    html = setMetaTag(html, 'name', 'description', article.excerpt || '');
    html = setMetaTag(html, 'property', 'og:title', article.title);
    html = setMetaTag(html, 'property', 'og:description', article.excerpt || '');
    html = setMetaTag(html, 'name', 'twitter:title', article.title);
    html = setMetaTag(html, 'name', 'twitter:description', article.excerpt || '');
    if (img) html = setMetaTag(html, 'property', 'og:image', img);

    // I percorsi relativi vanno corretti: questa pagina sta in una sottocartella
    html = html.replace(/(src|href)="assets\//g, '$1="../assets/');

    fs.writeFileSync(path.join(articlesDir, `${article.id}.html`), html);
  }
  console.log(`✓ ${articles.length} pagine articolo generate in /articoli/`);

  // ---------- SITEMAP (aiuta i motori di ricerca a trovare tutte le pagine) ----------
  const staticPages = [
    '', 'politica.html', 'economia.html', 'tecnologia.html', 'cultura.html',
    'sport.html', 'opinioni.html', 'chi-siamo.html', 'lavora-con-noi.html',
    'contatti.html', 'privacy.html', 'cookie.html', 'termini.html',
  ];

  const urls = [
    ...staticPages.map((p) => `  <url><loc>${SITE_URL}/${p}</loc></url>`),
    ...articles.map((a) => `  <url><loc>${SITE_URL}/articoli/${a.id}.html</loc><lastmod>${new Date(a.publish_at).toISOString().split('T')[0]}</lastmod></url>`),
  ].join('\n');

  fs.writeFileSync(
    path.join(distDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );

  fs.writeFileSync(
    path.join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /account.html\nDisallow: /login.html\nDisallow: /reset-password.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
  console.log('✓ sitemap.xml e robots.txt generati');

  console.log('\nBuild completata.');
}

build();
