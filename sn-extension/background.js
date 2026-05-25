// background.js — service worker

chrome.commands.onCommand.addListener(async (command) => {
  console.log('⌨️ Commande reçue :', command);

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    console.warn('⚠️ Aucun onglet actif trouvé.');
    return;
  }

  let frames;
  try {
    frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
  } catch (err) {
    console.warn('⚠️ Impossible de lire les frames :', err.message);
    return;
  }

  const targetFrame = frames.find(
    f => f.url?.includes('incident.do') && f.url?.includes('sys_id=')
  );

  if (!targetFrame) {
    console.warn('⚠️ Frame incident introuvable.');
    return;
  }

  const scriptMap = {
    'trame-assistance': 'content_assistance.js',
    'trame-tech':       'content_trame.js',
  };

  const file = scriptMap[command];
  if (!file) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [targetFrame.frameId] },
      files: [file]
    });
    console.log('✅ Script injecté :', file);
  } catch (err) {
    console.error('❌ Erreur injection :', err.message);
  }
});
