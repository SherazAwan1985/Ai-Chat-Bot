import { authenticate } from "../shopify.server";
import { BlobSessionStorage } from "../blobSessionStorage";

const storage = new BlobSessionStorage();

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (session) {
    // Load the session, update its scope, and re-store it
    const existing = await storage.loadSession(session.id);
    if (existing) {
      existing.scope = payload.current?.toString() ?? existing.scope;
      await storage.storeSession(existing);
    }
  }

  return new Response();
};
