import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

// Real timeupdate/seeked crossing-detection, actual video pause/resume, and focus
// movement need a genuine <video> element and real playback timing that jsdom cannot
// provide (docs/ARCHITECTURE.md's testing strategy: "jsdom is used only where DOM parsing
// is required") — see tests/unit/interactive-video.test.js for the structural/generator
// coverage this file doesn't duplicate.
//
// The video itself is a tiny (~5KB, 4s, no audio) synthetic test pattern generated with
// ffmpeg (tests/fixtures/media/tiny-test-video.mp4) — not a real recording, so there is
// nothing to license or attribute. It's served by tests/e2e/server.mjs at a fixed,
// same-origin URL (see TEST_VIDEO_URL) rather than embedded as a data: URL, matching a
// real constraint this application's own sanitizeURL() enforces: video is never permitted
// as a data: URL (only certain data:image/* MIME types are), so a data: URL test wouldn't
// even reflect how the real compiled output can look.

const TEST_VIDEO_URL = 'http://127.0.0.1:4173/tests/fixtures/media/tiny-test-video.mp4';

// The Playwright-bundled WebKit engine's own native <video controls> shadow-DOM internals
// intermittently throw this during rapid programmatic play/pause/seek, reproduced even with
// a bare <video controls> element and zero component code involved. It's a pre-existing
// engine quirk, not something interactive-video.js can cause or fix, so it's filtered here
// rather than masked by leaving the assertion out — any other page error still fails the test.
const KNOWN_BENIGN_WEBKIT_ERRORS = ['Temporal.Duration properties must be finite and of consistent sign'];

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => {
    if (KNOWN_BENIGN_WEBKIT_ERRORS.includes(error.message)) return;
    errors.push(error.message);
  });
  return errors;
}

function compileIv(overrides = {}) {
  return compileExportFixture('interactive-video', {
    configOverrides: {
      videoSourceType: 'url',
      videoUrl: TEST_VIDEO_URL,
      trackCompletion: true,
      ...overrides
    }
  });
}

async function seekTo(page, seconds) {
  // Per the HTML spec, setting currentTime while readyState is HAVE_NOTHING sets the
  // element's *default playback start position* instead of performing a real seek — no
  // 'seeking'/'seeked' event fires at all in that case, which is exactly what the
  // component's crossing-detection listens for. Metadata must be loaded first.
  await page.waitForFunction(() => document.querySelector('video').readyState >= 1);
  await page.evaluate(t => {
    const video = document.querySelector('video');
    video.currentTime = t;
  }, seconds);
  // A real seek fires 'seeking' then 'seeked' asynchronously; give the browser a tick to
  // actually settle before asserting on the result.
  await page.waitForTimeout(150);
}

test.describe('Interactive Video: marker triggers on crossing during normal playback', () => {
  test('play() from 0 pauses at the first required Information marker and shows its panel', async ({ page }) => {
    const errors = collectErrors(page);
    const html = compileIv({
      items: [
        { type: 'information', timestamp: 1, title: 'First Stop', required: true, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body text one.' },
        { type: 'information', timestamp: 3, title: 'Second Stop', required: false, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body text two.' }
      ]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toHaveText('First Stop');
    const paused = await page.evaluate(() => document.querySelector('video').paused);
    expect(paused).toBe(true);
    expect(errors).toEqual([]);
  });

  test('focus moves to the interaction panel when a marker triggers (controlled focus management)', async ({ page }) => {
    const html = compileIv({ items: [{ type: 'information', timestamp: 1, title: 'Focus Check', required: true, pauseVideo: true, body: 'Body.' }] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    const panelIsFocused = await page.evaluate(() => document.activeElement === document.querySelector('.iv-interaction-panel'));
    expect(panelIsFocused).toBe(true);
  });

  test('clicking Continue closes the panel, marks the marker visited, and does not immediately reopen it', async ({ page }) => {
    const html = compileIv({ items: [{ type: 'information', timestamp: 1, title: 'Once Only', required: true, pauseVideo: true, continueButtonLabel: 'Got it', body: 'Body.' }] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
    // Resume manually (default resumeBehaviour) and let it run past the same timestamp
    // again — the same-marker-reopening-in-a-loop failure mode this guards against.
    await page.evaluate(() => document.querySelector('video').play());
    await page.waitForTimeout(400);
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
  });

  test('resumeBehaviour "automaticAfterInformation" resumes playback on its own after Continue', async ({ page }) => {
    const html = compileIv({
      resumeBehaviour: 'automaticAfterInformation',
      items: [{ type: 'information', timestamp: 1, title: 'Auto Resume', required: true, pauseVideo: true, body: 'Body.' }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect.poll(() => page.evaluate(() => document.querySelector('video').paused)).toBe(false);
  });

  test('resumeBehaviour "manual" (default) leaves the video paused after Continue', async ({ page }) => {
    const html = compileIv({ items: [{ type: 'information', timestamp: 1, title: 'Manual Resume', required: true, pauseVideo: true, body: 'Body.' }] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await page.waitForTimeout(300);
    const paused = await page.evaluate(() => document.querySelector('video').paused);
    expect(paused).toBe(true);
  });
});

test.describe('Interactive Video: seeking', () => {
  test('seeking forward past two incomplete required markers triggers only the earliest one crossed', async ({ page }) => {
    const html = compileIv({
      items: [
        { type: 'information', timestamp: 1, title: 'Earlier Required', required: true, pauseVideo: true, body: 'Body.' },
        { type: 'information', timestamp: 2, title: 'Later Required', required: true, pauseVideo: true, body: 'Body.' }
      ]
    });
    await page.setContent(html);
    await seekTo(page, 3.5);
    await expect(page.locator('.iv-panel-title')).toHaveText('Earlier Required');
    // The video should have been pulled back to the earlier marker's own timestamp, not
    // left sitting at the seek target.
    const currentTime = await page.evaluate(() => document.querySelector('video').currentTime);
    expect(currentTime).toBeLessThan(1.5);
  });

  test('seeking backward before a marker does not trigger it, and does not error', async ({ page }) => {
    const errors = collectErrors(page);
    const html = compileIv({ items: [{ type: 'information', timestamp: 3, title: 'Later Marker', required: true, pauseVideo: true, body: 'Body.' }] });
    await page.setContent(html);
    await seekTo(page, 3.5); // cross it once
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await seekTo(page, 0.5); // seek back before it
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('an optional marker crossed by seeking does not force a pause', async ({ page }) => {
    const html = compileIv({ items: [{ type: 'information', timestamp: 1, title: 'Optional', required: false, pauseVideo: false, body: 'Body.' }] });
    await page.setContent(html);
    await seekTo(page, 2);
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
  });
});

test.describe('Interactive Video: completion', () => {
  test('completionRule "videoEnded" fires the shared completion message once the video ends', async ({ page }) => {
    const html = compileIv({ completionRule: 'videoEnded', completionMsg: 'All done!', items: [] });
    await page.setContent(html);
    await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 3.9; v.play(); });
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[id$="-completion-message"]')).toHaveText('All done!');
  });

  test('completionRule "allRequiredInteractionsCompleted" does not fire until the required marker is completed, then does', async ({ page }) => {
    const html = compileIv({
      completionRule: 'allRequiredInteractionsCompleted',
      completionMsg: 'Required work done!',
      items: [{ type: 'information', timestamp: 1, title: 'Required Stop', required: true, pauseVideo: true, body: 'Body.' }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
    await page.click('.iv-continue-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible();
  });

  // Real bug, reported from production use: the shared, generic progress mechanism every
  // simple component relies on (js/export-shell.js#updateProgress) auto-fires completion
  // whenever viewedItems.size reaches totalItems (here, the marker count) — completely
  // unaware of Interactive Video's own configurable completionRule. Completing every
  // authored marker was satisfying that shared, rule-blind 100% check even when
  // completionRule was 'videoEnded' and the video hadn't actually ended yet.
  test('completionRule "videoEnded" does NOT fire just because every marker has been completed — only once the video actually ends', async ({ page }) => {
    const html = compileIv({
      completionRule: 'videoEnded',
      completionMsg: 'All done!',
      items: [
        { type: 'information', timestamp: 1, title: 'Stop One', required: false, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body one.' },
        { type: 'information', timestamp: 2, title: 'Stop Two', required: false, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body two.' }
      ]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toHaveText('Stop One');
    await page.click('.iv-continue-btn');
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toHaveText('Stop Two');
    await page.click('.iv-continue-btn');
    // Both (of the only two) markers are now completed — the shared viewedItems/totalItems
    // ratio just hit 100%. Completion must still NOT have fired, since the video is nowhere
    // near its end.
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
    // Now let the video actually reach its end — completion should fire only now.
    await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 3.9; v.play(); });
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('completionRule "videoEndedAndRequiredInteractionsCompleted" does not fire from completed markers alone, nor from the video ending alone', async ({ page }) => {
    const html = compileIv({
      completionRule: 'videoEndedAndRequiredInteractionsCompleted',
      completionMsg: 'Both done!',
      items: [{ type: 'information', timestamp: 1, title: 'Required Stop', required: true, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body.' }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    // The one and only marker is completed (viewedItems/totalItems is already 100%), but
    // the video hasn't ended — must still not fire.
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
    await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 3.9; v.play(); });
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Interactive Video: multiple-choice markers pause safely', () => {
  test('a multiple-choice marker pauses on crossing', async ({ page }) => {
    const errors = collectErrors(page);
    const html = compileIv({
      items: [{
        type: 'multipleChoice', timestamp: 1, title: 'MC Marker', required: false, pauseVideo: true,
        question: '2+2?', answer1Label: '4', answer2Label: '5', correctAnswerIndex: '1'
      }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    // Real 1x playback needs ~1 real second to reach the timestamp-1 marker; poll instead
    // of a fixed wait (matching how the passing information-marker test above uses an
    // auto-retrying assertion rather than a fixed timeout).
    await expect.poll(() => page.evaluate(() => document.querySelector('video').paused)).toBe(true);
    expect(errors).toEqual([]);
  });
});

test.describe('Interactive Video: multiple-choice answering (Phase 4)', () => {
  function mcMarker(overrides = {}) {
    return {
      type: 'multipleChoice', timestamp: 1, title: 'Quick Check', required: true, pauseVideo: true,
      continueButtonLabel: 'Continue', question: 'What is 2+2?',
      answer1Label: '3', answer2Label: '4', answer3Label: '5', answer4Label: '',
      correctAnswerIndex: '2', maxAttempts: 1, showCorrectAfterFinal: false,
      generalCorrectFeedback: '', generalIncorrectFeedback: '', hint: '', ...overrides
    };
  }

  test('selecting the correct answer and submitting shows correct feedback and a Continue button', async ({ page }) => {
    const errors = collectErrors(page);
    const html = compileIv({ items: [mcMarker()] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-mc-option').nth(1)).toBeVisible();
    await page.locator('.iv-mc-option').nth(1).click(); // "4", the correct answer
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-correct/);
    await expect(page.locator('.iv-mc-feedback')).toBeVisible();
    await expect(page.locator('.iv-continue-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('clicking Continue after a correct answer marks the marker completed and satisfies allRequiredInteractionsCompleted', async ({ page }) => {
    const html = compileIv({
      completionRule: 'allRequiredInteractionsCompleted',
      completionMsg: 'All required done!',
      items: [mcMarker()]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(1).click();
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
    await page.click('.iv-continue-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible();
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
  });

  test('an incorrect answer with attempts remaining shows retry feedback, a hint, and keeps the panel open for another attempt', async ({ page }) => {
    const html = compileIv({ items: [mcMarker({ maxAttempts: 2, hint: 'Think about doubling 2.' })] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(0).click(); // "3", incorrect
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-incorrect/);
    await expect(page.locator('.iv-mc-feedback')).toContainText('1 attempt remaining');
    await expect(page.locator('.iv-mc-hint')).toBeVisible();
    await expect(page.locator('.iv-mc-hint')).toContainText('Think about doubling 2.');
    // Panel stays open, no premature Continue button, and the option is selectable again.
    await expect(page.locator('.iv-continue-btn')).toHaveCount(0);
    await expect(page.locator('.iv-mc-option').nth(1)).not.toHaveAttribute('aria-disabled', 'true');
    // Second, correct attempt now concludes it.
    await page.locator('.iv-mc-option').nth(1).click();
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-correct/);
    await expect(page.locator('.iv-continue-btn')).toBeVisible();
  });

  test('exhausting maxAttempts on an incorrect answer concludes the question and, with showCorrectAfterFinal, reveals the correct option', async ({ page }) => {
    const html = compileIv({ items: [mcMarker({ maxAttempts: 1, showCorrectAfterFinal: true })] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(0).click(); // "3", incorrect, only attempt
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-incorrect/);
    await expect(page.locator('.iv-continue-btn')).toBeVisible();
    await expect(page.locator('.iv-mc-option').nth(0)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.iv-mc-option').nth(1).locator('.iv-mc-correct-flag')).toBeVisible();
  });

  test('per-answer feedback overrides general feedback when both are authored', async ({ page }) => {
    const html = compileIv({
      items: [mcMarker({
        answer1Feedback: 'Close, but 3 is one less than the answer.',
        generalIncorrectFeedback: 'This general message should not appear.'
      })]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(0).click();
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toContainText('Close, but 3 is one less than the answer.');
    await expect(page.locator('.iv-mc-feedback')).not.toContainText('This general message should not appear.');
  });

  test('resumeBehaviour "automaticAfterCorrectAnswer" resumes playback after a correct answer\'s Continue, but manual stays paused after an incorrect-exhausted conclusion', async ({ page }) => {
    const html = compileIv({
      resumeBehaviour: 'automaticAfterCorrectAnswer',
      items: [mcMarker()]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(1).click(); // correct
    await page.click('.iv-mc-submit-btn');
    await page.click('.iv-continue-btn');
    await expect.poll(() => page.evaluate(() => document.querySelector('video').paused)).toBe(false);
  });

  test('submitting without selecting an answer shows a prompt instead of silently failing', async ({ page }) => {
    const html = compileIv({ items: [mcMarker()] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-mc-submit-btn')).toBeVisible();
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toContainText('Select an answer first.');
    await expect(page.locator('.iv-continue-btn')).toHaveCount(0);
  });

  test('arrow keys move selection between answer options (roving tabindex, keyboard-operable)', async ({ page }) => {
    const html = compileIv({ items: [mcMarker()] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-mc-option').first()).toBeVisible();
    await page.locator('.iv-mc-option').first().focus();
    await page.keyboard.press('ArrowDown');
    const secondSelected = await page.locator('.iv-mc-option').nth(1).getAttribute('aria-checked');
    expect(secondSelected).toBe('true');
    await page.keyboard.press('Enter');
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-correct/);
  });
});

test.describe('Interactive Video: marker list, progress summary, and restart (Phase 5)', () => {
  function twoMarkers() {
    return [
      { type: 'information', timestamp: 1, title: 'First Stop', required: true, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Body one.' },
      {
        type: 'multipleChoice', timestamp: 2, title: 'Quick Check', required: false, pauseVideo: true,
        continueButtonLabel: 'Continue', question: 'What is 2+2?', answer1Label: '3', answer2Label: '4',
        correctAnswerIndex: '2', maxAttempts: 1
      }
    ];
  }

  test('clicking a marker in the nav list jumps the video there and opens its panel, even though pauseVideo would not normally trigger it yet', async ({ page }) => {
    const html = compileIv({ items: twoMarkers() });
    await page.setContent(html);
    await page.waitForFunction(() => document.querySelector('video').readyState >= 1);
    await page.locator('.iv-marker-item-btn').nth(1).click(); // "Quick Check" at t=2, without ever playing/seeking there first
    await expect(page.locator('.iv-panel-title')).toHaveText('Quick Check');
    const currentTime = await page.evaluate(() => document.querySelector('video').currentTime);
    expect(currentTime).toBeCloseTo(2, 0);
  });

  test('the marker list reflects visited then completed state, and the progress summary updates', async ({ page }) => {
    const html = compileIv({ items: [twoMarkers()[0]] });
    await page.setContent(html);
    await expect(page.locator('.iv-progress-summary')).toHaveText('0 of 1 completed');
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await expect(page.locator('.iv-marker-item').first().locator('.iv-marker-state-badge')).toHaveText('Visited');
    await page.click('.iv-continue-btn');
    await expect(page.locator('.iv-marker-item').first().locator('.iv-marker-state-badge')).toHaveText('Completed');
    await expect(page.locator('.iv-progress-summary')).toHaveText('1 of 1 completed');
  });

  test('a completed multiple-choice marker shows a Correct/Incorrect state badge, not just Completed', async ({ page }) => {
    const html = compileIv({
      items: [{
        type: 'multipleChoice', timestamp: 1, title: 'Check', required: false, pauseVideo: true,
        question: 'What is 2+2?', answer1Label: '3', answer2Label: '4', correctAnswerIndex: '2', maxAttempts: 1
      }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').nth(1).click(); // correct
    await page.click('.iv-mc-submit-btn');
    await page.click('.iv-continue-btn');
    await expect(page.locator('.iv-marker-item').first().locator('.iv-marker-state-badge')).toHaveText('Correct');
  });

  test('clicking an already-completed marker in the list seeks there without reopening its panel', async ({ page }) => {
    const html = compileIv({ items: [twoMarkers()[0]] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
    await page.locator('.iv-marker-item-btn').first().click();
    await expect(page.locator('.iv-interaction-panel')).toBeHidden();
    const currentTime = await page.evaluate(() => document.querySelector('video').currentTime);
    expect(currentTime).toBeCloseTo(1, 0);
  });

  test('Restart clears marker state, resets the video to 0:00, and hides the completion message', async ({ page }) => {
    const errors = collectErrors(page);
    const html = compileIv({
      allowRestart: true,
      completionRule: 'allRequiredInteractionsCompleted',
      completionMsg: 'All done!',
      items: [{ ...twoMarkers()[0], required: true }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible();
    await expect(page.locator('.iv-progress-summary')).toHaveText('1 of 1 completed');

    await page.click('.iv-restart-btn');

    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
    await expect(page.locator('.iv-progress-summary')).toHaveText('0 of 1 completed');
    await expect(page.locator('.iv-marker-item').first().locator('.iv-marker-state-badge')).toBeHidden();
    // WebKit in particular can settle a currentTime = 0 assignment a fraction of a second
    // off exact zero (observed ~0.0013s) rather than bit-exact 0 — a real currentTime
    // consideration for tests, not a defect in ivRestart() itself.
    const currentTime = await page.evaluate(() => document.querySelector('video').currentTime);
    expect(currentTime).toBeLessThan(0.1);
    const paused = await page.evaluate(() => document.querySelector('video').paused);
    expect(paused).toBe(true);
    expect(errors).toEqual([]);
  });

  test('restarting then re-completing the same required marker updates progress again (no stale-state lockout), though the completion message itself stays a one-way signal', async ({ page }) => {
    // js/export-shell.js#evaluateComponentCompletion gates the completion *message* on
    // RiseComponentCompletion.hasCompleted(), which never resets — a host already told
    // "complete" should never be told otherwise, matching multiple-choice.js's own
    // resetQuiz()-then-retry precedent (its post-reset correct answer re-calls
    // updateTrackerComplete() too, and the message doesn't reappear there either). Restart
    // resets the *local* marker/progress state, not that durable one-way signal.
    const html = compileIv({
      allowRestart: true,
      completionRule: 'allRequiredInteractionsCompleted',
      completionMsg: 'All done!',
      items: [{ ...twoMarkers()[0], required: true }]
    });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeVisible();

    await page.click('.iv-restart-btn');
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();

    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    await page.click('.iv-continue-btn');
    await expect(page.locator('.iv-progress-summary')).toHaveText('1 of 1 completed');
    await expect(page.locator('[id$="-completion-text"]')).toHaveText('100%');
    await expect(page.locator('[id$="-completion-message"]')).toBeHidden();
  });

  test('showMarkerNavigation false hides the marker list; showVideoProgress false hides the progress summary; both independently controllable', async ({ page }) => {
    const html = compileIv({ showMarkerNavigation: false, showVideoProgress: true, items: [twoMarkers()[0]] });
    await page.setContent(html);
    await expect(page.locator('.iv-marker-list')).toHaveCount(0);
    await expect(page.locator('.iv-progress-summary')).toBeVisible();
  });

  test('allowRestart false renders no Restart button', async ({ page }) => {
    const html = compileIv({ allowRestart: false, items: [twoMarkers()[0]] });
    await page.setContent(html);
    await expect(page.locator('.iv-restart-btn')).toHaveCount(0);
  });
});

test.describe('Interactive Video: accessibility (Phase 6)', () => {
  // Scoped to the rule sets this app's own tests/e2e/accessibility.spec.js already
  // establishes as the meaningful, actionable set for this codebase (button-name,
  // label, aria-valid-attr[-value], color-contrast, target-size) plus two rules specific
  // to this component's new custom widgets: aria-required-children/aria-allowed-role,
  // since ivShowMultipleChoicePanel hand-builds a role="radiogroup"/role="radio" pattern
  // rather than using native <fieldset>/<input type="radio">. A full, unscoped axe.analyze()
  // would also flag document-level concerns (e.g. landmark structure) that are the export
  // shell's responsibility, not this component's, and are out of Phase 6's actual scope.
  const A11Y_RULES = [
    'button-name', 'label', 'aria-valid-attr', 'aria-valid-attr-value',
    'color-contrast', 'target-size', 'aria-required-children', 'aria-allowed-role'
  ];

  // .block-label ("SAMPLE EXPORT") is js/export-shell.js's shared block-chrome CSS, used
  // by every component, not something interactive-video.js owns or can fix from here — it
  // has the same real color-contrast issue (--accent at small/bold size) this scan caught
  // in .iv-panel-type-label, but fixing it is a cross-component design-system decision
  // (docs/COMPONENT-SCHEMA.md's own change-scope rules), out of this component-level audit.
  function scan(page) {
    return new AxeBuilder({ page }).exclude('.block-label').withRules(A11Y_RULES).analyze();
  }

  function richMarkerSet() {
    return [
      { type: 'information', timestamp: 1, title: 'Setup', required: true, pauseVideo: true, continueButtonLabel: 'Continue', body: 'Some information body text.' },
      {
        type: 'multipleChoice', timestamp: 2, title: 'Check', required: false, pauseVideo: true,
        continueButtonLabel: 'Continue', question: 'What is 2+2?', answer1Label: '3', answer2Label: '4',
        answer3Label: '5', correctAnswerIndex: '2', maxAttempts: 2, hint: 'Think about doubling 2.', showCorrectAfterFinal: true
      }
    ];
  }

  test('default render (marker list, progress summary, restart button, transcript) has no axe violations', async ({ page }) => {
    const html = compileIv({ allowRestart: true, transcript: 'A transcript of the video content.', items: richMarkerSet() });
    await page.setContent(html);
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test('an open Information panel has no axe violations', async ({ page }) => {
    const html = compileIv({ items: richMarkerSet() });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await expect(page.locator('.iv-panel-title')).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test('an open Multiple Choice panel, including mid-retry feedback and hint, has no axe violations', async ({ page }) => {
    const html = compileIv({ items: [richMarkerSet()[1]] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').first().click(); // "3", incorrect, one retry available
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-hint')).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test('a concluded Multiple Choice panel with the correct-answer flag revealed has no axe violations', async ({ page }) => {
    const html = compileIv({ items: [richMarkerSet()[1]] });
    await page.setContent(html);
    await page.evaluate(() => document.querySelector('video').play());
    await page.locator('.iv-mc-option').first().click(); // "3", incorrect, attempt 1 of 2
    await page.click('.iv-mc-submit-btn');
    await expect(page.locator('.iv-mc-feedback')).toHaveClass(/iv-incorrect/);
    await expect(page.locator('.iv-mc-option').first()).not.toHaveAttribute('aria-disabled', 'true');
    await page.locator('.iv-mc-option').first().click(); // "3" again, incorrect, attempt 2 of 2 — exhausts
    await page.click('.iv-mc-submit-btn');
    // Each option has its own .iv-mc-correct-flag span; .first() in DOM order is "3"'s own
    // (always-hidden, since it's the wrong answer) — the correct answer ("4") is index 1.
    await expect(page.locator('.iv-mc-option').nth(1).locator('.iv-mc-correct-flag')).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test('Tab traversal reaches both marker-nav buttons and the restart button without getting trapped', async ({ page }) => {
    // A native <video controls> element has several of its own internal (shadow-DOM)
    // focus stops — play, scrubber, volume, fullscreen — each consuming one Tab press
    // while document.activeElement, observed from the light DOM, keeps reporting the host
    // <video> element throughout (confirmed by direct observation: 5 consecutive Tab
    // presses all reported the <video> before advancing). That's how native controls work,
    // not a defect, and this component deliberately never replaces them (see "Accessibility"
    // above) — so counting distinct document.activeElement values isn't a reliable way to
    // verify "not trapped" here. Checking that every *light-DOM* control is eventually
    // reachable is the meaningful, version-independent signal instead.
    const html = compileIv({ allowRestart: true, items: richMarkerSet() });
    await page.setContent(html);
    const reached = new Set();
    for (let index = 0; index < 20 && !(reached.has('marker:0') && reached.has('marker:1') && reached.has('restart')); index += 1) {
      await page.keyboard.press('Tab');
      const key = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        if (el.id?.endsWith('-restart-btn')) return 'restart';
        if (el.classList?.contains('iv-marker-item-btn')) return 'marker:' + el.getAttribute('data-idx');
        return null;
      });
      if (key) reached.add(key);
    }
    expect(reached.has('marker:0')).toBe(true);
    expect(reached.has('marker:1')).toBe(true);
    expect(reached.has('restart')).toBe(true);
  });

  test('a marker-nav button has a visible focus indicator and honors reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const html = compileIv({ items: [richMarkerSet()[0]] });
    await page.setContent(html);
    const markerBtn = page.locator('.iv-marker-item-btn').first();
    await markerBtn.focus();
    const focusStyle = await markerBtn.evaluate(element => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => markerBtn.evaluate(element => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
  });
});
