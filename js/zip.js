// A minimal, dependency-free ZIP reader/writer (STORE method only — no DEFLATE
// compression). This app ships zero runtime dependencies and has no bundler (every
// module is loaded by the browser as-is, see docs/ARCHITECTURE.md), so a normal npm zip
// package isn't an option here; this hand-written implementation covers exactly what
// docs/MEDIA-ASSET-PIPELINE.md's Rise Project ZIP export and the portable project
// package need, and nothing more. STORE-only keeps the implementation small and fully
// deterministic; it is still a fully spec-compliant ZIP archive, readable by any
// standard unzip tool (Windows Explorer, macOS Archive Utility, 7-Zip, Rise's own
// import, etc.) — compression is an optimization this pass deliberately doesn't need.

const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const VERSION = 20; // 2.0 — the minimum version that supports long filenames, nothing exotic
const UTF8_FLAG = 0x0800;

// A fixed, arbitrary timestamp (2020-01-01T00:00:00) rather than `new Date()` — the same
// project input must always produce a byte-identical ZIP (see the determinism test in
// tests/media.test.mjs), matching how instance IDs elsewhere in this app are derived from
// the project id rather than Date.now() (docs/EXPORT-CONTRACT.md).
const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('ZIP entry data must be a Uint8Array, ArrayBuffer, or string.');
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

/**
 * @param {{ path: string, data: Uint8Array|ArrayBuffer|string }[]} entries
 * @returns {Blob} a valid application/zip archive, STORE method, deterministic bytes
 *   for the same input every time.
 */
export function createZip(entries) {
  const paths = new Set();
  entries.forEach(entry => {
    const path = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (paths.has(path)) throw new Error(`Duplicate ZIP entry path: "${path}".`);
    paths.add(path);
  });

  const parts = [];
  const centralDirectoryParts = [];
  let offset = 0;

  entries.forEach(entry => {
    const path = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const nameBytes = new TextEncoder().encode(path);
    const data = toBytes(entry.data);
    const checksum = crc32(data);

    const localHeader = [
      u32(LOCAL_FILE_SIGNATURE), u16(VERSION), u16(UTF8_FLAG), u16(0), u16(FIXED_DOS_TIME), u16(FIXED_DOS_DATE),
      u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0)
    ];
    localHeader.forEach(part => parts.push(part));
    parts.push(nameBytes);
    parts.push(data);

    const centralHeader = [
      u32(CENTRAL_DIRECTORY_SIGNATURE), u16(VERSION), u16(VERSION), u16(UTF8_FLAG), u16(0), u16(FIXED_DOS_TIME), u16(FIXED_DOS_DATE),
      u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)
    ];
    centralHeader.forEach(part => centralDirectoryParts.push(part));
    centralDirectoryParts.push(nameBytes);

    offset += localHeader.reduce((sum, part) => sum + part.length, 0) + nameBytes.length + data.length;
  });

  const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0);
  const centralDirectoryOffset = offset;

  const eocd = [
    u32(END_OF_CENTRAL_DIRECTORY_SIGNATURE), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralDirectorySize), u32(centralDirectoryOffset), u16(0)
  ];

  return new Blob([...parts, ...centralDirectoryParts, ...eocd], { type: 'application/zip' });
}

/**
 * Reads a ZIP archive written by createZip() (STORE method only — this is not a
 * general-purpose unzip implementation; it exists solely to reopen the portable
 * project packages this app itself writes, see js/project-package.js).
 * @param {Blob} blob
 * @returns {Promise<{ path: string, data: Uint8Array }[]>}
 */
export async function readZip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) throw new Error('Not a valid ZIP file (end-of-central-directory record not found).');

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);

  const entries = [];
  let cursor = centralDirectoryOffset;
  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_SIGNATURE) throw new Error('Corrupt ZIP central directory.');
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (compressionMethod !== 0) throw new Error(`ZIP entry "${name}" uses an unsupported compression method (only STORE is supported).`);

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    entries.push({ path: name, data: bytes.slice(dataStart, dataStart + compressedSize) });

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
