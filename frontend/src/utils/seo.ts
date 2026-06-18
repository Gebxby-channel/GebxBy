import type { ContentItem } from '../types/forum';
import { stripHtml } from './sanitize';

const SITE_NAME = 'CodeXAvernico';
const DEFAULT_DESCRIPTION = 'CodeXAvernico adalah archive blog untuk tulisan, lore, dan analisis.';

export function setArticleSeo(content: ContentItem) {
    const title = `${cleanText(content.head) || 'Archive'} | ${SITE_NAME}`;
    const description = summarize(content.subtitle || content.paragrafs || content.head || DEFAULT_DESCRIPTION, 165);
    const url = absoluteUrl(`/read/${content.idContent}`);
    const image = publicImageUrl(content);
    const authorName = cleanText(content.user?.name || content.user?.username || SITE_NAME);

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', 'index, follow');
    setLink('canonical', url);
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setOptionalMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setOptionalMeta('name', 'twitter:image', image);
    setArticleJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: cleanText(content.head),
        description,
        datePublished: content.createdAt,
        dateModified: content.updatedAt || content.createdAt,
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
    });
}

export function resetSeo() {
    document.title = SITE_NAME;
    setMeta('name', 'description', DEFAULT_DESCRIPTION);
    setMeta('name', 'robots', 'index, follow');
    removeLink('canonical');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', SITE_NAME);
    setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
    removeMeta('property', 'og:url');
    removeMeta('property', 'og:image');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', SITE_NAME);
    setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
    removeMeta('name', 'twitter:image');
    removeArticleJsonLd();
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
    const selector = `meta[${attribute}="${cssEscape(key)}"]`;
    let tag = document.head.querySelector<HTMLMetaElement>(selector);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, key);
        document.head.append(tag);
    }
    tag.content = content;
}

function setOptionalMeta(attribute: 'name' | 'property', key: string, content?: string) {
    if (content) {
        setMeta(attribute, key, content);
    } else {
        removeMeta(attribute, key);
    }
}

function removeMeta(attribute: 'name' | 'property', key: string) {
    document.head.querySelector(`meta[${attribute}="${cssEscape(key)}"]`)?.remove();
}

function setLink(rel: string, href: string) {
    let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${cssEscape(rel)}"]`);
    if (!tag) {
        tag = document.createElement('link');
        tag.rel = rel;
        document.head.append(tag);
    }
    tag.href = href;
}

function removeLink(rel: string) {
    document.head.querySelector(`link[rel="${cssEscape(rel)}"]`)?.remove();
}

function setArticleJsonLd(data: Record<string, unknown>) {
    let tag = document.getElementById('article-json-ld') as HTMLScriptElement | null;
    if (!tag) {
        tag = document.createElement('script');
        tag.id = 'article-json-ld';
        tag.type = 'application/ld+json';
        document.head.append(tag);
    }
    tag.text = JSON.stringify(data);
}

function removeArticleJsonLd() {
    document.getElementById('article-json-ld')?.remove();
}

function absoluteUrl(path: string) {
    const configured = import.meta.env.VITE_SITE_URL?.replace(/\/+$/, '');
    const base = configured || window.location.origin;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function publicImageUrl(content: ContentItem) {
    const candidates = [
        content.coverImage?.thumbnail,
        content.coverImage?.data,
        ...(content.images ?? []).flatMap((image) => [image.thumbnail, image.data]),
        content.user?.picture,
    ];
    return candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value));
}

function summarize(value: string, maxLength: number) {
    const clean = cleanText(value);
    if (clean.length <= maxLength) {
        return clean || DEFAULT_DESCRIPTION;
    }
    const end = clean.lastIndexOf(' ', maxLength);
    return `${clean.slice(0, end > 80 ? end : maxLength).trim()}...`;
}

function cleanText(value: string | undefined) {
    return stripHtml(value || '').replace(/\s+/g, ' ').trim();
}

function cssEscape(value: string) {
    return value.replace(/"/g, '\\"');
}
