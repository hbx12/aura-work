chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "extract-page") return;
  try {
    const text = document.body?.innerText?.trim() ?? "";
    sendResponse({
      ok: true,
      url: location.href,
      title: document.title,
      content: text.slice(0, 50000),
    });
  } catch (e) {
    sendResponse({ ok: false, error: String(e) });
  }
  return true;
});
