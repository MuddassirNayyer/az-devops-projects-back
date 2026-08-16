import { MongoClient, BSON } from "mongodb";
import { gzipSync } from "zlib";

const { EJSON } = BSON;

// Produces a dump laid out exactly like `mongodump --gzip`, so the result
// restores with a plain `mongorestore --gzip` and no custom tooling:
//
//   <root>/<db>/<collection>.bson.gz
//   <root>/<db>/<collection>.metadata.json.gz
//
// Documents are pulled with `raw: true`, so the driver hands back the original
// BSON bytes from the wire. Nothing is deserialized into JS objects and
// re-encoded, which is what keeps types (Decimal128, ObjectId, dates, binary)
// byte-identical to what mongodump would have written.

// mongodump percent-encodes characters that aren't safe in a filename.
function encodeName(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
  });
}

async function dumpCollection(db, info) {
  const name = info.name;
  const isView = info.type === "view";
  const coll = db.collection(name);

  // Views have no documents and no indexes of their own; mongorestore
  // recreates them from `options` (viewOn + pipeline) and expects an
  // empty .bson alongside the metadata.
  let bson = Buffer.alloc(0);
  let indexes = [];

  if (!isView) {
    indexes = await coll.indexes();

    const chunks = [];
    const cursor = coll.find({}, { raw: true, batchSize: 1000 });
    for await (const raw of cursor) {
      // `raw` can be a view onto a reused pool buffer — copy before keeping it.
      chunks.push(Buffer.from(raw));
    }
    bson = Buffer.concat(chunks);
  }

  // Field order, the bare-hex uuid, and canonical Extended JSON below all
  // mirror what `mongodump --gzip` writes byte-for-byte. Verified by diffing
  // against the real tool; don't "tidy" this without re-diffing.
  const metadata = {};
  if (info.options && Object.keys(info.options).length)
    metadata.options = info.options;
  metadata.indexes = indexes;

  const uuid = info.info?.uuid;
  if (uuid) {
    const hex =
      typeof uuid.toHexString === "function"
        ? uuid.toHexString()
        : Buffer.from(uuid.buffer ?? uuid).toString("hex");
    metadata.uuid = hex.replace(/-/g, "");
  }

  metadata.collectionName = name;
  metadata.type = info.type || "collection";

  return {
    bson,
    metadata: Buffer.from(EJSON.stringify(metadata, { relaxed: false }), "utf8"),
  };
}

/**
 * Dump every non-system collection in the database named by the URI.
 *
 * Returns `{ entries, stats }` where `entries` is `[{ name, buf }]` ready to
 * hand to buildZip, and `stats` carries per-collection results plus any
 * collections that failed (one bad collection does not abort the dump).
 */
export async function dumpDatabase(uri, { root = "database" } = {}) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    // Read off a secondary where one is available so a backup never competes
    // with production traffic on the primary.
    readPreference: "secondaryPreferred",
  });

  await client.connect();

  try {
    const db = client.db();
    const dbName = db.databaseName;
    const dir = `${root}/${encodeName(dbName)}`;

    const infos = (await db.listCollections().toArray()).filter(
      (i) => !i.name.startsWith("system."),
    );

    const entries = [];
    const collections = [];
    const failed = [];

    for (const info of infos) {
      try {
        const { bson, metadata } = await dumpCollection(db, info);
        const file = encodeName(info.name);
        entries.push({ name: `${dir}/${file}.bson.gz`, buf: gzipSync(bson) });
        entries.push({
          name: `${dir}/${file}.metadata.json.gz`,
          buf: gzipSync(metadata),
        });
        collections.push({ name: info.name, bytes: bson.length });
      } catch (e) {
        failed.push({ name: info.name, error: e.message });
      }
    }

    // A systematic fault (bad import, auth change, driver upgrade) makes every
    // collection fail the same way. Without this the caller would happily ship
    // a well-formed, completely empty archive and call it a backup.
    if (infos.length && !collections.length)
      throw new Error(
        `every collection failed to dump — first error: ${failed[0]?.error}`,
      );

    // Kept outside `root` — mongorestore warns about any file it finds in the
    // dump directory that isn't part of the dump.
    entries.push({
      name: `DATABASE-RESTORE.md`,
      buf: Buffer.from(restoreInstructions(dbName, root, failed), "utf8"),
    });

    return {
      entries,
      stats: {
        dbName,
        collections: collections.length,
        failed,
        rawBytes: collections.reduce((s, c) => s + c.bytes, 0),
      },
    };
  } finally {
    await client.close();
  }
}

function restoreInstructions(dbName, root, failed) {
  const warning = failed.length
    ? `\n## Collections that failed to dump\n\n` +
      failed.map((f) => `- \`${f.name}\` — ${f.error}`).join("\n") +
      `\n\nThese are **not** present in this backup.\n`
    : "";

  return `# Restoring this database backup

This folder is a standard \`mongodump --gzip\` archive of the \`${dbName}\`
database. It restores with the regular MongoDB tools — nothing custom needed.

## Requirements

MongoDB Database Tools (provides \`mongorestore\`):
https://www.mongodb.com/try/download/database-tools

## Restore

Unzip the backup, then from the directory containing \`${root}/\`:

\`\`\`bash
mongorestore --gzip --uri="<CONNECTION-STRING>" ${root}/
\`\`\`

The database name is taken from the \`${dbName}/\` folder. To restore into a
differently named database instead:

\`\`\`bash
mongorestore --gzip --uri="<CONNECTION-STRING>" \\
  --nsFrom='${dbName}.*' --nsTo='<NEW-DB-NAME>.*' ${root}/
\`\`\`

## Notes

- By default \`mongorestore\` **inserts** and skips documents whose \`_id\`
  already exists. To replace the target database entirely, add \`--drop\`.
  That is destructive — be certain of the target before using it.
- Always restore into a scratch database first and verify before pointing
  anything at a production cluster.
- Indexes are recreated from the \`.metadata.json.gz\` files after the
  documents load, so a large restore can take a while at the end.
${warning}`;
}
