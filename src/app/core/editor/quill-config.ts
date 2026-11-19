import hljs from 'highlight.js';

import { openEmojiPicker } from './emoji-picker.util';
import { registerHamboxQuillFormats } from './quill-blots';

// TODO(instructions-v2): real spreadsheet-style tables, collapsible/accordion sections, custom
// button blocks, and file-attachment blocks are deferred — see CLAUDE.md §13.

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);

/** Converts a YouTube watch/share link into the `/embed/` form Quill's `video` format needs. Returns the input unchanged if it isn't recognized as a YouTube URL. */
export function resolveYoutubeEmbedUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }
    if (YOUTUBE_HOSTS.has(url.hostname)) {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.pathname.startsWith('/embed/')) {
        return rawUrl;
      }
    }
  } catch {
    // Not a parseable absolute URL — fall through and let Quill store it as-is.
  }
  return rawUrl;
}

interface QuillToolbarHandlerContext {
  quill: {
    getSelection(focus?: boolean): { index: number; length: number } | null;
    getLength(): number;
    insertEmbed(index: number, type: string, value: unknown, source?: string): void;
    insertText(index: number, text: string, source?: string): void;
    setSelection(index: number, length?: number, source?: string): void;
  };
}

/**
 * Picks an image, uploads it and inserts the returned address at the cursor. Quill's own image button embeds the picture
 * as a base64 string inside the text (tens of thousands of characters, which the server refuses and never stores), so every
 * editor that offers pictures goes through here instead.
 */
function insertUploadedImage(
  quill: QuillToolbarHandlerContext['quill'],
  uploadImage: (file: File) => Promise<string | null>,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const range = quill.getSelection(true);
    const index = range?.index ?? quill.getLength();
    const url = await uploadImage(file);
    if (!url) {
      return;
    }
    quill.insertEmbed(index, 'image', url, 'user');
    quill.setSelection(index + 1, 0, 'user');
  };
  input.click();
}

/**
 * The plain editor used for short customer-facing texts (option / group instructions, usage text, category instructions,
 * reusable descriptions): headings, bold / italic / underline, lists and links. With `uploadImage` it also offers a picture
 * button that uploads the file and stores its address; without it there is no picture button at all, so a picture can never
 * be pasted in as an oversized inline string that would not save.
 */
export function buildBasicEditorModules(uploadImage?: (file: File) => Promise<string | null>) {
  return {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        uploadImage ? ['link', 'image'] : ['link'],
        ['clean'],
      ],
      handlers: uploadImage
        ? {
            image(this: QuillToolbarHandlerContext) {
              insertUploadedImage(this.quill, uploadImage);
            },
          }
        : {},
    },
  };
}

/** Builds the shared Quill `modules` config for the product instructions editor (admin panel + preview). */
export function buildProductInstructionsEditorModules(uploadImage: (file: File) => Promise<string | null>) {
  registerHamboxQuillFormats();

  return {
    syntax: { hljs },
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
        ['blockquote', 'code-block', 'link'],
        [{ callout: 'info' }, { callout: 'warning' }, { callout: 'tip' }, { callout: 'note' }],
        ['image', 'video', 'divider', 'emoji'],
        ['clean'],
      ],
      handlers: {
        image(this: QuillToolbarHandlerContext) {
          insertUploadedImage(this.quill, uploadImage);
        },
        video(this: QuillToolbarHandlerContext) {
          const rawUrl = window.prompt('Paste a YouTube link');
          if (!rawUrl) {
            return;
          }
          const quill = this.quill;
          const range = quill.getSelection(true);
          const index = range?.index ?? quill.getLength();
          quill.insertEmbed(index, 'video', resolveYoutubeEmbedUrl(rawUrl), 'user');
        },
        divider(this: QuillToolbarHandlerContext) {
          const quill = this.quill;
          const range = quill.getSelection(true);
          const index = range?.index ?? quill.getLength();
          quill.insertEmbed(index, 'divider', true, 'user');
          quill.setSelection(index + 1, 0, 'user');
        },
        emoji(this: QuillToolbarHandlerContext) {
          const quill = this.quill;
          const range = quill.getSelection(true);
          const anchor = document.querySelector('.ql-emoji') as HTMLElement | null;
          openEmojiPicker(anchor ?? document.body, (emoji) => {
            const index = range?.index ?? quill.getLength();
            quill.insertText(index, emoji, 'user');
            quill.setSelection(index + emoji.length, 0, 'user');
          });
        },
      },
    },
  };
}
