#!/usr/bin/env node
// MCP server: pull the actual file/image attachments out of Notion comments.
//
// The hosted Notion connector only reports `image-attached-count` — it never
// hands back the file. The official REST API *does*: GET /v1/comments returns
// each comment's `attachments[]` with a temporary signed `file.url`. This
// server walks a page's blocks, fetches their comments, downloads every
// attachment immediately (the URL expires), and returns a manifest mapping
// comment -> parent block text -> saved local paths.
//
// Requires an internal Notion integration token with the "Read comments"
// capability, shared on the target page/teamspace. See README.md.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Self-load NOTION_API_KEY from a .env next to this server, then from the
// project-root .env (two levels up), so it works whether or not the launching
// shell exported the token. Paths are resolved relative to this file
// (cwd-independent). A missing .env is fine — we fall back to the ambient
// environment. Existing env vars always win over the files.
const here = dirname(fileURLToPath(import.meta.url));
for (const envPath of [join(here, ".env"), join(here, "..", "..", ".env")]) {
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env here — try the next one / rely on the ambient environment */
  }
}

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = process.env.NOTION_VERSION || "2026-03-11";
const TOKEN = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
// Notion's rate limit is ~3 req/s; stay comfortably under it.
const CONCURRENCY = Number(process.env.NOTION_CONCURRENCY || 3);

const EXT_BY_CATEGORY = {
  image: ".png",
  pdf: ".pdf",
  video: ".mp4",
  audio: ".mp3",
  productivity: ".bin",
};
const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

// --- small utilities ---------------------------------------------------------

/** Notion ids are 32 hex chars; accept a raw id, a dashed uuid, or any URL. */
function normalizeId(input) {
  // Match both dashed UUID and bare 32-hex forms (dashes optional between groups).
  const m = String(input).match(
    /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i,
  );
  if (!m) throw new Error(`Could not find a Notion id in: ${input}`);
  const h = m[0].replace(/-/g, "").toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function notion(path, { query } = {}) {
  const url = new URL(NOTION_API + path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Notion-Version": NOTION_VERSION,
      },
    });
    if (res.status === 429 && attempt < 5) {
      const retry = Number(res.headers.get("retry-after") || 1);
      await sleep(retry * 1000);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.message || res.statusText;
      const err = new Error(`Notion ${res.status} on ${path}: ${msg}`);
      err.code = body?.code;
      throw err;
    }
    return body;
  }
}

/** Run async tasks with a bounded concurrency, preserving input order. */
async function pool(items, worker, limit = CONCURRENCY) {
  const out = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

const plainText = (richText) =>
  Array.isArray(richText) ? richText.map((rt) => rt.plain_text || "").join("") : "";

const blockText = (block) => {
  const data = block?.[block?.type];
  return plainText(data?.rich_text).trim();
};

// --- Notion crawling ---------------------------------------------------------

/** Depth-first list of every block under `rootId`, plus the page node itself. */
async function listBlocks(rootId) {
  const collected = [];
  async function walk(id, depth) {
    let cursor;
    do {
      const page = await notion(`/blocks/${id}/children`, {
        query: { start_cursor: cursor, page_size: 100 },
      });
      for (const b of page.results || []) {
        collected.push(b);
        if (b.has_children && depth < 6) await walk(b.id, depth + 1);
      }
      cursor = page.has_more ? page.next_cursor : undefined;
    } while (cursor);
  }
  await walk(rootId, 0);
  return collected;
}

async function commentsForBlock(blockId) {
  const all = [];
  let cursor;
  do {
    const page = await notion("/comments", {
      query: { block_id: blockId, start_cursor: cursor, page_size: 100 },
    });
    all.push(...(page.results || []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return all;
}

function extFor(url, category) {
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();
  const m = path.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return "." + m[1].toLowerCase();
  return EXT_BY_CATEGORY[category] || ".bin";
}

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url.slice(0, 80)}…`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return buf.length;
}

// --- the tool ----------------------------------------------------------------

async function getCommentAttachments(args) {
  if (!TOKEN) {
    throw new Error(
      "NOTION_API_KEY is not set. Create an internal integration with 'Read comments', share the page with it, and pass the token via env.",
    );
  }
  const { page_url, block_ids, include_resolved = false, inline_images = false } = args;
  if (!page_url && !(Array.isArray(block_ids) && block_ids.length)) {
    throw new Error("Provide either `page_url` (crawl whole page) or `block_ids` (targeted).");
  }

  const pageId = page_url ? normalizeId(page_url) : null;
  const outDir = resolve(
    args.out_dir || join(".notion-cache", pageId || "comments"),
  );

  // Build the set of blocks to inspect.
  let blocks;
  if (Array.isArray(block_ids) && block_ids.length) {
    blocks = block_ids.map((b) => ({ id: normalizeId(b), __text: "" }));
  } else {
    const tree = await listBlocks(pageId);
    // Include the page itself for page-level comments.
    blocks = [{ id: pageId, __text: "(page)" }, ...tree];
  }
  for (const b of blocks) if (b.__text === undefined) b.__text = blockText(b);

  // Fetch comments per block, keep only those carrying attachments.
  const perBlock = await pool(blocks, async (b) => {
    let comments = [];
    try {
      comments = await commentsForBlock(b.id);
    } catch (e) {
      // A block can be undeletable/permission-scoped; skip but note it.
      return { block: b, error: e.message, comments: [] };
    }
    const withFiles = comments.filter(
      (c) =>
        Array.isArray(c.attachments) &&
        c.attachments.length &&
        (include_resolved || c.resolved !== true),
    );
    return { block: b, comments: withFiles };
  });

  // Flatten -> download every attachment immediately (signed URLs expire).
  const manifest = [];
  const imageBlocks = [];
  let totalFiles = 0;

  for (const { block, comments, error } of perBlock) {
    if (error) {
      manifest.push({ block_id: block.id, error });
      continue;
    }
    for (const c of comments) {
      const entry = {
        block_id: block.id,
        block_excerpt: (block.__text || "").slice(0, 160) || null,
        discussion_id: c.discussion_id || null,
        comment_id: c.id,
        comment_text: plainText(c.rich_text) || null,
        created_time: c.created_time || null,
        attachments: [],
      };
      entry.attachments = await Promise.all(
        c.attachments.map(async (att, i) => {
          const url = att?.file?.url;
          if (!url) return { category: att?.category, error: "no file.url in attachment" };
          const ext = extFor(url, att.category);
          const filename = `${c.id.replace(/-/g, "")}-${i}${ext}`;
          const destPath = join(outDir, filename);
          try {
            const bytes = await downloadTo(url, destPath);
            totalFiles++;
            if (inline_images && MIME_BY_EXT[ext]?.startsWith("image/") && bytes <= 4_000_000) {
              const data = (await readFile(destPath)).toString("base64");
              imageBlocks.push({ type: "image", data, mimeType: MIME_BY_EXT[ext] });
            }
            return {
              category: att.category,
              saved_path: destPath,
              bytes,
              expiry_time: att?.file?.expiry_time || null,
            };
          } catch (e) {
            return { category: att.category, error: e.message };
          }
        }),
      );
      manifest.push(entry);
    }
  }

  const summary = {
    page_id: pageId,
    out_dir: outDir,
    blocks_scanned: blocks.length,
    comments_with_attachments: manifest.filter((m) => m.attachments?.length).length,
    files_downloaded: totalFiles,
    notion_version: NOTION_VERSION,
  };

  const content = [
    { type: "text", text: JSON.stringify({ summary, comments: manifest }, null, 2) },
    ...imageBlocks,
  ];
  return { content };
}

// --- MCP wiring --------------------------------------------------------------

const TOOL = {
  name: "get_comment_attachments",
  description:
    "Download image/file attachments from Notion comments and return a manifest mapping each comment to its parent block's text and the saved local file paths. Use `page_url` to crawl an entire page, or `block_ids` to target specific blocks you already know carry attachments (much faster). Signed URLs are downloaded immediately into a local cache. Read the saved_path files to view the images.",
  inputSchema: {
    type: "object",
    properties: {
      page_url: {
        type: "string",
        description: "Notion page URL or id. Crawls all blocks (incl. page-level comments).",
      },
      block_ids: {
        type: "array",
        items: { type: "string" },
        description: "Specific block ids/urls to fetch comments for instead of crawling the whole page.",
      },
      include_resolved: {
        type: "boolean",
        description: "Include resolved comments (default false).",
      },
      out_dir: {
        type: "string",
        description: "Directory to save attachments into (default .notion-cache/<pageId>).",
      },
      inline_images: {
        type: "boolean",
        description: "Also return image attachments inline as image content blocks (default false; paths are always returned).",
      },
    },
  },
};

const server = new Server(
  { name: "notion-comment-files", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [TOOL] }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== TOOL.name) {
    throw new Error(`Unknown tool: ${req.params.name}`);
  }
  try {
    return await getCommentAttachments(req.params.arguments || {});
  } catch (e) {
    return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("notion-comment-files MCP server ready (Notion-Version:", NOTION_VERSION + ")");
