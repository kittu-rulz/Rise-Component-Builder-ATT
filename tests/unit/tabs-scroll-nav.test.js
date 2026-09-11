import { describe, it, expect } from 'vitest';
import * as tabs from '../../components/tabs.js';
import * as processFlow from '../../components/process-flow.js';

describe('Horizontal Scroll Navigation with Back/Next Arrows', () => {
  it('Tabs component renders tabs-nav-wrapper with Back and Next scroll arrow buttons in horizontal mode', () => {
    const config = {
      ...tabs.defaultConfig,
      items: [
        { title: 'Tab One', content: 'Content 1' },
        { title: 'Tab Two', content: 'Content 2' },
        { title: 'Tab Three', content: 'Content 3' },
        { title: 'Tab Four', content: 'Content 4' },
        { title: 'Tab Five', content: 'Content 5' }
      ]
    };
    const html = tabs.generateHTML(config, 'inst-tabs');
    expect(html).toContain('tabs-nav-wrapper');
    expect(html).toContain('tabs-nav-prev');
    expect(html).toContain('tabs-nav-next');
    expect(html).toContain('id="inst-tabs-nav-prev"');
    expect(html).toContain('id="inst-tabs-nav-next"');
    expect(html).toContain('id="inst-tabs-tabs-header"');
  });

  it('Tabs CSS specifies nowrap and hidden scrollbars for horizontal tab track', () => {
    const css = tabs.generateCSS();
    expect(css).toContain('flex-wrap: nowrap');
    expect(css).toContain('.tabs-nav-arrow');
    expect(css).toContain('white-space: nowrap');
    expect(css).toContain('.tabs-header::-webkit-scrollbar');
  });

  it('Tabs JS includes scroll handlers and active tab scrollIntoView', () => {
    const js = tabs.generateJS(tabs.defaultConfig, 'inst-tabs');
    expect(js).toContain('scrollIntoView');
    expect(js).toContain('updateNavArrows');
    expect(js).toContain('scrollBy');
  });

  it('Process Flow renders breadcrumb navigation wrapper with prev/next scroll buttons', () => {
    const config = {
      ...processFlow.defaultConfig,
      items: [
        { title: 'Step 1', content: 'Details 1' },
        { title: 'Step 2', content: 'Details 2' },
        { title: 'Step 3', content: 'Details 3' },
        { title: 'Step 4', content: 'Details 4' }
      ]
    };
    const html = processFlow.generateHTML(config, 'inst-flow');
    expect(html).toContain('process-breadcrumbs-wrapper');
    expect(html).toContain('process-crumb-prev');
    expect(html).toContain('process-crumb-next');
    expect(html).toContain('id="inst-flow-crumb-prev"');
    expect(html).toContain('id="inst-flow-crumb-next"');
  });

  it('Process Flow CSS specifies nowrap and hidden scrollbars for breadcrumbs', () => {
    const css = processFlow.generateCSS();
    expect(css).toContain('.process-breadcrumbs-wrapper');
    expect(css).toContain('flex-wrap: nowrap');
    expect(css).toContain('.process-crumb-arrow');
    expect(css).toContain('.process-breadcrumbs::-webkit-scrollbar');
  });
});
