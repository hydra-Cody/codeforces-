chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.to !== "bg") return;

  if (message.type === "propagate config") {
    const { key, value, id } = message;

    chrome.tabs.query({ url: "*://codeforces.com/*" }, (tabs) => {
      for (const tab of tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (key, value) => {
            window.postMessage({
              type: "config change",
              to: "is",
              id: key,
              value: value
            }, "*");
          },
          args: [key, value]
        });
      }
    });

    sendResponse({ id, to: "is", type: "bg result" });
  }

  return true; // Needed to keep the message channel open for async response
});
