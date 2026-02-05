// background.js - Spabot Background Service

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_options") {
    // Open the options page in a new tab
    chrome.tabs.create({ url: request.url }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true; // Keep message channel open for async response
  }
});
