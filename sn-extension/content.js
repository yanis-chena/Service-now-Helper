// content.js
(async () => {
  console.log('🚀 SN Incident Helper démarré');

  // =========================
  // UTILITAIRES
  // =========================

  function waitForElementById(id, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const el = document.getElementById(id);
        if (el) { clearInterval(interval); resolve(el); return; }
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error(`Timeout : #${id} introuvable.`));
        }
      }, 200);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeRegex(label) {
    return label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function setLine(desc, label, value) {
    const regex = new RegExp(`^${escapeRegex(label)}\\s*:.*$`, 'm');
    if (regex.test(desc)) return desc.replace(regex, `${label} : ${value}`);
    return desc;
  }

  function setFieldValue(field, value) {
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function showToast(message, type = 'success') {
    const existing = document.getElementById('__sn_script_toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = '__sn_script_toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      padding: 12px 20px; border-radius: 8px; font-family: sans-serif;
      font-size: 14px; color: #fff;
      background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // =========================
  // TABLE DES ACRONYMES
  // =========================

  const COMPANY_ACRONYMS = {
    'GROUPAMA MEDITERRANEE': 'GMED',
    'GROUPAMA CENTRE MANCHE': 'GCM',
    'GROUPAMA GAN VIE': 'GGVIE',
    'GAN PREVOYANCE': 'GANPREV',
    'GROUPAMA SUPPORTS & SERVICES': 'G2S',
    'GROUPAMA MA': 'GMA',
    'CIGAC': 'CIGAC',
    'GROUPAMA EPARGNE SALARIALE': 'GES',
    'GROUPAMA NORD-EST': 'GNE',
    'GROUPAMA GRAND EST': 'GGE',
    'GROUPAMA D OC': 'GOC',
    'GAN PATRIMOINE': 'GANPAT',
    'GROUPAMA CENTRE ATLANTIQUE': 'GCA',
    'GROUPAMA RHONE ALPES AUVERGNE': 'GRAA',
    'GROUPAMA PARIS VAL DE LOIRE': 'GPVL',
    'GROUPAMA ANTILLES GUYANE': 'GAG',
    'GROUPAMA OCEAN INDIEN': 'GOI',
    'JURITRAVAIL': 'JURITRAVAIL',
    'GROUPAMA PROTECTION JURIDIQUE': 'GPJ',
    'GROUPAMA ASSURANCE-CREDIT': 'GAC',
    'GROUPAMA ASSET MANAGEMENT': 'GAM',
    'MUTUAIDE': 'MUTUAIDE',
    'GROUPAMA LOIRE BRETAGNE': 'GLB',
    'GROUPAMA IMMOBILIER': 'GIMMO',
    'GROUPAMA FORET ASSU (MISSO)': 'GFA',
    'SOCIETE FORESTIERE GROUPAMA': 'SFG',
    'CSE GMA': 'CSE GMA',
    'GAN OUTRE MER IA': 'GOM IA',
    'GROUPAMA ZASTRAHOVANE': 'GZAST',
    'GROUPAMA ASIGURARI SA': 'GASIG',
  };

  function resolveAcronym(companyRaw) {
    const normalized = companyRaw.trim().toUpperCase();
    return COMPANY_ACRONYMS[normalized] || companyRaw.trim() || '⚠️ inconnu';
  }

  await delay(800);

  // =========================
  // LECTURE CHAMPS
  // =========================

  const callerName     = document.getElementById('sys_display.incident.caller_id')?.value || '';
  const beneficiaryName = document.getElementById('sys_display.incident.u_beneficiary')?.value || '';
  const phoneNumber    = document.getElementById('incident.u_phone_contact')?.value || '';
  const hardware       = document.getElementById('sys_display.incident.u_related_hardware_ci')?.value || '';
  const companyRaw     = document.getElementById('incident.company_label')?.value || '';

  // =========================
  // POPUP BENEFICIAIRE
  // =========================

  let btn;
  try {
    btn = await waitForElementById('viewr.incident.u_beneficiary');
  } catch (err) {
    showToast('❌ Bouton bénéficiaire introuvable.', 'error');
    return { error: 'Bouton bénéficiaire introuvable.' };
  }

  btn.click();

  let windowsLogin = '';
  let userFunction = '';

  try {
    await waitForElementById('sys_readonly.sys_user.u_windows_login');
    await delay(200);
    windowsLogin = document.getElementById('sys_readonly.sys_user.u_windows_login')?.value || '';
    userFunction = document.getElementById('sys_readonly.sys_user.u_function')?.value || '';
  } catch (err) {
    console.warn('⚠️ Popup bénéficiaire :', err.message);
  } finally {
    const closeBtn =
      document.querySelector('.modal .close') ||
      document.querySelector('.modal .icon-cross') ||
      document.querySelector('.modal-footer .btn-default') ||
      document.querySelector('[data-dismiss="modal"]');
    if (closeBtn) closeBtn.click();
    else console.warn('⚠️ Aucun bouton fermeture trouvé');
  }

  // =========================
  // MODE AGENCE GAN
  // =========================

  const isAgenceGan   = userFunction.trim().toLowerCase() === 'agence gan';
  const entityAcronym = isAgenceGan ? 'GAN AGT' : resolveAcronym(companyRaw);

  // =========================
  // SHORT DESCRIPTION
  // =========================

  const shortDescField = document.getElementById('incident.short_description');
  if (shortDescField) {
    const updatedShortDesc = shortDescField.value.replace(/^Entité(?=\s*\/)/i, entityAcronym);
    setFieldValue(shortDescField, updatedShortDesc);
  }

  // =========================
  // DESCRIPTION LONGUE
  // =========================

  const field = document.getElementById('incident.description');
  if (!field) {
    showToast('❌ Champ description introuvable.', 'error');
    return { error: 'Champ description introuvable.' };
  }

  let desc = field.value || '';
  const FALLBACK = '⚠️ inconnu';
  const needSplit = callerName && beneficiaryName && callerName !== beneficiaryName;

  if (needSplit) {
    const headerBlock = `Nom prénom déclarant : ${callerName}\nBénéficiaire :`;
    const match = desc.match(/^Identifiant\s*:/m);
    if (match) desc = desc.replace(match[0], headerBlock + '\n' + match[0]);
    else desc = headerBlock + '\n' + desc;
  }

  if (isAgenceGan) {
    desc = setLine(desc, 'Identifiant', '');
    desc = setLine(desc, 'Prénom / Nom', '');
    const agenceBlock = `Code Agence : ${windowsLogin || FALLBACK}\nNom Agence : ${beneficiaryName || callerName || FALLBACK}`;
    const identMatch = desc.match(/^Identifiant\s*:/m);
    if (identMatch) desc = desc.replace(identMatch[0], agenceBlock + '\n' + identMatch[0]);
    else desc = agenceBlock + '\n' + desc;
  } else {
    desc = setLine(desc, 'Identifiant', windowsLogin || callerName || FALLBACK);
    desc = setLine(desc, 'Prénom / Nom', beneficiaryName || callerName || FALLBACK);
  }

  desc = setLine(desc, 'Téléphone', phoneNumber || FALLBACK);
  desc = setLine(desc, 'Matériel associé', hardware || FALLBACK);

  setFieldValue(field, desc);
  showToast('✅ Description mise à jour avec succès.');

  return {
    entity: entityAcronym,
    func:   userFunction || '—',
    login:  windowsLogin || '—',
    isAgence: isAgenceGan
  };
})();
