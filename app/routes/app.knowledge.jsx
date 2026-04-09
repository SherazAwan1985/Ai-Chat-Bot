import { useState, useRef } from "react";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const backendUrl = process.env.CHATBOT_BACKEND_URL || "";
  let uploadStatus = { hasCustomData: false, characters: 0 };

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/upload`);
      if (res.ok) uploadStatus = await res.json();
    } catch {
      // backend unreachable — leave defaults
    }
  }

  return { backendUrl, uploadStatus };
};

export default function KnowledgePage() {
  const { backendUrl, uploadStatus } = useLoaderData();
  const [status, setStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [message, setMessage] = useState("");
  const [chars, setChars] = useState(uploadStatus.characters);
  const [hasData, setHasData] = useState(uploadStatus.hasCustomData);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setStatus("uploading");
    setMessage("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(`File "${file.name}" uploaded successfully.`);
        setChars(data.characters);
        setHasData(true);
      } else {
        setStatus("error");
        setMessage(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the chatbot backend. Check that CHATBOT_BACKEND_URL is correct.");
    } finally {
      // reset so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const backendMissing = !backendUrl;

  return (
    <s-page heading="Knowledge Base">
      {/* ── Current knowledge status ── */}
      <s-section heading="Current Knowledge Status">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border-width="base" border-radius="base">
            <s-stack direction="inline" gap="base">
              <s-text size="large">{hasData ? "📄" : "📭"}</s-text>
              <s-stack direction="block" gap="extraTight">
                <s-text weight="bold">
                  {hasData ? "Custom knowledge file loaded" : "No custom knowledge uploaded yet"}
                </s-text>
                <s-text tone="subdued" size="small">
                  {hasData
                    ? `${chars.toLocaleString()} characters stored — the AI will use this as extra context.`
                    : "Upload a PDF, TXT, or CSV file to give the AI extra information about your store."}
                </s-text>
              </s-stack>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* ── Upload section ── */}
      <s-section heading="Upload New File">
        {backendMissing ? (
          <s-box padding="base" border-width="base" border-radius="base">
            <s-stack direction="inline" gap="base">
              <s-text size="large">⚠️</s-text>
              <s-stack direction="block" gap="extraTight">
                <s-text weight="bold">Backend URL not configured</s-text>
                <s-text tone="subdued" size="small">
                  Add <s-text weight="bold">CHATBOT_BACKEND_URL</s-text> to your app environment
                  variables (your Vercel deployment URL) and restart the app.
                </s-text>
              </s-stack>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              <s-text>
                Upload a file to provide the AI with extra information — such as a return policy,
                FAQ, size guide, or product details not captured in Shopify descriptions. The file
                content is stored on Vercel Blob and referenced on every customer question.
              </s-text>
            </s-paragraph>

            <s-stack direction="block" gap="tight">
              <s-text weight="bold">Accepted formats</s-text>
              <s-unordered-list>
                <s-list-item>PDF — any document exported as PDF</s-list-item>
                <s-list-item>TXT — plain text file</s-list-item>
                <s-list-item>CSV — spreadsheet exported as CSV</s-list-item>
              </s-unordered-list>
              <s-text tone="subdued" size="small">Maximum file size: 10 MB. Maximum text extracted: 15,000 characters.</s-text>
            </s-stack>

            {/* Hidden file input driven by the button */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.csv"
              style={{ display: "none" }}
              onChange={handleUpload}
              disabled={status === "uploading"}
            />

            <s-stack direction="inline" gap="base">
              <s-button
                onClick={() => fileRef.current?.click()}
                disabled={status === "uploading"}
                variant="primary"
              >
                {status === "uploading" ? "Uploading…" : "Choose File to Upload"}
              </s-button>
              {fileName && status !== "uploading" && (
                <s-text tone="subdued" size="small">Selected: {fileName}</s-text>
              )}
            </s-stack>

            {/* Status feedback */}
            {status === "uploading" && (
              <s-box padding="base" border-width="base" border-radius="base">
                <s-stack direction="inline" gap="base">
                  <s-spinner />
                  <s-text>Uploading and processing file…</s-text>
                </s-stack>
              </s-box>
            )}
            {status === "success" && (
              <s-box padding="base" border-width="base" border-radius="base">
                <s-stack direction="inline" gap="base">
                  <s-text>✅</s-text>
                  <s-stack direction="block" gap="extraTight">
                    <s-text weight="bold">{message}</s-text>
                    <s-text tone="subdued" size="small">
                      {chars.toLocaleString()} characters extracted and stored. The AI will use
                      this content starting from the next customer message.
                    </s-text>
                  </s-stack>
                </s-stack>
              </s-box>
            )}
            {status === "error" && (
              <s-box padding="base" border-width="base" border-radius="base">
                <s-stack direction="inline" gap="base">
                  <s-text>❌</s-text>
                  <s-stack direction="block" gap="extraTight">
                    <s-text weight="bold">Upload failed</s-text>
                    <s-text tone="subdued" size="small">{message}</s-text>
                  </s-stack>
                </s-stack>
              </s-box>
            )}
          </s-stack>
        )}
      </s-section>

      {/* ── Aside tips ── */}
      <s-section slot="aside" heading="Tips for Best Results">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold">Return policy</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Export your return policy page as a PDF and upload it so customers get accurate answers about returns.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">FAQ document</s-text>
            <br />
            <s-text size="small" tone="subdued">
              A TXT file with common questions and answers works great and is easy to maintain.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Size guide</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Export your size chart as a CSV — column names become labels the AI can reference.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Re-upload anytime</s-text>
            <br />
            <s-text size="small" tone="subdued">
              Uploading a new file replaces the previous one immediately.
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="What the AI won't use">
        <s-text size="small" tone="subdued">
          The AI always has live access to your Shopify product data (title, price, stock, description,
          tags) regardless of this upload. The uploaded file is extra context only — not a replacement
          for product data.
        </s-text>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
