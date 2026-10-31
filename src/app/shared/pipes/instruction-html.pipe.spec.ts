import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { InstructionHtmlPipe, youtubeVideoId } from './instruction-html.pipe';

describe('youtubeVideoId', () => {
  it('reads the id from the common YouTube link shapes', () => {
    expect(youtubeVideoId('https://youtu.be/aSe-FD7bNGQ?is=OzYbu2bbnpLTumYY')).toBe('aSe-FD7bNGQ');
    expect(youtubeVideoId('https://www.youtube.com/watch?v=aSe-FD7bNGQ&t=10s')).toBe('aSe-FD7bNGQ');
    expect(youtubeVideoId('https://m.youtube.com/shorts/aSe-FD7bNGQ')).toBe('aSe-FD7bNGQ');
    expect(youtubeVideoId('https://www.youtube.com/embed/aSe-FD7bNGQ')).toBe('aSe-FD7bNGQ');
  });

  it('rejects anything that is not a YouTube video address', () => {
    expect(youtubeVideoId('https://example.com/watch?v=aSe-FD7bNGQ')).toBeNull();
    expect(youtubeVideoId('https://youtube.com.evil.test/watch?v=aSe-FD7bNGQ')).toBeNull();
    expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(youtubeVideoId('https://www.youtube.com/watch?v="><script>alert(1)</script>')).toBeNull();
    expect(youtubeVideoId('not a url')).toBeNull();
  });
});

describe('InstructionHtmlPipe', () => {
  function render(html: string): string {
    const pipe = TestBed.runInInjectionContext(() => new InstructionHtmlPipe());
    const sanitizer = TestBed.inject(DomSanitizer);
    return sanitizer.sanitize(1, pipe.transform(html)) ?? '';
  }

  it('turns a YouTube link into an embedded player', () => {
    const html = render('<p>Watch: <a href="https://youtu.be/aSe-FD7bNGQ">video</a></p>');
    expect(html).toContain('youtube-nocookie.com/embed/aSe-FD7bNGQ');
    expect(html).toContain('<iframe');
  });

  it('turns a bare YouTube address typed as text into a player', () => {
    expect(render('<p>https://youtu.be/aSe-FD7bNGQ</p>')).toContain('youtube-nocookie.com/embed/aSe-FD7bNGQ');
  });

  it('leaves ordinary links and text alone, and still strips scripts', () => {
    const html = render('<p>Read <a href="https://example.com/x">this</a></p><script>alert(1)</script>');
    expect(html).toContain('https://example.com/x');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<script');
  });
});
