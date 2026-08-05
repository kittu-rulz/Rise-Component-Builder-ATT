import { collectMediaReferences, createMediaReference, isMediaReference } from './media.js';
import { registerLocalBlobURL, revokeLocalBlobURL } from './utilities.js';

export const MEDIA_DB_NAME = 'rise-component-builder-media';
export const MEDIA_DB_VERSION = 1;
export const MEDIA_STORE_NAME = 'media';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

export function createIndexedDBMediaStore(indexedDBFactory = globalThis.indexedDB) {
  let databasePromise;

  function open() {
    if (!indexedDBFactory) return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDBFactory.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          const store = database.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error('Could not open the local media database.'));
      };
      request.onblocked = () => reject(new Error('The local media database is blocked by another tab.'));
    });
    return databasePromise;
  }

  async function transact(mode, operation) {
    const database = await open();
    const transaction = database.transaction(MEDIA_STORE_NAME, mode);
    const store = transaction.objectStore(MEDIA_STORE_NAME);
    return operation(store, transaction);
  }

  return {
    open,
    async put(record) {
      if (!record?.id || !(record.blob instanceof Blob)) throw new Error('A valid media record and Blob are required.');
      return transact('readwrite', store => requestResult(store.put(record)));
    },
    async get(id) {
      return transact('readonly', store => requestResult(store.get(id)));
    },
    async delete(id) {
      return transact('readwrite', store => requestResult(store.delete(id)));
    },
    async getAll() {
      return transact('readonly', store => requestResult(store.getAll()));
    }
  };
}

const defaultStore = createIndexedDBMediaStore();
const runtimeObjectURLs = new Map();

export async function saveMediaRecord(record, store = defaultStore) {
  try {
    await store.put(record);
  } catch (error) {
    // Same friendly-rewrite policy as js/storage.js's localStorage quota handling —
    // IndexedDB throws a QuotaExceededError under the same DOMException name.
    throw new Error(error?.name === 'QuotaExceededError'
      ? 'This browser’s local media storage is full. Delete unused projects/media or free up disk space, then try again.'
      : 'This browser could not store the uploaded file locally.');
  }
  return createMediaReference(record);
}

export async function getMediaRecord(id, store = defaultStore) {
  return store.get(id);
}

// Finds an already-stored record with the same content hash and kind, so an author
// re-uploading the same picture (even under a different filename) can reuse the
// existing asset instead of the app silently storing a second copy. Never blocks an
// upload — a `null` contentHash (digest unavailable, see js/media.js#computeFileHash)
// simply means no duplicate can be found, not that anything is wrong with the file.
export async function findDuplicateByHash(contentHash, kind, store = defaultStore) {
  if (!contentHash) return null;
  const all = await store.getAll();
  return all.find(record => record.contentHash === contentHash && record.kind === kind) || null;
}

export function peekMediaObjectURL(id) {
  return runtimeObjectURLs.get(id) || '';
}

export async function ensureMediaObjectURL(id, store = defaultStore) {
  if (runtimeObjectURLs.has(id)) return runtimeObjectURLs.get(id);
  const record = await store.get(id);
  if (!record?.blob) return '';
  const url = registerLocalBlobURL(URL.createObjectURL(record.blob));
  runtimeObjectURLs.set(id, url);
  return url;
}

export function releaseMediaObjectURL(id) {
  const url = runtimeObjectURLs.get(id);
  if (!url) return false;
  runtimeObjectURLs.delete(id);
  revokeLocalBlobURL(url);
  return true;
}

export function releaseAllMediaObjectURLs() {
  [...runtimeObjectURLs.keys()].forEach(releaseMediaObjectURL);
}

export function pruneMediaObjectURLs(config) {
  const active = new Set(collectMediaReferences(config).map(reference => reference.mediaId));
  [...runtimeObjectURLs.keys()].forEach(id => { if (!active.has(id)) releaseMediaObjectURL(id); });
}

export async function deleteMediaRecord(id, store = defaultStore) {
  releaseMediaObjectURL(id);
  await store.delete(id);
}

export async function restoreMediaReferences(value, store = defaultStore) {
  const references = collectMediaReferences(value);
  const missing = [];
  await Promise.all(references.map(async reference => {
    if (!await ensureMediaObjectURL(reference.mediaId, store)) missing.push(reference.mediaId);
  }));
  return { restored: references.length - missing.length, missing };
}

export function resolveMediaReference(value) {
  if (!isMediaReference(value)) return value;
  return peekMediaObjectURL(value.mediaId);
}

export function resolveMediaReferencesForPreview(value) {
  if (isMediaReference(value)) return resolveMediaReference(value);
  if (Array.isArray(value)) return value.map(resolveMediaReferencesForPreview);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveMediaReferencesForPreview(entry)]));
  }
  return value;
}

export function getRuntimeMediaURLCount() {
  return runtimeObjectURLs.size;
}

export { defaultStore as mediaStore };
