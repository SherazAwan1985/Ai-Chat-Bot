import { authenticate } from "../shopify.server";
import { BlobSessionStorage } from "../blobSessionStorage";

const storage = new BlobSessionStorage();

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the sessions may have been deleted previously.
  if (session) {
    const sessions = await storage.findSessionsByShop(shop);
    const ids = sessions.map((s) => s.id);
    if (ids.length > 0) {
      await storage.deleteSessions(ids);
    }
  }

  return new Response();
};
