import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Eleven URL-safe characters: the id of a YouTube video. */
const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Pulls the id out of a YouTube link (watch, youtu.be, shorts or embed), or returns null when the text is not one.
 * Only the id is ever copied into the player address, so nothing else from the link can reach the page.
 */
export function youtubeVideoId(text: string): string | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      id = match ? match[1] : null;
    }
  }

  return id && VIDEO_ID.test(id) ? id : null;
}

/** A responsive player for the video, built with the DOM API (never by pasting strings together). */
function buildPlayer(doc: Document, id: string): HTMLElement {
  const wrapper = doc.createElement('div');
  wrapper.setAttribute('style', 'position:relative;width:100%;aspect-ratio:16/9;margin:10px 0;border-radius:12px;overflow:hidden;background:#000');
  const frame = doc.createElement('iframe');
  frame.setAttribute('src', `https://www.youtube-nocookie.com/embed/${id}`);
  frame.setAttribute('title', 'Video');
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen');
  frame.setAttribute('allowfullscreen', '');
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  frame.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;border:0');
  wrapper.appendChild(frame);
  return wrapper;
}

/**
 * Renders the admin's rich-text instructions for customers: the HTML is sanitized first, then any YouTube link in it
 * (a link, or a bare address typed into the text) is swapped for an embedded player so the video simply plays.
 */
@Pipe({ name: 'instructionHtml', standalone: true })
export class InstructionHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(html: string | null | undefined): SafeHtml {
    const clean = this.sanitizer.sanitize(SecurityContext.HTML, html ?? '') ?? '';
    if (typeof DOMParser === 'undefined' || !/youtu/i.test(clean)) {
      return this.sanitizer.bypassSecurityTrustHtml(clean);
    }

    const doc = new DOMParser().parseFromString(`<div id="root">${clean}</div>`, 'text/html');
    const root = doc.getElementById('root');
    if (!root) {
      return this.sanitizer.bypassSecurityTrustHtml(clean);
    }

    // Links: <a href="https://youtu.be/…">anything</a>
    for (const link of Array.from(root.querySelectorAll('a[href]'))) {
      const id = youtubeVideoId(link.getAttribute('href') ?? '');
      if (id) {
        link.replaceWith(buildPlayer(doc, id));
      }
    }

    // Bare addresses typed as plain text.
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    for (const node of textNodes) {
      const text = node.textContent ?? '';
      if (!/youtu/i.test(text)) {
        continue;
      }

      const parts = text.split(/(\s+)/);
      let changed = false;
      const fragment = doc.createDocumentFragment();
      for (const part of parts) {
        const id = youtubeVideoId(part);
        if (id) {
          fragment.appendChild(buildPlayer(doc, id));
          changed = true;
        } else {
          fragment.appendChild(doc.createTextNode(part));
        }
      }

      if (changed) {
        node.replaceWith(fragment);
      }
    }

    return this.sanitizer.bypassSecurityTrustHtml(root.innerHTML);
  }
}
