function sendResponse(id, result) {
  window.postMessage({ type: "bg result", id, result, to: "is" }, window.origin);
}

function sendError(id, error) {
  window.postMessage({ type: "error", id, error, to: "is" }, window.origin);
}

window.addEventListener("message", (o) => {
  if (o.origin !== window.origin || o.data.to !== "cs") return;
  const id = o.data.id;

  if (o.data.type === "get storage") {
    chrome.storage.sync.get([o.data.key], (res) => {
      if (chrome.runtime.lastError) return sendError(id, chrome.runtime.lastError.message);
      sendResponse(id, res);
    });
  } else if (o.data.type === "set storage") {
    chrome.storage.sync.set({ [o.data.key]: o.data.value }, () => {
      if (chrome.runtime.lastError) return sendError(id, chrome.runtime.lastError.message);
      sendResponse(id, true);
    });
  } else {
    o.data.to = "bg";
    chrome.runtime.sendMessage(o.data, (response) => {
      window.postMessage(response, window.origin);
    });
  }
});

chrome.runtime.onMessage.addListener((e) => {
  window.postMessage(e, window.origin);
});

const script = document.createElement("script");
script.src = chrome.runtime.getURL("index.js");
script.id = "codeforces++";
(document.body || document.head || document.documentElement).appendChild(script);
script.remove();
