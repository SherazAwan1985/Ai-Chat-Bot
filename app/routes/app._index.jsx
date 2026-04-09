import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch store info and product count
  const res = await admin.graphql(`#graphql
    query DashboardData {
      shop {
        name
        myshopifyDomain
      }
      productsCount { count }
    }
  `);
  const { data } = await res.json();

  const hasBackendUrl = !!process.env.CHATBOT_BACKEND_URL;

  return {
    shop: data?.shop ?? {},
    productCount: data?.productsCount?.count ?? 0,
    hasBackendUrl,
    backendUrl: process.env.CHATBOT_BACKEND_URL || "",
  };
};

export default function Dashboard() {
  const { shop, productCount, hasBackendUrl, backendUrl } = useLoaderData();

  const steps = [
    {
      done: true,
      label: "Install the app",
      detail: "You're here — the app is installed and running.",
    },
    {
      done: hasBackendUrl,
      label: "Deploy chatbot backend to Vercel",
      detail: hasBackendUrl
        ? `Connected: ${backendUrl}`
        : "Deploy the shopify-ai-chatbot folder to Vercel, then add CHATBOT_BACKEND_URL to your app environment variables.",
    },
    {
      done: false,
      label: "Enable widget in theme customizer",
      detail:
        'Go to Online Store → Themes → Customize → App embeds → toggle on "AI Chat Widget".',
    },
    {
      done: false,
      label: "Set your Vercel URL in the block settings",
      detail:
        "Inside the theme customizer, open the AI Chat Widget block and paste your Vercel backend URL.",
    },
    {
      done: false,
      label: "(Optional) Upload a knowledge file",
      detail:
        "Visit the Knowledge Base page to upload a PDF, TXT, or CSV for extra AI context.",
    },
  ];

  return (
    <s-page heading="AI Chatbot — Dashboard">
      {/* ── Stats ── */}
      <s-layout columns="3">
        <s-box padding="base" border-width="base" border-radius="base">
          <s-stack direction="block" gap="tight">
            <s-text tone="subdued" size="small">Store</s-text>
            <s-heading size="medium">{shop.name || "—"}</s-heading>
            <s-text tone="subdued" size="small">{shop.myshopifyDomain}</s-text>
          </s-stack>
        </s-box>

        <s-box padding="base" border-width="base" border-radius="base">
          <s-stack direction="block" gap="tight">
            <s-text tone="subdued" size="small">Products available to AI</s-text>
            <s-heading size="medium">{productCount}</s-heading>
            <s-text tone="subdued" size="small">
              Fetched live on every chat message
            </s-text>
          </s-stack>
        </s-box>

        <s-box padding="base" border-width="base" border-radius="base">
          <s-stack direction="block" gap="tight">
            <s-text tone="subdued" size="small">Backend status</s-text>
            <s-heading size="medium">
              {hasBackendUrl ? "✅ Connected" : "⚠️ Not set"}
            </s-heading>
            <s-text tone="subdued" size="small">
              {hasBackendUrl
                ? "Vercel backend URL is configured"
                : "Add CHATBOT_BACKEND_URL to env vars"}
            </s-text>
          </s-stack>
        </s-box>
      </s-layout>

      {/* ── Setup checklist ── */}
      <s-section heading="Setup Checklist">
        <s-stack direction="block" gap="base">
          {steps.map((step, i) => (
            <s-box
              key={i}
              padding="base"
              border-width="base"
              border-radius="base"
            >
              <s-stack direction="inline" gap="base">
                <s-text size="large">{step.done ? "✅" : "⬜"}</s-text>
                <s-stack direction="block" gap="extraTight">
                  <s-text weight="bold">
                    Step {i + 1}: {step.label}
                  </s-text>
                  <s-text tone="subdued" size="small">
                    {step.detail}
                  </s-text>
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      {/* ── Aside ── */}
      <s-section slot="aside" heading="Quick Actions">
        <s-stack direction="block" gap="base">
          <s-button href="/app/knowledge" variant="secondary" full-width>
            Upload Knowledge File
          </s-button>
          <s-button href="/app/setup" variant="secondary" full-width>
            View Setup Guide
          </s-button>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="How It Works">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold">1. Live product data</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Your store's products are fetched on every customer question — always up to date.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">2. Gemini AI answers</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Google Gemini reads the product data and replies in friendly, natural language.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">3. Custom knowledge</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Upload a PDF, TXT, or CSV (FAQ, size guide, return policy) to give the AI extra context.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">4. Zero performance impact</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Everything runs on Vercel serverless functions — completely separate from your store.
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
