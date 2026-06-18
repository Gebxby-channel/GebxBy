import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SITE_NAME = 'CodeXAvernico';
const SITE_URL = normalizeBaseUrl(process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://gebxby.vercel.app');
const API_BASE_URL = normalizeBaseUrl(
  process.env.VITE_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'https://federal-wasp-gebxby-18a594b4.koyeb.app',
);
const DIST_DIR = path.resolve('dist');
const FEED_LIMIT = clampNumber(process.env.SITEMAP_FEED_LIMIT, 1, 50, 20);
const MAX_PAGES = clampNumber(process.env.SITEMAP_MAX_PAGES, 1, 100, 25);
const REQUEST_TIMEOUT_MS = clampNumber(process.env.SITEMAP_REQUEST_TIMEOUT_MS, 3_000, 60_000, 25_000);

const STATIC_URLS = [
  { loc: SITE_URL, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/category`, changefreq: 'daily', priority: '0.7' },
];

await main();

async function main() {
  await mkdir(DIST_DIR, { recursive: true });

  const articles = await fetchPublishedArticles();
  const sitemap = buildSitemap(articles);
  const robots = buildRobots();

  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(path.join(DIST_DIR, 'robots.txt'), robots, 'utf8');

  await writeArticlePages(articles);
  await writeIndexPage(articles);

  console.log(`SEO assets generated: ${articles.length} article URLs, sitemap.xml, robots.txt`);
}

async function fetchPublishedArticles() {
  const seen = new Set();
  const articles = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = `${API_BASE_URL}/content/feed-page?mode=all&page=${page}&limit=${FEED_LIMIT}`;
    const payload = await fetchJson(url).catch((error) => {
      console.warn(`SEO sitemap fetch failed for page ${page}: ${error.message}`);
      return null;
    });

    const items = Array.isArray(payload?.items) ? payload.items : [];
    for (const item of items) {
      if (!item?.idContent || seen.has(item.idContent) || item.status === 'DRAFT') {
        continue;
      }
      seen.add(item.idContent);
      articles.push(item);
    }

    if (!payload?.hasMore || items.length === 0) {
      break;
    }
  }

  return articles;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildSitemap(articles) {
  const articleUrls = articles.map((article) => ({
    loc: `${SITE_URL}/read/${encodeURIComponent(article.idContent)}`,
    lastmod: toIsoDate(article.updatedAt || article.createdAt),
    changefreq: 'weekly',
    priority: '0.8',
  }));

  const urls = [...STATIC_URLS, ...articleUrls];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => renderSitemapUrl(url)),
    '</urlset>',
    '',
  ].join('\n');
}

function renderSitemapUrl(url) {
  return [
    '  <url>',
    `    <loc>${escapeXml(url.loc)}</loc>`,
    url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : null,
    `    <changefreq>${escapeXml(url.changefreq)}</changefreq>`,
    `    <priority>${escapeXml(url.priority)}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n');
}

function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

async function writeArticlePages(articles) {
  const indexPath = path.join(DIST_DIR, 'index.html');
  let template;
  try {
    template = await readFile(indexPath, 'utf8');
  } catch {
    return;
  }

  await Promise.all(articles.map(async (article) => {
    const id = String(article.idContent);
    const articleDir = path.join(DIST_DIR, 'read', id);
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, 'index.html'), renderArticleHtml(template, article), 'utf8');
  }));
}

async function writeIndexPage(articles) {
  const indexPath = path.join(DIST_DIR, 'index.html');
  let template;
  try {
    template = await readFile(indexPath, 'utf8');
  } catch {
    return;
  }

  const fallback = renderIndexFallback(articles);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: articles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/read/${encodeURIComponent(article.idContent)}`,
      name: cleanText(article.head),
    })),
  };
  const meta = [
    `<link rel="canonical" href="${escapeHtmlAttr(SITE_URL)}" />`,
    `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(itemListJsonLd))}</script>`,
  ].join('\n    ');

  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${SITE_NAME}</title>\n    ${meta}`)
    .replace('<div id="root"></div>', `<div id="root">\n${fallback}\n    </div>`);

  await writeFile(indexPath, html, 'utf8');
}

function renderIndexFallback(articles) {
  const links = articles.map((article) => {
    const title = cleanText(article.head) || 'Archive';
    const description = summarize(article.subtitle || article.paragrafs || title, 140);
    const href = `/read/${encodeURIComponent(article.idContent)}`;
    return [
      '    <li>',
      `      <a href="${escapeHtmlAttr(href)}">${escapeHtml(title)}</a>`,
      `      <p>${escapeHtml(description)}</p>`,
      '    </li>',
    ].join('\n');
  });

  return [
    '<main class="seo-fallback">',
    `  <h1>${SITE_NAME}</h1>`,
    '  <p>Archive blog untuk tulisan, lore, dan analisis.</p>',
    '  <nav aria-label="Artikel terbaru">',
    '    <ul>',
    ...links,
    '    </ul>',
    '  </nav>',
    '</main>',
  ].join('\n');
}

function renderArticleHtml(template, article) {
  const articleTemplate = stripDefaultSeo(template);
  const title = `${cleanText(article.head) || 'Archive'} | ${SITE_NAME}`;
  const description = summarize(article.subtitle || article.paragrafs || article.head || SITE_NAME, 165);
  const url = `${SITE_URL}/read/${encodeURIComponent(article.idContent)}`;
  const image = findPublicImage(article);
  const published = toIsoDateTime(article.createdAt);
  const modified = toIsoDateTime(article.updatedAt || article.createdAt);
  const authorName = cleanText(article.user?.name || article.user?.username || SITE_NAME);
  const bodyPreview = summarize(article.paragrafs || article.subtitle || article.head || '', 720);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: cleanText(article.head),
    description,
    datePublished: published,
    dateModified: modified,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(image ? { image: [image] } : {}),
  };

  const meta = [
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${escapeHtmlAttr(url)}" />`,
    '<meta property="og:type" content="article" />',
    `<meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtmlAttr(image)}" />` : null,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtmlAttr(image)}" />` : null,
    `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(jsonLd))}</script>`,
  ].filter(Boolean).join('\n    ');

  const fallback = [
    '<main class="seo-fallback">',
    `  <article itemscope itemtype="https://schema.org/BlogPosting">`,
    `    <h1 itemprop="headline">${escapeHtml(cleanText(article.head) || SITE_NAME)}</h1>`,
    `    <p>${escapeHtml(description)}</p>`,
    `    <p>Ditulis oleh ${escapeHtml(authorName)}${published ? ` pada ${escapeHtml(published.slice(0, 10))}` : ''}.</p>`,
    `    <div itemprop="articleBody">${escapeHtml(bodyPreview)}</div>`,
    '  </article>',
    '</main>',
  ].join('\n');

  return articleTemplate
    .replace(/<html\s+lang="[^"]*"/, '<html lang="id"')
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${meta}`)
    .replace('<div id="root"></div>', `<div id="root">\n${fallback}\n    </div>`);
}

function stripDefaultSeo(html) {
  return html
    .replace(/\s*<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/\s*<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/\s*<meta\s+property="og:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/\s*<meta\s+name="twitter:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, '')
    .replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
}

function findPublicImage(article) {
  const candidates = [
    article.coverImage?.thumbnail,
    article.coverImage?.data,
    ...(Array.isArray(article.images) ? article.images.flatMap((image) => [image.thumbnail, image.data]) : []),
    article.user?.picture,
  ];
  return candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value));
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function toIsoDate(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function toIsoDateTime(value) {
  const date = toDate(value);
  return date ? date.toISOString() : undefined;
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function summarize(value, maxLength) {
  const clean = cleanText(value);
  if (clean.length <= maxLength) {
    return clean;
  }
  const end = clean.lastIndexOf(' ', maxLength);
  return `${clean.slice(0, end > 80 ? end : maxLength).trim()}...`;
}

function cleanText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function escapeScriptJson(value) {
  return value.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
