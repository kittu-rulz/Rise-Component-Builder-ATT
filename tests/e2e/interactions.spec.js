import { expect, test } from '@playwright/test';

async function openComponent(page, name, category = 'Interactive') {
  await page.goto('/');
  if (category !== 'Interactive') await page.getByText(category, { exact: true }).click();
  await page.locator('.component-select-card').filter({ hasText: name }).click();
  await expect(page.locator('#live-preview-iframe')).toBeVisible();
  return page.frameLocator('#live-preview-iframe');
}

test('accordion supports click, Enter, Space, ARIA state, and multi-open mode', async ({ page }) => {
  const frame = await openComponent(page, 'Responsive Accordion');
  const triggers = frame.locator('.accordion-trigger');
  await triggers.nth(0).click();
  await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await triggers.nth(1).focus();
  await triggers.nth(1).press('Enter');
  await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await triggers.nth(2).focus();
  await triggers.nth(2).press('Space');
  await expect(triggers.nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'true');
});

test('tabs support click, arrow keys, Home, End, selection, and focus movement', async ({ page }) => {
  const frame = await openComponent(page, 'Horizontal Tabs');
  const tabs = frame.locator('.tab-btn');
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await tabs.nth(1).press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await tabs.nth(2).press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await tabs.nth(0).press('End');
  await expect(tabs.nth(2)).toBeFocused();
});

test('flip cards support click, Enter, Space, announcements, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await openComponent(page, '3D Flip Cards');
  const cards = frame.locator('.flip-card');
  await cards.nth(0).click();
  await expect(cards.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await expect(frame.locator('[id$="-interaction-status"]')).not.toBeEmpty();
  await cards.nth(0).press('Enter');
  await expect(cards.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await cards.nth(1).press('Space');
  await expect(cards.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => cards.nth(0).locator('.flip-card-inner').evaluate(element => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
});

test('multiple choice validates missing selection and announces correct and incorrect feedback', async ({ page }) => {
  const frame = await openComponent(page, 'Multiple Choice Check', 'Knowledge Checks');
  const submit = frame.locator('.quiz-submit-btn');
  const feedback = frame.locator('[id$="-quiz-feedback-box"]');
  await submit.click();
  await expect(feedback).toContainText(/select|answer/i);
  await frame.locator('.quiz-option').nth(1).click();
  await submit.click();
  await expect(feedback).toContainText(/incorrect|try/i);
  await frame.locator('.quiz-option').nth(0).click();
  await submit.click();
  await expect(feedback).toContainText(/correct/i);
  await expect(feedback).toHaveAttribute('aria-live', 'polite');
});

test('multiple select toggles independent options and requires all correct answers to pass', async ({ page }) => {
  const frame = await openComponent(page, 'Multiple Select Check', 'Knowledge Checks');
  const options = frame.locator('.quiz-option');
  const submit = frame.locator('.quiz-submit-btn');
  const feedback = frame.locator('[id$="-quiz-feedback-box"]');

  await submit.click();
  await expect(feedback).toContainText(/select/i);

  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('aria-checked', 'true');
  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('aria-checked', 'false');

  await options.nth(0).click();
  await options.nth(2).click();
  await submit.click();
  await expect(feedback).toContainText(/incorrect|review/i);

  await options.nth(2).click();
  await options.nth(1).click();
  await submit.click();
  await expect(feedback).toContainText(/correct/i);
  await expect(feedback).toHaveAttribute('aria-live', 'polite');
});

test('timeline supports click, keyboard selection, and completion updates', async ({ page }) => {
  const frame = await openComponent(page, 'Vertical Step Timeline', 'Timelines');
  await page.getByRole('button', { name: 'Behavior' }).click();
  await page.locator('#input-track-completion').check();
  const steps = frame.locator('.timeline-step');
  await steps.nth(0).click();
  await expect(steps.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await steps.nth(1).focus();
  await steps.nth(1).press('Enter');
  await expect(steps.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(frame.locator('.progress-bar-container')).toHaveAttribute('aria-valuenow', /[1-9]\d*/);
});
