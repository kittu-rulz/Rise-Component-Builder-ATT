import { expect, test } from '@playwright/test';
import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

// These specs load the committed standalone export fixtures directly — the same files
// a real user gets from the Export modal's "Download .HTML File" button — with NO
// dependency on this application's own builder UI. This is the closest thing to a real
// "exported component in the wild" check that can be automated: a real browser opening
// a real standalone file. It is NOT a Rise or Moodle test — see
// docs/RISE-COMPATIBILITY-MATRIX.md for what remains manual-only (docs/RISE-TEST-CHECKLIST.md,
// docs/MOODLE-SCORM-TEST-CHECKLIST.md) and why.

function collectErrors(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.describe('exported fixtures load standalone with no console errors', () => {
  const fixtures = [
    'accordion.html', 'flip-cards.html', 'tabs.html', 'multiple-choice.html',
    'hotspots.html', 'timeline.html', 'audio-player.html'
  ];

  for (const filename of fixtures) {
    test(`${filename} renders with no console/page errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`/tests/fixtures/exports/${filename}`);
      await expect(page.locator('.block-headline')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('exported fixtures are keyboard-operable standalone', () => {
  test('accordion: Tab reaches a header and Enter/Space toggle it', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/accordion.html');
    const trigger = page.locator('.accordion-trigger').first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('flip cards: Enter and Space flip a card', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/flip-cards.html');
    const card = page.locator('.flip-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  test('tabs: arrow keys move focus and selection', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/tabs.html');
    const tabs = page.locator('.tab-btn');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('multiple choice: keyboard selection and submit produce feedback', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/multiple-choice.html');
    const options = page.locator('.quiz-option');
    await options.first().focus();
    await page.keyboard.press('Enter');
    const submit = page.locator('.quiz-submit-btn');
    await submit.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[id$="-quiz-feedback-box"]')).not.toBeEmpty();
  });

  test('hotspots: Enter opens a pin tooltip and Escape closes it', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/hotspots.html');
    const pin = page.locator('.hotspot-pin').first();
    await pin.focus();
    await page.keyboard.press('Enter');
    await expect(pin).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(pin).toHaveAttribute('aria-expanded', 'false');
  });

  test('timeline: Enter selects a step', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/timeline.html');
    const step = page.locator('.timeline-step').first();
    await step.focus();
    await page.keyboard.press('Enter');
    await expect(step).toHaveAttribute('aria-pressed', 'true');
  });

  test('audio player: Enter/Space toggle play state on the native play button', async ({ page }) => {
    await page.goto('/tests/fixtures/exports/audio-player.html');
    const playBtn = page.locator('.audio-play-btn');
    await playBtn.focus();
    await page.keyboard.press('Enter');
    await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
  });

  // Gallery and video aren't among the 7 committed fixtures (docs/RISE-COMPATIBILITY-MATRIX.md
  // deliberately keeps that set small and representative), so these two compile a one-off
  // export via the same fixture helper the completion tests use, instead of adding new
  // permanent fixture files.
  test('video player: Enter/Space toggle play state and arrow keys move the scrub bar', async ({ page }) => {
    await page.setContent(compileExportFixture('video-frame'));
    const playBtn = page.locator('.video-mini-play');
    await playBtn.focus();
    await page.keyboard.press('Enter');
    await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    const scrubBar = page.locator('.video-timeline-scrub');
    await scrubBar.focus();
    await page.keyboard.press('ArrowRight');
    await expect(scrubBar).toHaveAttribute('aria-valuenow', '5');
    await page.keyboard.press('Home');
    await expect(scrubBar).toHaveAttribute('aria-valuenow', '0');
  });

  test('image gallery: Enter opens the lightbox, arrow keys navigate, and Escape restores focus', async ({ page }) => {
    await page.setContent(compileExportFixture('image-gallery'));
    const cards = page.locator('.gallery-item-card');
    await cards.first().focus();
    await page.keyboard.press('Enter');
    const lightbox = page.locator('.lightbox-overlay');
    await expect(lightbox).toBeVisible();
    const caption = page.locator('.lightbox-caption');
    const firstCaption = await caption.textContent();
    await page.keyboard.press('ArrowRight');
    await expect(caption).not.toHaveText(firstCaption || '');
    await page.keyboard.press('ArrowLeft');
    await expect(caption).toHaveText(firstCaption || '');
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
    await expect(cards.first()).toBeFocused();
  });
});

test.describe('exported fixtures degrade gracefully when Google Fonts is blocked', () => {
  test('accordion: text remains visible via the sans-serif fallback when the font CDN is unreachable', async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    const errors = collectErrors(page);
    await page.goto('/tests/fixtures/exports/accordion.html');
    const headline = page.locator('.block-headline');
    await expect(headline).toBeVisible();
    await expect(headline).not.toHaveText('');
    const fontFamily = await headline.evaluate(element => getComputedStyle(element).fontFamily);
    expect(fontFamily.toLowerCase()).toContain('sans-serif');
    // The intentionally aborted font requests themselves surface as generic browser
    // resource-load console errors (not application errors) — only assert no *other*
    // console/page errors were produced while degrading.
    expect(errors.filter(message => !/font|failed to load resource/i.test(message))).toEqual([]);
  });
});
