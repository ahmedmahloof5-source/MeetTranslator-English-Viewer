
(() => {
  if (window.meetTranslatorLoaded) return;
  window.meetTranslatorLoaded = true;

  let receiveEnabled = false;
  let outgoingEnabled = true;
  let lastEditor = null;

  let originalDraft = "";
  let lastTranslatedDraft = "";
  let originalEditor = null;

  const translated = new WeakSet();

  // Translation requests run in the extension service worker so the
  // cross-origin request uses the declared host permission.
  function translate(text, from, to, mode = "translate") {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "MEET_TRANSLATOR_REQUEST", text, from, to, mode },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.error || "Translation failed"));
            return;
          }
          resolve(response.result);
        }
      );
    });
  }

  async function toRomaji(japanese) {
    return translate(japanese, "ja", "ja", "romaji");
  }

  // Create translator panel
  const panel = document.createElement("div");
  panel.id = "meet-translator-panel";

  panel.style.cssText = `
    position: fixed;
    top: 150px;
    left: 150px;
    width: 250px;
    min-width: 210px;
    min-height: 260px;
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
    resize: both;
    overflow: auto;
    box-sizing: border-box;
    z-index: 9999999;
    background: white;
    color: #222;
    padding: 14px;
    border: 1px solid #888;
    border-radius: 10px;
    box-shadow: 0 3px 15px #555;
    font: 14px Arial, sans-serif;
  `;

  panel.innerHTML = `
    <div id="translator-header"
      style="background:#333;color:white;padding:10px;
      margin:-14px -14px 12px -14px;
      border-radius:9px 9px 0 0;
      cursor:move;user-select:none;font-weight:bold;">
      ☰ MOVE TRANSLATOR · RESIZE CORNER
    </div>

    <b>🌐 Meet Translator v2.1</b>

    <label style="display:block;margin-top:12px">
      <input type="checkbox" id="receive">
      Auto-translate Japanese text on Meet page
    </label>

    <label style="display:block;margin-top:8px">
      <input type="checkbox" id="outgoing" checked>
      Enable outgoing translation
    </label>

    <div style="margin-top:8px;font-size:11px;color:#666;line-height:1.35">
      Translation text is sent to Google. Incoming page scanning is off by default.
    </div>

    <hr>

    <button id="translate-japanese"
      style="width:100%;padding:8px;margin:3px 0">
      🇯🇵 Japanese
    </button>

    <button id="translate-romaji"
      style="width:100%;padding:8px;margin:3px 0">
      🔤 Romaji
    </button>

    <button id="translate-both"
      style="width:100%;padding:8px;margin:3px 0">
      🌐 English + Japanese
    </button>

    <button id="translate-english"
      style="width:100%;padding:8px;margin:3px 0">
      🇬🇧 Revert to English
    </button>

    <div id="translator-status"
      style="margin-top:10px;font-size:12px;color:#16803c">
      Translator ready.
    </div>

    <div style="margin-top:10px;font-size:11px;color:#666">
      Shortcuts: Ctrl+J / R / B / E
    </div>
  `;

  document.body.appendChild(panel);

  // The Chrome toolbar icon hides/shows only the panel. The content script,
  // incoming-message observer, and keyboard shortcuts remain active.
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type !== "MEET_TRANSLATOR_TOGGLE_PANEL") return;
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  const status = document.getElementById("translator-status");

  // Drag panel
  const header = document.getElementById("translator-header");

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener("pointerdown", e => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener("pointermove", e => {
    if (!dragging) return;

    const x = Math.max(
      0,
      Math.min(
        window.innerWidth - panel.offsetWidth,
        e.clientX - offsetX
      )
    );

    const y = Math.max(
      0,
      Math.min(
        window.innerHeight - panel.offsetHeight,
        e.clientY - offsetY
      )
    );

    panel.style.left = x + "px";
    panel.style.top = y + "px";
  });

  header.addEventListener("pointerup", () => {
    dragging = false;
  });

  header.addEventListener("pointercancel", () => {
    dragging = false;
  });

  // ON/OFF switches
  document.getElementById("receive").onchange = e => {
    receiveEnabled = e.target.checked;
    status.textContent = receiveEnabled
      ? "Incoming translation ON — matching page text may be sent to Google."
      : "Incoming translation OFF";
    if (receiveEnabled) scanMessages();
  };

  document.getElementById("outgoing").onchange = e => {
    outgoingEnabled = e.target.checked;
    status.textContent = outgoingEnabled
      ? "Outgoing translation ON"
      : "Outgoing translation OFF";
  };

  // Remember active chat input
  document.addEventListener("focusin", e => {
    if (
      e.target.matches?.(
        '[contenteditable="true"], textarea'
      )
    ) {
      lastEditor = e.target;
    }
  });

  function getEditor() {
    if (lastEditor?.isConnected) return lastEditor;
    return null;
  }

  function getText(editor) {
    return editor.isContentEditable
      ? editor.innerText
      : editor.value;
  }

  // Replace draft without sending it
  function replaceDraft(editor, text) {
    editor.focus();

    if (editor.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();

      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand("insertText", false, text);

    } else {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      if (!setter) throw new Error("Input not supported");

      setter.call(editor, text);

      editor.dispatchEvent(new Event("input", {
        bubbles: true
      }));
    }
  }

  // Translation modes
  async function translateDraft(mode) {
    if (!outgoingEnabled) {
      status.textContent = "Outgoing translation is OFF.";
      return;
    }

    const editor = getEditor();

    if (!editor) {
      status.textContent =
        "Click the Meet chat box and type first.";
      return;
    }

    const current = getText(editor).trim();

    if (!current) {
      status.textContent = "Write a message first.";
      return;
    }

    // Remember original English text
    if (editor !== originalEditor) {
      originalEditor = editor;
      originalDraft = current;
      lastTranslatedDraft = "";

    } else if (current !== lastTranslatedDraft) {
      originalDraft = current;
      lastTranslatedDraft = "";
    }

    // Restore English
    if (mode === "english") {
      replaceDraft(editor, originalDraft);
      lastTranslatedDraft = "";
      status.textContent = "Original English restored.";
      return;
    }

    try {
      status.textContent = "Translating...";

      const japanese = await translate(
        originalDraft,
        "en",
        "ja"
      );

      let result;

      if (mode === "japanese") {
        result = japanese;

      } else if (mode === "both") {
        result = originalDraft + "\n" + japanese;

      } else if (mode === "romaji") {
        result = await toRomaji(japanese);
      }

      replaceDraft(editor, result);
      lastTranslatedDraft = result;

      status.textContent =
        "Translation ready! Check before sending.";

    } catch (error) {
      console.error(error);
      status.textContent = "Translation failed. Try again.";
    }
  }

  // Button actions
  document.getElementById("translate-japanese").onclick =
    () => translateDraft("japanese");

  document.getElementById("translate-romaji").onclick =
    () => translateDraft("romaji");

  document.getElementById("translate-both").onclick =
    () => translateDraft("both");

  document.getElementById("translate-english").onclick =
    () => translateDraft("english");

  // Keyboard shortcuts
  document.addEventListener("keydown", event => {
    if (
      !event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    ) return;

    const shortcuts = {
      j: "japanese",
      r: "romaji",
      b: "both",
      e: "english"
    };

    const mode = shortcuts[event.key.toLowerCase()];

    if (mode) {
      event.preventDefault();
      event.stopPropagation();
      translateDraft(mode);
    }
  }, true);

  // Detect incoming Japanese messages
  async function scanMessages() {
    if (!receiveEnabled) return;

    const elements = document.querySelectorAll("div, p, span");

    for (const element of elements) {
      if (element.closest("#meet-translator-panel")) continue;
      if (translated.has(element)) continue;
      if (element.isContentEditable) continue;

      const text = element.innerText?.trim();

      if (!text || text.length < 2 || text.length > 500) continue;

      if (!/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) continue;

      // Avoid translating parent elements repeatedly
      if ([...element.children].some(child =>
        /[\u3040-\u30ff\u4e00-\u9faf]/.test(
          child.innerText || ""
        )
      )) continue;

      translated.add(element);

      try {
        const english = await translate(text, "ja", "en");

        if (!receiveEnabled || !element.isConnected) continue;

        const result = document.createElement("div");

        result.className = "meet-translated-message";
        result.textContent = "🇬🇧 " + english;

        result.style.cssText = `
          color:#16803c;
          background:#e8f5e9;
          padding:6px;
          margin-top:5px;
          border-radius:6px;
          font-size:13px;
        `;

        element.appendChild(result);

      } catch (error) {
        console.error(error);
      }
    }
  }

  let scanTimer;

  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanMessages, 400);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  scanMessages();

  console.log("Meet Japanese Translator v2.1 loaded!");

})();