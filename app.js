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
const DB_VERSION = 2;
const STORE_NAME = 'clients';
const WA_TEMPLATE_KEY = 'gic_wa_template';
const FIREBASE_CONFIG_KEY = 'gic_firebase_config';
const DEFAULT_COLLECTION = 'gic_policies';

let DATA = [];           // All client records
let filteredData = [];   // Currently displayed records
let CLAIMS = [];         // All claim records
let filteredClaims = []; // Filtered claim records
let activeStatusFilter = 'all';
let dbInstance = null;
let firebaseApp = null;
let firestoreDb = null;
let cloudSyncActive = false;
let firestoreUnsubscribe = null;
let firestoreClaimsUnsubscribe = null;
let expandedRows = new Set();
let commTypeState = { ac: 'direct', ed: 'direct' };

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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: true,
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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: false,
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
    wa_sent: false,
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
    if (!db.objectStoreNames.contains('claims')) {
      db.createObjectStore('claims', { keyPath: 'id' });
    }
  };
  req.onsuccess = function(e) {
    dbInstance = e.target.result;
    logActivity('🗄️ Local database connected', 'info');
    loadAllFromDB();
    loadClaimsFromDB();
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
  CLAIMS = JSON.parse(JSON.stringify(SAMPLE_CLAIMS));
  saveAllToDB(() => {
    saveClaimsToDB(() => {
      logActivity('✨ Sample data loaded — 10 test clients and 2 claims added', 'success');
      applyFiltersAndStats();
      renderClaimsTable();
    });
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
      startRealtimeClaimsSync();
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
    snapshot.forEach(doc => {
      const cloudClient = { ...doc.data(), id: doc.id };
      

      cloud.push(cloudClient);
    });
    
    DATA = cloud;
    saveAllToDB();
    applyFiltersAndStats();
    logActivity(`☁️ Live sync: ${cloud.length} records received`, 'info');
  });
}

function startRealtimeClaimsSync() {
  if (firestoreClaimsUnsubscribe) firestoreClaimsUnsubscribe();
  firestoreClaimsUnsubscribe = firestoreDb.collection('gic_claims').onSnapshot(snapshot => {
    const cloudClaims = [];
    snapshot.forEach(doc => {
      cloudClaims.push({ ...doc.data(), id: doc.id });
    });
    CLAIMS = cloudClaims;
    saveClaimsToDB();
    renderClaimsTable();
    logActivity(`☁️ Claims sync: ${cloudClaims.length} records received`, 'info');
  });
}

function disconnectCloud() {
  if (firestoreUnsubscribe) { firestoreUnsubscribe(); firestoreUnsubscribe = null; }
  if (firestoreClaimsUnsubscribe) { firestoreClaimsUnsubscribe(); firestoreClaimsUnsubscribe = null; }
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

const HARDCODED_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAPxNVrkK3_KCpygpsuzsFSPPJXtJ38kkc",
  authDomain: "gic-register-ab710.firebaseapp.com",
  projectId: "gic-register-ab710",
  storageBucket: "gic-register-ab710.firebasestorage.app",
  collection: "gic_policies"
};

function autoConnectFirebase() {
  let cfg = null;
  const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (saved) {
    try { cfg = JSON.parse(saved); } catch(e) {}
  }
  if (!cfg) {
    cfg = HARDCODED_FIREBASE_CONFIG;
  }
  if (!cfg || !cfg.projectId || !cfg.apiKey) return;
  try {
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

function isFuturePolicy(startDateStr) {
  if (!startDateStr) return false;
  const start = new Date(startDateStr); start.setHours(0,0,0,0);
  return start > today();
}

function daysUntilStart(startDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr); start.setHours(0,0,0,0);
  return Math.ceil((start - today()) / 86400000);
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ddmmyyyyToYyyymmdd(str) {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return str;
}

function yyyymmddToDdmmyyyy(str) {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}-${month}-${year}`;
  }
  return str;
}

function parseDateString(str) {
  if (!str) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const parts = str.split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function isValidDateString(str) {
  if (!str) return true;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(str)) return false;
  const parts = str.split('-');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

// Delegated Date Mask Input Listeners
document.addEventListener('keydown', function(e) {
  if (e.target && e.target.classList.contains('date-mask')) {
    e.target.lastKey = e.key;
    if (e.key === 'Backspace') {
      const start = e.target.selectionStart;
      const val = e.target.value;
      if (start > 0 && val[start - 1] === '-') {
        e.preventDefault();
        e.target.value = val.slice(0, start - 2) + val.slice(start);
        e.target.setSelectionRange(start - 2, start - 2);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
});

document.addEventListener('input', function(e) {
  if (e.target && e.target.classList.contains('date-mask')) {
    let val = e.target.value.replace(/[^0-9]/g, '');
    let res = '';
    if (val.length > 0) {
      res += val.substring(0, 2);
    }
    if (val.length > 2) {
      res += '-' + val.substring(2, 4);
    }
    if (val.length > 4) {
      res += '-' + val.substring(4, 8);
    }
    e.target.value = res;
  }
});

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
  const claimView = document.getElementById('claimsView');
  const anaView = document.getElementById('analyticsView');
  const tabReg = document.getElementById('tabRegister');
  const tabClaim = document.getElementById('tabClaims');
  const tabAna = document.getElementById('tabAnalytics');

  // Hide all
  regView.classList.add('hidden');
  claimView.classList.add('hidden');
  anaView.classList.add('hidden');
  tabReg.classList.remove('active');
  tabClaim.classList.remove('active');
  tabAna.classList.remove('active');

  if (view === 'register') {
    regView.classList.remove('hidden');
    tabReg.classList.add('active');
  } else if (view === 'claims') {
    claimView.classList.remove('hidden');
    tabClaim.classList.add('active');
    renderClaimsTable();
  } else {
    anaView.classList.remove('hidden');
    tabAna.classList.add('active');
    renderAnalytics();
  }
}

// ══════════════════════════════════════════════════════════════
// STATS & FILTERS
// ══════════════════════════════════════════════════════════════
function updateYearFilters() {
  const yearFilter = document.getElementById('yearFilter');
  if (!yearFilter) return;

  const currentVal = yearFilter.value;

  const years = [...new Set(DATA.map(c => c.end_date ? new Date(c.end_date).getFullYear() : null).filter(Boolean))];
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort((a, b) => b - a);

  const existingOptions = Array.from(yearFilter.options).map(opt => opt.value).filter(val => val !== 'all');
  if (JSON.stringify(years) === JSON.stringify(existingOptions.map(Number))) {
    return;
  }

  let html = '<option value="all">All Years</option>';
  years.forEach(y => {
    html += `<option value="${y}">${y}</option>`;
  });

  yearFilter.innerHTML = html;

  if (currentVal && [...yearFilter.options].some(opt => opt.value === currentVal)) {
    yearFilter.value = currentVal;
  } else {
    yearFilter.value = 'all';
  }
}

function applyFiltersAndStats() {
  updateYearFilters();

  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const selectedMonth = document.getElementById('monthFilter').value;
  const selectedYear = document.getElementById('yearFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  // Enrich with daysLeft, isFuture, and isRenewed
  const enriched = DATA.map(c => {
    const days = daysLeft(c.end_date);
    const isFuture = isFuturePolicy(c.start_date);
    
    // Check if there is a newer policy (renewal) in the dataset
    const isRenewed = DATA.some(other => {
      if (other.id === c.id) return false;
      
      const hasSamePolicyNo = c.policy_no && other.policy_no && 
                              c.policy_no.trim() !== '' && 
                              c.policy_no.trim().toLowerCase() === other.policy_no.trim().toLowerCase();
                              
      const hasSameClientAndPlan = (!c.policy_no || !other.policy_no || c.policy_no.trim() === '' || other.policy_no.trim() === '') &&
                                    c.name && other.name &&
                                    c.name.trim().toLowerCase() === other.name.trim().toLowerCase() &&
                                    c.provider && other.provider &&
                                    c.provider.trim().toLowerCase() === other.provider.trim().toLowerCase() &&
                                    c.plan && other.plan &&
                                    c.plan.trim().toLowerCase() === other.plan.trim().toLowerCase();
                                    
      if (!hasSamePolicyNo && !hasSameClientAndPlan) return false;
      
      // Check if other starts after this one
      const cStart = new Date(c.start_date || c.created_at || 0);
      const otherStart = new Date(other.start_date || other.created_at || 0);
      if (otherStart > cStart) return true;
      if (otherStart.getTime() === cStart.getTime()) {
        const cEnd = new Date(c.end_date || 0);
        const otherEnd = new Date(other.end_date || 0);
        if (otherEnd > cEnd) return true;
        return other.id > c.id;
      }
      return false;
    });

    return { ...c, _days: days, _isFuture: isFuture, _isRenewed: isRenewed };
  });

  // Compute stats (all records, no status filter)
  let totalPremium = 0, totalComm = 0, active = 0, expired = 0, days15 = 0, days7 = 0, days3 = 0, expiredToday = 0;
  enriched.forEach(c => {
    if (c._isFuture) {
      return; // Skip future policies for active/expired statistics
    }

    let isActive = false;
    if (c._days >= 0) {
      if (c._isRenewed) {
        // Find if any newer counterpart has started
        const newerActive = enriched.some(other => {
          if (other.id === c.id) return false;
          const hasSamePolicyNo = c.policy_no && other.policy_no && 
                                  c.policy_no.trim() !== '' && 
                                  c.policy_no.trim().toLowerCase() === other.policy_no.trim().toLowerCase();
          const hasSameClientAndPlan = (!c.policy_no || !other.policy_no || c.policy_no.trim() === '' || other.policy_no.trim() === '') &&
                                        c.name && other.name &&
                                        c.name.trim().toLowerCase() === other.name.trim().toLowerCase() &&
                                        c.provider && other.provider &&
                                        c.provider.trim().toLowerCase() === other.provider.trim().toLowerCase() &&
                                        c.plan && other.plan &&
                                        c.plan.trim().toLowerCase() === other.plan.trim().toLowerCase();
          if (!hasSamePolicyNo && !hasSameClientAndPlan) return false;
          
          const cStart = new Date(c.start_date || c.created_at || 0);
          const otherStart = new Date(other.start_date || other.created_at || 0);
          return otherStart > cStart && !other._isFuture;
        });
        if (!newerActive) {
          isActive = true; // No newer policy has started yet, old is still active
        }
      } else {
        isActive = true;
      }
    }

    if (isActive) {
      totalPremium += Number(c.premium_amount) || 0;
      totalComm += Number(c.commission_amount) || 0;
      active++;
    } else if (c._days < 0 && !c._isRenewed) {
      expired++;
    }

    // Alerts and expired counts are for non-renewed policies only
    if (!c._isRenewed) {
      if (c._days === 0) expiredToday++;

      // Exclusive ranges
      if (c._days >= 0 && c._days <= 3) days3++;
      else if (c._days >= 4 && c._days <= 7) days7++;
      else if (c._days >= 8 && c._days <= 15) days15++;
    }
  });

  document.getElementById('statTotalPremium').textContent = formatCurrency(totalPremium);
  document.getElementById('statPremiumSub').textContent = `${active} active ${active === 1 ? 'policy' : 'policies'}`;
  document.getElementById('statCommission').textContent = formatCurrency(totalComm);
  document.getElementById('statCommissionSub').textContent = 'from active policies';
  document.getElementById('stat15Days').textContent = days15;
  document.getElementById('stat7Days').textContent = days7;
  document.getElementById('stat3Days').textContent = days3;
  document.getElementById('statExpiredToday').textContent = expiredToday;
  document.getElementById('statExpiredSub').textContent = `${expired} total expired`;

  // Filter
  filteredData = enriched.filter(c => {
    // Status filter
    if (activeStatusFilter === 'expired' && (c._days >= 0 || c._isFuture || c._isRenewed)) return false;
    if (activeStatusFilter === 'today' && (c._days !== 0 || c._isFuture || c._isRenewed)) return false;
    if (activeStatusFilter === '3' && (c._days < 0 || c._days > 3 || c._isFuture || c._isRenewed)) return false;
    if (activeStatusFilter === '7' && (c._days < 4 || c._days > 7 || c._isFuture || c._isRenewed)) return false;
    if (activeStatusFilter === '15' && (c._days < 8 || c._days > 15 || c._isFuture || c._isRenewed)) return false;

    // Year filter (on end_date year)
    if (selectedYear !== 'all') {
      const y = new Date(c.end_date).getFullYear();
      if (y !== Number(selectedYear)) return false;
    }

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
    let expClass = getExpiryClass(days);
    let expLabel = getExpiryLabel(days);
    if (client._isFuture) {
      expClass = 'exp-future';
      const daysToStart = daysUntilStart(client.start_date);
      expLabel = daysToStart === 1 ? 'Starts Tomorrow' : `Starts in ${daysToStart}d`;
    } else if (client._isRenewed) {
      expClass = 'exp-renewed';
      expLabel = 'Renewed';
    }
    const provClass = getProviderClass(client.provider);
    const isExpanded = expandedRows.has(client.id);

    // Row background class
    let rowClass = '';
    if (client._isRenewed) {
      rowClass = 'renewed-row';
    } else if (days < 0) {
      rowClass = 'expired-row';
    } else if (days <= 3) {
      rowClass = 'urgent-row';
    }
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
        <div class="action-btns">
          <button class="action-btn wa ${client.wa_sent ? 'sent' : ''}" title="Send WhatsApp Reminder" onclick="sendWhatsApp('${client.id}')">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
          <button class="action-btn renew" title="Renew Policy" onclick="openRenewModal('${client.id}')">
            <i class="fa-solid fa-arrows-rotate"></i>
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

  const fitnessSection = client.fitness_details
    ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic">"${escapeHtml(client.fitness_details)}"</div>`
    : '';

  return `
    <div class="family-expand-panel">
      <div class="family-expand-title"><i class="fa-solid fa-people-group"></i> Family Members (${(client.family_members||[]).length})</div>
      <div class="family-members-grid">${memberCards || '<div style="color:var(--text-light);font-size:12px">No family members added</div>'}</div>
      ${fitnessSection}
    </div>`;
}

function toggleFamilyRow(clientId) {
  if (expandedRows.has(clientId)) expandedRows.delete(clientId);
  else expandedRows.add(clientId);
  renderTable();
}



function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
// ADD CLIENT
// ══════════════════════════════════════════════════════════════
function openAddClientModal() {
  const titleEl = document.getElementById('addClientModalTitle');
  if (titleEl) titleEl.textContent = 'Add New Client';
  // Reset all fields
  ['ac_name','ac_mobile','ac_email','ac_address','ac_plan','ac_policy_no','ac_plan_amount','ac_fitness'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('ac_profession').value = '';
  document.getElementById('ac_provider').value = '';
  document.getElementById('ac_providerOtherGroup').style.display = 'none';
  document.getElementById('ac_start_date').value = '';
  document.getElementById('ac_end_date').value = '';
  document.getElementById('ac_policy_term').value = '';
  document.getElementById('ac_family_count').value = '1';
  document.getElementById('ac_comm_direct').value = '';
  document.getElementById('ac_comm_pct').value = '';
  document.getElementById('ac_comm_calc').textContent = '0';
  setCommType('ac', 'percentage');
  updateFamilyCards('ac');
  openModal('addClientOverlay');
  document.getElementById('ac_name').focus();
}

function submitAddClient() {
  const name = document.getElementById('ac_name').value.trim();
  const mobile = document.getElementById('ac_mobile').value.trim();
  const providerSel = document.getElementById('ac_provider').value;
  const provider = providerSel === '__other__' ? document.getElementById('ac_providerOther').value.trim() : providerSel;
  const plan = document.getElementById('ac_plan').value.trim();
  const planAmount = document.getElementById('ac_plan_amount').value;
  const startDateRaw = document.getElementById('ac_start_date').value.trim();
  const endDateRaw = document.getElementById('ac_end_date').value.trim();

  if (!name || !mobile || !provider || !plan || !planAmount || !endDateRaw) {
    showToast('Please fill all required (*) fields', 'error'); return;
  }

  if (startDateRaw && !isValidDateString(startDateRaw)) {
    showToast('Please enter a valid Policy Start Date in DD-MM-YYYY format', 'error'); return;
  }
  if (!isValidDateString(endDateRaw)) {
    showToast('Please enter a valid Policy End Date in DD-MM-YYYY format', 'error'); return;
  }

  const count = Number(document.getElementById('ac_family_count').value) || 1;
  for (let i = 0; i < count; i++) {
    const rawDob = (document.getElementById(`ac_mdob_${i}`) || {}).value || '';
    if (rawDob && !isValidDateString(rawDob)) {
      showToast(`Please enter a valid DOB (DD-MM-YYYY) for Member ${i + 1}`, 'error'); return;
    }
  }

  const commAmount = getCommissionAmount('ac');
  const familyMembers = collectFamilyCards('ac');
  const clientId = generateId();

  const newClient = {
    id: clientId,
    name, mobile: cleanMobile(mobile),
    email: document.getElementById('ac_email').value.trim(),
    address: document.getElementById('ac_address').value.trim(),
    profession: document.getElementById('ac_profession').value,
    provider,
    plan,
    plan_amount: Number(planAmount) || 0,
    policy_no: document.getElementById('ac_policy_no').value.trim(),
    premium_mode: 'yearly',
    premium_amount: Number(planAmount) || 0,
    start_date: ddmmyyyyToYyyymmdd(startDateRaw),
    end_date: ddmmyyyyToYyyymmdd(endDateRaw),
    policy_term: document.getElementById('ac_policy_term').value,
    commission_type: commTypeState.ac,
    commission_value: Number(document.getElementById(commTypeState.ac === 'percentage' ? 'ac_comm_pct' : 'ac_comm_direct').value) || 0,
    commission_amount: commAmount,
    fitness_details: document.getElementById('ac_fitness').value.trim(),
    family_count: Number(document.getElementById('ac_family_count').value) || 1,
    family_members: familyMembers,
    wa_sent: false,
    created_at: new Date().toISOString()
  };

  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY) || '{}');
    const docRef = firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(newClient.id);
    docRef.set(newClient).then(() => {
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
  document.getElementById('ed_start_date').value = yyyymmddToDdmmyyyy(client.start_date || '');
  document.getElementById('ed_end_date').value = yyyymmddToDdmmyyyy(client.end_date || '');
  document.getElementById('ed_policy_term').value = client.policy_term || '';

  // Commission
  setCommType('ed', client.commission_type || 'percentage');
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

  openModal('editClientOverlay');
}

function submitEditClient() {
  if (!currentEditId) return;
  const clientIdx = DATA.findIndex(c => c.id === currentEditId);
  if (clientIdx === -1) return;

  const name = document.getElementById('ed_name').value.trim();
  const mobile = document.getElementById('ed_mobile').value.trim();
  const providerSel = document.getElementById('ed_provider').value;
  const provider = providerSel === '__other__' ? document.getElementById('ed_providerOther').value.trim() : providerSel;
  const plan = document.getElementById('ed_plan').value.trim();
  const planAmount = document.getElementById('ed_plan_amount').value;
  const startDateRaw = document.getElementById('ed_start_date').value.trim();
  const endDateRaw = document.getElementById('ed_end_date').value.trim();

  if (!name || !mobile || !provider || !plan || !planAmount || !endDateRaw) {
    showToast('Please fill all required fields', 'error'); return;
  }

  if (startDateRaw && !isValidDateString(startDateRaw)) {
    showToast('Please enter a valid Start Date in DD-MM-YYYY format', 'error'); return;
  }
  if (!isValidDateString(endDateRaw)) {
    showToast('Please enter a valid End Date in DD-MM-YYYY format', 'error'); return;
  }

  const count = Number(document.getElementById('ed_family_count').value) || 1;
  for (let i = 0; i < count; i++) {
    const rawDob = (document.getElementById(`ed_mdob_${i}`) || {}).value || '';
    if (rawDob && !isValidDateString(rawDob)) {
      showToast(`Please enter a valid DOB (DD-MM-YYYY) for Member ${i + 1}`, 'error'); return;
    }
  }

  const commAmount = getCommissionAmount('ed');
  const familyMembers = collectFamilyCards('ed');

  const updated = {
    ...DATA[clientIdx], name, mobile: cleanMobile(mobile),
    email: document.getElementById('ed_email').value.trim(),
    address: document.getElementById('ed_address').value.trim(),
    profession: document.getElementById('ed_profession').value,
    provider, plan,
    plan_amount: Number(planAmount) || 0,
    policy_no: document.getElementById('ed_policy_no').value.trim(),
    premium_mode: 'yearly',
    premium_amount: Number(planAmount) || 0,
    start_date: ddmmyyyyToYyyymmdd(startDateRaw),
    end_date: ddmmyyyyToYyyymmdd(endDateRaw),
    policy_term: document.getElementById('ed_policy_term').value,
    commission_type: commTypeState.ed,
    commission_value: Number(document.getElementById(commTypeState.ed === 'percentage' ? 'ed_comm_pct' : 'ed_comm_direct').value) || 0,
    commission_amount: commAmount,
    fitness_details: document.getElementById('ed_fitness').value.trim(),
    family_count: Number(document.getElementById('ed_family_count').value) || 1,
    family_members: familyMembers,
    updated_at: new Date().toISOString()
  };

  DATA[clientIdx] = updated;
  updateInDB(updated);
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).doc(updated.id).set(updated).catch(() => {});
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
  if (!confirm(`DELETE ALL ${DATA.length} client records and ${CLAIMS.length} claim records?\n\nThis is PERMANENT and cannot be undone!`)) return;
  const count = DATA.length;
  const claimCount = CLAIMS.length;
  DATA = [];
  CLAIMS = [];
  expandedRows.clear();
  saveAllToDB();
  saveClaimsToDB();
  if (cloudSyncActive && firestoreDb) {
    const cfg = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY)||'{}');
    firestoreDb.collection(cfg.collection || DEFAULT_COLLECTION).get().then(snap => {
      snap.forEach(doc => doc.ref.delete());
    }).catch(() => {});
    firestoreDb.collection('gic_claims').get().then(snap => {
      snap.forEach(doc => doc.ref.delete());
    }).catch(() => {});
  }
  applyFiltersAndStats();
  renderClaimsTable();
  showToast(`All ${count} records and ${claimCount} claims deleted!`, 'error');
  logActivity(`💥 ALL RECORDS WIPED: ${count} clients and ${claimCount} claims deleted`, 'error');
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
          <input type="text" class="form-input date-mask" id="${prefix}_mdob_${idx}" value="${yyyymmddToDdmmyyyy(existing.dob||'')}" placeholder="DD-MM-YYYY" maxlength="10">
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
      dob: ddmmyyyyToYyyymmdd((document.getElementById(`${prefix}_mdob_${i}`) || {}).value || ''),
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
  const premium = Number(document.getElementById(`${prefix}_plan_amount`).value) || 0;
  const pct = Number(document.getElementById(`${prefix}_comm_pct`).value) || 0;
  const calc = Math.round(premium * pct / 100);
  const el = document.getElementById(`${prefix}_comm_calc`);
  if (el) el.textContent = calc.toLocaleString('en-IN');
}

function getCommissionAmount(prefix) {
  if (commTypeState[prefix] === 'percentage') {
    const premium = Number(document.getElementById(`${prefix}_plan_amount`).value) || 0;
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
  const s = parseDateString(start), e = parseDateString(end);
  if (!s || !e || e <= s) { termEl.value = ''; return; }
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
  if (DATA.length === 0 && CLAIMS.length === 0) { showToast('No data to backup', 'error'); return; }
  const backup = {
    version: '2.0', exportedAt: new Date().toISOString(),
    totalRecords: DATA.length,
    totalClaims: CLAIMS.length,
    data: DATA,
    claims: CLAIMS
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GIC_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Backup downloaded: ${DATA.length} records, ${CLAIMS.length} claims`, 'success');
  logActivity(`💾 Backup downloaded: ${DATA.length} records, ${CLAIMS.length} claims`, 'success');
}

function restoreBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if ((!backup.data || !Array.isArray(backup.data)) && (!backup.claims || !Array.isArray(backup.claims))) { showToast('Invalid backup file!', 'error'); return; }
      if (!confirm(`Restore ${backup.data ? backup.data.length : 0} records and ${backup.claims ? backup.claims.length : 0} claims from backup?\n\nThis will REPLACE current data!`)) return;
      DATA = backup.data || [];
      CLAIMS = backup.claims || [];
      saveAllToDB(() => {
        saveClaimsToDB(() => {
          applyFiltersAndStats();
          renderClaimsTable();
          showToast(`✅ Restored ${DATA.length} records and ${CLAIMS.length} claims!`, 'success');
          logActivity(`⬆️ Backup restored: ${DATA.length} records and ${CLAIMS.length} claims`, 'success');
        });
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
        legend: { position: 'right', labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 12, boxWidth: 12 } },
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
        legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 8, boxWidth: 12 } }
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
  const previousVal = yearSel ? yearSel.value : '';

  // Populate years
  const years = [...new Set(DATA.map(c => c.end_date ? new Date(c.end_date).getFullYear() : null).filter(Boolean))];
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort();

  // If there was a previous selection, maintain it; otherwise default to current year
  const defaultSelected = previousVal ? Number(previousVal) : currentYear;
  yearSel.innerHTML = years.map(y => `<option value="${y}" ${y === defaultSelected ? 'selected' : ''}>${y}</option>`).join('');
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
        legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 12 }, padding: 16, boxWidth: 14 } },
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
        x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } } },
        y: {
          position: 'left', title: { display: true, text: 'Premium (₹)', font: { family: 'Plus Jakarta Sans', size: 11 } },
          ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v), font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y1: {
          position: 'right', title: { display: true, text: 'Policy Count', font: { family: 'Plus Jakarta Sans', size: 11 } },
          ticks: { stepSize: 1, font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}



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

// ══════════════════════════════════════════════════════════════
// POLICY RENEWAL CLONING
// ══════════════════════════════════════════════════════════════
function openRenewModal(clientId) {
  const client = DATA.find(c => c.id === clientId);
  if (!client) return;

  // 1. Reset all fields in the Add Client modal first
  openAddClientModal();

  // 2. Set the modal title to "Renew Policy: [Client Name]"
  document.getElementById('addClientModalTitle').textContent = `Renew Policy: ${client.name}`;

  // 3. Pre-fill text inputs
  document.getElementById('ac_name').value = client.name || '';
  document.getElementById('ac_mobile').value = client.mobile || '';
  document.getElementById('ac_email').value = client.email || '';
  document.getElementById('ac_address').value = client.address || '';
  document.getElementById('ac_profession').value = client.profession || '';
  document.getElementById('ac_plan').value = client.plan || '';
  document.getElementById('ac_plan_amount').value = client.plan_amount || '';
  document.getElementById('ac_policy_no').value = client.policy_no || '';

  // 4. Pre-fill provider selection
  const providerSelect = document.getElementById('ac_provider');
  let providerFound = false;
  for (let opt of providerSelect.options) {
    if (opt.value === client.provider || opt.text === client.provider) { 
      opt.selected = true; 
      providerFound = true; 
      break; 
    }
  }
  if (!providerFound) {
    providerSelect.value = '__other__';
    document.getElementById('ac_providerOtherGroup').style.display = 'flex';
    document.getElementById('ac_providerOtherGroup').classList.remove('hidden');
    document.getElementById('ac_providerOther').value = client.provider || '';
  } else {
    document.getElementById('ac_providerOtherGroup').style.display = 'none';
    document.getElementById('ac_providerOtherGroup').classList.add('hidden');
  }

  // 5. Pre-fill dates (pre-calculate new term dates)
  if (client.end_date) {
    const oldEndDate = new Date(client.end_date);
    if (!isNaN(oldEndDate.getTime())) {
      // Start Date = old_end_date + 1 day
      const newStartDate = new Date(oldEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1);

      // End Date = old_end_date + 1 year
      const newEndDate = new Date(oldEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      // Format as DD-MM-YYYY
      const startStr = yyyymmddToDdmmyyyy(newStartDate.toISOString().split('T')[0]);
      const endStr = yyyymmddToDdmmyyyy(newEndDate.toISOString().split('T')[0]);

      document.getElementById('ac_start_date').value = startStr;
      document.getElementById('ac_end_date').value = endStr;
      
      // Calculate policy term
      calcPolicyTerm('ac');
    }
  }

  // 6. Pre-fill commission details
  setCommType('ac', client.commission_type || 'percentage');
  if (client.commission_type === 'percentage') {
    document.getElementById('ac_comm_pct').value = client.commission_value || '';
    updateCommissionCalc('ac');
  } else {
    document.getElementById('ac_comm_direct').value = client.commission_amount || '';
  }

  // 7. Pre-fill fitness / health notes
  document.getElementById('ac_fitness').value = client.fitness_details || '';

  // 8. Pre-fill family members
  document.getElementById('ac_family_count').value = client.family_count || 1;
  updateFamilyCards('ac', client.family_members);
}

// ══════════════════════════════════════════════════════════════
// CLAIMS DATA & DATABASE HELPERS
// ══════════════════════════════════════════════════════════════
const SAMPLE_CLAIMS = [
  {
    id: 'MMC_CLAIM_SAMPLE_1',
    client_id: 'MMC_SAMPLE_001',
    client_name: 'Ramesh Kumar Sharma',
    claimant_name: 'Sunita Sharma',
    provider: 'Star Health Insurance',
    plan: 'Star Comprehensive Family',
    amount: 45000,
    status: 'settled',
    date_applied: '2026-05-10',
    date_docs_sent: '2026-05-12',
    date_responded: '2026-05-20',
    date_approved: '2026-05-22',
    date_settled: '2026-05-25',
    notes: 'Hospitalized at Sunshine Hospital for Dengue treatment. Bills settled completely.',
    created_at: '2026-05-10T10:00:00Z'
  },
  {
    id: 'MMC_CLAIM_SAMPLE_2',
    client_id: 'MMC_SAMPLE_002',
    client_name: 'Priya Mehta',
    claimant_name: 'Aryan Mehta',
    provider: 'HDFC ERGO Health Insurance',
    plan: 'HDFC Optima Restore',
    amount: 18000,
    status: 'pending',
    date_applied: '2026-06-01',
    date_docs_sent: '2026-06-03',
    date_responded: '',
    date_approved: '',
    date_settled: '',
    notes: 'Claim for tonsils surgery. Documents submitted to TPA.',
    created_at: '2026-06-01T11:00:00Z'
  }
];

function loadClaimsFromDB() {
  if (!dbInstance) {
    CLAIMS = JSON.parse(JSON.stringify(SAMPLE_CLAIMS));
    renderClaimsTable();
    return;
  }
  const tx = dbInstance.transaction(['claims'], 'readonly');
  const store = tx.objectStore('claims');
  const req = store.getAll();
  req.onsuccess = function(e) {
    CLAIMS = e.target.result || [];
    if (CLAIMS.length === 0 && DATA.length <= 10) {
      CLAIMS = JSON.parse(JSON.stringify(SAMPLE_CLAIMS));
      saveClaimsToDB();
    }
    logActivity(`📂 Loaded ${CLAIMS.length} claim records`, 'info');
    renderClaimsTable();
  };
}

function saveClaimsToDB(callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction(['claims'], 'readwrite');
  const store = tx.objectStore('claims');
  store.clear().onsuccess = function() {
    let remaining = CLAIMS.length;
    if (remaining === 0) { if (callback) callback(); return; }
    CLAIMS.forEach(item => {
      const req = store.put(item);
      req.onsuccess = function() { remaining--; if (remaining === 0 && callback) callback(); };
      req.onerror = function() { remaining--; if (remaining === 0 && callback) callback(); };
    });
  };
}

function addClaimToDB(item, callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction(['claims'], 'readwrite');
  tx.objectStore('claims').put(item).onsuccess = function() { if (callback) callback(); };
}

function updateClaimInDB(item, callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction(['claims'], 'readwrite');
  tx.objectStore('claims').put(item).onsuccess = function() { if (callback) callback(); };
}

function deleteClaimFromDB(id, callback) {
  if (!dbInstance) { if (callback) callback(); return; }
  const tx = dbInstance.transaction(['claims'], 'readwrite');
  tx.objectStore('claims').delete(id).onsuccess = function() { if (callback) callback(); };
}

// ══════════════════════════════════════════════════════════════
// CLAIMS ACTIONS & RENDER
// ══════════════════════════════════════════════════════════════
function updateClaimsStats() {
  let totalClaimAmt = 0, pendingClaimAmt = 0, settledClaimAmt = 0;
  let totalCount = CLAIMS.length, pendingCount = 0, settledCount = 0;

  CLAIMS.forEach(c => {
    const amt = Number(c.amount) || 0;
    totalClaimAmt += amt;
    if (c.status === 'settled') {
      settledClaimAmt += amt;
      settledCount++;
    } else if (c.status === 'pending') {
      pendingClaimAmt += amt;
      pendingCount++;
    } else if (c.status === 'approved') {
      pendingClaimAmt += amt;
      pendingCount++;
    }
  });

  const totalEl = document.getElementById('claimStatTotal');
  const totalSubEl = document.getElementById('claimStatTotalSub');
  const pendingEl = document.getElementById('claimStatPending');
  const pendingSubEl = document.getElementById('claimStatPendingSub');
  const settledEl = document.getElementById('claimStatSettled');
  const settledSubEl = document.getElementById('claimStatSettledSub');

  if (totalEl) totalEl.textContent = formatCurrency(totalClaimAmt);
  if (totalSubEl) totalSubEl.textContent = `${totalCount} claim${totalCount !== 1 ? 's' : ''} logged`;
  if (pendingEl) pendingEl.textContent = formatCurrency(pendingClaimAmt);
  if (pendingSubEl) pendingSubEl.textContent = `${pendingCount} pending / approved`;
  if (settledEl) settledEl.textContent = formatCurrency(settledClaimAmt);
  if (settledSubEl) settledSubEl.textContent = `${settledCount} settled`;
}

function applyClaimsFilters() {
  const query = (document.getElementById('claimSearchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('claimStatusFilter').value;

  filteredClaims = CLAIMS.filter(c => {
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Search query
    if (query) {
      const searchable = [
        c.client_name || '',
        c.claimant_name || '',
        c.notes || '',
        c.status || ''
      ].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  // Sort by date applied descending
  filteredClaims.sort((a, b) => new Date(b.date_applied) - new Date(a.date_applied));

  const countEl = document.getElementById('claimRecordCount');
  if (countEl) countEl.textContent = `${filteredClaims.length} claim${filteredClaims.length !== 1 ? 's' : ''}`;

  renderClaimsTableRows();
}

function renderClaimsTable() {
  updateClaimsStats();
  applyClaimsFilters();
}

function renderClaimsTableRows() {
  const tbody = document.getElementById('claimsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filteredClaims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔍</div><h3>No claims found</h3><p>Try adjusting your search or filters</p></div></td></tr>`;
    return;
  }

  filteredClaims.forEach((claim, idx) => {
    const statusClass = claim.status || 'pending';
    const tr = document.createElement('tr');
    
    // Dates timeline markup
    const timelineHtml = `
      <div style="font-size:11.5px;line-height:1.4">
        <strong>Applied:</strong> ${formatDate(claim.date_applied)}<br>
        ${claim.date_docs_sent ? `<strong>Docs Sent:</strong> ${formatDate(claim.date_docs_sent)}<br>` : ''}
        ${claim.date_responded ? `<strong>Responded:</strong> ${formatDate(claim.date_responded)}<br>` : ''}
        ${claim.date_approved ? `<strong>Approved:</strong> ${formatDate(claim.date_approved)}<br>` : ''}
        ${claim.date_settled ? `<strong>Settled:</strong> ${formatDate(claim.date_settled)}<br>` : ''}
      </div>
    `;

    tr.innerHTML = `
      <td class="sr-num">${idx + 1}</td>
      <td>
        <div class="cell-name">
          <strong>${escapeHtml(claim.client_name)}</strong><br>
          <small>Claimant: ${escapeHtml(claim.claimant_name)}</small>
        </div>
      </td>
      <td>
        <div class="cell-plan">
          <strong>${escapeHtml(claim.plan || '—')}</strong><br>
          <span class="provider-badge ${getProviderClass(claim.provider)}">${escapeHtml(claim.provider || '—')}</span>
        </div>
      </td>
      <td>
        <div class="cell-premium">
          <strong>${formatCurrency(claim.amount)}</strong>
        </div>
      </td>
      <td>
        <span class="claim-status-badge ${statusClass}">${statusClass}</span>
      </td>
      <td>${timelineHtml}</td>
      <td style="max-width:200px;font-size:12px;color:var(--text-secondary);word-wrap:break-word;white-space:normal;">
        ${claim.notes ? escapeHtml(claim.notes) : '<span style="color:var(--text-light)">No remarks</span>'}
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn edit" title="Edit Claim" onclick="openEditClaimModal('${claim.id}')">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="action-btn delete" title="Delete Claim" onclick="deleteClaim('${claim.id}','${escapeHtml(claim.claimant_name)}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openLogClaimModal() {
  document.getElementById('claim_id').value = '';
  document.getElementById('claimModalTitle').textContent = 'Log New Claim';
  
  clearSelectedClaimClient();
  
  document.getElementById('claim_amount').value = '';
  document.getElementById('claim_status').value = 'pending';
  document.getElementById('claim_dateApplied').value = '';
  document.getElementById('claim_dateDocsSent').value = '';
  document.getElementById('claim_dateResponded').value = '';
  document.getElementById('claim_dateApproved').value = '';
  document.getElementById('claim_dateSettled').value = '';
  document.getElementById('claim_notes').value = '';
  
  toggleClaimStatusFields();
  openModal('logClaimOverlay');
}

function openEditClaimModal(claimId) {
  const claim = CLAIMS.find(c => c.id === claimId);
  if (!claim) return;

  document.getElementById('claim_id').value = claim.id;
  document.getElementById('claimModalTitle').textContent = 'Edit Claim';
  
  // Pre-select the client
  selectClaimClient(claim.client_id, claim.client_name, claim.provider || '', claim.plan || '');

  // Populate claimant dropdown and set selected value
  const claimantSelect = document.getElementById('claim_claimant');
  claimantSelect.value = claim.claimant_name;

  document.getElementById('claim_amount').value = claim.amount || '';
  document.getElementById('claim_status').value = claim.status || 'pending';
  document.getElementById('claim_dateApplied').value = yyyymmddToDdmmyyyy(claim.date_applied || '');
  document.getElementById('claim_dateDocsSent').value = yyyymmddToDdmmyyyy(claim.date_docs_sent || '');
  document.getElementById('claim_dateResponded').value = yyyymmddToDdmmyyyy(claim.date_responded || '');
  document.getElementById('claim_dateApproved').value = yyyymmddToDdmmyyyy(claim.date_approved || '');
  document.getElementById('claim_dateSettled').value = yyyymmddToDdmmyyyy(claim.date_settled || '');
  document.getElementById('claim_notes').value = claim.notes || '';

  toggleClaimStatusFields();
  openModal('logClaimOverlay');
}

function toggleClaimStatusFields() {
  const status = document.getElementById('claim_status').value;
  const approvedGrp = document.getElementById('claim_dateApprovedGroup');
  const settledGrp = document.getElementById('claim_dateSettledGroup');

  if (!approvedGrp || !settledGrp) return;

  if (status === 'approved') {
    approvedGrp.style.display = 'flex';
    settledGrp.style.display = 'none';
  } else if (status === 'settled') {
    approvedGrp.style.display = 'flex';
    settledGrp.style.display = 'flex';
  } else {
    approvedGrp.style.display = 'none';
    settledGrp.style.display = 'none';
  }
}

function searchClaimClients() {
  const query = document.getElementById('claim_clientSearch').value.toLowerCase().trim();
  const resultsDiv = document.getElementById('claim_clientSearchResults');
  if (!resultsDiv) return;

  if (!query) {
    resultsDiv.innerHTML = '';
    resultsDiv.classList.remove('visible');
    return;
  }

  // Filter clients
  const matches = DATA.filter(c => 
    c.name.toLowerCase().includes(query) || 
    (c.mobile && c.mobile.includes(query))
  ).slice(0, 5);

  if (matches.length === 0) {
    resultsDiv.innerHTML = `<div class="client-result-item" style="cursor:default;color:var(--text-light)">No clients found</div>`;
  } else {
    resultsDiv.innerHTML = matches.map(c => `
      <div class="client-result-item" onclick="selectClaimClient('${c.id}', '${escapeHtml(c.name)}', '${escapeHtml(c.provider || '')}', '${escapeHtml(c.plan || '')}')">
        <div class="flex-col">
          <div class="cri-name">${escapeHtml(c.name)}</div>
          <div class="cri-detail">${escapeHtml(c.provider || '')} | ${escapeHtml(c.plan || '')} | ${c.mobile || ''}</div>
        </div>
      </div>
    `).join('');
  }
  resultsDiv.classList.add('visible');
}

function selectClaimClient(clientId, clientName, provider, plan) {
  document.getElementById('claim_clientId').value = clientId;
  document.getElementById('claim_selectedClientName').textContent = clientName;
  document.getElementById('claim_selectedClientDetail').textContent = `${provider} | ${plan}`;

  // Hide search and show selected client card
  document.getElementById('claim_searchGroup').classList.add('hidden');
  document.getElementById('claim_selectedClientGroup').classList.remove('hidden');

  // Clear search results
  const resultsDiv = document.getElementById('claim_clientSearchResults');
  if (resultsDiv) {
    resultsDiv.innerHTML = '';
    resultsDiv.classList.remove('visible');
  }

  // Populate claimant select dropdown
  const claimantSelect = document.getElementById('claim_claimant');
  claimantSelect.innerHTML = '<option value="">Select member</option>';

  const client = DATA.find(c => c.id === clientId);
  if (client) {
    // Add "Self"
    const selfOpt = document.createElement('option');
    selfOpt.value = client.name;
    selfOpt.textContent = `${client.name} (Self)`;
    claimantSelect.appendChild(selfOpt);

    // Add family members
    if (client.family_members && client.family_members.length > 0) {
      client.family_members.forEach(m => {
        if (m.name && m.name !== client.name) {
          const opt = document.createElement('option');
          opt.value = m.name;
          const relation = m.type === 'other' ? (m.other_label || 'Relative') : getMemberTypeLabel(m.type);
          opt.textContent = `${m.name} (${relation})`;
          claimantSelect.appendChild(opt);
        }
      });
    }
  }
}

function clearSelectedClaimClient() {
  document.getElementById('claim_clientId').value = '';
  document.getElementById('claim_clientSearch').value = '';
  document.getElementById('claim_searchGroup').classList.remove('hidden');
  document.getElementById('claim_selectedClientGroup').classList.add('hidden');

  const claimantSelect = document.getElementById('claim_claimant');
  claimantSelect.innerHTML = '<option value="">Select member</option>';
}

async function submitLogClaim() {
  const claimIdInput = document.getElementById('claim_id');
  const clientId = document.getElementById('claim_clientId').value;
  const claimantName = document.getElementById('claim_claimant').value;
  const amount = document.getElementById('claim_amount').value;
  const status = document.getElementById('claim_status').value;
  const dateAppliedRaw = document.getElementById('claim_dateApplied').value.trim();
  const dateDocsSentRaw = document.getElementById('claim_dateDocsSent').value.trim();
  const dateRespondedRaw = document.getElementById('claim_dateResponded').value.trim();
  const dateApprovedRaw = document.getElementById('claim_dateApproved').value.trim();
  const dateSettledRaw = document.getElementById('claim_dateSettled').value.trim();
  const notes = document.getElementById('claim_notes').value.trim();

  if (!clientId || !claimantName || !amount || !dateAppliedRaw) {
    showToast('Please fill all required (*) fields', 'error');
    return;
  }

  // Validate dates
  if (!isValidDateString(dateAppliedRaw)) {
    showToast('Please enter a valid Date Applied in DD-MM-YYYY format', 'error'); return;
  }
  if (dateDocsSentRaw && !isValidDateString(dateDocsSentRaw)) {
    showToast('Please enter a valid Date Docs Sent in DD-MM-YYYY format', 'error'); return;
  }
  if (dateRespondedRaw && !isValidDateString(dateRespondedRaw)) {
    showToast('Please enter a valid Response Date in DD-MM-YYYY format', 'error'); return;
  }
  if (status === 'approved' || status === 'settled') {
    if (!dateApprovedRaw) {
      showToast('Please enter an Approval Date', 'error'); return;
    }
    if (!isValidDateString(dateApprovedRaw)) {
      showToast('Please enter a valid Approval Date in DD-MM-YYYY format', 'error'); return;
    }
  }
  if (status === 'settled') {
    if (!dateSettledRaw) {
      showToast('Please enter a Settlement Date', 'error'); return;
    }
    if (!isValidDateString(dateSettledRaw)) {
      showToast('Please enter a valid Settlement Date in DD-MM-YYYY format', 'error'); return;
    }
  }

  const client = DATA.find(c => c.id === clientId);
  if (!client) {
    showToast('Selected client not found', 'error');
    return;
  }

  const isEdit = !!claimIdInput.value;
  const id = isEdit ? claimIdInput.value : 'CLAIM_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substr(2,6).toUpperCase();

  const claimEntry = {
    id,
    client_id: clientId,
    client_name: client.name,
    provider: client.provider || '',
    plan: client.plan || '',
    claimant_name: claimantName,
    amount: Number(amount) || 0,
    status,
    date_applied: ddmmyyyyToYyyymmdd(dateAppliedRaw),
    date_docs_sent: dateDocsSentRaw ? ddmmyyyyToYyyymmdd(dateDocsSentRaw) : '',
    date_responded: dateRespondedRaw ? ddmmyyyyToYyyymmdd(dateRespondedRaw) : '',
    date_approved: dateApprovedRaw ? ddmmyyyyToYyyymmdd(dateApprovedRaw) : '',
    date_settled: dateSettledRaw ? ddmmyyyyToYyyymmdd(dateSettledRaw) : '',
    notes,
    updated_at: new Date().toISOString()
  };

  if (!isEdit) {
    claimEntry.created_at = new Date().toISOString();
  } else {
    const old = CLAIMS.find(c => c.id === id);
    if (old) claimEntry.created_at = old.created_at || new Date().toISOString();
  }

  // Firestore Sync
  if (cloudSyncActive && firestoreDb) {
    const docRef = firestoreDb.collection('gic_claims').doc(claimEntry.id);
    docRef.set(claimEntry).then(() => {
      showToast('Claim synced to cloud!', 'success');
    }).catch(() => showToast('Cloud sync failed, saved locally', 'error'));
  }

  if (isEdit) {
    const idx = CLAIMS.findIndex(c => c.id === id);
    if (idx !== -1) CLAIMS[idx] = claimEntry;
    updateClaimInDB(claimEntry);
    showToast('Claim updated successfully!', 'success');
    logActivity(`✏️ Claim updated: ${claimantName} (₹${amount})`, 'info');
  } else {
    CLAIMS.push(claimEntry);
    addClaimToDB(claimEntry);
    showToast('Claim logged successfully!', 'success');
    logActivity(`➕ Claim logged: ${claimantName} (₹${amount})`, 'success');
  }

  renderClaimsTable();
  closeModal('logClaimOverlay');
}

function deleteClaim(claimId, claimantName) {
  if (!confirm(`Delete claim for claimant "${claimantName}"?\n\nThis cannot be undone.`)) return;
  const idx = CLAIMS.findIndex(c => c.id === claimId);
  if (idx === -1) return;
  CLAIMS.splice(idx, 1);
  deleteClaimFromDB(claimId);
  if (cloudSyncActive && firestoreDb) {
    firestoreDb.collection('gic_claims').doc(claimId).delete().catch(() => {});
  }
  renderClaimsTable();
  showToast(`Deleted claim: ${claimantName}`, 'info');
  logActivity(`🗑️ Deleted claim: ${claimantName}`, 'error');
}
