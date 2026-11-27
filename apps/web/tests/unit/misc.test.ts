import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from '@/lib/slug';
import { escapeXml, jsonLd } from '@/lib/seo';
import { imageDimensions, sniffImage } from '@/server/media/sniff';
import { isValidStorageKey } from '@/server/media/storage';
import { generateStorageKey, sanitizeFilename } from '@/server/media/upload';

describe('slugs', () => {
  it('slugifies headlines', () => {
    expect(slugify('Who Watches the Watchers?')).toBe('who-watches-the-watchers');
    expect(slugify('  Café & Cinéma — 2026 ')).toBe('cafe-and-cinema-2026');
    expect(slugify('ঢাকা')).toBe('');
    expect(isValidSlug('a-b-c')).toBe(true);
    expect(isValidSlug('a--b')).toBe(false);
    expect(isValidSlug('../etc')).toBe(false);
  });
});

describe('output escaping', () => {
  it('keeps JSON-LD from closing its script tag', () => {
    const out = jsonLd({ headline: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ headline: '</script><script>alert(1)</script>' });
  });
  it('escapes XML', () => {
    expect(escapeXml('<a href="x">&\u0001')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
  });
});

describe('media validation', () => {
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 4,
    0xb0, 0, 0, 2, 0xee,
  ]);
  it('identifies images by content, not name', () => {
    expect(sniffImage(png)?.mime).toBe('image/png');
    expect(imageDimensions(png, { mime: 'image/png', ext: 'png' })).toEqual({
      width: 1200,
      height: 750,
    });
    expect(
      sniffImage(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      ),
    ).toBeNull();
    expect(sniffImage(new TextEncoder().encode('<?php system($_GET[1]); ?>'))).toBeNull();
    expect(sniffImage(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // Windows executable
  });

  it('only accepts server-generated storage keys', () => {
    expect(isValidStorageKey(generateStorageKey('jpg'))).toBe(true);
    for (const bad of [
      '../../etc/passwd',
      '2026/11/../../x.jpg',
      '2026/11/abc.php',
      '/etc/passwd',
      '2026/11/' + 'a'.repeat(32) + '.svg',
    ]) {
      expect(isValidStorageKey(bad)).toBe(false);
    }
  });

  it('sanitises original filenames for display', () => {
    expect(sanitizeFilename('../../evil<script>.png')).toBe('evil_script_.png');
  });
});
