// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { blobToDataURL } from '../../js/media.js';

test('blobToDataURL uses the browser FileReader path when FileReader is available', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
  const dataUrl = await blobToDataURL(blob);
  expect(dataUrl).toMatch(/^data:image\/png;base64,/);
});
