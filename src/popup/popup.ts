document.getElementById('menu-overview')?.addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('overview.html') });
  window.close();
});

document.getElementById('menu-workflow')?.addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('workflow.html') });
  window.close();
});