// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { downloadProjectPackage } from '../../js/project-package.js';

afterEach(() => {
  delete globalThis.URL.createObjectURL;
  delete globalThis.URL.revokeObjectURL;
});

test('downloadProjectPackage names the file after the slugified project name and cleans up its object URL', () => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:local-package');
  globalThis.URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture() {
    expect(this.download).toBe('my-cool-project.rise-project.zip');
  });

  downloadProjectPackage('My Cool Project!', new Blob(['zip-bytes']));

  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-package');
  clickSpy.mockRestore();
});
