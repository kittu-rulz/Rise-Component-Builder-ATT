import { describe, expect, it } from 'vitest';
import * as tabs from '../../components/tabs.js';
import { editorSchemas } from '../../js/editor-schemas.js';
import { createEmptyItemMedia } from '../../js/item-media.js';

const media = {
  ...createEmptyItemMedia('image'),
  sourceType: 'url',
  src: 'https://example.com/diagram.png',
  alt: 'A diagram of the project lifecycle',
  placement: 'left'
};

describe('Tabs: per-tab media', () => {
  it('is offered in the editor, as it is for Accordion', () => {
    expect(editorSchemas['tab-blocks'].supportsItemMedia).toBe(true);
  });

  it('renders a tab’s media inside its panel, next to its text', () => {
    const config = { ...tabs.defaultConfig, items: [{ title: 'One', content: 'Body text', media }, { title: 'Two', content: 'Plain' }] };
    const html = tabs.generateHTML(config, 'rcb-test');
    const panel = html.split('id="rcb-test-tab-panel-0"')[1].split('id="rcb-test-tab-panel-1"')[0];
    expect(panel).toContain('item-content-layout layout-media-left');
    expect(panel).toContain('https://example.com/diagram.png');
    expect(panel).toContain('Body text');
    expect(html.split('id="rcb-test-tab-panel-1"')[1]).not.toContain('item-content-layout');
  });

  it('ships the media styles and pauses playing media when the tab changes', () => {
    expect(tabs.generateCSS()).toContain('.item-content-layout');
    expect(tabs.generateJS(tabs.defaultConfig, 'rcb-test')).toContain("querySelectorAll('audio, video')");
  });

  it('reports media problems in validation', () => {
    const bad = { ...media, src: '', mediaId: '', alt: '' };
    const result = tabs.validate({ ...tabs.defaultConfig, items: [{ title: 'One', content: 'Body', media: bad }] });
    expect(result.valid).toBe(false);
  });
});
