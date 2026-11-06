// Translation requests are handled here because the content script runs
// in the page's origin. Only translation text is sent to Google's endpoint.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "MEET_TRANSLATOR_REQUEST") return;

  (async () => {
    const { text, from, to, mode } = message;
    if (typeof text !== "string" || !text.trim() || text.length > 5000) {
      throw new Error("Please provide text between 1 and 5,000 characters.");
    }
    if (!/^[a-z]{2,3}$/.test(from) || !/^[a-z]{2,3}$/.test(to)) {
      throw new Error("Unsupported language code.");
    }

    const params = new URLSearchParams({
      client: "gtx",
      sl: from,
      tl: to,
      dt: mode === "romaji" ? "rm" : "t",
      q: text
    });
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params.toString()}`
    );
    if (!response.ok) throw new Error("Translation service unavailable.");
    const data = await response.json();
    const parts = data?.[0] || [];
    const result = mode === "romaji"
      ? parts.map(part => part?.[3] || "").filter(Boolean).join(" ")
      : parts.map(part => part?.[0] || "").join("");
    if (!result) throw new Error("No translation was returned.");
    sendResponse({ ok: true, result });
  })().catch(error => {
    sendResponse({ ok: false, error: error?.message || "Translation failed." });
  });

  return true;
});


// Clicking the toolbar extension icon toggles the translator panel on the
// active Google Meet tab. The content script keeps running while the panel
// is hidden, so translation and keyboard shortcuts continue to work.
chrome.action.onClicked.addListener(tab => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(
    tab.id,
    { type: "MEET_TRANSLATOR_TOGGLE_PANEL" },
    () => {
      // No receiver means the current tab is not a Meet page, or Meet has
      // not finished loading. The user can click again after Meet loads.
      void chrome.runtime.lastError;
    }
  );
});
