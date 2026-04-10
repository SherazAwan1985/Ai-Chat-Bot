/**
 * Gemini Service — builds the system prompt and sends messages to the
 * Google Gemini API (model: gemini-2.0-flash).
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Build the system instruction string injected into every chat session.
 * @param {string} shopifyProducts - Formatted product list from Shopify
 * @param {string} customKnowledge - Extra text uploaded by the store owner
 * @returns {string}
 */
function buildSystemInstruction(shopifyProducts, customKnowledge) {
  let instruction = `You are a friendly and knowledgeable shopping assistant for this Shopify store.

LIVE STORE PRODUCTS (always use this data to answer product questions):
${shopifyProducts}
`;

  if (customKnowledge && customKnowledge.trim().length > 0) {
    instruction += `
EXTRA KNOWLEDGE FROM STORE OWNER (use this as additional reference):
${customKnowledge}
`;
  }

  instruction += `
YOUR RULES:
- Only answer questions related to this store, its products, pricing, availability, and shopping help
- Always mention price and stock status when discussing a product
- If a product is out of stock (inventory 0 or less), say so clearly
- If you do not know something, say you are not sure — never make up product details
- Keep answers short, friendly, and helpful — maximum 3 to 4 sentences
- If a customer wants to purchase, encourage them to use the store's cart
- Never answer questions unrelated to shopping or this store`;

  return instruction;
}

/**
 * Send a chat message to Gemini with full conversation history.
 * @param {string} userMessage - The latest message from the customer
 * @param {Array<{role: string, content: string}>} history - Prior turns
 * @param {string} shopifyProducts - Formatted product text
 * @param {string} customKnowledge - Custom knowledge from uploaded file
 * @returns {Promise<string>} The AI reply text
 */
async function chat(userMessage, history, shopifyProducts, customKnowledge) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('[GEMINI] GEMINI_API_KEY environment variable is not set!');
      throw new Error('GEMINI_API_KEY not configured. Please check environment variables.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const systemInstruction = buildSystemInstruction(
      shopifyProducts,
      customKnowledge
    );

    // Convert history from { role, content } to Gemini format
    // Gemini uses 'user' and 'model' roles
    const geminiHistory = (history || [])
      .filter(
        (turn) =>
          turn &&
          (turn.role === 'user' || turn.role === 'model') &&
          typeof turn.content === 'string'
      )
      .map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.content }],
      }));

    const chatSession = model.startChat({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      history: geminiHistory,
    });

    const result = await chatSession.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error('[GEMINI] Error during chat:', err.message);
    return 'I am having trouble right now. Please try again in a moment.';
  }
}

module.exports = { chat };
