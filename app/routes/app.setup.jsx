import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`#graphql
    query ShopDomain {
      shop { myshopifyDomain name }
    }
  `);
  const { data } = await res.json();

  return {
    shopDomain: data?.shop?.myshopifyDomain ?? "",
    shopName: data?.shop?.name ?? "My Store",
    backendUrl: process.env.CHATBOT_BACKEND_URL || "",
  };
};

export default function SetupPage() {
  const { shopDomain, shopName, backendUrl } = useLoaderData();

  const themeCustomizerUrl = shopDomain
    ? `https://${shopDomain}/admin/themes/current/editor?context=apps`
    : "#";

  const fallbackSnippet = backendUrl
    ? `<!-- AI Chat Widget (fallback — use the Theme App Extension instead) -->
<script>
  (function(){
    var s=document.createElement('script');
    s.src='${backendUrl}/widget/ai-chatbot.js';
    s.defer=true;
    document.head.appendChild(s);
    window.__AIC_CONFIG__={
      backendUrl:'${backendUrl}',
      storeName:'${shopName}',
      primaryColor:'#6366f1',
      welcomeMessage:'Hi! Ask me anything about our products!'
    };
  })();
</script>`
    : "// Deploy the Vercel backend first, then your URL will appear here.";

  const steps = [
    {
      number: "1",
      heading: "Deploy the Vercel backend",
      body: (
        <>
          <s-paragraph>
            <s-text>
              Inside the <s-text weight="bold">shopify-ai-chatbot/</s-text> folder, run:
            </s-text>
          </s-paragraph>
          <s-box padding="base" border-width="base" border-radius="base" background="subdued">
            <pre style={{ margin: 0, fontSize: 13, overflowX: "auto" }}>
              <code>{`cd shopify-ai-chatbot\nnpm install\nvercel login\nvercel\nvercel --prod`}</code>
            </pre>
          </s-box>
          <s-paragraph>
            <s-text tone="subdued" size="small">
              Then copy your production URL (e.g. https://ai-chatbot-xxx.vercel.app) and add it as{" "}
              <s-text weight="bold">CHATBOT_BACKEND_URL</s-text> in this app's environment variables.
            </s-text>
          </s-paragraph>
        </>
      ),
    },
    {
      number: "2",
      heading: "Add required Vercel environment variables",
      body: (
        <>
          <s-paragraph>
            <s-text>
              In your Vercel project dashboard → Settings → Environment Variables, add:
            </s-text>
          </s-paragraph>
          <s-box padding="base" border-width="base" border-radius="base" background="subdued">
            <pre style={{ margin: 0, fontSize: 13 }}>
              <code>{`GEMINI_API_KEY=your_key_from_aistudio.google.com
SHOPIFY_STORE=yourstore.myshopify.com
SHOPIFY_TOKEN=your_admin_api_token
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token`}</code>
            </pre>
          </s-box>
        </>
      ),
    },
    {
      number: "3",
      heading: "Enable the widget in the theme customizer",
      body: (
        <>
          <s-paragraph>
            <s-text>
              Open your theme customizer and enable the AI Chat Widget in the App embeds section.
            </s-text>
          </s-paragraph>
          <s-button href={themeCustomizerUrl} target="_blank" variant="primary">
            Open Theme Customizer →
          </s-button>
          <s-paragraph>
            <s-text tone="subdued" size="small">
              Path: Online Store → Themes → Customize → App embeds (left sidebar) → toggle on{" "}
              <s-text weight="bold">AI Chat Widget</s-text>
            </s-text>
          </s-paragraph>
        </>
      ),
    },
    {
      number: "4",
      heading: "Configure widget settings",
      body: (
        <s-paragraph>
          <s-text>
            After enabling the block, click the <s-text weight="bold">AI Chat Widget</s-text> block
            in the left sidebar to open its settings. Paste your Vercel backend URL, set your store
            name, choose a brand color, and click Save.
          </s-text>
        </s-paragraph>
      ),
    },
    {
      number: "5",
      heading: "Test the widget on your storefront",
      body: (
        <s-paragraph>
          <s-text>
            Visit your store in a new tab. The chat bubble should appear in the bottom corner. Click
            it and ask a question about one of your products to verify it's working correctly.
          </s-text>
        </s-paragraph>
      ),
    },
  ];

  return (
    <s-page heading="Setup Guide & Embed">
      {/* ── Step-by-step guide ── */}
      <s-section heading="Step-by-Step Setup">
        <s-stack direction="block" gap="base">
          {steps.map((step) => (
            <s-box key={step.number} padding="base" border-width="base" border-radius="base">
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" gap="base">
                  <s-box
                    padding="tight"
                    border-radius="base"
                    style={{
                      background: "#6366f1",
                      color: "#fff",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {step.number}
                  </s-box>
                  <s-heading size="small">{step.heading}</s-heading>
                </s-stack>
                <s-stack direction="block" gap="tight">
                  {step.body}
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      {/* ── Fallback embed snippet ── */}
      <s-section heading="Manual Embed (Fallback)">
        <s-paragraph>
          <s-text>
            If you prefer not to use the Theme App Extension, you can paste the snippet below
            directly before the <s-text weight="bold">{"</body>"}</s-text> tag in your{" "}
            <s-text weight="bold">theme.liquid</s-text> file.
          </s-text>
        </s-paragraph>
        <s-box padding="base" border-width="base" border-radius="base" background="subdued">
          <pre style={{ margin: 0, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            <code>{fallbackSnippet}</code>
          </pre>
        </s-box>
        <s-paragraph>
          <s-text tone="subdued" size="small">
            The Theme App Extension approach (Step 3) is recommended — it lets you configure the
            widget without touching code and can be toggled on/off from the customizer.
          </s-text>
        </s-paragraph>
      </s-section>

      {/* ── Aside ── */}
      <s-section slot="aside" heading="Current Configuration">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="extraTight">
            <s-text weight="bold" size="small">Backend URL</s-text>
            <s-text tone={backendUrl ? "default" : "critical"} size="small">
              {backendUrl || "Not configured — add CHATBOT_BACKEND_URL to env vars"}
            </s-text>
          </s-stack>
          <s-stack direction="block" gap="extraTight">
            <s-text weight="bold" size="small">Store domain</s-text>
            <s-text size="small">{shopDomain}</s-text>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Troubleshooting">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold" size="small">Widget not showing</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Confirm the App embed toggle is ON in the theme customizer and the Vercel URL is
              entered correctly in the block settings (no trailing slash).
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold" size="small">AI not answering about products</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Check that SHOPIFY_STORE and SHOPIFY_TOKEN are set in Vercel and that the token has{" "}
              <s-text weight="bold">read_products</s-text> scope.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold" size="small">CORS error in browser</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Make sure the Vercel URL in the block settings has no trailing slash and matches your
              production deployment exactly.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold" size="small">Gemini API errors</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Verify GEMINI_API_KEY in Vercel env vars is valid and hasn't exceeded its free quota.
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
