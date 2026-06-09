/* =============================================================
   GIC RENEWAL PORTAL — COMPLETE APPLICATION LOGIC
   Midas Money Care | app.js v2.0
   ============================================================= */

'use strict';

// ══════════════════════════════════════════════════════════════
// CONSTANTS & GLOBAL STATE
// ══════════════════════════════════════════════════════════════
const MASTER_PASSWORD = 'shrey@2711';
const DB_NAME = 'GICPortalDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'clients';
const WA_TEMPLATE_KEY = 'gic_wa_template';
const FIREBASE_CONFIG_KEY = 'gic_firebase_config';
const DEFAULT_COLLECTION = 'gic_policies';

let DATA = [];           // All client records
let filteredData = [];   // Currently displayed records
let activeStatusFilter = 'all';
let dbInstance = null;
let firebaseApp = null;
let firestoreDb = null;
let cloudSyncActive = false;
let firestoreUnsubscribe = null;
let expandedRows = new Set();
let commTypeState = { ac: 'direct', lp: 'direct', ed: 'direct' };
let lpSelectedClient = null;
let lpSelectedMemberIdx = null;
let currentEditId = null;

// Chart instances
let providerChartInst = null;
let urgencyChartInst = null;
let forecastChartInst = null;

// ══════════════════════════════════════════════════════════════
// SAMPLE DATA — 10 REALISTIC TEST CLIENTS
// (Today = June 9, 2026)
// ══════════════════════════════════════════════════════════════
const SAMPLE_CLIENTS = [
  {
    id: 'MMC_SAMPLE_001', name: 'Ramesh Kumar Sharma',
    mobile: '9876543210', email: 'ramesh.sharma@gmail.com',
    address: 'B-204, Sunshine Apartments, Borivali West, Mumbai - 400092',
    profession: 'Business Owner',
    provider: 'Star Health Insurance', plan: 'Star Comprehensive Family',
    plan_amount: 500000, policy_no: 'P/181323/01/2026/001234',
    premium_mode: 'yearly', premium_amount: 18500,
    start_date: '2025-06-12', end_date: '2026-06-12',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 15, commission_amount: 2775,
    fitness_details: 'All members healthy. No pre-existing conditions declared.',
    family_count: 4,
    family_members: [
      { type: 'self', name: 'Ramesh Kumar Sharma', dob: '1980-03-15', height: "5'9\"", weight: '75', gender: 'male' },
      { type: 'spouse', name: 'Sunita Sharma', dob: '1983-07-22', height: "5'4\"", weight: '62', gender: 'female' },
      { type: 'child', name: 'Rohan Sharma', dob: '2008-11-05', height: "5'2\"", weight: '48', gender: 'male' },
      { type: 'child', name: 'Anjali Sharma', dob: '2012-04-18', height: "4'8\"", weight: '35', gender: 'female' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-12T10:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_002', name: 'Priya Mehta',
    mobile: '9821234567', email: 'priya.mehta@hdfc.com',
    address: '12, Rose Garden Society, Andheri East, Mumbai - 400069',
    profession: 'Salaried (Private)',
    provider: 'HDFC ERGO Health Insurance', plan: 'HDFC Optima Restore',
    plan_amount: 1000000, policy_no: 'HDI-HIA-25-0112876-A',
    premium_mode: 'yearly', premium_amount: 24200,
    start_date: '2025-06-16', end_date: '2026-06-16',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 12, commission_amount: 2904,
    fitness_details: 'All healthy. Minor thyroid issue in policyholder (declared).',
    family_count: 3,
    family_members: [
      { type: 'self', name: 'Priya Mehta', dob: '1987-09-12', height: "5'5\"", weight: '60', gender: 'female' },
      { type: 'spouse', name: 'Ketan Mehta', dob: '1984-02-28', height: "5'10\"", weight: '78', gender: 'male' },
      { type: 'child', name: 'Aryan Mehta', dob: '2014-06-30', height: "4'5\"", weight: '30', gender: 'male' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-16T11:30:00Z'
  },
  {
    id: 'MMC_SAMPLE_003', name: 'Suresh Nair',
    mobile: '9988776655', email: 'suresh.nair@gmail.com',
    address: '5/A, Lakeview Residency, Powai, Mumbai - 400076',
    profession: 'Salaried (Private)',
    provider: 'Niva Bupa Health Insurance', plan: 'Niva Bupa ReAssure 2.0',
    plan_amount: 750000, policy_no: 'NBHI-25-0045678',
    premium_mode: 'yearly', premium_amount: 15000,
    start_date: '2025-06-14', end_date: '2026-06-14',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 18, commission_amount: 2700,
    fitness_details: 'No pre-existing conditions. All members fit.',
    family_count: 2,
    family_members: [
      { type: 'self', name: 'Suresh Nair', dob: '1978-11-20', height: "5'7\"", weight: '70', gender: 'male' },
      { type: 'spouse', name: 'Meena Nair', dob: '1981-05-14', height: "5'3\"", weight: '55', gender: 'female' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: true,
    created_at: '2025-06-14T09:15:00Z'
  },
  {
    id: 'MMC_SAMPLE_004', name: 'Anita Desai',
    mobile: '9867451230', email: 'anita.desai@yahoo.com',
    address: 'House No. 34, Sector 8, Vashi, Navi Mumbai - 400703',
    profession: 'Housewife',
    provider: 'Care Health Insurance', plan: 'Care Supreme',
    plan_amount: 600000, policy_no: 'CHP-2025-00087654',
    premium_mode: 'yearly', premium_amount: 31800,
    start_date: '2025-06-24', end_date: '2026-06-24',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 10, commission_amount: 3180,
    fitness_details: 'Husband has mild hypertension (declared). Others healthy.',
    family_count: 5,
    family_members: [
      { type: 'self', name: 'Anita Desai', dob: '1975-08-04', height: "5'2\"", weight: '68', gender: 'female' },
      { type: 'spouse', name: 'Vinod Desai', dob: '1972-01-17', height: "5'8\"", weight: '80', gender: 'male' },
      { type: 'child', name: 'Riya Desai', dob: '2000-10-05', height: "5'4\"", weight: '52', gender: 'female' },
      { type: 'child', name: 'Vivek Desai', dob: '2004-03-22', height: "5'7\"", weight: '65', gender: 'male' },
      { type: 'other', name: 'Prakashbhai Desai', dob: '1946-07-08', height: "5'5\"", weight: '66', gender: 'male', other_label: 'Father-in-Law' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-24T14:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_005', name: 'Vikram Singh Rathore',
    mobile: '9712345678', email: 'vikramsingh@business.com',
    address: 'Plot 22, MIDC Industrial Area, Thane - 400601',
    profession: 'Business Owner',
    provider: 'Bajaj Allianz Life Insurance', plan: 'Bajaj Allianz Smart Health Goal',
    plan_amount: 2000000, policy_no: 'BAL-LIFE-2025-554321',
    premium_mode: 'yearly', premium_amount: 8400,
    start_date: '2025-07-09', end_date: '2026-07-09',
    policy_term: '1 Year', commission_type: 'direct',
    commission_value: 0, commission_amount: 1200,
    fitness_details: 'Excellent health. Regular gym-goer.',
    family_count: 1,
    family_members: [
      { type: 'self', name: 'Vikram Singh Rathore', dob: '1985-12-01', height: "6'0\"", weight: '82', gender: 'male' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-07-09T10:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_006', name: 'Kavita Joshi',
    mobile: '9654321098', email: 'kavita.joshi@email.com',
    address: 'C-301, Raj Paradise, Mira Road, Thane - 401107',
    profession: 'Salaried (Government)',
    provider: 'LIC of India', plan: 'LIC Jeevan Arogya',
    plan_amount: 300000, policy_no: 'LIC-MH-2025-887766',
    premium_mode: 'yearly', premium_amount: 12600,
    start_date: '2025-06-09', end_date: '2026-06-09',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 8, commission_amount: 1008,
    fitness_details: 'All members in good health.',
    family_count: 3,
    family_members: [
      { type: 'self', name: 'Kavita Joshi', dob: '1982-04-25', height: "5'3\"", weight: '58', gender: 'female' },
      { type: 'spouse', name: 'Deepak Joshi', dob: '1979-09-10', height: "5'9\"", weight: '74', gender: 'male' },
      { type: 'child', name: 'Tanvi Joshi', dob: '2010-12-19', height: "4'9\"", weight: '38', gender: 'female' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-09T08:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_007', name: 'Mohammed Arif Sheikh',
    mobile: '9543210987', email: 'arif.sheikh@gmail.com',
    address: 'Flat 7, Al-Farooq Building, Kurla West, Mumbai - 400070',
    profession: 'Business Owner',
    provider: 'ICICI Prudential Life Insurance', plan: 'iProtect Smart',
    plan_amount: 5000000, policy_no: 'ICICI-PL-2025-23456',
    premium_mode: 'yearly', premium_amount: 22100,
    start_date: '2025-06-05', end_date: '2026-06-05',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 14, commission_amount: 3094,
    fitness_details: 'Diabetes Type 2 declared. All others healthy.',
    family_count: 4,
    family_members: [
      { type: 'self', name: 'Mohammed Arif Sheikh', dob: '1976-06-22', height: "5'8\"", weight: '85', gender: 'male' },
      { type: 'spouse', name: 'Rukhsar Sheikh', dob: '1980-03-14', height: "5'2\"", weight: '64', gender: 'female' },
      { type: 'child', name: 'Ayaan Sheikh', dob: '2007-08-17', height: "5'5\"", weight: '55', gender: 'male' },
      { type: 'child', name: 'Aliya Sheikh', dob: '2010-11-25', height: "4'10\"", weight: '36', gender: 'female' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-05T10:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_008', name: 'Deepa Krishnamurthy',
    mobile: '9432109876', email: 'deepa.k@infosys.com',
    address: '18, 3rd Cross, Indiranagar, Bengaluru - 560038',
    profession: 'Salaried (Private)',
    provider: 'Aditya Birla Health Insurance', plan: 'Activ Health Enhanced',
    plan_amount: 800000, policy_no: 'ABHI-KA-25-009876',
    premium_mode: 'half_yearly', premium_amount: 19750,
    start_date: '2026-02-15', end_date: '2026-08-15',
    policy_term: '6 Months', commission_type: 'percentage',
    commission_value: 12, commission_amount: 2370,
    fitness_details: 'Both members very healthy. No known conditions.',
    family_count: 2,
    family_members: [
      { type: 'self', name: 'Deepa Krishnamurthy', dob: '1990-01-30', height: "5'4\"", weight: '55', gender: 'female' },
      { type: 'spouse', name: 'Rajesh Krishnamurthy', dob: '1988-07-05', height: "5'11\"", weight: '79', gender: 'male' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2026-02-15T09:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_009', name: 'Rajesh Bhushan Agarwal',
    mobile: '9321098765', email: 'rajeshagarwal@business.co.in',
    address: '44-B, Civil Lines, Nagpur - 440001',
    profession: 'Business Owner',
    provider: 'Max Life Insurance', plan: 'Max Smart Total Elite',
    plan_amount: 1500000, policy_no: 'MXL-MH-2025-7788990',
    premium_mode: 'yearly', premium_amount: 16300,
    start_date: '2025-06-20', end_date: '2026-06-20',
    policy_term: '1 Year', commission_type: 'percentage',
    commission_value: 16, commission_amount: 2608,
    fitness_details: 'Healthy family. Annual health checkup done.',
    family_count: 3,
    family_members: [
      { type: 'self', name: 'Rajesh Bhushan Agarwal', dob: '1974-05-18', height: "5'6\"", weight: '76', gender: 'male' },
      { type: 'spouse', name: 'Shalini Agarwal', dob: '1978-11-03', height: "5'3\"", weight: '60', gender: 'female' },
      { type: 'child', name: 'Nishant Agarwal', dob: '2005-02-14', height: "5'7\"", weight: '62', gender: 'male' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-06-20T12:00:00Z'
  },
  {
    id: 'MMC_SAMPLE_010', name: 'Sunita Kumari Yadav',
    mobile: '9210987654', email: 'sunita.yadav@gmail.com',
    address: 'Village Rampur, Post Bhiwandi, Thane - 421302',
    profession: 'Farmer',
    provider: 'SBI Life Insurance', plan: 'SBI Life Smart Platina Plus',
    plan_amount: 1000000, policy_no: 'SBIL-UP-2025-334455',
    premium_mode: 'quarterly', premium_amount: 28900,
    start_date: '2025-09-30', end_date: '2026-09-30',
    policy_term: '1 Year', commission_type: 'direct',
    commission_value: 0, commission_amount: 3500,
    fitness_details: 'Good health overall. Husband mild BP (declared).',
    family_count: 4,
    family_members: [
      { type: 'self', name: 'Sunita Kumari Yadav', dob: '1973-12-10', height: "5'1\"", weight: '66', gender: 'female' },
      { type: 'spouse', name: 'Ramkishan Yadav', dob: '1970-08-22', height: "5'6\"", weight: '75', gender: 'male' },
      { type: 'child', name: 'Rahul Yadav', dob: '1999-04-12', height: "5'8\"", weight: '68', gender: 'male' },
      { type: 'child', name: 'Pooja Yadav', dob: '2003-07-30', height: "5'2\"", weight: '50', gender: 'female' }
    ],
    kyc_docs: [], policy_doc: null, wa_sent: false,
    created_at: '2025-09-30T10:00:00Z'
  }
];

// Default WhatsApp Template
const DEFAULT_WA_TEMPLATE = `Dear {name},

🔔 *Policy Renewal Reminder — Midas Money Care*

Your insurance policy is coming up for renewal soon.

📋 *Policy Details:*
• Plan: {plan}
• Provider: {provider}
• Policy No: {policy_no}
• Expiry Date: {end_date}
• Days Remaining: *{days} days*
• Premium Amount: ₹{premium}
• Sum Insured: ₹{plan_amount}

Please contact us immediately to renew your policy and avoid any lapse in coverage.

📞 Call/WhatsApp us anytime for assistance.

Thank you for trusting us! 🙏

*Midas Money Care*
_Your Trusted Insurance Partner_`;

// ══════════════════════════════════════════════════════════════
// SECURITY / AUTH
// ══════════════════════════════════════════════════════════════
function verifyPassword() {
  const val = document.getElementById('passwordInput').value;
  if (val === MASTER_PASSWORD) {
    sessionStorage.setItem('gic_auth', '1');
    const overlay = document.getElementById('securityOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 400);
    logActivity('🔓 Portal unlocked successfully', 'success');
  } else {
    document.getElementById('passwordInput').style.borderColor = 'var(--danger)';
    document.getElementById('passwordInput').style.boxShadow = '0 0 0 3px rgba(239,68,68,0.2)';
    showToast('Incorrect password. Please try again.', 'error');
    setTimeout(() => {
      document.getElementById('passwordInput').style.borderColor = '';
      document.getElementById('passwordInput').style.boxShadow = '';
    }, 1500);
  }
}

function checkAuth() {
  if (sessionStorage.getItem('gic_auth') === '1') {
    document.getElementById('securityOverlay').style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════
// INDEXEDDB SETUP
// ══════════════════════════════════════════════════════════════
function initDatabase() {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = function(e) {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  req.onsuccess = function(e) {
    dbInstance = e.target.result;
    logActivity('🗄️ Local database connected', 'info');
    loadAllFromDB();
  };
  req.onerror = function() {
    logActivity('❌ Database error — using memory only', 'error');
    injectSampleData();
  };
}

function loadAllFromDB() {
  const tx = dbInstance.transaction([STORE_NAME], 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  req.onsuccess = function(e) {
    DATA = e.target.result || [];
    if (DATA.length === 0) {
      injectSampleData();
    } else {
      logActivity(`📂 Loaded ${DATA.length} client records`, 'info');
      applyFiltersAndStats();
    }
  };
}

function injectSampleData() {
  DATA = JSON.parse(JSON.stringify(SAMPLE_CLIENTS));
  saveAllToDB(() => {
    logActivity('✨ Sample data loaded — 10 test clients added', 'success');
    applyFiltersAndStats();
  });
}

function saveAllToDB(callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear().onsuccess = function() {
    let remaining = DATA.length;
    if (remaining === 0) { if (callback) callback(); return; }
    DATA.forEach(item => {
      const req = store.put(item);
      req.onsuccess = function() { remaining--; if (remaining === 0 && callback) callback(); };
      req.onerror = function() { remaining--; if (remaining === 0 && callback) callback(); };
    });
  };
}

function addToDB(item, callback) {
  if (!dbInstance) { DATA.push(item); if (callback) callback(); return; }
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  tx.objectStore(STORE_NAME).put(item).onsuccess = function() { if (callback) callback(); };
}

function updateInDB(item, callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  tx.objectStore(STORE_NAME).put(item).onsuccess = function() { if (callback) callback(); };
}

function deleteFromDB(id, callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  tx.objectStore(STORE_NAME).delete(id).onsuccess = function() { if (callback) callback(); };
}

// ══════════════════════════════════════════════════════════════
// FIREBASE CLOUD SYNC
// ══════════════════════════════════════════════════════════════
function connectCloud() {
  const projectId = document.getElementById('fb_projectId').value.trim();
  const apiKey = document.getElementById('fb_apiKey').value.trim();
  const authDomain = document.getElementById('fb_authDomain').value.trim();
  const storageBucket = document.getElementById('fb_storageBucket').value.trim();
  const collection = document.getElementById('fb_collection').value.trim() || DEFAULT_COLLECTION;

  if (!projectId || !apiKey || !authDomain) {
    showToast('Please fill in Project ID, API Key, and Auth Domain', 'error'); return;
  }

  const config = { projectId, apiKey, authDomain, storageBucket, collection };
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));

  document.getElementById('cloudConnectStatus').textContent = 'Connecting to Firebase...';
  updateSyncUI('connecting');

  try {
    if (firebaseApp) {
      try { firebase.app().delete(); } catch(e) {}
    }
    firebaseApp = firebase.initializeApp({ apiKey, authDomain, projectId, storageBucket }, 'gic_' + Date.now());
    firestoreDb = firebaseApp.firestore();

    // Test connection
    firestoreDb.collection(collection).limit(1).get().then(() => {
      cloudSyncActive = true;
      startRealtimeSync(collection);
      document.getElementById('cloudConnectStatus').textContent = '✅ Connected successfully!';
      document.getElementById('disconnectBtn').style.display = '';
      updateSyncUI('connected');
      showToast('Firebase connected! Live sync active.', 'success');
      logActivity('☁️ Firebase cloud sync connected', 'success');
      closeModal('cloudSyncOverlay');
    }).catch(err => {
      document.getElementById('cloudConnectStatus').textContent = '❌ Connection failed: ' + err.message;
      updateSyncUI('disconnected');
      showToast('Firebase connection failed', 'error');
    });
  } catch(err) {
    document.getElementById('cloudConnectStatus').textContent = '❌ Error: ' + err.message;
    updateSyncUI('disconnected');
  }
}

function startRealtimeSync(collection) {
  if (firestoreUnsubscribe) firestoreUnsubscribe();
  firestoreUnsubscribe = firestoreDb.collection(collection).onSnapshot(snapshot => {
    const cloud = [];
    snapshot.forEach(doc => cloud.push({ ...doc.data(), id: doc.id }));
    DATA = cloud;
    saveAllToDB();
    applyFiltersAndStats();
    logActivity(`☁️ Live sync: ${cloud.length} records received`, 'info');
  });
}

function disconnectCloud() {
  if (firestoreUnsubscribe) { firestoreUnsubscribe(); firestoreUnsubscribe = null; }
  cloudSyncActive = false;
  firebaseApp = null; firestoreDb = null;
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  updateSyncUI('disconnected');
  document.getElementById('disconnectBtn').style.display = 'none';
  document.getElementById('cloudConnectStatus').textContent = '';
  showToast('Cloud sync disconnected', 'info');
  logActivity('☁️ Cloud sync disconnected', 'warn');
}

function updateSyncUI(state) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncStatusLabel');
  const sub = document.getElementById('syncSubLabel');
  const badge = document.getElementById('cloudStatusBadge');

  dot.className = 'sync-dot' + (state === 'connected' ? ' connected' : state === 'connecting' ? ' connecting' : '');

  if (state === 'connected') {
    label.textContent = 'Live Sync Active';
    sub.textContent = 'All devices stay in sync';
    badge.className = 'firebase-status-badge connected';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connected';
  } else if (state === 'connecting') {
    label.textContent = 'Connecting...';
    sub.textContent = 'Establishing Firebase connection';
    badge.className = 'firebase-status-badge connecting';
    badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
  } else {
    label.textContent = 'Not Connected';
    sub.textContent = 'Configure Firebase for live sync';
    badge.className = 'firebase-status-badge disconnected';
    badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Not Connected';
  }
}

function autoConnectFirebase() {
  const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!saved) return;
  try {
    const cfg = JSON.parse(saved);
    document.getElementById('fb_projectId').value = cfg.projectId || '';
    document.getElementById('fb_apiKey').value = cfg.apiKey || '';
    document.getElementById('fb_authDomain').value = cfg.authDomain || '';
    document.getElementById('fb_storageBucket').value = cfg.storageBucket || '';
    document.getElementById('fb_collection').value = cfg.collection || DEFAULT_COLLECTION;
    connectCloud();
  } catch(e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════
function generateId() {
  return 'MMC_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substr(2,6).toUpperCase();
}

function today() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function daysLeft(endDateStr) {
  if (!endDateStr) return 9999;
  const end = new Date(endDateStr); end.setHours(0,0,0,0);
  return Math.ceil((end - today()) / 86400000);
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(val) {
  const n = Number(val);
  if (isNaN(n) || n === 0) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

function cleanMobile(val) {
  if (!val) return '';
  const cleaned = String(val).replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned.slice(2);
  return cleaned;
}

function getProviderClass(provider) {
  if (!provider) return 'prov-other';
  const p = provider.toLowerCase();
  if (p.includes('star')) return 'prov-star';
  if (p.includes('hdfc')) return 'prov-hdfc';
  if (p.includes('niva') || p.includes('bupa')) return 'prov-niva';
  if (p.includes('care') || p.includes('religare')) return 'prov-care';
  if (p.includes('aditya') || p.includes('birla')) return 'prov-aditya';
  if (p.includes('bajaj')) return 'prov-bajaj';
  if (p.includes('lic')) return 'prov-lic';
  if (p.includes('icici')) return 'prov-icici';
  if (p.includes('sbi')) return 'prov-sbi';
  if (p.includes('max')) return 'prov-max';
  if (p.includes('tata') || p.includes('aia')) return 'prov-tata';
  if (p.includes('kotak')) return 'prov-kotak';
  return 'prov-other';
}

function getExpiryClass(days) {
  if (days < 0) return 'exp-expired';
  if (days === 0) return 'exp-today';
  if (days <= 3) return 'exp-3';
  if (days <= 7) return 'exp-7';
  if (days <= 15) return 'exp-15';
  return 'exp-safe';
}

function getExpiryLabel(days) {
  if (days < 0) return `${Math.abs(days)}d Expired`;
  if (days === 0) return 'Expires TODAY';
  if (days === 1) return 'Tomorrow';
  if (days <= 3) return `${days} Days`;
  if (days <= 7) return `${days} Days`;
  if (days <= 15) return `${days} Days`;
  return `${days} Days`;
}

function getPremiumModeLabel(mode) {
  const m = { yearly: 'Yearly', half_yearly: 'Half-Yearly', quarterly: 'Quarterly', monthly: 'Monthly' };
  return m[mode] || mode || 'Yearly';
}

function getMemberTypeLabel(type) {
  const t = { self: 'Self', spouse: 'Spouse', child: 'Child', other: 'Other' };
  return t[type] || 'Member';
}

async function getFileData(input) {
  const file = input.files[0];
  if (!file) return null;
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve({ name: file.name, type: file.type, data: e.target.result, size: file.size });
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

async function getMultipleFilesData(input) {
  const files = input.files;
  if (!files || files.length === 0) return [];
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const data = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => resolve({ name: f.name, type: f.type, data: e.target.result, size: f.size });
      r.onerror = () => resolve(null);
      r.readAsDataURL(f);
    });
    if (data) results.push(data);
  }
  return results;
}

function downloadDoc(doc, clientName) {
  if (!doc) return;
  if (doc.url) { window.open(doc.url, '_blank'); return; }
  try {
    const parts = doc.data.split(';base64,');
    const mime = parts[0].split(':')[1];
    const raw = atob(parts[1]);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = doc.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) { window.open(doc.data, '_blank'); }
}

// ══════════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════════
function startClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  const t = document.getElementById('appToast');
  const icon = document.getElementById('toastIcon');
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast toast-' + type + ' show';
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  icon.textContent = icons[type] || '✅';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════════════════════════════
function logActivity(text, type = 'info') {
  const log = document.getElementById('activityLog');
  if (!log) return;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const el = document.createElement('div');
  el.className = 'activity-entry ' + type;
  el.innerHTML = `<span class="act-time">${now}</span>${text}`;
  log.insertBefore(el, log.firstChild);
  if (log.children.length > 60) log.removeChild(log.lastChild);
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR TOGGLE (MOBILE)
// ══════════════════════════════════════════════════════════════
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
// Close on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});
// Close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

// ══════════════════════════════════════════════════════════════
// VIEW SWITCHING
// ══════════════════════════════════════════════════════════════
function switchView(view) {
  const regView = document.getElementById('registerView');
  const anaView = document.getElementById('analyticsView');
  const tabReg = document.getElementById('tabRegister');
  const tabAna = document.getElementById('tabAnalytics');

  if (view === 'register') {
    regView.classList.remove('hidden');
    anaView.classList.add('hidden');
    tabReg.classList.add('active');
    tabAna.classList.remove('active');
  } else {
    regView.classList.add('hidden');
    anaView.classList.remove('hidden');
    tabAna.classList.add('active');
    tabReg.classList.remove('active');
    renderAnalytics();
  }
}

// ══════════════════════════════════════════════════════════════
// STATS & FILTERS
// ══════════════════════════════════════════════════════════════
function applyFiltersAndStats() {
  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const selectedMonth = document.getElementById('monthFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  // Enrich with daysLeft
  const enriched = DATA.map(c => ({ ...c, _days: daysLeft(c.end_date) }));

  // Compute stats (all records, no status filter)
  let totalPremium = 0, totalComm = 0, active = 0, expired = 0, days15 = 0, days7 = 0, days3 = 0;
  enriched.forEach(c => {
    if (c._days >= 0) { totalPremium += Number(c.premium_amount) || 0; totalComm += Number(c.commission_amount) || 0; active++; }
    else expired++;
    if (c._days >= 0 && c._days <= 15) days15++;
    if (c._days >= 0 && c._days <= 7) days7++;
    if (c._days >= 0 && c._days <= 3) days3++;
  });

  document.getElementById('statTotalPremium').textContent = formatCurrency(totalPremium);
  document.getElementById('statPremiumSub').textContent = `${active} active ${active === 1 ? 'policy' : 'policies'}`;
  document.getElementById('statCommission').textContent = formatCurrency(totalComm);
  document.getElementById('statCommissionSub').textContent = 'from active policies';
  document.getElementById('stat15Days').textContent = days15;
  document.getElementById('stat7Days').textContent = days7;
  document.getElementById('stat3Days').textContent = days3;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statExpiredSub').textContent = `${expired} expired`;

  // Filter
  filteredData = enriched.filter(c => {
    // Status filter
    if (activeStatusFilter === 'expired' && c._days >= 0) return false;
    if (activeStatusFilter === 'today' && c._days !== 0) return false;
    if (activeStatusFilter === '3' && (c._days < 0 || c._days > 3)) return false;
    if (activeStatusFilter === '7' && (c._days < 0 || c._days > 7)) return false;
    if (activeStatusFilter === '15' && (c._days < 0 || c._days > 15)) return false;

    // Month filter (on end_date month)
    if (selectedMonth !== 'all') {
      const m = new Date(c.end_date).getMonth();
      if (m !== Number(selectedMonth)) return false;
    }

    // Search
    if (query) {
      const searchable = [c.name, c.mobile, c.policy_no, c.provider, c.plan, c.email].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  // Sort
  filteredData.sort((a, b) => {
    switch(sortBy) {
      case 'name_az': return a.name.localeCompare(b.name);
      case 'name_za': return b.name.localeCompare(a.name);
      case 'premium_high': return (Number(b.premium_amount)||0) - (Number(a.premium_amount)||0);
      case 'premium_low': return (Number(a.premium_amount)||0) - (Number(b.premium_amount)||0);
      case 'commission_high': return (Number(b.commission_amount)||0) - (Number(a.commission_amount)||0);
      case 'date_desc': return new Date(b.end_date) - new Date(a.end_date);
      case 'date_asc': default: return new Date(a.end_date) - new Date(b.end_date);
    }
  });

  document.getElementById('recordCount').textContent = `${filteredData.length} record${filteredData.length !== 1 ? 's' : ''}`;
  renderTable();
}

function setStatusFilter(filter, el) {
  activeStatusFilter = filter;
  document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  applyFiltersAndStats();
}

function applyFilters() { applyFiltersAndStats(); }

// ══════════════════════════════════════════════════════════════
// RENDER TABLE
// ══════════════════════════════════════════════════════════════
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">🔍</div><h3>No records found</h3><p>Try adjusting your search or filters</p></div></td></tr>`;
    return;
  }

  filteredData.forEach((client, idx) => {
    const days = client._days;
    const expClass = getExpiryClass(days);
    const expLabel = getExpiryLabel(days);
    const provClass = getProviderClass(client.provider);
    const hasKyc = client.kyc_docs && client.kyc_docs.length > 0;
    const isExpanded = expandedRows.has(client.id);

    // Row background class
    let rowClass = '';
    if (days < 0) rowClass = 'expired-row';
    else if (days <= 3) rowClass = 'urgent-row';
    if (isExpanded) rowClass += ' family-expanded';

    const tr = document.createElement('tr');
    tr.id = `row-${client.id}`;
    tr.className = rowClass;
    tr.innerHTML = `
      <td style="width:40px;padding-left:20px">
        <input type="checkbox" class="cb-custom row-cb" data-id="${client.id}">
      </td>
      <td class="sr-num">${idx + 1}</td>
      <td>
        <div class="cell-name">
          <strong>${escapeHtml(client.name)}</strong><br>
          <small><i class="fa-solid fa-phone" style="font-size:9px;color:var(--text-light)"></i> ${cleanMobile(client.mobile) || '—'}</small>
          ${client.profession ? `<br><small style="color:var(--text-light);font-size:10px">${escapeHtml(client.profession)}</small>` : ''}
        </div>
      </td>
      <td>
        <div class="cell-plan">
          <strong>${escapeHtml(client.plan || '—')}</strong><br>
          <span class="provider-badge ${provClass}">${escapeHtml(client.provider || '—')}</span>
        </div>
      </td>
      <td class="cell-num">${client.policy_no ? escapeHtml(client.policy_no) : '<span style="color:var(--text-light)">Not entered</span>'}</td>
      <td>
        <div class="cell-premium">
          <strong>${formatCurrency(client.premium_amount)}</strong><br>
          <small><span class="mode-badge">${getPremiumModeLabel(client.premium_mode)}</span></small>
        </div>
      </td>
      <td class="cell-commission">${formatCurrency(client.commission_amount)}</td>
      <td>
        <div class="cell-date">
          <strong>${formatDate(client.end_date)}</strong><br>
          <small style="color:var(--text-light);font-size:10px">Start: ${formatDate(client.start_date)}</small>
        </div>
      </td>
      <td><span class="expiry-badge ${expClass}">${expLabel}</span></td>
      <td>
        <span class="kyc-indicator ${hasKyc ? 'kyc-yes' : 'kyc-no'}">
          ${hasKyc ? `<i class="fa-solid fa-circle-check"></i> ${client.kyc_docs.length} file${client.kyc_docs.length > 1 ? 's' : ''}` : '<i class="fa-regular fa-circle-xmark"></i> None'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn wa ${client.wa_sent ? 'sent' : ''}" title="Send WhatsApp Reminder" onclick="sendWhatsApp('${client.id}')">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
          <button class="action-btn family ${isExpanded ? 'active' : ''}" title="Show/Hide Family Members" onclick="toggleFamilyRow('${client.id}')">
            <i class="fa-solid fa-people-group"></i>
          </button>
          <button class="action-btn edit" title="Edit Client" onclick="openEditModal('${client.id}')">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="action-btn delete" title="Delete Client" onclick="deleteClient('${client.id}','${escapeHtml(client.name)}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    // Family expand row
    if (isExpanded && client.family_members && client.family_members.length > 0) {
      const expandTr = document.createElement('tr');
      expandTr.className = 'family-expand-row';
      expandTr.id = `family-row-${client.id}`;
      expandTr.innerHTML = `<td colspan="11">${buildFamilyPanel(client)}</td>`;
      tbody.appendChild(expandTr);
    }
  });
}

function buildFamilyPanel(client) {
  const memberCards = (client.family_members || []).map(m => {
    const typeClass = { self: 'member-type-self', spouse: 'member-type-spouse', child: 'member-type-child', other: 'member-type-other' }[m.type] || 'member-type-other';
    const typeLabel = m.type === 'other' ? (m.other_label || 'Other') : getMemberTypeLabel(m.type);
    const age = m.dob ? Math.floor((Date.now() - new Date(m.dob)) / (365.25 * 86400000)) : null;
    return `
      <div class="family-member-card">
        <span class="member-type-tag ${typeClass}">${typeLabel}</span>
        <div class="member-name">${escapeHtml(m.name || '—')}</div>
        <div class="member-detail">
          ${m.gender ? `<span>${m.gender === 'male' ? '♂' : m.gender === 'female' ? '♀' : '⚥'} ${m.gender}</span> &nbsp;` : ''}
          ${age !== null ? `<span>Age: ${age} yrs</span>` : ''}
          ${m.dob ? `<br><span style="font-size:10px">DOB: ${formatDate(m.dob)}</span>` : ''}
          ${m.height || m.weight ? `<br><span style="font-size:10px">${m.height ? 'H: ' + m.height : ''} ${m.weight ? '· W: ' + m.weight + 'kg' : ''}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  const kycSection = (client.kyc_docs && client.kyc_docs.length > 0)
    ? client.kyc_docs.map((d, i) => `<button class="btn btn-secondary btn-sm" style="margin:3px" onclick="downloadClientDoc('${client.id}','kyc',${i})"><i class="fa-solid fa-download"></i> ${escapeHtml(d.name)}</button>`).join('')
    : '<span style="color:var(--text-light);font-size:12px">No KYC documents uploaded</span>';

  const policyDocSection = client.policy_doc
    ? `<button class="btn btn-secondary btn-sm" onclick="downloadClientDoc('${client.id}','policy',0)"><i class="fa-solid fa-file-pdf" style="color:var(--danger)"></i> ${escapeHtml(client.policy_doc.name)}</button>`
    : '<span style="color:var(--text-light);font-size:12px">No policy document</span>';

  const fitnessSection = client.fitness_details
    ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic">"${escapeHtml(client.fitness_details)}"</div>`
    : '';

  return `
    <div class="family-expand-panel">
      <div class="family-expand-title"><i class="fa-solid fa-people-group"></i> Family Members (${(client.family_members||[]).length})</div>
      <div class="family-members-grid">${memberCards || '<div style="color:var(--text-light);font-size:12px">No family members added</div>'}</div>
      ${fitnessSection}
      <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:6px">📄 Policy Doc</div>
          ${policyDocSection}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:6px">🪪 KYC Documents</div>
          ${kycSection}
        </div>
      </div>
    </div>`;
}

function toggleFamilyRow(clientId) {
  if (expandedRows.has(clientId)) expandedRows.delete(clientId);
  else expandedRows.add(clientId);
  renderTable();
}

function downloadClientDoc(clientId, type, idx) {
  const client = DATA.find(c => c.id === clientId);
  if (!client) return;
  if (type === 'policy' && client.policy_doc) downloadDoc(client.policy_doc, client.name);
  else if (type === 'kyc' && client.kyc_docs && client.kyc_docs[idx]) downloadDoc(client.kyc_docs[idx], client.name);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
// ADD CLIENT
// ══════════════════════════════════════════════════════════════
function openAddClientModal() {
  // Reset all fields
  ['ac_name','ac_mobile','ac_email','ac_address','ac_plan','ac_policy_no','ac_premium_amount','ac_plan_amount','ac_fitness'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('ac_profession').value = '';
  document.getElementById('ac_provider').value = '';
  document.getElementById('ac_providerOtherGroup').style.display = 'none';
  document.getElementById('ac_premium_mode').value = 'yearly';
  document.getElementById('ac_start_date').value = '';
  document.getElementById('ac_end_date').value = '';
  document.getElementById('ac_policy_term').value = '';
  document.getElementById('ac_family_count').value = '1';
  document.getElementById('ac_comm_direct').value = '';
  document.getElementById('ac_comm_pct').value = '';
  document.getElementById('ac_comm_calc').textContent = '0';
  document.getElementById('ac_kyc_docs').value = '';
  document.getElementById('ac_policy_doc').value = '';
  document.getElementById('ac_kyc_preview').textContent = 'No files selected';
  document.getElementById('ac_policy_preview').textContent = 'No file selected';
  setCommType('ac', 'direct');
  updateFamilyCards('ac');
  openModal('addClientOverlay');
  document.getElementById('ac_name').focus();
}

async function submitAddClient() {
  const name = document.getElementById('ac_name').value.trim();
  const mobile = document.getElementById('ac_mobile').value.trim();
  const providerSel = document.getElementById('ac_provider').value;
  const provider = providerSel === '__other__' ? document.getElementById('ac_providerOther').value.trim() : providerSel;
  const plan = document.getElementById('ac_plan').value.trim();
  const premiumAmount = document.getElementById('ac_premium_amount').value;
  const endDate = document.getElementById('ac_end_date').value;

  if (!name || !mobile || !provider || !plan || !premiumAmount || !endDate) {
    showToast('Please fill all required (*) fields', 'error'); return;
  }

  const commAmount = getCommissionAmount('ac');
  const familyMembers = collectFamilyCards('ac');
  const kycDocs = await getMultipleFilesData(document.getElementById('ac_kyc_docs'));
  const policyDoc = await getFileData(document.getElementById('ac_policy_doc'));

  const newClient = {
    id: generateId(),
    name, mobile: cleanMobile(mobile),
    email: document.getElementById('ac_email').value.trim(),
    address: document.getElementById('ac_address').value.trim(),
    profession: document.getElementById('ac_profession').value,
    provider,
    plan,
    plan_amount: Number(document.getElementById('ac_plan_amount').value) || 0,
    policy_no: document.getElementById('ac_policy_no').value.trim(),
    premium_mode: document.getElementById('ac_premium_mode').value,
    premium_amount: Number(premiumAmount),
    start_date: document.getElementById('ac_start_date').value,
    end_date: endDate,
    policy_term: document.getElementById('ac_policy_term').value,
    commission_type: commTypeState.ac,
    commission_value: Number(document.getElementById(commTypeState.ac === 'percentage' ? 'ac_comm_pct' : 'ac_comm_direct').value) || 0,
    commission_amount: commAmount,
    fitness_details: document.getElementById('ac_fitness').value.trim(),
    family_count: Number(document.getElementById('ac_family_count').value) || 1,
    family_members: familyMembers,
    kyc_docs: kycDocs,
    policy_doc: policyDoc,
    wa_sent: false,
    created_at: new Date().toISOString()
  };

  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY) || '{}');
    const docRef = firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(newClient.id);
    const cloudEntry = { ...newClient }; delete cloudEntry.kyc_docs; delete cloudEntry.policy_doc;
    cloudEntry.kyc_docs = []; cloudEntry.policy_doc = null; // Store files locally only for cloud mode
    docRef.set(cloudEntry).then(() => {
      showToast(`${name} saved to cloud!`, 'success');
    }).catch(() => showToast('Cloud save failed, saved locally', 'error'));
  }

  DATA.push(newClient);
  addToDB(newClient);
  applyFiltersAndStats();
  closeModal('addClientOverlay');
  showToast(`✅ ${name} added successfully!`, 'success');
  logActivity(`➕ New client added: ${name} — ${provider}`, 'success');
}

// ══════════════════════════════════════════════════════════════
// LOG POLICY MODAL
// ══════════════════════════════════════════════════════════════
function openLogPolicyModal() {
  lpSelectedClient = null; lpSelectedMemberIdx = null;
  document.getElementById('lp_search').value = '';
  document.getElementById('lpSearchResults').innerHTML = '';
  document.getElementById('lpSearchResults').classList.remove('visible');
  document.getElementById('lpSelectedClientCard').style.display = 'none';
  document.getElementById('lpStep2').classList.add('hidden');
  document.getElementById('lpStep3').classList.add('hidden');
  document.getElementById('lpSaveBtn').disabled = true;
  ['lp_provider','lp_plan','lp_policy_no','lp_plan_amount','lp_premium_amount','lp_start_date','lp_end_date','lp_policy_term'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  setCommType('lp','direct');
  openModal('logPolicyOverlay');
}

function searchClientsForLog() {
  const q = document.getElementById('lp_search').value.toLowerCase().trim();
  const results = document.getElementById('lpSearchResults');
  if (!q) { results.classList.remove('visible'); return; }
  const matches = DATA.filter(c =>
    c.name.toLowerCase().includes(q) || (c.mobile && c.mobile.includes(q))
  ).slice(0, 8);
  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:14px;color:var(--text-muted);font-size:13px;text-align:center">No client found</div>';
    results.classList.add('visible');
    return;
  }
  results.innerHTML = matches.map(c => `
    <div class="client-result-item" onclick="selectLogClient('${c.id}')">
      <div>
        <div class="cri-name">${escapeHtml(c.name)}</div>
        <div class="cri-detail">${c.mobile} &nbsp;·&nbsp; ${escapeHtml(c.provider || '')} &nbsp;·&nbsp; ${(c.family_members||[]).length} members</div>
      </div>
    </div>`).join('');
  results.classList.add('visible');
}

function selectLogClient(clientId) {
  lpSelectedClient = DATA.find(c => c.id === clientId);
  if (!lpSelectedClient) return;
  document.getElementById('lpSearchResults').classList.remove('visible');
  document.getElementById('lp_search').value = lpSelectedClient.name;
  document.getElementById('lpSelectedClientCard').style.display = 'block';
  document.getElementById('lpClientInfo').innerHTML = `
    <div style="flex:1">
      <div class="sc-name">${escapeHtml(lpSelectedClient.name)}</div>
      <div class="sc-detail">📞 ${lpSelectedClient.mobile} &nbsp;·&nbsp; ${escapeHtml(lpSelectedClient.provider || '')} &nbsp;·&nbsp; ${getPremiumModeLabel(lpSelectedClient.premium_mode)} ₹${formatCurrency(lpSelectedClient.premium_amount)}</div>
      <div class="sc-detail" style="margin-top:4px">📋 ${(lpSelectedClient.family_members||[]).length} family members</div>
    </div>`;

  // Show family member selection
  document.getElementById('lpStep2').classList.remove('hidden');
  const familyList = document.getElementById('lpFamilyList');
  familyList.innerHTML = (lpSelectedClient.family_members || []).map((m, idx) => {
    const typeClass = { self: 'member-type-self', spouse: 'member-type-spouse', child: 'member-type-child', other: 'member-type-other' }[m.type] || 'member-type-other';
    return `
      <div class="family-member-card" onclick="selectLogMember(${idx}, this)" style="cursor:pointer;border:2px solid var(--card-border);transition:var(--t)" id="lpMember-${idx}">
        <span class="member-type-tag ${typeClass}">${m.type === 'other' ? (m.other_label||'Other') : getMemberTypeLabel(m.type)}</span>
        <div class="member-name">${escapeHtml(m.name || '—')}</div>
        <div class="member-detail" style="font-size:11px">${m.dob ? formatDate(m.dob) : ''} ${m.gender ? '· ' + m.gender : ''}</div>
      </div>`;
  }).join('') || '<div style="color:var(--text-muted)">No family members</div>';
}

function selectLogMember(idx, el) {
  lpSelectedMemberIdx = idx;
  document.querySelectorAll('#lpFamilyList .family-member-card').forEach(c => {
    c.style.borderColor = 'var(--card-border)'; c.style.background = '';
  });
  el.style.borderColor = 'var(--primary)'; el.style.background = 'var(--primary-dim)';
  document.getElementById('lpStep3').classList.remove('hidden');
  document.getElementById('lpSaveBtn').disabled = false;
}

async function submitLogPolicy() {
  if (!lpSelectedClient || lpSelectedMemberIdx === null) {
    showToast('Please select a client and family member', 'error'); return;
  }
  const providerSel = document.getElementById('lp_provider').value;
  const provider = providerSel === '__other__' ? document.getElementById('lp_providerOther').value.trim() : providerSel;
  const plan = document.getElementById('lp_plan').value.trim();
  const premium = document.getElementById('lp_premium_amount').value;
  const endDate = document.getElementById('lp_end_date').value;
  if (!provider || !plan || !premium || !endDate) {
    showToast('Please fill required policy fields', 'error'); return;
  }

  // Update the client record with new policy info
  const clientIdx = DATA.findIndex(c => c.id === lpSelectedClient.id);
  if (clientIdx === -1) return;

  const kycDocs = await getMultipleFilesData(document.getElementById('lp_kyc_docs'));
  const policyDoc = await getFileData(document.getElementById('lp_policy_doc'));
  const commAmount = getCommissionAmount('lp');

  const updatedClient = {
    ...DATA[clientIdx],
    provider, plan,
    plan_amount: Number(document.getElementById('lp_plan_amount').value) || DATA[clientIdx].plan_amount,
    policy_no: document.getElementById('lp_policy_no').value.trim() || DATA[clientIdx].policy_no,
    premium_mode: document.getElementById('lp_premium_mode').value,
    premium_amount: Number(premium),
    start_date: document.getElementById('lp_start_date').value || DATA[clientIdx].start_date,
    end_date: endDate,
    policy_term: document.getElementById('lp_policy_term').value,
    commission_type: commTypeState.lp,
    commission_value: Number(document.getElementById(commTypeState.lp === 'percentage' ? 'lp_comm_pct' : 'lp_comm_direct').value) || 0,
    commission_amount: commAmount,
    kyc_docs: kycDocs.length > 0 ? kycDocs : DATA[clientIdx].kyc_docs,
    policy_doc: policyDoc || DATA[clientIdx].policy_doc,
    updated_at: new Date().toISOString()
  };

  DATA[clientIdx] = updatedClient;
  updateInDB(updatedClient);
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    const entry = { ...updatedClient }; delete entry.kyc_docs; delete entry.policy_doc;
    entry.kyc_docs = updatedClient.kyc_docs.map(d => ({ name: d.name, type: d.type }));
    entry.policy_doc = updatedClient.policy_doc ? { name: updatedClient.policy_doc.name, type: updatedClient.policy_doc.type } : null;
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(updatedClient.id).set(entry).catch(() => {});
  }
  applyFiltersAndStats();
  closeModal('logPolicyOverlay');
  showToast(`✅ Policy logged for ${lpSelectedClient.name}`, 'success');
  logActivity(`📋 Policy logged: ${lpSelectedClient.name} — ${provider}`, 'success');
}

// ══════════════════════════════════════════════════════════════
// EDIT CLIENT
// ══════════════════════════════════════════════════════════════
function openEditModal(clientId) {
  const client = DATA.find(c => c.id === clientId);
  if (!client) return;
  currentEditId = clientId;
  document.getElementById('editModalSubtitle').textContent = `Editing: ${client.name}`;

  // Personal
  document.getElementById('ed_name').value = client.name || '';
  document.getElementById('ed_mobile').value = client.mobile || '';
  document.getElementById('ed_email').value = client.email || '';
  document.getElementById('ed_address').value = client.address || '';
  document.getElementById('ed_profession').value = client.profession || '';

  // Policy - set provider
  const providerSelect = document.getElementById('ed_provider');
  let providerFound = false;
  for (let opt of providerSelect.options) {
    if (opt.value === client.provider || opt.text === client.provider) { opt.selected = true; providerFound = true; break; }
  }
  if (!providerFound) {
    providerSelect.value = '__other__';
    document.getElementById('ed_providerOtherGroup').classList.remove('hidden');
    document.getElementById('ed_providerOther').value = client.provider || '';
  } else {
    document.getElementById('ed_providerOtherGroup').classList.add('hidden');
  }

  document.getElementById('ed_plan').value = client.plan || '';
  document.getElementById('ed_plan_amount').value = client.plan_amount || '';
  document.getElementById('ed_policy_no').value = client.policy_no || '';
  document.getElementById('ed_premium_mode').value = client.premium_mode || 'yearly';
  document.getElementById('ed_premium_amount').value = client.premium_amount || '';
  document.getElementById('ed_start_date').value = client.start_date || '';
  document.getElementById('ed_end_date').value = client.end_date || '';
  document.getElementById('ed_policy_term').value = client.policy_term || '';

  // Commission
  setCommType('ed', client.commission_type || 'direct');
  if (client.commission_type === 'percentage') {
    document.getElementById('ed_comm_pct').value = client.commission_value || '';
    document.getElementById('ed_comm_calc').textContent = (client.commission_amount || 0).toLocaleString('en-IN');
  } else {
    document.getElementById('ed_comm_direct').value = client.commission_amount || '';
  }

  document.getElementById('ed_fitness').value = client.fitness_details || '';

  // Family
  document.getElementById('ed_family_count').value = client.family_count || 1;
  updateFamilyCards('ed', client.family_members);

  // Docs preview
  const kycDocs = client.kyc_docs || [];
  document.getElementById('ed_kyc_preview').textContent = kycDocs.length > 0 ? `Current: ${kycDocs.length} file(s) — ${kycDocs.map(d=>d.name).join(', ')}` : 'No KYC files';
  document.getElementById('ed_policy_preview').textContent = client.policy_doc ? `Current: ${client.policy_doc.name}` : 'No policy doc';
  document.getElementById('ed_kyc_docs').value = '';
  document.getElementById('ed_policy_doc').value = '';

  openModal('editClientOverlay');
}

async function submitEditClient() {
  if (!currentEditId) return;
  const clientIdx = DATA.findIndex(c => c.id === currentEditId);
  if (clientIdx === -1) return;

  const name = document.getElementById('ed_name').value.trim();
  const mobile = document.getElementById('ed_mobile').value.trim();
  const providerSel = document.getElementById('ed_provider').value;
  const provider = providerSel === '__other__' ? document.getElementById('ed_providerOther').value.trim() : providerSel;
  const plan = document.getElementById('ed_plan').value.trim();
  const premiumAmount = document.getElementById('ed_premium_amount').value;
  const endDate = document.getElementById('ed_end_date').value;

  if (!name || !mobile || !provider || !plan || !premiumAmount || !endDate) {
    showToast('Please fill all required fields', 'error'); return;
  }

  const commAmount = getCommissionAmount('ed');
  const familyMembers = collectFamilyCards('ed');

  let kycDocs = await getMultipleFilesData(document.getElementById('ed_kyc_docs'));
  if (kycDocs.length === 0) kycDocs = DATA[clientIdx].kyc_docs || [];
  let policyDoc = await getFileData(document.getElementById('ed_policy_doc'));
  if (!policyDoc) policyDoc = DATA[clientIdx].policy_doc || null;

  const updated = {
    ...DATA[clientIdx], name, mobile: cleanMobile(mobile),
    email: document.getElementById('ed_email').value.trim(),
    address: document.getElementById('ed_address').value.trim(),
    profession: document.getElementById('ed_profession').value,
    provider, plan,
    plan_amount: Number(document.getElementById('ed_plan_amount').value) || 0,
    policy_no: document.getElementById('ed_policy_no').value.trim(),
    premium_mode: document.getElementById('ed_premium_mode').value,
    premium_amount: Number(premiumAmount),
    start_date: document.getElementById('ed_start_date').value,
    end_date: endDate,
    policy_term: document.getElementById('ed_policy_term').value,
    commission_type: commTypeState.ed,
    commission_value: Number(document.getElementById(commTypeState.ed === 'percentage' ? 'ed_comm_pct' : 'ed_comm_direct').value) || 0,
    commission_amount: commAmount,
    fitness_details: document.getElementById('ed_fitness').value.trim(),
    family_count: Number(document.getElementById('ed_family_count').value) || 1,
    family_members: familyMembers,
    kyc_docs: kycDocs, policy_doc: policyDoc,
    updated_at: new Date().toISOString()
  };

  DATA[clientIdx] = updated;
  updateInDB(updated);
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    const entry = { ...updated }; delete entry.kyc_docs; delete entry.policy_doc;
    entry.kyc_docs = []; entry.policy_doc = null;
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(updated.id).set(entry).catch(() => {});
  }
  applyFiltersAndStats();
  closeModal('editClientOverlay');
  showToast(`✅ ${name} updated!`, 'success');
  logActivity(`✏️ Updated client: ${name}`, 'info');
}

// ══════════════════════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════════════════════
function deleteClient(clientId, clientName) {
  if (!confirm(`Delete record for "${clientName}"?\n\nThis cannot be undone.`)) return;
  const idx = DATA.findIndex(c => c.id === clientId);
  if (idx === -1) return;
  DATA.splice(idx, 1);
  expandedRows.delete(clientId);
  deleteFromDB(clientId);
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(clientId).delete().catch(() => {});
  }
  applyFiltersAndStats();
  showToast(`Deleted: ${clientName}`, 'info');
  logActivity(`🗑️ Deleted client: ${clientName}`, 'error');
}

function wipeAllData() {
  const pass = prompt('⚠️ DANGER ZONE\n\nEnter admin password to delete ALL records:');
  if (pass !== MASTER_PASSWORD) { showToast('Incorrect password. Aborted.', 'error'); return; }
  if (!confirm(`DELETE ALL ${DATA.length} client records?\n\nThis is PERMANENT and cannot be undone!`)) return;
  const count = DATA.length;
  DATA = [];
  expandedRows.clear();
  saveAllToDB();
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).get().then(snap => {
      snap.forEach(doc => doc.ref.delete());
    }).catch(() => {});
  }
  applyFiltersAndStats();
  showToast(`All ${count} records deleted!`, 'error');
  logActivity(`💥 ALL RECORDS WIPED: ${count} clients deleted`, 'error');
}

// ══════════════════════════════════════════════════════════════
// FAMILY MEMBER FORM
// ══════════════════════════════════════════════════════════════
function updateFamilyCards(prefix, existingMembers) {
  const count = Number(document.getElementById(`${prefix}_family_count`).value) || 1;
  const container = document.getElementById(`${prefix}_familyCardsContainer`);
  const existing = existingMembers || [];
  let html = '';
  for (let i = 0; i < count; i++) {
    const m = existing[i] || {};
    let defaultType = i === 0 ? 'self' : i === 1 ? 'spouse' : 'child';
    if (m.type) defaultType = m.type;
    html += buildFamilyCard(prefix, i, defaultType, m);
  }
  container.innerHTML = html;
  // Attach file preview listeners
  container.querySelectorAll('input[type="file"]').forEach(inp => {
    inp.addEventListener('change', function() {
      const prevId = this.dataset.preview;
      if (prevId) document.getElementById(prevId).textContent = this.files.length ? this.files[0].name : 'No file';
    });
  });
}

function buildFamilyCard(prefix, idx, defaultType, existing) {
  const types = [
    { value: 'self', label: 'Self (Main Policyholder)' },
    { value: 'spouse', label: 'Spouse / Partner' },
    { value: 'child', label: 'Child' },
    { value: 'other', label: 'Other (Grandparent / Relative)' }
  ];
  const typeOptions = types.map(t => `<option value="${t.value}" ${t.value === defaultType ? 'selected' : ''}>${t.label}</option>`).join('');
  const genderOptions = ['male','female','other'].map(g => `<option value="${g}" ${(existing.gender||'male') === g ? 'selected' : ''}>${g.charAt(0).toUpperCase()+g.slice(1)}</option>`).join('');
  const labels = { self: 'Self / Main Policyholder', spouse: 'Spouse', child: `Child ${idx - 1}`, other: 'Other Member' };

  return `
    <div class="family-card-item">
      <div class="card-header">
        <span class="card-num">Member ${idx + 1}</span>
        ${idx > 0 ? `<button type="button" class="remove-member-btn" onclick="removeFamilyCard('${prefix}',${idx})"><i class="fa-solid fa-xmark"></i> Remove</button>` : ''}
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Member Type</label>
          <select class="form-select" id="${prefix}_mtype_${idx}" onchange="handleOtherLabel('${prefix}',${idx},this.value)">
            ${typeOptions}
          </select>
        </div>
        <div class="form-group" id="${prefix}_otherlabel_grp_${idx}" style="display:${defaultType==='other'?'flex':'none'}">
          <label class="form-label">Relation Label</label>
          <input type="text" class="form-input" id="${prefix}_otherlabel_${idx}" placeholder="e.g. Father, Mother" value="${existing.other_label||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" class="form-input" id="${prefix}_mname_${idx}" value="${existing.name||''}" placeholder="Enter full name">
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" class="form-input" id="${prefix}_mdob_${idx}" value="${existing.dob||''}">
        </div>
      </div>
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-select" id="${prefix}_mgender_${idx}">${genderOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Height</label>
          <input type="text" class="form-input" id="${prefix}_mheight_${idx}" value="${existing.height||''}" placeholder="e.g. 5'8&quot;">
        </div>
        <div class="form-group">
          <label class="form-label">Weight (kg)</label>
          <input type="number" class="form-input" id="${prefix}_mweight_${idx}" value="${existing.weight||''}" placeholder="kg">
        </div>
      </div>
    </div>`;
}

function removeFamilyCard(prefix, idx) {
  const countInput = document.getElementById(`${prefix}_family_count`);
  let count = parseInt(countInput.value);
  if (count > 1) { countInput.value = count - 1; updateFamilyCards(prefix, collectFamilyCards(prefix).filter((_,i) => i !== idx)); }
}

function handleOtherLabel(prefix, idx, value) {
  const grp = document.getElementById(`${prefix}_otherlabel_grp_${idx}`);
  if (grp) grp.style.display = value === 'other' ? 'flex' : 'none';
}

function collectFamilyCards(prefix) {
  const count = Number(document.getElementById(`${prefix}_family_count`).value) || 1;
  const members = [];
  for (let i = 0; i < count; i++) {
    const type = (document.getElementById(`${prefix}_mtype_${i}`) || {}).value || (i===0 ? 'self' : i===1 ? 'spouse' : 'child');
    members.push({
      type,
      name: (document.getElementById(`${prefix}_mname_${i}`) || {}).value || '',
      dob: (document.getElementById(`${prefix}_mdob_${i}`) || {}).value || '',
      gender: (document.getElementById(`${prefix}_mgender_${i}`) || {}).value || 'male',
      height: (document.getElementById(`${prefix}_mheight_${i}`) || {}).value || '',
      weight: (document.getElementById(`${prefix}_mweight_${i}`) || {}).value || '',
      other_label: type === 'other' ? ((document.getElementById(`${prefix}_otherlabel_${i}`) || {}).value || '') : ''
    });
  }
  return members;
}

// ══════════════════════════════════════════════════════════════
// COMMISSION HELPERS
// ══════════════════════════════════════════════════════════════
function setCommType(prefix, type) {
  commTypeState[prefix] = type;
  const directBtn = document.getElementById(`${prefix}_comm_direct_btn`);
  const pctBtn = document.getElementById(`${prefix}_comm_pct_btn`);
  const directDiv = document.getElementById(`${prefix}_directDiv`);
  const pctDiv = document.getElementById(`${prefix}_pctDiv`);
  const calcDiv = document.getElementById(`${prefix}_calcDiv`);

  if (type === 'direct') {
    directBtn && directBtn.classList.add('active');
    pctBtn && pctBtn.classList.remove('active');
    directDiv && directDiv.classList.remove('hidden');
    pctDiv && pctDiv.classList.add('hidden');
    calcDiv && calcDiv.classList.add('hidden');
  } else {
    pctBtn && pctBtn.classList.add('active');
    directBtn && directBtn.classList.remove('active');
    pctDiv && pctDiv.classList.remove('hidden');
    calcDiv && calcDiv.classList.remove('hidden');
    directDiv && directDiv.classList.add('hidden');
  }
}

function updateCommissionCalc(prefix) {
  if (commTypeState[prefix] !== 'percentage') return;
  const premium = Number(document.getElementById(`${prefix}_premium_amount`).value) || 0;
  const pct = Number(document.getElementById(`${prefix}_comm_pct`).value) || 0;
  const calc = Math.round(premium * pct / 100);
  const el = document.getElementById(`${prefix}_comm_calc`);
  if (el) el.textContent = calc.toLocaleString('en-IN');
}

function getCommissionAmount(prefix) {
  if (commTypeState[prefix] === 'percentage') {
    const premium = Number(document.getElementById(`${prefix}_premium_amount`).value) || 0;
    const pct = Number(document.getElementById(`${prefix}_comm_pct`).value) || 0;
    return Math.round(premium * pct / 100);
  }
  return Number(document.getElementById(`${prefix}_comm_direct`).value) || 0;
}

// ══════════════════════════════════════════════════════════════
// POLICY TERM AUTO-CALC
// ══════════════════════════════════════════════════════════════
function calcPolicyTerm(prefix) {
  const start = document.getElementById(`${prefix}_start_date`).value;
  const end = document.getElementById(`${prefix}_end_date`).value;
  const termEl = document.getElementById(`${prefix}_policy_term`);
  if (!start || !end || !termEl) return;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e) || e <= s) { termEl.value = ''; return; }
  const diffMs = e - s;
  const diffDays = Math.round(diffMs / 86400000);
  const diffMonths = Math.round(diffMs / (30.44 * 86400000));
  const diffYears = Math.round(diffMs / (365.25 * 86400000) * 10) / 10;
  if (diffYears >= 1) termEl.value = `${diffYears} Year${diffYears !== 1 ? 's' : ''}`;
  else if (diffMonths >= 1) termEl.value = `${diffMonths} Month${diffMonths !== 1 ? 's' : ''}`;
  else termEl.value = `${diffDays} Days`;
}

// ══════════════════════════════════════════════════════════════
// PROVIDER "OTHER" TOGGLE
// ══════════════════════════════════════════════════════════════
function toggleOtherProvider(prefix) {
  const sel = document.getElementById(`${prefix}_provider`);
  const grp = document.getElementById(`${prefix}_providerOtherGroup`);
  if (!sel || !grp) return;
  if (sel.value === '__other__') { grp.classList.remove('hidden'); grp.style.display = 'flex'; }
  else { grp.classList.add('hidden'); grp.style.display = 'none'; }
}

// ══════════════════════════════════════════════════════════════
// WHATSAPP
// ══════════════════════════════════════════════════════════════
function sendWhatsApp(clientId) {
  const client = DATA.find(c => c.id === clientId);
  if (!client) return;
  const template = localStorage.getItem(WA_TEMPLATE_KEY) || DEFAULT_WA_TEMPLATE;
  const days = daysLeft(client.end_date);
  const msg = template
    .replace(/{name}/g, client.name)
    .replace(/{provider}/g, client.provider || '')
    .replace(/{plan}/g, client.plan || '')
    .replace(/{policy_no}/g, client.policy_no || 'N/A')
    .replace(/{end_date}/g, formatDate(client.end_date))
    .replace(/{days}/g, days < 0 ? 'EXPIRED' : String(days))
    .replace(/{premium}/g, (client.premium_amount || 0).toLocaleString('en-IN'))
    .replace(/{plan_amount}/g, (client.plan_amount || 0).toLocaleString('en-IN'))
    .replace(/{mobile}/g, client.mobile || '');

  const phone = cleanMobile(client.mobile);
  const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  // Mark as sent
  const idx = DATA.findIndex(c => c.id === clientId);
  if (idx !== -1) {
    DATA[idx].wa_sent = true;
    DATA[idx].wa_sent_at = new Date().toISOString();
    updateInDB(DATA[idx]);
    renderTable();
  }
  logActivity(`💬 WhatsApp reminder sent to: ${client.name}`, 'success');
  showToast(`Reminder sent to ${client.name}`, 'success');
}

function openWaTemplateModal() {
  const template = localStorage.getItem(WA_TEMPLATE_KEY) || DEFAULT_WA_TEMPLATE;
  document.getElementById('waTemplateText').value = template;
  updateWaPreview();
  openModal('waTemplateOverlay');
}

function saveWaTemplate() {
  const text = document.getElementById('waTemplateText').value;
  localStorage.setItem(WA_TEMPLATE_KEY, text);
  closeModal('waTemplateOverlay');
  showToast('WhatsApp template saved!', 'success');
  logActivity('💬 WhatsApp template updated', 'info');
}

function resetWaTemplate() {
  document.getElementById('waTemplateText').value = DEFAULT_WA_TEMPLATE;
  updateWaPreview();
}

function updateWaPreview() {
  const template = document.getElementById('waTemplateText').value;
  const preview = document.getElementById('waPreviewBox');
  const sampleClient = DATA[0] || { name: 'Client Name', provider: 'Star Health', plan: 'Premium Plan', policy_no: 'POL-001', end_date: '2026-06-12', premium_amount: 15000, plan_amount: 500000, mobile: '9876543210' };
  const days = daysLeft(sampleClient.end_date);
  const previewed = template
    .replace(/{name}/g, sampleClient.name)
    .replace(/{provider}/g, sampleClient.provider || 'Star Health')
    .replace(/{plan}/g, sampleClient.plan || 'Plan Name')
    .replace(/{policy_no}/g, sampleClient.policy_no || 'P/001')
    .replace(/{end_date}/g, formatDate(sampleClient.end_date))
    .replace(/{days}/g, days < 0 ? 'EXPIRED' : String(days))
    .replace(/{premium}/g, (sampleClient.premium_amount || 0).toLocaleString('en-IN'))
    .replace(/{plan_amount}/g, (sampleClient.plan_amount || 0).toLocaleString('en-IN'))
    .replace(/{mobile}/g, sampleClient.mobile || '');
  preview.textContent = previewed;
}

function insertVar(varStr) {
  const ta = document.getElementById('waTemplateText');
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + varStr + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + varStr.length;
  ta.focus();
  updateWaPreview();
}

// ══════════════════════════════════════════════════════════════
// CLOUD SYNC MODAL
// ══════════════════════════════════════════════════════════════
function openCloudSyncModal() {
  openModal('cloudSyncOverlay');
}

// ══════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ══════════════════════════════════════════════════════════════
function exportToExcel() {
  if (DATA.length === 0) { showToast('No records to export', 'error'); return; }
  const rows = DATA.map((c, i) => ({
    'Sr No': i + 1,
    'Client Name': c.name,
    'Mobile': c.mobile,
    'Email': c.email || '',
    'Address': c.address || '',
    'Profession': c.profession || '',
    'Insurance Provider': c.provider,
    'Plan Name': c.plan,
    'Sum Insured (₹)': c.plan_amount || 0,
    'Policy Number': c.policy_no || '',
    'Premium Mode': getPremiumModeLabel(c.premium_mode),
    'Premium Amount (₹)': c.premium_amount || 0,
    'Commission (₹)': c.commission_amount || 0,
    'Commission %': c.commission_type === 'percentage' ? c.commission_value + '%' : 'N/A',
    'Start Date': formatDate(c.start_date),
    'End Date': formatDate(c.end_date),
    'Policy Term': c.policy_term || '',
    'Days Left': daysLeft(c.end_date),
    'Status': daysLeft(c.end_date) < 0 ? 'EXPIRED' : daysLeft(c.end_date) === 0 ? 'TODAY' : daysLeft(c.end_date) <= 3 ? 'CRITICAL' : daysLeft(c.end_date) <= 7 ? 'URGENT' : daysLeft(c.end_date) <= 15 ? 'WARNING' : 'ACTIVE',
    'Family Count': c.family_count || 1,
    'Family Members': (c.family_members || []).map(m => `${getMemberTypeLabel(m.type)}: ${m.name}`).join(' | '),
    'Health Notes': c.fitness_details || '',
    'WA Sent': c.wa_sent ? 'Yes' : 'No',
    'Created On': formatDate(c.created_at)
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'GIC Register');

  // Style header
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: '0EA5E9' } } };
  }
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));

  const now = new Date();
  const filename = `GIC_Register_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`✅ Excel exported: ${filename}`, 'success');
  logActivity(`📊 Excel report generated: ${DATA.length} records`, 'success');
}

// ══════════════════════════════════════════════════════════════
// BACKUP & RESTORE
// ══════════════════════════════════════════════════════════════
function downloadBackup() {
  if (DATA.length === 0) { showToast('No data to backup', 'error'); return; }
  const backup = {
    version: '2.0', exportedAt: new Date().toISOString(),
    totalRecords: DATA.length,
    data: DATA.map(c => { const copy = { ...c }; delete copy.kyc_docs; delete copy.policy_doc; return copy; })
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GIC_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Backup downloaded: ${DATA.length} records`, 'success');
  logActivity(`💾 Backup downloaded: ${DATA.length} records`, 'success');
}

function restoreBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.data || !Array.isArray(backup.data)) { showToast('Invalid backup file!', 'error'); return; }
      if (!confirm(`Restore ${backup.data.length} records from backup?\n\nThis will REPLACE current data!`)) return;
      DATA = backup.data.map(c => ({ ...c, kyc_docs: [], policy_doc: null }));
      saveAllToDB(() => {
        applyFiltersAndStats();
        showToast(`✅ Restored ${DATA.length} records!`, 'success');
        logActivity(`⬆️ Backup restored: ${DATA.length} records`, 'success');
      });
    } catch(err) { showToast('Failed to parse backup file!', 'error'); }
  };
  reader.readAsText(file);
  input.value = '';
}

// ══════════════════════════════════════════════════════════════
// ANALYTICS & CHARTS
// ══════════════════════════════════════════════════════════════
function renderAnalytics() {
  renderProviderChart();
  renderUrgencyChart();
  renderForecastChart();
}

function renderProviderChart() {
  const ctx = document.getElementById('providerChart');
  if (!ctx) return;
  if (providerChartInst) providerChartInst.destroy();

  const counts = {};
  DATA.forEach(c => { counts[c.provider || 'Unknown'] = (counts[c.provider || 'Unknown'] || 0) + 1; });
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  const palette = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#06b6d4','#84cc16','#ec4899','#14b8a6','#6366f1','#a855f7'];

  providerChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderWidth: 3, borderColor: '#ffffff',
        hoverBorderWidth: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { font: { family: 'Inter', size: 11 }, padding: 12, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} ${ctx.parsed === 1 ? 'policy' : 'policies'} (${Math.round(ctx.parsed / values.reduce((a,b)=>a+b,0) * 100)}%)`
          }
        }
      }
    }
  });
}

function renderUrgencyChart() {
  const ctx = document.getElementById('urgencyChart');
  if (!ctx) return;
  if (urgencyChartInst) urgencyChartInst.destroy();

  const buckets = { 'Expired': 0, 'Today': 0, '≤3 Days': 0, '≤7 Days': 0, '≤15 Days': 0, 'Safe (>15d)': 0 };
  DATA.forEach(c => {
    const d = daysLeft(c.end_date);
    if (d < 0) buckets['Expired']++;
    else if (d === 0) buckets['Today']++;
    else if (d <= 3) buckets['≤3 Days']++;
    else if (d <= 7) buckets['≤7 Days']++;
    else if (d <= 15) buckets['≤15 Days']++;
    else buckets['Safe (>15d)']++;
  });

  const colors = ['#ef4444','#dc2626','#f97316','#f59e0b','#0ea5e9','#10b981'];
  const labels = Object.keys(buckets);
  const values = Object.values(buckets);

  urgencyChartInst = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3, borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 8, boxWidth: 12 } }
      }
    }
  });

  // Urgency breakdown cards
  const breakdown = document.getElementById('urgencyBreakdown');
  if (breakdown) {
    const colorMap = { 'Expired': '#ef4444','Today': '#dc2626','≤3 Days': '#f97316','≤7 Days': '#f59e0b','≤15 Days': '#0ea5e9','Safe (>15d)': '#10b981' };
    breakdown.innerHTML = labels.map((l, i) => `
      <div class="urgency-item">
        <div class="u-count" style="color:${colorMap[l]}">${values[i]}</div>
        <div class="u-label">${l}</div>
      </div>`).join('');
  }
}

function renderForecastChart() {
  const ctx = document.getElementById('forecastChart');
  if (!ctx) return;
  if (forecastChartInst) forecastChartInst.destroy();

  const yearSel = document.getElementById('forecastYear');
  // Populate years
  const years = [...new Set(DATA.map(c => c.end_date ? new Date(c.end_date).getFullYear() : null).filter(Boolean))];
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort();
  yearSel.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
  const selectedYear = Number(yearSel.value) || currentYear;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const premiumByMonth = Array(12).fill(0);
  const countByMonth = Array(12).fill(0);

  DATA.filter(c => c.end_date && new Date(c.end_date).getFullYear() === selectedYear).forEach(c => {
    const m = new Date(c.end_date).getMonth();
    premiumByMonth[m] += Number(c.premium_amount) || 0;
    countByMonth[m]++;
  });

  forecastChartInst = new Chart(ctx, {
    data: {
      labels: monthNames,
      datasets: [
        {
          type: 'bar', label: 'Premium (₹)',
          data: premiumByMonth,
          backgroundColor: 'rgba(14,165,233,0.75)',
          borderColor: '#0ea5e9', borderWidth: 2,
          borderRadius: 6, yAxisID: 'y'
        },
        {
          type: 'line', label: 'Policy Count',
          data: countByMonth,
          borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)',
          tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#10b981',
          borderWidth: 2.5, yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Inter', size: 12 }, padding: 16, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Premium (₹)') return ` Premium: ₹${ctx.parsed.y.toLocaleString('en-IN')}`;
              return ` Policies: ${ctx.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: {
          position: 'left', title: { display: true, text: 'Premium (₹)', font: { family: 'Inter', size: 11 } },
          ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v), font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y1: {
          position: 'right', title: { display: true, text: 'Policy Count', font: { family: 'Inter', size: 11 } },
          ticks: { stepSize: 1, font: { family: 'Inter', size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// File preview event bindings
document.addEventListener('DOMContentLoaded', function() {
  // KYC docs previews
  ['ac_kyc_docs','ac_policy_doc','lp_kyc_docs','lp_policy_doc','ed_kyc_docs','ed_policy_doc'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() {
      const previewId = id.replace('docs', 'preview').replace('doc', 'preview');
      const prevEl = document.getElementById(previewId);
      if (!prevEl) return;
      if (this.files.length === 1) prevEl.textContent = this.files[0].name;
      else if (this.files.length > 1) prevEl.textContent = `${this.files.length} files selected`;
      else prevEl.textContent = 'No file selected';
    });
  });
});

// ══════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  startClock();
  initDatabase();
  autoConnectFirebase();

  // Password Enter key
  document.getElementById('passwordInput')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyPassword();
  });

  // Load WhatsApp template
  if (!localStorage.getItem(WA_TEMPLATE_KEY)) {
    localStorage.setItem(WA_TEMPLATE_KEY, DEFAULT_WA_TEMPLATE);
  }

  // Initial family card
  updateFamilyCards('ac');
  updateFamilyCards('ed');

  logActivity('🚀 GIC Renewal Portal loaded', 'success');
  logActivity(`📅 Today: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 'info');
});
