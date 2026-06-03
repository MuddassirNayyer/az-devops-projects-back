import { createGzip } from "zlib";
import { Readable, PassThrough } from "stream";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: true,
  },
};

// Minimal ZIP builder — no external deps, pure Node.js
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

function crc32(buf) {
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++)
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, "");
  const pat = process.env.ADO_PAT;
  if (!org || !pat)
    return res.status(500).json({ error: "Server not configured." });

  const headers = {
    Authorization: "Basic " + Buffer.from(":" + pat).toString("base64"),
  };
  const { repos } = req.body;
  if (!repos?.length)
    return res.status(400).json({ error: "No repos provided" });

  // Fetch all repos in parallel
  const results = await Promise.all(
    repos.map(async ({ projectId, projectName, repoId, repoName, branch }) => {
      const cleanBranch = (branch || "main").replace("refs/heads/", "");
      const urls = [
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=${cleanBranch}&$format=zip&api-version=6.0`,
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=master&$format=zip&api-version=6.0`,
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
        `${org}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers });
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            const safeName = `${projectName.replace(/[^a-z0-9_\-]/gi, "_")}/${repoName.replace(/[^a-z0-9_\-]/gi, "_")}.zip`;
            return { name: safeName, buf };
          }
          const txt = await r.text();
          if (
            txt.includes("Cannot find any branches") ||
            txt.includes("GitItemNotFoundException")
          )
            return null;
        } catch (e) {
          continue;
        }
      }
      return null;
    }),
  );

  const entries = results.filter(Boolean);
  if (!entries.length)
    return res.status(404).json({ error: "No repos could be downloaded." });

  // Build ZIP in memory
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
  const zipBuf = Buffer.concat([...parts, centralDirBuf, eocd]);

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ado-backup-${date}.zip"`,
  );
  res.setHeader("Content-Length", zipBuf.length);
  res.end(zipBuf);
}
