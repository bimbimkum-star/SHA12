/**
 * खाताबुक प्रो - Safegate & IndexedDB Engine
 */

// 1. INDEXEDDB आर्किटेक्चर (नो क्रैश, नो हैंग, नो डेटा लॉस)
const DB_NAME = 'SafegateKhataDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';
let idb = null;
let currentTransactions = [];

// IndexedDB शुरू करना
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      idb = e.target.result;
      resolve(idb);
    };

    request.onerror = (e) => {
      console.error('IndexedDB Error:', e.target.error);
      reject(e.target.error);
    };
  });
}

// IndexedDB CRUD ऑपरेशन्स
function idbAdd(entry) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function idbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClearAndBulkInsert(items) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 2. SAFEGATE PIN सुरक्षा इंजन
let enteredPin = '';
let isSettingNewPin = false;

function initSafegate() {
  const savedPin = localStorage.getItem('SAFEGATE_PIN');
  if (!savedPin) {
    // पहली बार पिन सेट करना
    isSettingNewPin = true;
    document.getElementById('safegateTitle').innerText = '🛡️ नया पिन सेट करें';
    document.getElementById('safegateDesc').innerText = 'सुरक्षा के लिए 4-अंकों का गुप्त पिन बनाएं';
  } else {
    isSettingNewPin = false;
    document.getElementById('safegateTitle').innerText = '🛡️ Safegate सुरक्षा लॉक';
    document.getElementById('safegateDesc').innerText = 'खाता खोलने के लिए अपना पिन दर्ज करें';
  }
}

function pressPin(num) {
  if (enteredPin.length < 4) {
    enteredPin += num;
    updatePinDots();
    if (enteredPin.length === 4) {
      setTimeout(submitPin, 100);
    }
  }
}

function clearPin() {
  enteredPin = '';
  updatePinDots();
  document.getElementById('pinErrorMsg').innerText = '';
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pinDots .dot');
  dots.forEach((dot, index) => {
    if (index < enteredPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function submitPin() {
  const errorEl = document.getElementById('pinErrorMsg');
  const savedPin = localStorage.getItem('SAFEGATE_PIN');

  if (isSettingNewPin) {
    if (enteredPin.length === 4) {
      localStorage.setItem('SAFEGATE_PIN', enteredPin);
      alert('Safegate पिन सफलतापूर्वक सेट हो गया!');
      unlockApp();
    }
  } else {
    if (enteredPin === savedPin) {
      unlockApp();
    } else {
      errorEl.innerText = '⚠️ गलत पिन! कृपया पुनः प्रयास करें।';
      clearPin();
    }
  }
}

function unlockApp() {
  document.getElementById('safegateShield').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  loadAndSyncData();
}

function lockAppNow() {
  clearPin();
  initSafegate();
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('safegateShield').style.display = 'flex';
}

// 3. सेटिंग्स और स्टेट
let settings = {
  shopName: "ऑडियो खाताबुक प्रो",
  phone: "",
  upi: ""
};

try {
  const savedSettings = localStorage.getItem('PRO_KHATA_SETTINGS');
  if (savedSettings) settings = JSON.parse(savedSettings);
} catch (e) {
  console.error(e);
}

function applySettings() {
  document.getElementById('shopHeaderTitle').innerText = '🎙️ ' + settings.shopName;
  if (settings.phone) {
    document.getElementById('shopHeaderSubtitle').innerText = `संपर्क: ${settings.phone} | Safegate Active`;
  }
}

function openSettingsModal() {
  document.getElementById('settingShopName').value = settings.shopName || '';
  document.getElementById('settingShopPhone').value = settings.phone || '';
  document.getElementById('settingShopUpi').value = settings.upi || '';
  document.getElementById('settingShopPin').value = '';
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');
}

function saveSettings() {
  settings.shopName = document.getElementById('settingShopName').value.trim() || 'ऑडियो खाताबुक प्रो';
  settings.phone = document.getElementById('settingShopPhone').value.trim();
  settings.upi = document.getElementById('settingShopUpi').value.trim();

  const newPin = document.getElementById('settingShopPin').value.trim();
  if (newPin.length === 4 && !isNaN(newPin)) {
    localStorage.setItem('SAFEGATE_PIN', newPin);
  }

  localStorage.setItem('PRO_KHATA_SETTINGS', JSON.stringify(settings));
  applySettings();
  closeSettingsModal();
  speakText('सेटिंग्स सुरक्षित रूप से सेव हो गई हैं।');
}

// 4. डेटा सिंकिंग और रेंडरिंग
async function loadAndSyncData() {
  currentTransactions = await idbGetAll();
  // समय के आधार पर सॉर्ट
  currentTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  renderTable();
  updateSummary();
}

function initDateTime() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  document.getElementById('custDateTime').value = localISO;
}

async function addEntry(name, amount, type, isoDate) {
  const item = {
    id: 'TX_' + Date.now() + Math.floor(Math.random() * 100),
    name: name.trim(),
    amount: parseFloat(amount),
    type: type,
    timestamp: isoDate || new Date().toISOString()
  };

  await idbAdd(item);
  await loadAndSyncData();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('custName').value;
  const amt = document.getElementById('custAmount').value;
  const typ = document.getElementById('custType').value;
  const dt = new Date(document.getElementById('custDateTime').value).toISOString();

  await addEntry(name, amt, typ, dt);

  document.getElementById('custName').value = '';
  document.getElementById('custAmount').value = '';
  initDateTime();
  speakText(`${name} की प्रविष्टि सुरक्षित सहेज ली गई है।`);
}

async function deleteEntry(id) {
  if (confirm('क्या आप सच में इस एंट्री को हटाना चाहते हैं?')) {
    await idbDelete(id);
    await loadAndSyncData();
  }
}

// 5. टेबल और समरी UI
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const search = (document.getElementById('searchBar').value || '').toLowerCase().trim();
  const filter = document.getElementById('filterType').value;

  tbody.innerHTML = '';

  const filtered = currentTransactions.filter(item => {
    const matchesName = item.name.toLowerCase().includes(search);
    const matchesType = (filter === 'ALL') || (item.type === filter);
    return matchesName && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:24px;">कोई लेन-देन नहीं मिला</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    const isIncome = item.type === 'IN';
    const d = new Date(item.timestamp);
    const dtFormatted = d.toLocaleDateString('hi-IN', { day:'2-digit', month:'short' }) + ' ' + d.toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' });

    tr.innerHTML = `
      <td>${dtFormatted}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td class="${isIncome ? 'tag-in' : 'tag-out'}">${isIncome ? 'जमा (IN)' : 'उधार (OUT)'}</td>
      <td class="${isIncome ? 'tag-in' : 'tag-out'}">₹${item.amount.toLocaleString('en-IN')}</td>
      <td>
        <div class="actions-wrap">
          ${!isIncome ? `
            <button class="btn-action btn-wa" onclick="sendWhatsApp('${escapeHtml(item.name)}',${item.amount})" title="WhatsApp">💬 WhatsApp</button>
            <button class="btn-action btn-upi" onclick="showUpiQR('${escapeHtml(item.name)}',${item.amount})" title="QR Pay">📱 QR Pay</button>
          ` : ''}
          <button class="btn-action" onclick="openEditModal('${item.id}')" title="एडिट">✏️️</button>
          <button class="btn-action" onclick="deleteEntry('${item.id}')" title="हटाएं">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummary() {
  let inSum = 0;
  let outSum = 0;
  currentTransactions.forEach(t => {
    if (t.type === 'IN') inSum += t.amount;
    else outSum += t.amount;
  });

  document.getElementById('sumIn').innerText = '₹' + inSum.toLocaleString('en-IN');
  document.getElementById('sumOut').innerText = '₹' + outSum.toLocaleString('en-IN');
  document.getElementById('sumBalance').innerText = '₹' + (inSum - outSum).toLocaleString('en-IN');
}

// 6. एडिट मोडल
function openEditModal(id) {
  const item = currentTransactions.find(t => t.id === id);
  if (!item) return;

  document.getElementById('editId').value = item.id;
  document.getElementById('editName').value = item.name;
  document.getElementById('editAmount').value = item.amount;
  document.getElementById('editType').value = item.type;

  const d = new Date(item.timestamp);
  const tzOffset = d.getTimezoneOffset() * 60000;
  document.getElementById('editDateTime').value = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);

  document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const item = currentTransactions.find(t => t.id === id);
  if (item) {
    item.name = document.getElementById('editName').value.trim();
    item.amount = parseFloat(document.getElementById('editAmount').value);
    item.type = document.getElementById('editType').value;
    item.timestamp = new Date(document.getElementById('editDateTime').value).toISOString();
    
    await idbAdd(item);
    await loadAndSyncData();
    closeEditModal();
    speakText('एंट्री अपडेट कर दी गई है।');
  }
}

// 7. व्हाट्सएप और QR
function sendWhatsApp(name, amount) {
  let msg = `नमस्ते ${name} जी, ${settings.shopName} में आपके खाते का ₹${amount.toLocaleString('en-IN')} बकाया शेष है। कृपया भुगतान करें।`;
  if (settings.upi) msg += ` UPI ID: ${settings.upi}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function showUpiQR(name, amount) {
  if (!settings.upi) {
    alert('कृपया पहले सेटिंग्स में जाकर UPI ID दर्ज करें!');
    openSettingsModal();
    return;
  }
  const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upi)}&pn=${encodeURIComponent(settings.shopName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Khata: ' + name)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  document.getElementById('upiCardContent').innerHTML = `
    <h4 style="margin:0;">${escapeHtml(settings.shopName)}</h4>
    <p style="font-size:12px; color:#555;">ग्राहक: <strong>${escapeHtml(name)}</strong></p>
    <p style="font-size:16px; font-weight:bold; color:#10b981; margin-top:4px;">राशि: ₹${amount.toLocaleString('en-IN')}</p>
    <img src="${qrApiUrl}" alt="UPI QR">
    <p style="font-size:11px; color:#666;">Google Pay / PhonePe / Paytm से स्कैन करें</p>
  `;
  document.getElementById('upiModal').classList.add('show');
}

function closeUpiModal() {
  document.getElementById('upiModal').classList.remove('show');
}

// 8. वॉयस असिस्टेंट इंजन
let recognition = null;
let isListening = false;
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.lang = 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById('micBtn').classList.add('active');
    document.getElementById('soundwave').classList.add('active');
    document.getElementById('micText').innerText = 'सुन रहा हूँ... बोलिए';
    document.getElementById('voiceStatus').innerText = 'माइक चालू है, बोलें...';
  };

  recognition.onend = () => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('active');
    document.getElementById('soundwave').classList.remove('active');
    document.getElementById('micText').innerText = 'बोलने के लिए माइक दबाएं';
  };

  recognition.onerror = () => {
    document.getElementById('voiceStatus').innerText = 'आवाज़ साफ नहीं आई, पुनः बोलें।';
  };

  recognition.onresult = (evt) => {
    const spoken = evt.results[0][0].transcript;
    document.getElementById('voiceStatus').innerText = `सुना: "${spoken}"`;
    handleVoiceCommand(spoken);
  };
}

function toggleVoice() {
  if (!recognition) {
    alert('ब्राउज़र में वॉयस सपोर्ट नहीं है। Chrome प्रयोग करें।');
    return;
  }
  if (isListening) recognition.stop();
  else recognition.start();
}

async function handleVoiceCommand(raw) {
  const text = raw.toLowerCase();

  // सवाल पहचानना
  if (text.includes('बकाया') || text.includes('हिसाब') || text.includes('कितना') || text.includes('बाकी')) {
    let matchedCustomer = null;
    for (let item of currentTransactions) {
      if (text.includes(item.name.toLowerCase())) {
        matchedCustomer = item.name;
        break;
      }
    }
    if (matchedCustomer) {
      let bal = 0;
      currentTransactions.filter(t => t.name.toLowerCase() === matchedCustomer.toLowerCase()).forEach(t => {
        if (t.type === 'OUT') bal += t.amount;
        else bal -= t.amount;
      });
      if (bal > 0) speakText(`${matchedCustomer} के यहाँ ${bal} रुपये बाकी हैं।`);
      else if (bal < 0) speakText(`${matchedCustomer} का ${Math.abs(bal)} रुपये जमा है।`);
      else speakText(`${matchedCustomer} का हिसाब बराबर है।`);
    } else {
      speakText('ग्राहक का नाम समझ नहीं आया।');
    }
    return;
  }

  // एंट्री दर्ज करना
  const digits = text.match(/\d+/g);
  if (!digits) {
    speakText('रुपये समझ नहीं आए। दोबारा बोलें।');
    return;
  }
  const amount = parseFloat(digits[0]);

  let type = 'IN';
  const outWords = ['दिया', 'दिए', 'भेजा', 'भेजे', 'उधार दिया', 'पे किया'];
  if (outWords.some(w => text.includes(w))) type = 'OUT';

  let name = 'ग्राहक';
  const namePart = text.match(/(.*?)(?:को|से|ने)/);
  if (namePart && namePart[1]) {
    name = namePart[1].replace(/\d+/g, '').replace(/रुपये|रुपया|रू/g, '').trim();
  }

  await addEntry(name, amount, type, new Date().toISOString());
  speakText(`${name} के खाते में ${amount} रुपये ${type === 'IN' ? 'जमा' : 'उधार'} दर्ज हो गए हैं।`);
}

function speakText(txt) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'hi-IN';
    window.speechSynthesis.speak(u);
  }
}

// 9. प्रिंट इंजन
function openPrintModal() {
  const select = document.getElementById('printCustomerSelect');
  select.innerHTML = '<option value="ALL">-- समस्त ग्राहक (Full Ledger) --</option>';
  const names = [...new Set(currentTransactions.map(t => t.name))];
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.innerText = n;
    select.appendChild(opt);
  });
  document.getElementById('printModal').classList.add('show');
}

function closePrintModal() {
  document.getElementById('printModal').classList.remove('show');
}

function runPrint(mode) {
  const select = document.getElementById('printCustomerSelect');
  const target = select.value;
  const dataToPrint = (target === 'ALL') ? currentTransactions : currentTransactions.filter(t => t.name === target);

  if (dataToPrint.length === 0) {
    alert('प्रिंट के लिए कोई डेटा नहीं है।');
    return;
  }

  let inTotal = 0;
  let outTotal = 0;
  dataToPrint.forEach(t => {
    if (t.type === 'IN') inTotal += t.amount;
    else outTotal += t.amount;
  });

  const outDiv = document.getElementById('printOutput');
  document.body.className = (mode === 'A4') ? 'mode-a4' : 'mode-roll';

  if (mode === 'A4') {
    let rows = dataToPrint.map(t => `
      <tr>
        <td>${new Date(t.timestamp).toLocaleString('hi-IN')}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${t.type === 'IN' ? 'जमा' : 'उधार'}</td>
        <td style="text-align:right;">₹${t.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    outDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h2>${escapeHtml(settings.shopName)}</h2>
          <p style="font-size:12px; color:#555;">संपर्क: ${escapeHtml(settings.phone || 'N/A')}</p>
          <p style="font-size:12px; margin-top:4px;">रिपोर्ट: <strong>${target === 'ALL' ? 'समस्त खाताबुक लेज़र' : escapeHtml(target)}</strong></p>
        </div>
        <div style="text-align:right; font-size:12px;">
          दिनांक: ${new Date().toLocaleDateString('hi-IN')}
        </div>
      </div>
      <hr style="margin: 10px 0;">
      <table>
        <thead>
          <tr><th>दिनांक व समय</th><th>ग्राहक</th><th>प्रकार</th><th style="text-align:right;">राशि</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px; float:right; width:260px; font-size:13px;">
        <p>कुल जमा: <strong>₹${inTotal.toFixed(2)}</strong></p>
        <p>कुल उधार: <strong>₹${outTotal.toFixed(2)}</strong></p>
        <hr style="margin:6px 0;">
        <p style="font-size:15px;">शुद्ध बैलेंस: <strong>₹${(inTotal - outTotal).toFixed(2)}</strong></p>
      </div>
    `;
  } else {
    let rows = dataToPrint.map(t => `
      <tr>
        <td>${new Date(t.timestamp).toLocaleDateString('hi-IN', {day:'2-digit', month:'2-digit'})} ${escapeHtml(t.name.slice(0,8))}</td>
        <td>${t.type}</td>
        <td style="text-align:right;">${t.amount}</td>
      </tr>
    `).join('');

    outDiv.innerHTML = `
      <div class="thermal-box">
        <div class="center">
          <h3 style="margin:0;">${escapeHtml(settings.shopName)}</h3>
          <p style="font-size:9px;">खाता: ${target === 'ALL' ? 'समस्त' : escapeHtml(target)}</p>
          <p style="font-size:9px;">${new Date().toLocaleDateString('hi-IN')}</p>
        </div>
        <table>
          <thead>
            <tr><th>विवरण</th><th>टाइप</th><th style="text-align:right;">राशि</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:6px; font-size:10px;">
          <div>जमा: ₹${inTotal}</div>
          <div>उधार: ₹${outTotal}</div>
          <div style="font-weight:bold; font-size:11px; margin-top:2px;">शुद्ध बाकी: ₹${inTotal - outTotal}</div>
        </div>
        <div class="center" style="margin-top:8px; font-size:9px;">** धन्यवाद! **</div>
      </div>
    `;
  }

  closePrintModal();
  window.print();
}

// 10. बैकअप और रीस्टोर
function exportDataCSV() {
  if (currentTransactions.length === 0) {
    alert('डेटा उपलब्ध नहीं है।');
    return;
  }
  let csv = 'ID,Date,Customer,Type,Amount\n';
  currentTransactions.forEach(t => {
    csv += `"${t.id}","${t.timestamp}","${t.name}","${t.type}",${t.amount}\n`;
  });
  downloadFile(csv, `Khata_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

function backupJSON() {
  if (currentTransactions.length === 0) {
    alert('बैकअप के लिए कोई डेटा नहीं है।');
    return;
  }
  const dataToSave = {
    settings: settings,
    transactions: currentTransactions,
    backupDate: new Date().toISOString()
  };
  downloadFile(JSON.stringify(dataToSave, null, 2), `Safegate_Backup_${Date.now()}.json`, 'application/json');
  speakText('सेफगेट बैकअप फाइल डाउनलोड हो गई है।');
}

function restoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        if (confirm('क्या आप बैकअप से डेटा रीस्टोर करना चाहते हैं? पुराना डेटा ओवरराइट हो जाएगा।')) {
          await idbClearAndBulkInsert(parsed.transactions);
          if (parsed.settings) settings = parsed.settings;
          localStorage.setItem('PRO_KHATA_SETTINGS', JSON.stringify(settings));
          applySettings();
          await loadAndSyncData();
          alert('डेटा सफलतापूर्वक रीस्टोर हो गया!');
        }
      } else {
        alert('अमान्य बैकअप फाइल!');
      }
    } catch(err) {
      alert('फाइल पढ़ने में त्रुटि!');
    }
  };
  reader.readAsText(file);
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[s]);
}

// एप्लिकेशन लोड
window.addEventListener('DOMContentLoaded', async () => {
  initDateTime();
  applySettings();
  await initIndexedDB();
  initSafegate();
});
