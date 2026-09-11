import { describe, expect, it } from 'vitest';
import {
  createDefaultItemMedia,
  normalizeItemMedia,
  isItemMediaActive,
  validateItemMedia,
  renderItemMediaElement,
  wrapItemMediaContent,
  getItemMediaCSS
} from '../../js/item-media.js';
import { generateHTML, generateCSS, generateJS, validate } from '../../components/accordion.js';

describe('Item Media Attachment Module (js/item-media.js)', () => {
  describe('createDefaultItemMedia', () => {
    it('returns a clean default media configuration object', () => {
      const media = createDefaultItemMedia();
      expect(media).toEqual({
        type: 'none',
        sourceType: 'upload',
        src: '',
        mediaId: '',
        fileName: '',
        mimeType: '',
        alt: '',
        decorative: false,
        caption: '',
        transcript: '',
        placement: 'above',
        aspectRatio: 'original',
        fit: 'contain',
        focalPosition: 'center center',
        posterSrc: '',
        posterMediaId: '',
        captionsSrc: '',
        preload: 'metadata'
      });
    });
  });

  describe('normalizeItemMedia', () => {
    it('handles null, undefined, or empty item objects gracefully', () => {
      expect(normalizeItemMedia(null)).toEqual(createDefaultItemMedia());
      expect(normalizeItemMedia(undefined)).toEqual(createDefaultItemMedia());
      expect(normalizeItemMedia({})).toEqual(createDefaultItemMedia());
      expect(normalizeItemMedia({ media: null })).toEqual(createDefaultItemMedia());
    });

    it('normalizes legacy accordion items without a media property', () => {
      const legacyItem = {
        title: 'Legacy Panel',
        content: '<p>Legacy body text</p>'
      };
      const normalized = normalizeItemMedia(legacyItem);
      expect(normalized.type).toBe('none');
      expect(normalized.src).toBe('');
      expect(normalized.placement).toBe('above');
    });

    it('sanitizes invalid enum values back to safe defaults', () => {
      const invalidItem = {
        media: {
          type: 'hologram',
          sourceType: 'telepathy',
          placement: 'diagonal',
          aspectRatio: '100:1',
          fit: 'stretch',
          preload: 'hyperdrive'
        }
      };
      const normalized = normalizeItemMedia(invalidItem);
      expect(normalized.type).toBe('none');
      expect(normalized.sourceType).toBe('upload');
      expect(normalized.placement).toBe('above');
      expect(normalized.aspectRatio).toBe('original');
      expect(normalized.fit).toBe('contain');
      expect(normalized.preload).toBe('metadata');
    });

    it('extracts MediaReference properties from src object correctly', () => {
      const itemWithRef = {
        media: {
          type: 'image',
          sourceType: 'upload',
          src: {
            mediaId: 'med-12345',
            name: 'diagram.png',
            mimeType: 'image/png',
            size: 4096
          }
        }
      };
      const normalized = normalizeItemMedia(itemWithRef);
      expect(normalized.mediaId).toBe('med-12345');
      expect(normalized.fileName).toBe('diagram.png');
      expect(normalized.mimeType).toBe('image/png');
    });
  });

  describe('isItemMediaActive', () => {
    it('returns false for none or missing sources', () => {
      expect(isItemMediaActive(null)).toBe(false);
      expect(isItemMediaActive({ type: 'none' })).toBe(false);
      expect(isItemMediaActive({ type: 'image', src: '' })).toBe(false);
      expect(isItemMediaActive({ type: 'audio', src: '' })).toBe(false);
    });

    it('returns true when media type is not none and has valid source or mediaId', () => {
      expect(isItemMediaActive({ type: 'image', src: 'https://example.com/img.png' })).toBe(true);
      expect(isItemMediaActive({ type: 'audio', mediaId: 'med-audio-1' })).toBe(true);
      expect(isItemMediaActive({ type: 'video', src: 'https://example.com/video.mp4' })).toBe(true);
    });
  });

  describe('validateItemMedia', () => {
    it('passes cleanly for type=none', () => {
      const result = validateItemMedia({ type: 'none' }, 0);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('flags error if active media type has no source', () => {
      const result = validateItemMedia({ type: 'image', src: '', mediaId: '' }, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('IMAGE media type is selected, but no media source was provided')])
      );
    });

    it('flags warning if meaningful image has no alt text', () => {
      const result = validateItemMedia({
        type: 'image',
        sourceType: 'url',
        src: 'https://example.com/chart.png',
        decorative: false,
        alt: ''
      }, 1);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Item 2: Meaningful image is missing alternative text')])
      );
    });

    it('passes decorative image without alt text', () => {
      const result = validateItemMedia({
        type: 'image',
        sourceType: 'url',
        src: 'https://example.com/divider.png',
        decorative: true,
        alt: ''
      }, 0);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns on insecure HTTP remote URLs', () => {
      const result = validateItemMedia({
        type: 'video',
        sourceType: 'url',
        src: 'http://insecure.example.com/video.mp4'
      }, 0);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Insecure HTTP media URL detected')])
      );
    });

    it('warns on non-direct audio/video links', () => {
      const videoResult = validateItemMedia({
        type: 'video',
        sourceType: 'url',
        src: 'https://youtube.com/watch?v=12345'
      }, 0);
      expect(videoResult.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('does not appear to be a direct video file')])
      );
    });
  });

  describe('renderItemMediaElement and wrapItemMediaContent', () => {
    it('returns untouched contentHTML if no media is active', () => {
      const content = '<p>Original body text</p>';
      const wrapped = wrapItemMediaContent({ type: 'none' }, content, 'inst-1', 0);
      expect(wrapped).toBe(content);
    });

    it('renders image markup with correct aspect ratio class and figcaption', () => {
      const imageMedia = {
        type: 'image',
        sourceType: 'url',
        src: 'https://example.com/demo.jpg',
        alt: 'Demo visual',
        caption: 'Detailed figure caption',
        aspectRatio: '16:9',
        fit: 'cover',
        placement: 'above'
      };
      const rendered = renderItemMediaElement(imageMedia, 'test-inst', 0);
      expect(rendered).toContain('class="item-media-slot item-media-type-image item-media-align-above"');
      expect(rendered).toContain('class="item-media-figure item-media-aspect-16-9"');
      expect(rendered).toContain('src="https://example.com/demo.jpg"');
      expect(rendered).toContain('alt="Demo visual"');
      expect(rendered).toContain('Detailed figure caption');
      expect(rendered).toContain('loading="lazy"');
    });

    it('renders audio markup with controls, preload, and transcript details', () => {
      const audioMedia = {
        type: 'audio',
        sourceType: 'url',
        src: 'https://example.com/voiceover.mp3',
        caption: 'Audio Lesson 1',
        transcript: 'Welcome to module one training.',
        preload: 'none',
        placement: 'below'
      };
      const rendered = renderItemMediaElement(audioMedia, 'test-inst', 1);
      expect(rendered).toContain('class="item-media-audio-player"');
      expect(rendered).toContain('preload="none"');
      expect(rendered).toContain('Audio Lesson 1');
      expect(rendered).toContain('class="item-media-transcript-drawer"');
      expect(rendered).toContain('Welcome to module one training.');
    });

    it('renders video markup with poster, track, and transcript', () => {
      const videoMedia = {
        type: 'video',
        sourceType: 'url',
        src: 'https://example.com/intro.mp4',
        posterSrc: 'https://example.com/thumb.jpg',
        captionsSrc: 'https://example.com/subs.vtt',
        transcript: 'Full video walkthrough dialogue.',
        aspectRatio: '4:3',
        placement: 'left'
      };
      const rendered = renderItemMediaElement(videoMedia, 'test-inst', 2);
      expect(rendered).toContain('class="item-media-video-player"');
      expect(rendered).toContain('poster="https://example.com/thumb.jpg"');
      expect(rendered).toContain('track src="https://example.com/subs.vtt"');
      expect(rendered).toContain('item-media-aspect-4-3');
      expect(rendered).toContain('Full video walkthrough dialogue.');
    });

    it('wraps content in responsive two-column grid classes for side-by-side placements', () => {
      const leftMedia = {
        type: 'image',
        sourceType: 'url',
        src: 'https://example.com/side.png',
        placement: 'left'
      };
      const wrappedLeft = wrapItemMediaContent(leftMedia, '<p>Right text</p>', 'inst-1', 0);
      expect(wrappedLeft).toContain('class="item-content-layout layout-media-left"');
      expect(wrappedLeft).toContain('class="item-text-slot"><p>Right text</p></div>');

      const rightMedia = {
        type: 'image',
        sourceType: 'url',
        src: 'https://example.com/side.png',
        placement: 'right'
      };
      const wrappedRight = wrapItemMediaContent(rightMedia, '<p>Left text</p>', 'inst-1', 0);
      expect(wrappedRight).toContain('class="item-content-layout layout-media-right"');
    });

    it('includes responsive mobile CSS rules in getItemMediaCSS', () => {
      const css = getItemMediaCSS();
      expect(css).toContain('@media (max-width: 640px)');
      expect(css).toContain('.item-content-layout.layout-media-left');
      expect(css).toContain('.item-content-layout.layout-media-right');
      expect(css).toContain('.item-media-aspect-16-9');
      expect(css).toContain('.item-media-aspect-4-3');
      expect(css).toContain('.item-media-aspect-1-1');
      expect(css).toContain('.item-media-aspect-3-2');
    });
  });

  describe('Accordion Integration with Media', () => {
    it('generates valid HTML without media for legacy items', () => {
      const config = {
        accordionMulti: false,
        accordionExpandAll: false,
        items: [
          { title: 'Item 1', content: '<p>Content 1</p>' },
          { title: 'Item 2', content: '<p>Content 2</p>' }
        ]
      };
      const html = generateHTML(config);
      expect(html).toContain('Item 1');
      expect(html).toContain('Content 1');
      expect(html).not.toContain('item-media-slot');
    });

    it('generates HTML with media for items with active attachments', () => {
      const config = {
        accordionMulti: false,
        accordionExpandAll: false,
        items: [
          {
            title: 'Item with Media',
            content: '<p>Body text</p>',
            media: {
              type: 'image',
              sourceType: 'url',
              src: 'https://example.com/photo.jpg',
              alt: 'Descriptive photo',
              placement: 'above'
            }
          }
        ]
      };
      const html = generateHTML(config);
      expect(html).toContain('item-media-slot item-media-type-image');
      expect(html).toContain('src="https://example.com/photo.jpg"');
    });

    it('generates CSS that includes item-media layout classes', () => {
      const css = generateCSS({});
      expect(css).toContain('.item-content-layout');
      expect(css).toContain('.item-media-slot');
    });

    it('generates JS with pauseMediaInPanel to pause audio and video when panels collapse', () => {
      const js = generateJS({ accordionMulti: false });
      expect(js).toContain('function pauseMediaInPanel(panel)');
      expect(js).toContain('panel.querySelectorAll(\'audio, video\')');
      expect(js).toContain('mediaEl.pause()');
    });

    it('renders MediaReference object and blob URLs correctly when resolved for preview', () => {
      const itemWithMediaRef = {
        title: 'Resolved Item',
        content: '<p>Body text</p>',
        media: {
          type: 'image',
          sourceType: 'upload',
          src: {
            mediaId: 'med-9999',
            name: 'photo.png',
            mimeType: 'image/png',
            size: 1024
          },
          alt: 'Photo description',
          placement: 'above'
        }
      };
      const rendered = wrapItemMediaContent(itemWithMediaRef.media, itemWithMediaRef.content, 'acc-test', 0);
      expect(rendered).toContain('item-media-slot');
      expect(rendered).toContain('alt="Photo description"');

      // When resolved in preview as a blob URL string:
      const itemWithBlob = {
        title: 'Blob Item',
        content: '<p>Body text</p>',
        media: {
          type: 'image',
          sourceType: 'upload',
          src: 'blob:http://localhost:5173/1234-5678',
          alt: 'Blob photo',
          placement: 'above'
        }
      };
      const renderedBlob = wrapItemMediaContent(itemWithBlob.media, itemWithBlob.content, 'acc-test', 0);
      expect(renderedBlob).toContain('src="blob:http://localhost:5173/1234-5678"');
    });

    it('validates accordion items and reports media errors/warnings', () => {
      const invalidConfig = {
        items: [
          {
            title: 'Broken item',
            content: 'Text',
            media: {
              type: 'video',
              sourceType: 'url',
              src: ''
            }
          }
        ]
      };
      const validation = validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('VIDEO media type is selected, but no media source was provided')])
      );
    });
  });
});

