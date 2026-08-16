// Minimal ZIP builder — no external deps, pure Node.js.
// Entries are STORED (uncompressed); anything that benefits from compression
// (repo archives, gzipped BSON) is already compressed before it gets here.

function u32LE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function u16LE(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

export function crc32(buf) {
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeLocalFileHeader(name, crc, size) {
  const nameBuf = Buffer.from(name, "utf8");
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // signature
    u16LE(20), // version needed
    u16LE(0), // flags
    u16LE(0), // compression: stored
    u16LE(0),
    u16LE(0), // mod time/date
    u32LE(crc),
    u32LE(size), // compressed size
    u32LE(size), // uncompressed size
    u16LE(nameBuf.length),
    u16LE(0), // extra field length
    nameBuf,
  ]);
}

function makeCentralDir(name, crc, size, offset) {
  const nameBuf = Buffer.from(name, "utf8");
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x01, 0x02]), // signature
    u16LE(20),
    u16LE(20), // versions
    u16LE(0), // flags
    u16LE(0), // compression: stored
    u16LE(0),
    u16LE(0), // mod time/date
    u32LE(crc),
    u32LE(size),
    u32LE(size),
    u16LE(nameBuf.length),
    u16LE(0),
    u16LE(0), // extra, comment
    u16LE(0), // disk start
    u16LE(0),
    u32LE(0), // internal/external attrs
    u32LE(offset),
    nameBuf,
  ]);
}

function makeEOCD(numEntries, centralDirSize, centralDirOffset) {
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16LE(0),
    u16LE(0),
    u16LE(numEntries),
    u16LE(numEntries),
    u32LE(centralDirSize),
    u32LE(centralDirOffset),
    u16LE(0),
  ]);
}

/**
 * Build a ZIP archive from `[{ name, buf }]` entries.
 * The central directory counts are 16-bit, so this tops out at 65535 entries.
 */
export function buildZip(entries) {
  const parts = [];
  const centralDirs = [];
  let offset = 0;

  for (const { name, buf } of entries) {
    const crc = crc32(buf);
    const localHeader = makeLocalFileHeader(name, crc, buf.length);
    parts.push(localHeader, buf);
    centralDirs.push(makeCentralDir(name, crc, buf.length, offset));
    offset += localHeader.length + buf.length;
  }

  const centralDirBuf = Buffer.concat(centralDirs);
  const eocd = makeEOCD(entries.length, centralDirBuf.length, offset);
  return Buffer.concat([...parts, centralDirBuf, eocd]);
}
