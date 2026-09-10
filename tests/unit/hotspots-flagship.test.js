// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { defaultConfig, generateHTML, generateCSS, generateJS, validate } from '../../components/hotspots.js';

describe('Interactive Hotspots Flagship Capabilities', () => {
  test('defaultConfig provides complete flagship structure', () => {
    expect(defaultConfig.calloutMode).toBe('tooltip');
    expect(defaultConfig.showProgress).toBe(true);
    expect(defaultConfig.enableZoomPan).toBe(true);
    expect(defaultConfig.items.length).toBeGreaterThanOrEqual(3);
    expect(defaultConfig.items[0].markerType).toBe('icon');
  });

  test('generates vector marker icons, lettered pins, and numbered pins correctly', () => {
    const config = {
      title: 'Infrastructure Tour',
      calloutMode: 'tooltip',
      showProgress: true,
      enableZoomPan: true,
      items: [
        { title: 'Marker 1', content: 'Details 1', x: 20, y: 30, markerType: 'icon', iconName: 'fiber' },
        { title: 'Marker 2', content: 'Details 2', x: 50, y: 50, markerType: 'letter' },
        { title: 'Marker 3', content: 'Details 3', x: 80, y: 70, markerType: 'number' }
      ]
    };

    const html = generateHTML(config, 'test-hs-1');
    const container = document.createElement('div');
    container.innerHTML = html;

    const pins = container.querySelectorAll('.hotspot-pin');
    expect(pins.length).toBe(3);

    // Pin 1: vector icon
    expect(pins[0].classList.contains('has-vector-icon')).toBe(true);
    expect(pins[0].querySelector('svg')).not.toBeNull();

    // Pin 2: lettered
    expect(pins[1].querySelector('.pin-body').textContent.trim()).toBe('B');

    // Pin 3: numbered
    expect(pins[2].querySelector('.pin-body').textContent.trim()).toBe('3');
  });

  test('generates Progress HUD and Zoom & Pan toolbar controls', () => {
    const config = {
      title: 'Facility Map',
      content: 'Inspect the facility zones below.',
      showProgress: true,
      enableZoomPan: true,
      items: [
        { title: 'Zone A', content: 'Server Room', x: 25, y: 40 },
        { title: 'Zone B', content: 'Power Grid', x: 75, y: 60 }
      ]
    };

    const html = generateHTML(config, 'test-hs-2');
    const container = document.createElement('div');
    container.innerHTML = html;

    // Progress HUD check
    const progressHud = container.querySelector('.hotspot-progress-hud');
    expect(progressHud).not.toBeNull();
    expect(container.querySelector('.hotspot-visited-count')).not.toBeNull();
    expect(container.querySelector('.hotspot-progress-fill')).not.toBeNull();

    // Zoom toolbar check
    const zoomToolbar = container.querySelector('.hotspot-zoom-toolbar');
    expect(zoomToolbar).not.toBeNull();
    expect(container.querySelector('.btn-zoom-in')).not.toBeNull();
    expect(container.querySelector('.btn-zoom-out')).not.toBeNull();
    expect(container.querySelector('.btn-zoom-reset')).not.toBeNull();
    expect(container.querySelector('.hotspot-zoom-level').textContent.trim()).toBe('100%');
  });

  test('supports Drawer and Modal callout modes with accessible markup', () => {
    // Drawer mode
    const drawerConfig = {
      calloutMode: 'drawer',
      items: [{ title: 'Zone 1', content: 'High Security Area', x: 40, y: 40 }]
    };
    const drawerHtml = generateHTML(drawerConfig, 'test-drawer-hs');
    const drawerContainer = document.createElement('div');
    drawerContainer.innerHTML = drawerHtml;
    expect(drawerContainer.querySelector('.hotspot-drawer')).not.toBeNull();
    expect(drawerContainer.querySelector('.hotspot-drawer-close')).not.toBeNull();

    // Modal mode
    const modalConfig = {
      calloutMode: 'modal',
      items: [{ title: 'Substation Alpha', content: '345kV Transformer', x: 50, y: 50 }]
    };
    const modalHtml = generateHTML(modalConfig, 'test-modal-hs');
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    expect(modalContainer.querySelector('.hotspot-modal-backdrop')).not.toBeNull();
    expect(modalContainer.querySelector('.hotspot-modal')).not.toBeNull();
    expect(modalContainer.querySelector('.hotspot-modal-close')).not.toBeNull();
  });

  test('renders audio narration player and transcript disclosure when audio is configured', () => {
    const config = {
      calloutMode: 'tooltip',
      items: [
        {
          title: 'Main Gate Audio Tour',
          content: 'Entry security protocols.',
          x: 30,
          y: 40,
          audioUrl: 'https://example.com/audio/gate.mp3',
          audioTranscript: 'Welcome to the main facility entrance. Security badge check is required.'
        }
      ]
    };

    const html = generateHTML(config, 'test-audio-hs');
    const container = document.createElement('div');
    container.innerHTML = html;

    const audioNarration = container.querySelector('.hotspot-audio-narration');
    expect(audioNarration).not.toBeNull();
    expect(container.querySelector('audio')).not.toBeNull();
    expect(container.querySelector('audio').getAttribute('src')).toBe('https://example.com/audio/gate.mp3');

    const transcript = container.querySelector('.hotspot-audio-transcript');
    expect(transcript).not.toBeNull();
    expect(transcript.textContent).toContain('Welcome to the main facility entrance');
  });

  test('generateCSS and generateJS output valid, complete code strings', () => {
    const css = generateCSS();
    expect(css).toContain('.hotspots-container');
    expect(css).toContain('.hotspot-progress-hud');
    expect(css).toContain('.hotspot-zoom-toolbar');
    expect(css).toContain('.hotspot-drawer');
    expect(css).toContain('.hotspot-modal');

    const js = generateJS();
    expect(js).toContain('function applyTransform()');
    expect(js).toContain('function toggleHotspot(');
    expect(js).toContain('function updateHUD()');
  });

  test('validate() properly checks coordinates, titles, and contents', () => {
    const validConfig = {
      items: [
        { title: 'Marker 1', content: 'Content 1', x: '20', y: '30' },
        { title: 'Marker 2', content: 'Content 2', x: 50, y: 50 }
      ]
    };
    expect(validate(validConfig).valid).toBe(true);

    const invalidConfig = {
      items: [
        { title: '', content: 'Content 1', x: '20', y: '30' },
        { title: 'Marker 2', content: '', x: 50, y: 50 },
        { title: 'Marker 3', content: 'Content 3', x: 150, y: 50 } // out of range
      ]
    };
    const res = validate(invalidConfig);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
  });
});
