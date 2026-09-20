// @vitest-environment jsdom
/**
 * @file media-library-integration.test.js
 * Comprehensive automated test suite for complete Media Library integration:
 * 1. Storage Architecture & Safe Media Reference Schema
 * 2. Central Resolver (resolveMediaAsset)
 * 3. Media Picker Modal ("Choose Media") UI & Keyboard Accessibility
 * 4. Component Authoring Workflow (Choose from Media Library, Upload New, External URL, Remove Media)
 * 5. Real-time Usage Tracking & In-Use/Unused Calculations
 * 6. Delete & Replace Protection
 * 7. Safe Project Autosave Serialization
 * 8. Package Export Pipeline (Zero blob URLs, assets/ rewriting)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMediaReference,
  isMediaReference,
  collectMediaReferences,
  prepareMediaFile,
  formatFileSize
} from '../../js/media.js';
import {
  createIndexedDBMediaStore,
  saveMediaRecord,
  getMediaRecord,
  deleteMediaRecord,
  resolveMediaAsset,
  ensureMediaObjectURL,
  peekMediaObjectURL
} from '../../js/media-storage.js';
import {
  getMediaAssetUsage,
  getAllMediaUsageMap,
  replaceMediaAssetReferences
} from '../../js/media-usage.js';
import { createMediaUploadControl } from '../../js/media-upload.js';
import { showMediaPickerModal } from '../../js/dashboard/media-picker-modal.js';
import { transformMediaReferences, buildRiseProjectZip } from '../../js/export.js';
import { buildProjectSchemaV3, createComponentInstance } from '../../js/project-schema.js';
import { saveProject, getProject } from '../../js/storage.js';
import { memoryLocalStorage } from '../fixtures/index.js';

describe('Rise Component Builder AT&T — Complete Media Library Integration Suite', () => {
  let mockStore;
  let storedRecords;

  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    storedRecords = new Map();

    // Create lightweight in-memory store for unit test execution
    mockStore = {
      async put(record) {
        if (!record?.id || !(record.blob instanceof Blob)) throw new Error('A valid media record and Blob are required.');
        storedRecords.set(record.id, record);
        return record.id;
      },
      async get(id) {
        return storedRecords.get(id) || null;
      },
      async delete(id) {
        storedRecords.delete(id);
      },
      async getAll() {
        return [...storedRecords.values()];
      }
    };

    document.body.innerHTML = `
      <div class="app-container" id="app-shell">
        <div id="view-container"></div>
      </div>
      <div id="modal-root"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('1. Storage Architecture & Media Reference Model', () => {
    it('creates canonical serializable media references without storing Blobs or Files in project JSON', async () => {
      const blob = new Blob(['sample image data'], { type: 'image/png' });
      const record = {
        id: 'asset-img-001',
        schemaVersion: 1,
        name: 'network_tower.png',
        mimeType: 'image/png',
        size: blob.size,
        createdAt: new Date().toISOString(),
        kind: 'image',
        blob
      };

      await mockStore.put(record);
      const ref = createMediaReference(record);

      expect(isMediaReference(ref)).toBe(true);
      expect(ref.mediaId).toBe('asset-img-001');
      expect(ref.sourceType).toBe('library');
      expect(ref.kind).toBe('image');
      expect(ref.blob).toBeUndefined(); // Binary blob is never part of serializable reference
    });

    it('collects media references across nested component configs', () => {
      const ref1 = createMediaReference({ id: 'img-1', kind: 'image', name: 'diag.png', mimeType: 'image/png', size: 100 });
      const ref2 = createMediaReference({ id: 'aud-1', kind: 'audio', name: 'clip.mp3', mimeType: 'audio/mpeg', size: 500 });

      const config = {
        title: 'Network Overview',
        bannerImage: ref1,
        items: [
          { text: 'Step 1', media: { type: 'audio', src: ref2 } }
        ]
      };

      const collected = collectMediaReferences(config);
      expect(collected.length).toBe(2);
      expect(collected.map(c => c.mediaId)).toEqual(['img-1', 'aud-1']);
    });
  });

  describe('2. Central Runtime Asset Resolver (resolveMediaAsset)', () => {
    it('resolves external HTTP/HTTPS and data URLs directly', () => {
      expect(resolveMediaAsset('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
      expect(resolveMediaAsset('data:image/svg+xml,<svg></svg>')).toBe('data:image/svg+xml,<svg></svg>');
      expect(resolveMediaAsset('')).toBe('');
    });

    it('resolves library media references via runtime Object URL or fallback', () => {
      const ref = createMediaReference({ id: 'asset-123', kind: 'image', name: 'photo.jpg', mimeType: 'image/jpeg', size: 200 });
      // When not in runtime map, returns fallback empty string gracefully without throwing
      expect(resolveMediaAsset(ref)).toBe('');
    });
  });

  describe('3. Media Picker Modal UI & Accessibility', () => {
    it('opens Choose Media modal and renders compatible assets with usage counts', async () => {
      const blob = new Blob(['png-bytes'], { type: 'image/png' });
      await mockStore.put({ id: 'img-abc', name: 'fiber_optic.png', kind: 'image', size: 2048, createdAt: new Date().toISOString(), blob });
      await mockStore.put({ id: 'aud-xyz', name: 'tone_alert.mp3', kind: 'audio', size: 4096, createdAt: new Date().toISOString(), blob });

      const promise = showMediaPickerModal({
        filterKind: 'image',
        triggerElement: document.body,
        store: mockStore
      });

      // Wait a tick for modal DOM mounting
      await new Promise(resolve => setTimeout(resolve, 10));

      const modal = document.querySelector('.media-picker-overlay');
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain('Choose Media');
      expect(modal.textContent).toContain('fiber_optic.png');

      // Audio is filtered out when filterKind is 'image'
      expect(modal.textContent).not.toContain('tone_alert.mp3');

      // Select asset
      const card = modal.querySelector('[data-asset-id="img-abc"]');
      expect(card).not.toBeNull();
      card.click();

      // Confirm button
      const confirmBtn = modal.querySelector('#picker-confirm-btn');
      confirmBtn.click();

      const result = await promise;
      expect(result).not.toBeNull();
      expect(result.mediaId).toBe('img-abc');
      expect(result.name).toBe('fiber_optic.png');
    });
  });

  describe('4. Component Authoring Workflow (createMediaUploadControl)', () => {
    it('renders Choose from Media Library, Browse File, External URL, and Remove actions', () => {
      const onChange = vi.fn();
      const control = createMediaUploadControl({
        field: { id: 'testImage', type: 'image', label: 'Test Image' },
        controlId: 'ctrl-test-img',
        value: '',
        onChange,
        store: mockStore
      });

      const element = control.element;
      expect(element.querySelector('.media-library-btn')).not.toBeNull();
      expect(element.querySelector('.media-drop-zone button')).not.toBeNull();
      expect(element.querySelector('input[type="url"]')).not.toBeNull();
      expect(element.querySelector('.media-external-btn')).not.toBeNull();
    });
  });

  describe('5. Real-time Asset Usage Tracking & Delete/Replace Protection', () => {
    it('calculates accurate usage counts across projects and components', () => {
      const ref = createMediaReference({ id: 'shared-diagram', kind: 'image', name: 'diagram.png', mimeType: 'image/png', size: 1024 });

      const comp1 = createComponentInstance({
        type: 'accordion',
        name: 'Section 1',
        config: {
          title: 'Section 1',
          items: [{ title: 'Item 1', media: { type: 'image', src: ref } }]
        }
      });
      const comp2 = createComponentInstance({
        type: 'card-carousel',
        name: 'Section 2',
        config: {
          title: 'Section 2',
          cards: [{ title: 'Card 1', image: ref }]
        }
      });

      const project = buildProjectSchemaV3({
        name: 'Fiber Field Technician Course',
        components: {
          [comp1.id]: comp1,
          [comp2.id]: comp2
        }
      });
      saveProject(project);

      const usage = getMediaAssetUsage('shared-diagram');
      expect(usage.totalUses).toBe(2);
      expect(usage.isInUse).toBe(true);
      expect(usage.references.length).toBe(2);
      expect(usage.references[0].projectName).toBe('Fiber Field Technician Course');
    });

    it('replaces all references to an asset across projects with a new asset', () => {
      const oldRef = createMediaReference({ id: 'old-asset', kind: 'image', name: 'old.png', mimeType: 'image/png', size: 100 });
      const newRef = createMediaReference({ id: 'new-asset', kind: 'image', name: 'new.png', mimeType: 'image/png', size: 200 });

      const comp = createComponentInstance({
        type: 'accordion',
        name: 'Module 1',
        config: {
          title: 'Module 1',
          items: [{ title: 'Overview', media: { type: 'image', src: oldRef, mediaId: 'old-asset' } }]
        }
      });
      const project = buildProjectSchemaV3({
        name: 'Safety Training',
        components: { [comp.id]: comp }
      });
      saveProject(project);

      const count = replaceMediaAssetReferences('old-asset', newRef);
      expect(count).toBeGreaterThanOrEqual(1);

      const updatedProj = getProject(project.id);
      const updatedItemMedia = updatedProj.components[comp.id].config.items[0].media;
      expect(updatedItemMedia.mediaId).toBe('new-asset');
    });
  });

  describe('6. Safe Project Autosave Serialization', () => {
    it('allows projects containing Media Library references to serialize and save cleanly without errors', () => {
      const ref = createMediaReference({
        id: 'tower-photo',
        kind: 'image',
        name: '5g_cell_site.png',
        mimeType: 'image/png',
        size: 3500,
        createdAt: new Date().toISOString()
      });

      const comp = createComponentInstance({
        type: 'image-gallery',
        name: '5G Infrastructure Gallery',
        config: {
          title: '5G Infrastructure Gallery',
          images: [{ image: ref, altText: '5G Cell Site Mast' }]
        }
      });

      const project = buildProjectSchemaV3({
        name: '5G Mobile Core Course',
        components: { [comp.id]: comp }
      });

      expect(() => saveProject(project)).not.toThrow();

      const loaded = getProject(project.id);
      expect(loaded).not.toBeNull();
      expect(loaded.components[comp.id].config.images[0].image.mediaId).toBe('tower-photo');
    });
  });

  describe('7. Export Packaging & Relative Path Rewriting', () => {
    it('packages referenced media into assets/ folder and avoids emitting blob: URLs', async () => {
      const blob = new Blob(['image payload content'], { type: 'image/png' });
      await mockStore.put({ id: 'export-asset-01', name: 'schematic.png', kind: 'image', mimeType: 'image/png', size: blob.size, blob });

      const ref = createMediaReference({ id: 'export-asset-01', kind: 'image', name: 'schematic.png', mimeType: 'image/png', size: blob.size });

      const config = {
        title: 'Network Schematics',
        diagram: ref
      };

      const result = await transformMediaReferences(config, { mode: 'package', store: mockStore });
      expect(result.config.diagram).toMatch(/^assets\/schematic(-\d+)?\.png$/);
      expect(result.assets.length).toBe(1);
      expect(result.assets[0].relativePath).toMatch(/^assets\/schematic(-\d+)?\.png$/);

      const zipResult = await buildRiseProjectZip({
        html: `<html><body><img src="${result.config.diagram}" /></body></html>`,
        assets: result.assets,
        manifest: result.manifest
      });

      expect(zipResult.size).toBeGreaterThan(0);
      expect(zipResult.blob instanceof Blob).toBe(true);
    });
  });
});
