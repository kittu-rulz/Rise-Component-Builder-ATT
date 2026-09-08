import { describe, expect, test } from 'vitest';
import { ATT_FUNCTIONAL_ICONS, getAttIconSvg, getAttIconData } from '../../js/att-icons.js';
import * as accordion from '../../components/accordion.js';
import * as tabs from '../../components/tabs.js';
import * as flipCards from '../../components/flip-cards.js';
import * as verticalTimeline from '../../components/vertical-timeline.js';
import * as audioPlayer from '../../components/audio-player.js';
import * as videoFrame from '../../components/video-frame.js';
import * as interactiveVideo from '../../components/interactive-video.js';
import * as scenario from '../../components/scenario.js';
import * as sortingActivity from '../../components/sorting-activity.js';
import * as imageGallery from '../../components/image-gallery.js';
import * as buttonList from '../../components/button-list.js';
import * as pricingComparison from '../../components/pricing-comparison.js';
import * as profileCards from '../../components/profile-cards.js';

describe('AT&T Functional Icons Utility (Prompt 6)', () => {
  test('ATT_FUNCTIONAL_ICONS contains 400+ authoritative icons from January 2026 design system', () => {
    const iconKeys = Object.keys(ATT_FUNCTIONAL_ICONS);
    expect(iconKeys.length).toBeGreaterThan(400);
    expect(iconKeys).toContain('padlock');
    expect(iconKeys).toContain('chevron-down');
    expect(iconKeys).toContain('play');
    expect(iconKeys).toContain('pause');
    expect(iconKeys).toContain('check');
    expect(iconKeys).toContain('close');
  });

  test('no icons contain PowerPoint export artifacts (Pixel_Grid, Clear_Space, Grid_Target)', () => {
    for (const [name, icon] of Object.entries(ATT_FUNCTIONAL_ICONS)) {
      expect(icon.body, `Icon "${name}" has Pixel_Grid`).not.toContain('Pixel_Grid');
      expect(icon.body, `Icon "${name}" has Clear_Space`).not.toContain('Clear_Space');
      expect(icon.body, `Icon "${name}" has Grid_Target`).not.toContain('Grid_Target');
    }
  });

  test('getAttIconSvg renders clean SVG with currentColor and aria-hidden="true" by default', () => {
    const svg = getAttIconSvg('chevron-down');
    expect(svg).toContain('<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">');
    expect(svg).toContain('</svg>');
  });

  test('getAttIconSvg supports className, width, height, style', () => {
    const svg = getAttIconSvg('padlock', {
      className: 'my-icon',
      width: 24,
      height: 24,
      style: 'margin-right: 8px;'
    });
    expect(svg).toContain('class="my-icon"');
    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
    expect(svg).toContain('style="margin-right: 8px;"');
  });

  test('getAttIconSvg handles accessible title correctly (role="img" and <title>)', () => {
    const svg = getAttIconSvg('play', { title: 'Play Video' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>Play Video</title>');
    expect(svg).not.toContain('aria-hidden="true"');
  });

  test('getAttIconSvg returns empty string for non-existent icons', () => {
    const svg = getAttIconSvg('non-existent-icon-12345');
    expect(svg).toBe('');
  });

  test('getAttIconData returns raw icon object', () => {
    const data = getAttIconData('check');
    expect(data).not.toBeNull();
    expect(data.cat).toBe('communications-and-alerts');
    expect(data.viewBox).toBe('0 0 32 32');
    expect(data.body).toBeTruthy();
  });
});

describe('Component Integration with Official AT&T Icons', () => {
  const instanceId = 'test-icon-instance';

  test('accordion uses padlock and chevron/arrow icons from AT&T library', () => {
    const html = accordion.generateHTML({
      items: [
        { title: 'Item 1', content: 'Body 1' },
        { title: 'Item 2', content: 'Body 2' }
      ],
      accordionSequential: true,
      iconStyle: 'chevron'
    }, instanceId);
    expect(html).toContain('accordion-lock-icon');
    expect(html).toContain('fill="currentColor"');
  });

  test('tabs uses padlock and check icons from AT&T library', () => {
    const html = tabs.generateHTML({
      items: [
        { title: 'Tab 1', content: 'Content 1' },
        { title: 'Tab 2', content: 'Content 2' }
      ],
      tabsSequential: true
    }, instanceId);
    expect(html).toContain('tab-lock-icon');
    expect(html).toContain('fill="currentColor"');
  });

  test('flip-cards uses question-circle-filled and check icons', () => {
    const html = flipCards.generateHTML({
      items: [
        { title: 'Question', content: 'Answer', hint: 'Think carefully' }
      ],
      flipCardSelfAssess: true
    }, instanceId);
    expect(html).toContain('fill="currentColor"');
  });

  test('vertical-timeline uses padlock icon for locked steps', () => {
    const html = verticalTimeline.generateHTML({
      items: [
        { title: 'Step 1', content: 'Detail 1' },
        { title: 'Step 2', content: 'Detail 2' }
      ],
      timelineChronologicalReveal: true
    }, instanceId);
    expect(html).toContain('step-lock-icon');
    expect(html).toContain('fill="currentColor"');
  });

  test('audio-player uses functional player icons', () => {
    const html = audioPlayer.generateHTML({
      items: [
        { title: 'Track 1', content: 'https://example.com/audio.mp3' }
      ]
    }, instanceId);
    expect(html).toContain('aud-play-btn');
    expect(html).toContain('fill="currentColor"');
  });

  test('video-frame uses functional video controls', () => {
    const html = videoFrame.generateHTML({
      items: [
        { title: 'Demo Video', content: 'https://example.com/video.mp4' }
      ]
    }, instanceId);
    expect(html).toContain('video-overlay-play');
    expect(html).toContain('fill="currentColor"');
  });

  test('interactive-video uses information and check circle icons', () => {
    const html = interactiveVideo.generateHTML({
      items: [
        { title: 'Note 1', content: 'Some note', timestamp: 10, type: 'note' }
      ]
    }, instanceId);
    expect(html).toContain('fill="currentColor"');
  });

  test('sorting-activity uses drag handle SVG with currentColor', () => {
    const html = sortingActivity.generateHTML({
      items: [
        { title: 'Item 1', content: 'Category 1' }
      ]
    }, instanceId);
    expect(html).toContain('class="drag-handle"');
    expect(html).toContain('fill="currentColor"');
  });

  test('image-gallery uses close icon instead of &times;', () => {
    const html = imageGallery.generateHTML({
      items: [
        { title: 'Image 1', content: 'https://example.com/img1.jpg' }
      ]
    }, instanceId);
    expect(html).toContain('lightbox-close-icon');
    expect(html).not.toContain('&times;');
    expect(html).toContain('fill="currentColor"');
  });

  test('button-list uses open-new icon for external links', () => {
    const html = buttonList.generateHTML({
      items: [
        { title: 'External Resource', content: 'https://att.com' }
      ]
    }, instanceId);
    expect(html).toContain('class="link-button-item"');
    expect(html).toContain('fill="currentColor"');
  });

  test('pricing-comparison uses check icon for features', () => {
    const html = pricingComparison.generateHTML({
      items: [
        { title: 'Plan A', content: 'Feature 1\nFeature 2', price: '$50' }
      ]
    }, instanceId);
    expect(html).toContain('tick-icon');
    expect(html).toContain('fill="currentColor"');
  });

  test('scenario and profile-cards use person icon as avatar fallback', () => {
    const scenarioHtml = scenario.generateHTML({
      items: [
        { title: 'Dialogue prompt', content: 'What would you do?' },
        { title: 'Option 1', content: 'Feedback 1' }
      ]
    }, instanceId);
    expect(scenarioHtml).toContain('char-avatar-img');
    expect(scenarioHtml).toContain('fill="currentColor"');

    const profileHtml = profileCards.generateHTML({
      items: [
        { title: 'Jane Doe', content: 'Bio info', role: 'Engineer' }
      ]
    }, instanceId);
    expect(profileHtml).toContain('profile-avatar-circle');
    expect(profileHtml).toContain('fill="currentColor"');
  });
});
