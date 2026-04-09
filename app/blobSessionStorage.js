/**
 * BlobSessionStorage — Shopify session storage backed by Vercel Blob.
 *
 * Each session is stored as a public JSON blob at:
 *   shopify-sessions/<sessionId>.json
 *
 * The blob URL is deterministic when addRandomSuffix is false, so we use
 * Vercel Blob's list() with a prefix to look up the URL by session ID for
 * delete/head operations.
 */

import { put, del, list } from "@vercel/blob";
import { Session } from "@shopify/shopify-api";

const PREFIX = "shopify-sessions/";

/** Build the canonical pathname for a session blob. */
function sessionPathname(id) {
  // encodeURIComponent keeps IDs with special chars safe as blob path segments
  return `${PREFIX}${encodeURIComponent(id)}.json`;
}

/**
 * Find a single blob's URL by its exact pathname via Vercel Blob list().
 * Returns null if not found.
 * @param {string} pathname
 * @returns {Promise<string | null>}
 */
async function resolveBlobUrl(pathname) {
  const { blobs } = await list({ prefix: pathname });
  const match = blobs.find((b) => b.pathname === pathname);
  return match?.url ?? null;
}

export class BlobSessionStorage {
  /**
   * Store (create or overwrite) a session.
   * @param {Session} session
   * @returns {Promise<boolean>}
   */
  async storeSession(session) {
    try {
      // toPropertyArray(true) includes onlineAccessInfo (userId, etc.)
      const data = JSON.stringify(session.toPropertyArray(true));
      await put(sessionPathname(session.id), data, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
      return true;
    } catch (err) {
      console.error("[BlobSessionStorage] storeSession failed:", err.message);
      return false;
    }
  }

  /**
   * Load a session by its ID.
   * @param {string} id
   * @returns {Promise<Session | undefined>}
   */
  async loadSession(id) {
    try {
      const url = await resolveBlobUrl(sessionPathname(id));
      if (!url) return undefined;

      const res = await fetch(url);
      if (!res.ok) return undefined;

      const propertyArray = await res.json();
      return Session.fromPropertyArray(propertyArray, true);
    } catch (err) {
      console.error("[BlobSessionStorage] loadSession failed:", err.message);
      return undefined;
    }
  }

  /**
   * Delete a single session by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteSession(id) {
    try {
      const url = await resolveBlobUrl(sessionPathname(id));
      if (!url) return true; // Already gone — treat as success
      await del(url);
      return true;
    } catch (err) {
      console.error("[BlobSessionStorage] deleteSession failed:", err.message);
      return false;
    }
  }

  /**
   * Delete multiple sessions by ID.
   * @param {string[]} ids
   * @returns {Promise<boolean>}
   */
  async deleteSessions(ids) {
    try {
      const urls = await Promise.all(
        ids.map((id) => resolveBlobUrl(sessionPathname(id)))
      );
      const validUrls = urls.filter(Boolean);
      if (validUrls.length > 0) {
        await del(validUrls);
      }
      return true;
    } catch (err) {
      console.error(
        "[BlobSessionStorage] deleteSessions failed:",
        err.message
      );
      return false;
    }
  }

  /**
   * Find all sessions for a given shop domain.
   * Lists all session blobs and filters by the shop field in each JSON blob.
   * @param {string} shop — e.g. "yourstore.myshopify.com"
   * @returns {Promise<Session[]>}
   */
  async findSessionsByShop(shop) {
    try {
      const { blobs } = await list({ prefix: PREFIX });

      const sessions = await Promise.all(
        blobs.map(async (blob) => {
          try {
            const res = await fetch(blob.url);
            if (!res.ok) return null;
            const propertyArray = await res.json();
            return Session.fromPropertyArray(propertyArray, true);
          } catch {
            return null;
          }
        })
      );

      return sessions.filter((s) => s?.shop === shop);
    } catch (err) {
      console.error(
        "[BlobSessionStorage] findSessionsByShop failed:",
        err.message
      );
      return [];
    }
  }
}
