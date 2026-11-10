import DOMPurify from 'dompurify';

export function sanitizeArticle(html?: string) {
  return DOMPurify.sanitize(html ?? '', {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

export function linkifyMentions(html?: string) {
  const documentValue = new DOMParser().parseFromString(sanitizeArticle(html), 'text/html');
  const walker = documentValue.createTreeWalker(documentValue.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('a, code, pre, script, style')) continue;
    if (/@[A-Za-z0-9._]{3,24}/.test(node.data)) textNodes.push(node);
  }
  const mentionPattern = /(^|[^A-Za-z0-9._])@([A-Za-z0-9._]{3,24})(?![A-Za-z0-9._])/g;
  for (const node of textNodes) {
    const text = node.data;
    const fragment = documentValue.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    mentionPattern.lastIndex = 0;
    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionStart = match.index + match[1].length;
      fragment.append(text.slice(lastIndex, mentionStart));
      const username = match[2];
      const link = documentValue.createElement('a');
      link.href = `/u/${encodeURIComponent(username)}`;
      link.className = 'font-semibold text-sky-400 hover:text-sky-300 hover:underline';
      link.textContent = `@${username}`;
      fragment.append(link);
      lastIndex = mentionPattern.lastIndex;
    }
    if (lastIndex === 0) continue;
    fragment.append(text.slice(lastIndex));
    node.replaceWith(fragment);
  }
  return documentValue.body.innerHTML;
}

export function stripHtml(html?: string) {
  const element = document.createElement('div');
  element.innerHTML = sanitizeArticle(html);
  return element.textContent?.trim() ?? '';
}
