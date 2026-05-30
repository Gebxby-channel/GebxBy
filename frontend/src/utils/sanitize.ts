import DOMPurify from 'dompurify';

export function sanitizeArticle(html?: string) {
  return DOMPurify.sanitize(html ?? '', {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

export function stripHtml(html?: string) {
  const element = document.createElement('div');
  element.innerHTML = sanitizeArticle(html);
  return element.textContent?.trim() ?? '';
}
