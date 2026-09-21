// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  createDefaultItemMedia,
  createEmptyItemMedia,
  createItemMediaControl,
  getItemMediaCSS,
  getItemMediaType,
  isItemMediaActive,
  normalizeItemMedia,
  renderItemMediaCSS,
  renderItemMediaElement,
  validateItemMedia,
  wrapItemMediaContent
} from '../../js/item-media.js';
import { getEditorSchema } from '../../js/editor-schemas.js';
import { createSchemaItemEditor } from '../../js/editor.js';
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

    it('resolves item.media structures properly in preview without collapsing into a string', async () => {
      const { resolveMediaReferencesForPreview } = await import('../../js/media-storage.js');
      const config = {
        items: [
          {
            title: 'Uploaded Media Item',
            content: '<p>Body text</p>',
            media: {
              type: 'image',
              sourceType: 'upload',
              mediaId: 'med-upload-999',
              src: {
                mediaId: 'med-upload-999',
                name: 'test-upload.png',
                mimeType: 'image/png'
              },
              alt: 'Uploaded test image',
              placement: 'above',
              aspectRatio: '16:9',
              fit: 'contain'
            }
          }
        ]
      };
      const resolved = resolveMediaReferencesForPreview(config);
      expect(typeof resolved.items[0].media).toBe('object');
      expect(resolved.items[0].media.type).toBe('image');
      expect(resolved.items[0].media.placement).toBe('above');
      expect(resolved.items[0].media.alt).toBe('Uploaded test image');
    });
  });

  describe('createItemMediaControl & Focus Editor Integration', () => {
    it('renders separate, uniquely named Media Library triggers for Block Background vs Accordion Item', () => {
      const container = document.createElement('div');
      const schema = getEditorSchema('accordion');
      const items = [
        {
          title: 'Understanding User Intent',
          content: 'Intro content',
          media: { type: 'image', sourceType: 'upload', src: '', mediaId: '' }
        }
      ];
      const config = {
        blockBackgroundImage: '',
        items
      };

      const editor = createSchemaItemEditor({
        container,
        onChange: () => {}
      });

      editor.render({ schema, items, config });

      // Find all "Choose from Media Library" buttons
      const libraryButtons = Array.from(container.querySelectorAll('.media-library-btn'));
      expect(libraryButtons.length).toBeGreaterThanOrEqual(2);

      const backgroundBtn = libraryButtons.find(btn => btn.getAttribute('aria-label')?.includes('Block Background'));
      expect(backgroundBtn).toBeDefined();
      expect(backgroundBtn?.getAttribute('aria-label')).toBe('Choose Image for Block Background from Media Library');

      const itemBtn = libraryButtons.find(btn => btn.getAttribute('aria-label')?.includes('Understanding User Intent') || btn.getAttribute('aria-label')?.includes('Accordion Section 1'));
      expect(itemBtn).toBeDefined();
      expect(itemBtn?.getAttribute('aria-label')).toContain('Image for');
      expect(itemBtn?.getAttribute('aria-label')).toContain('from Media Library');

      // The background trigger and item trigger must be separate DOM nodes
      expect(backgroundBtn).not.toBe(itemBtn);
    });

    it('dynamically renders full audio controls when item media type is set to audio', () => {
      const item = {
        title: 'Network Overview',
        content: 'Audio explanation',
        media: { type: 'none' }
      };

      const control = createItemMediaControl({
        item,
        index: 0,
        itemLabel: 'Network Overview',
        onChange: () => {}
      });

      const typeSelect = control.querySelector('.item-media-type-select');
      expect(typeSelect).not.toBeNull();

      // Change to audio
      typeSelect.value = 'audio';
      typeSelect.dispatchEvent(new Event('change'));

      expect(item.media.type).toBe('audio');
      expect(item.media.placement).toBe('above');
      expect(item.media.preload).toBe('metadata');

      const subControls = control.querySelector('.item-media-subcontrols');
      expect(subControls).not.toBeNull();
      const libraryBtn = subControls.querySelector('.media-library-btn');
      expect(libraryBtn).not.toBeNull();
      expect(libraryBtn.getAttribute('aria-label')).toContain('Choose Audio for Network Overview Audio from Media Library');

      const transcriptInput = subControls.querySelector('textarea[aria-label*="Transcript"]');
      expect(transcriptInput).not.toBeNull();
    });

    it('dynamically renders full video controls with poster and captions when set to video', () => {
      const item = {
        title: 'Safety Procedure Video',
        content: 'Watch video',
        media: { type: 'none' }
      };

      const control = createItemMediaControl({
        item,
        index: 0,
        itemLabel: 'Safety Procedure Video',
        onChange: () => {}
      });

      const typeSelect = control.querySelector('.item-media-type-select');
      typeSelect.value = 'video';
      typeSelect.dispatchEvent(new Event('change'));

      expect(item.media.type).toBe('video');
      expect(item.media.aspectRatio).toBe('16:9');

      const subControls = control.querySelector('.item-media-subcontrols');
      const libraryBtns = Array.from(subControls.querySelectorAll('.media-library-btn'));
      // Video source + Video poster
      expect(libraryBtns.length).toBeGreaterThanOrEqual(2);

      const videoTrigger = libraryBtns.find(btn => btn.getAttribute('aria-label')?.includes('Choose Video for Safety Procedure Video'));
      expect(videoTrigger).toBeDefined();

      const posterTrigger = libraryBtns.find(btn => btn.getAttribute('aria-label')?.includes('Poster'));
      expect(posterTrigger).toBeDefined();
    });

    it('attaching media to an item does not overwrite or mutate block background image', () => {
      const container = document.createElement('div');
      const schema = getEditorSchema('accordion');
      const items = [
        {
          title: 'Section 1',
          content: 'Content 1',
          media: { type: 'image', sourceType: 'upload', src: '', mediaId: '' }
        }
      ];
      const config = {
        blockBackgroundImage: 'https://example.com/bg.jpg',
        items
      };

      const editor = createSchemaItemEditor({
        container,
        onChange: () => {}
      });

      editor.render({ schema, items, config });

      // Find item upload control URL input
      const itemUrlInput = container.querySelector('#item-media-file-0');
      expect(itemUrlInput).not.toBeNull();

      itemUrlInput.value = 'https://example.com/item-image.png';
      itemUrlInput.dispatchEvent(new Event('input'));

      // Verify item media updated
      expect(items[0].media.src).toBe('https://example.com/item-image.png');

      // Verify block background remains completely unchanged
      expect(config.blockBackgroundImage).toBe('https://example.com/bg.jpg');
    });

    it('canonical getItemMediaType correctly resolves across legacy and object formats', () => {
      expect(getItemMediaType(null)).toBe('none');
      expect(getItemMediaType({})).toBe('none');
      expect(getItemMediaType({ media: 'image' })).toBe('image');
      expect(getItemMediaType({ media: { type: 'audio' } })).toBe('audio');
      expect(getItemMediaType({ media: { kind: 'video' } })).toBe('video');
      expect(getItemMediaType({ mediaType: 'image' })).toBe('image');
    });

    it('createEmptyItemMedia creates complete serializable schemas for image, audio, and video', () => {
      const img = createEmptyItemMedia('image');
      expect(img.type).toBe('image');
      expect(img.placement).toBe('above');
      expect(img.aspectRatio).toBe('original');
      expect(img.fit).toBe('contain');
      expect(img.decorative).toBe(false);

      const aud = createEmptyItemMedia('audio');
      expect(aud.type).toBe('audio');
      expect(aud.preload).toBe('metadata');
      expect(aud.placement).toBe('above');

      const vid = createEmptyItemMedia('video');
      expect(vid.type).toBe('video');
      expect(vid.aspectRatio).toBe('16:9');
      expect(vid.preload).toBe('metadata');
    });

    it('maintains independent media configurations across multiple items', () => {
      const container = document.createElement('div');
      const schema = getEditorSchema('accordion');
      const items = [
        {
          title: 'Section 1',
          content: 'Content 1',
          media: { type: 'image', sourceType: 'url', src: 'https://example.com/img1.jpg' }
        },
        {
          title: 'Section 2',
          content: 'Content 2',
          media: { type: 'audio', sourceType: 'url', src: 'https://example.com/audio2.mp3' }
        }
      ];
      const config = {
        blockBackgroundImage: 'https://example.com/bg.jpg',
        items
      };

      const editor = createSchemaItemEditor({
        container,
        onChange: () => {}
      });

      editor.render({ schema, items, config });

      const itemCards = container.querySelectorAll('.dynamic-item-card:not(.component-fields-card)');
      expect(itemCards.length).toBe(2);

      // Section 1 has Image controls
      const card1Select = itemCards[0].querySelector('.item-media-type-select');
      expect(card1Select?.value).toBe('image');

      // Section 2 has Audio controls
      const card2Select = itemCards[1].querySelector('.item-media-type-select');
      expect(card2Select?.value).toBe('audio');

      // Update Section 1 media type to none
      card1Select.value = 'none';
      card1Select.dispatchEvent(new Event('change'));

      expect(items[0].media.type).toBe('none');
      expect(items[1].media.type).toBe('audio');
      expect(config.blockBackgroundImage).toBe('https://example.com/bg.jpg');
    });
  });
});

