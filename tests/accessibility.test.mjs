import { test } from 'vitest';
import assert from 'node:assert/strict';

import { generateIframeContent } from '../js/preview.js';
import { editorSchemas } from '../js/editor-schemas.js';
import { toRgba } from '../js/utilities.js';
import { COMPONENT_REGISTRY } from '../js/component-registry.js';

// Every catalog component is a real module now (docs/ARCHITECTURE.md §1); use the full registry.
const registry = Object.fromEntries(COMPONENT_REGISTRY.map(entry => [entry.id, entry.renderer]));
// stateFor() below never sets currentProjectId, so js/preview.js#getInstanceId deterministically
// derives this fixed instance id prefix for every generated document in this file.
const ID = 'rcb-preview';

function stateFor(componentId, items) {
  return {
    selectedComponent: { id: componentId },
    settings: { defaultFont: 'Lato' },
    config: {
      blockTitle: 'Learning activity',
      blockHeadline: 'Accessible component',
      blockDesc: 'Complete the activity.',
      colorPrimary: '#2563EB',
      colorAccent: '#B45309',
      colorBg: '#FFFFFF',
      colorText: '#1F2937',
      borderRadius: '12',
      shadowDepth: 'soft',
      borderOutline: true,
      accordionMulti: true,
      accordionAnimation: true,
      iconStyle: 'chevron',
      trackCompletion: true,
      completionMsg: 'Activity complete!',
      items
    }
  };
}

function generate(componentId, items) {
  return generateIframeContent(stateFor(componentId, items), registry, toRgba);
}

const contentItems = [
  { title: 'First item', content: 'First description', category: 'A', correct: true, x: 25, y: 25 },
  { title: 'Second item', label: 'Second answer', content: 'Second description', category: 'B', correct: false, x: 75, y: 75 }
];

test('shared preview shell exposes headings, progress, live status, focus, and reduced-motion support', () => {
  const html = generate('accordion', contentItems);
  assert.match(html, new RegExp(`<main class="rise-block-wrapper" aria-labelledby="${ID}-block-headline">`));
  assert.match(html, /role="progressbar"[^>]+aria-valuenow="0"/);
  assert.match(html, new RegExp(`id="${ID}-interaction-status"[^>]+role="status"[^>]+aria-live="polite"`));
  assert.match(html, /:focus-visible/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /@media \(forced-colors: active\)/);
});

test('accordion, tabs, flip cards, and quiz expose their required widget states', () => {
  const accordionHtml = generate('accordion', contentItems);
  assert.match(accordionHtml, new RegExp(`aria-expanded="false" aria-controls="${ID}-accordion-panel-0"`));
  assert.match(accordionHtml, new RegExp(`role="region" aria-labelledby="${ID}-accordion-trigger-0"`));

  const tabsHtml = generate('tab-blocks', contentItems);
  assert.match(tabsHtml, /role="tablist"/);
  assert.match(tabsHtml, /role="tab" aria-selected="true"/);
  assert.match(tabsHtml, new RegExp(`role="tabpanel" aria-labelledby="${ID}-tab-0"`));
  assert.match(tabsHtml, /event\.key === 'ArrowRight'/);

  const flipHtml = generate('flip-cards', contentItems);
  assert.match(flipHtml, /class="flip-card" role="button" tabindex="0" aria-expanded="false"/);
  assert.match(flipHtml, /class="flip-card-back"[^>]+aria-hidden="true"/);

  const quizHtml = generate('multiple-choice', contentItems);
  assert.match(quizHtml, /role="radiogroup"/);
  assert.match(quizHtml, /role="radio" tabindex="0" aria-checked="false"/);
  assert.match(quizHtml, new RegExp(`id="${ID}-quiz-feedback-box"[^>]+role="status"`));
});

test('hotspots, sorting, blanks, timelines, process, and scenario have keyboard and announcement hooks', () => {
  const hotspots = generate('hotspots', contentItems);
  assert.match(hotspots, /<button type="button" class="hotspot-pin"/);
  assert.match(hotspots, /role="region" aria-label="Hotspot details" aria-hidden="true"/);
  assert.match(hotspots, /event\.key === 'Escape'/);

  const sorting = generate('sorting-activity', contentItems);
  assert.match(sorting, new RegExp(`aria-describedby="${ID}-sorting-instructions"`));
  assert.match(sorting, /class="target-btn"[^>]+aria-pressed="false"/);
  assert.match(sorting, new RegExp(`id="${ID}-sorting-feedback-box"[^>]+aria-live="polite"`));

  const blanks = generate('fill-blank', [{ title: 'The answer is [blank].', content: 'accessible' }]);
  assert.match(blanks, /aria-label="Answer for sentence 1"/);
  assert.match(blanks, /aria-invalid/);

  const horizontal = generate('horizontal-timeline', contentItems);
  assert.match(horizontal, /aria-label="Timeline steps"/);
  assert.match(horizontal, new RegExp(`role="tabpanel" aria-labelledby="${ID}-timeline-tab-0"`));

  const vertical = generate('vertical-timeline', contentItems);
  assert.match(vertical, /role="list" aria-label="Timeline"/);
  assert.match(vertical, /aria-pressed="false"/);

  const process = generate('process-flow', contentItems);
  assert.match(process, /aria-roledescription="step"/);
  assert.match(process, /aria-live="polite" aria-atomic="true"/);

  const scenario = generate('scenario', contentItems);
  assert.match(scenario, new RegExp(`id="${ID}-scenario-feedback-card"[^>]+role="status"`));
});

test('media and gallery output includes alternatives, accessible controls, and dialog behavior', () => {
  const audio = generate('audio-player', [{
    title: 'Audio lesson', content: 'https://example.com/audio.mp3', transcript: '<p>Transcript text</p>',
    iconImage: 'https://example.com/audio-art.png', iconAltText: 'Podcast cover', iconDecorative: false
  }]);
  assert.match(audio, /aria-label="Play audio" aria-pressed="false"/);
  assert.match(audio, /class="custom-item-icon"[^>]+alt="Podcast cover"/);
  assert.match(audio, /role="slider" tabindex="0" aria-label="Audio position"/);
  assert.match(audio, /<summary>Transcript<\/summary>/);
  assert.match(audio, /addEventListener\('ended'/);

  const video = generate('video-frame', [{ title: 'Video lesson', content: 'https://example.com/video.mp4', captionsUrl: 'https://example.com/captions.vtt', audioDescription: '<p>Visual description</p>' }]);
  assert.match(video, /<track kind="captions"[^>]+default>/);
  assert.match(video, /role="slider" tabindex="0" aria-label="Video position"/);
  assert.match(video, /<summary>Visual description<\/summary>/);

  const gallery = generate('image-gallery', [{ title: 'Diagram', content: 'https://example.com/image.png', altText: 'A process diagram' }]);
  assert.match(gallery, /<button type="button" class="gallery-item-card"/);
  assert.match(gallery, /role="dialog" aria-modal="true"/);
  assert.match(gallery, /galleryReturnFocus/);

  const information = generate('info-grid', [{
    title: 'Feature', content: 'Description', iconImage: 'https://example.com/feature.png', iconDecorative: true
  }]);
  assert.match(information, /class="custom-item-icon"[^>]+aria-hidden="true"/);
});

test('media alternatives use required alt text or visible non-blocking warnings', () => {
  const transcript = editorSchemas['audio-player'].itemFields.find(field => field.id === 'transcript');
  const captions = editorSchemas['video-frame'].itemFields.find(field => field.id === 'captionsUrl');
  const altText = editorSchemas['image-gallery'].itemFields.find(field => field.id === 'altText');
  const iconSchemas = ['flip-cards', 'info-grid', 'audio-player'].map(componentId => editorSchemas[componentId].itemFields);
  assert.equal(transcript?.required, false);
  assert.equal(Boolean(transcript?.warningMessage), true);
  assert.equal(captions?.required, false);
  assert.equal(Boolean(captions?.warningMessage), true);
  assert.equal(altText?.required, false);
  assert.equal(Boolean(altText?.warningMessage), true);
  iconSchemas.forEach(fields => {
    assert.equal(fields.some(field => field.id === 'iconImage' && field.type === 'image'), true);
    assert.equal(Boolean(fields.find(field => field.id === 'iconAltText')?.warningMessage), true);
    assert.equal(fields.find(field => field.id === 'iconDecorative')?.default, false);
  });
  Object.values(editorSchemas).flatMap(schema => [
    ...(schema.componentFields || []), ...(schema.itemFields || [])
  ]).filter(field => field.type === 'image').forEach(field => {
    assert.match(field.preferredDimensions, /\d+ × \d+ px/);
  });
});

test('every reviewed component produces syntactically valid inline interaction JavaScript', () => {
  const componentIds = [
    'accordion', 'tab-blocks', 'flip-cards', 'hotspots', 'multiple-choice', 'sorting-activity',
    'fill-blank', 'vertical-timeline', 'horizontal-timeline', 'process-flow', 'scenario',
    'audio-player', 'video-frame', 'image-gallery'
  ];
  componentIds.forEach(componentId => {
    const html = generate(componentId, contentItems);
    const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
    assert.ok(script, `${componentId} should include an interaction script`);
    assert.doesNotThrow(() => Function(script), `${componentId} interaction script should parse`);
  });
});
