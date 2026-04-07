# Shopify AI Chatbot

## 1. What This App Does

This app adds a floating AI chat widget to your Shopify storefront that lets customers ask natural-language questions about your products, prices, and stock levels. It uses Google Gemini (gemini-2.0-flash) to generate friendly, accurate answers based on live data fetched directly from your Shopify Admin API. Store owners can also upload a custom PDF, TXT, or CSV file — such as an FAQ, size guide, or return policy — which the AI will use as extra reference when answering customer questions.

---

## 2. Prerequisites

- **Node.js 18 or higher** — [nodejs.org](https://nodejs.org)
- **A Shopify Partner account with a development store** — [partners.shopify.com](https://partners.shopify.com)
- **A Google Gemini API key** (free tier available) — [aistudio.google.com](https://aistudio.google.com)
- **A Vercel account** (free tier available) — [vercel.com](https://vercel.com)
- **Vercel CLI** installed globally:
  ```bash
  npm install -g vercel
  ```

---

## 3. Get Your API Keys

### Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key**, then **Create API Key**
3. Copy the generated key — you will paste it into your `.env.local` file

### Shopify Admin API Token

1. Log in to your Shopify store admin panel
2. Navigate to **Settings → Apps and sales channels → Develop apps**
3. Click **Create an app** and give it a name (e.g. "AI Chatbot")
4. Click **Configure Admin API scopes** and enable:
   - `read_products`
   - `read_orders` *(optional, for future use)*
   - `read_customers` *(optional, for future use)*
5. Click **Save**, then **Install app**
6. Copy the **Admin API access token** — it is only shown once

---

## 4. Local Setup

1. **Clone the repo or navigate into the project folder:**
   ```bash
   cd shopify-ai-chatbot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create your local environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Fill in all values in `.env.local`:**
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   SHOPIFY_STORE=yourstore.myshopify.com
   SHOPIFY_TOKEN=your_shopify_admin_api_token_here
   KV_REST_API_URL=your_vercel_kv_url_here
   KV_REST_API_TOKEN=your_vercel_kv_token_here
   ```

5. **Start the local development server:**
   ```bash
   npm run dev
   # or: vercel dev
   ```

6. **Open the widget in your browser:**
   ```
   http://localhost:3000/widget
   ```
   Click the purple bubble in the bottom-right corner to test the chat.

---

## 5. Set Up Vercel KV (for File Upload Feature)

Vercel KV is used to persist the custom knowledge text uploaded by the store owner between serverless function calls.

1. Log in at [vercel.com](https://vercel.com) and open your project dashboard
2. Click the **Storage** tab
3. Click **Create Database** and choose **KV**
4. Give it a name (e.g. `chatbot-kv`) and click **Create**
5. Go to the **KV** database settings and copy:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
6. Paste both values into:
   - Your `.env.local` file (for local dev)
   - Your Vercel project's **Environment Variables** (for production)

---

## 6. Deploy to Vercel

1. **Log in to Vercel CLI:**
   ```bash
   vercel login
   ```

2. **Run the initial deployment (creates the project):**
   ```bash
   vercel
   ```
   Follow the prompts — choose your scope, confirm the project name, and link or create a new project.

3. **Add all environment variables in the Vercel dashboard:**
   - Go to your project → **Settings → Environment Variables**
   - Add each of the 5 variables from `.env.example` with their real values
   - Make sure they are set for the **Production** environment

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

5. **Copy your production URL** — it will look like:
   ```
   https://shopify-ai-chatbot.vercel.app
   ```
   You will need this URL in the next step.

---

## 7. Embed the Widget in Shopify

1. Open `widget/chat-widget.html` in a code editor
2. Find the `CONFIG` object near the top of the `<script>` tag and update it:
   ```javascript
   const CONFIG = {
     backendUrl: 'https://your-app.vercel.app',  // ← your Vercel production URL (no trailing slash)
     storeName: 'Your Store Name',
     welcomeMessage: 'Hi! How can I help you today?',
     primaryColor: '#6366f1',                     // ← change to match your brand
   };
   ```
3. Select and copy the **entire contents** of `chat-widget.html`
4. In your Shopify admin, go to:
   **Online Store → Themes → your active theme → Edit code**
5. Open `layout/theme.liquid`
6. Paste the entire widget code **just before the closing `</body>` tag**
7. Click **Save**
8. Preview your store — you should see the chat bubble in the bottom-right corner

---

## 8. Upload a Custom Knowledge File

The AI can use an additional document (FAQ, return policy, size guide, etc.) when answering questions.

1. Open the chat widget on your store
2. Click the **paperclip icon** next to the input field
3. Select a file — accepted formats: **PDF, TXT, or CSV** (max 10 MB)
4. Wait for the confirmation message in the chat
5. From that point on, the AI will reference the uploaded content in all future answers
6. You can upload a new file at any time to replace the previous one

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| "AI is not answering about my products" | Verify `SHOPIFY_STORE` (no `https://`, just `yourstore.myshopify.com`) and `SHOPIFY_TOKEN` are set correctly in Vercel environment variables |
| "File upload fails silently" | Make sure Vercel KV is created and both `KV_REST_API_URL` + `KV_REST_API_TOKEN` are added as environment variables |
| "CORS error in browser console" | Check that `CONFIG.backendUrl` has no trailing slash and matches your exact Vercel deployment URL |
| "Gemini API error" | Confirm `GEMINI_API_KEY` is valid; check your free-tier quota at [aistudio.google.com](https://aistudio.google.com) |
| Chat widget not showing on Shopify | Confirm you pasted the code before `</body>` (not `</head>`) in `theme.liquid` |
| Local dev shows no products | Make sure `vercel dev` is running (not `node server.js`) so env vars from `.env.local` are loaded |
