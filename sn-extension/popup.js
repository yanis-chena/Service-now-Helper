const btnRun        = document.getElementById('btnRun');
const btnTrame      = document.getElementById('btnTrame');
const btnAssistance = document.getElementById('btnAssistance');
const statusEl      = document.getElementById('status');
const statusText    = document.getElementById('statusText');
const infoEntity    = document.getElementById('infoEntity');
const infoLogin     = document.getElementById('infoLogin');
const infoMode      = document.getElementById('infoMode');
const footerDot     = document.getElementById('footerDot');

// =========================
// STATUS
// =========================

function setStatus(type, text) {
  statusEl.className = `show ${type}`;
  statusText.textContent = text;
}

// =========================
// UI INFOS
// =========================

function updateInfoCards(result) {
  if (!result) return;
  infoEntity.textContent   = result.entity || '—';
  infoLogin.textContent    = result.login  || '—';
  infoMode.innerHTML = result.isAgence
    ? '<span class="tag">Agence GAN</span>'
    : 'Standard';
  footerDot.classList.add('active');
}

// =========================
// HELPER : frame incident
// =========================

async function getIncidentFrame(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  return frames.find(
    f => f.url?.includes('incident.do') && f.url?.includes('sys_id=')
  ) || null;
}

// =========================
// HELPER : injection générique
// =========================

async function runScript(file, btn, successMsg) {
  btn.disabled = true;
  setStatus('loading', 'Exécution en cours…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { setStatus('error', 'Onglet introuvable.'); return; }

    const targetFrame = await getIncidentFrame(tab.id);
    if (!targetFrame) { setStatus('error', 'Frame incident introuvable.'); return; }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [targetFrame.frameId] },
      files: [file]
    });

    const result = results?.[0]?.result ?? null;

    if (!result)          setStatus('error', 'Aucune réponse du script.');
    else if (result.error) setStatus('error', result.error);
    else {
      setStatus('success', successMsg);
      updateInfoCards(result);
    }
  } catch (err) {
    console.error(err);
    setStatus('error', err?.message || 'Erreur inconnue');
  } finally {
    btn.disabled = false;
  }
}

// =========================
// BOUTONS
// =========================

btnAssistance.addEventListener('click', () =>
  runScript('content_assistance.js', btnAssistance, 'Trame Assistance insérée ✓'));

btnTrame.addEventListener('click', () =>
  runScript('content_trame.js', btnTrame, 'Trame Tech insérée ✓'));

btnRun.addEventListener('click', () =>
  runScript('content.js', btnRun, 'Description mise à jour ✓'));

// =========================
// RACCOURCIS CLAVIER (popup ouvert)
// =========================

document.addEventListener('keydown', (e) => {
  if (!e.altKey) return;

  switch (e.key.toLowerCase()) {
    case 'w': e.preventDefault(); if (!btnAssistance.disabled) btnAssistance.click(); break;
    case 'x': e.preventDefault(); if (!btnTrame.disabled)      btnTrame.click();      break;
    case 'v': e.preventDefault(); if (!btnRun.disabled)        btnRun.click();        break;
  }
});