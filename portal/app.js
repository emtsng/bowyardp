/*
 * Bowyard Partners — Portal Firebase Config
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/ and create a project
 * 2. Enable Authentication > Sign-in method > Email/Password
 * 3. Create a Firestore Database (start in test mode, then apply rules below)
 * 4. In Project Settings > Your apps, register a web app and copy the config below
 *
 * FIRESTORE SECURITY RULES (paste in Firestore > Rules):
 * ─────────────────────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     function isStaff() {
 *       return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['staff','admin'];
 *     }
 *     match /users/{uid} {
 *       allow read, write: if request.auth.uid == uid;
 *       allow read: if isStaff();
 *     }
 *     match /matters/{id} {
 *       allow read: if request.auth.uid != null &&
 *         (resource.data.clientId == request.auth.uid || isStaff());
 *       allow write: if isStaff();
 *     }
 *     match /court_dates/{id} {
 *       allow read: if request.auth.uid != null;
 *       allow write: if isStaff();
 *     }
 *     match /cac_submissions/{id} {
 *       allow read: if request.auth.uid != null &&
 *         (resource.data.clientId == request.auth.uid || isStaff());
 *       allow create: if request.auth.uid != null;
 *       allow update: if isStaff();
 *     }
 *     match /mail/{id} {
 *       allow create: if request.auth.uid != null;
 *     }
 *   }
 * }
 *
 * FIREBASE STORAGE RULES (paste in Storage > Rules):
 * ─────────────────────────────────────────────────────
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     match /cac-uploads/{userId}/{allPaths=**} {
 *       allow write: if request.auth.uid == userId;
 *       allow read: if request.auth.uid != null;
 *     }
 *   }
 * }
 */

const firebaseConfig = {
  apiKey: "AIzaSyCwg-hqLys643Sh2vbeMmfnYushNrR2Q2Q",
  authDomain: "bowyard-portal.firebaseapp.com",
  projectId: "bowyard-portal",
  storageBucket: "bowyard-portal.firebasestorage.app",
  messagingSenderId: "128033886588",
  appId: "1:128033886588:web:6932881c4975283ecb14f9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* ── Auth helpers ─────────────────────────────────────── */
async function getPortalUser() {
  return new Promise(resolve => {
    auth.onAuthStateChanged(async user => {
      if (!user) { resolve(null); return; }
      const snap = await db.collection('users').doc(user.uid).get();
      if (!snap.exists) { resolve(null); return; }
      resolve({ uid: user.uid, ...snap.data() });
    });
  });
}

async function requireRole(allowed) {
  const user = await getPortalUser();
  if (!user) { window.location.href = portalRoot() + 'index.html'; return null; }
  if (!allowed.includes(user.role)) {
    window.location.href = user.role === 'client'
      ? portalRoot() + 'client/index.html'
      : portalRoot() + 'staff/index.html';
    return null;
  }
  return user;
}

function portalRoot() {
  const p = window.location.pathname;
  if (p.includes('/client/') || p.includes('/staff/')) return '../';
  return './';
}

/* ── Formatters ───────────────────────────────────────── */
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

/* ── UI helpers ───────────────────────────────────────── */
function statusBadge(status) {
  const m = {
    open:['open','Open'], in_progress:['progress','In Progress'],
    pending_client:['pending','Pending Client'], closed:['closed','Closed'],
    urgent:['urgent','Urgent'], filed:['filed','Filed'],
    under_review:['review','Under Review'], submitted:['submitted','Submitted'],
    rejected:['urgent','Rejected'], adjourned:['adjourned','Adjourned'],
    scheduled:['scheduled','Scheduled'], concluded:['concluded','Concluded']
  };
  const [c,l] = m[status] || ['open', status];
  return `<span class="p-badge ${c}">${l}</span>`;
}

function initials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

function setUserBlock(user) {
  const el = document.getElementById('user-block');
  if (!el) return;
  el.innerHTML = `
    <div class="portal-user-block">
      <div class="portal-avatar">${initials(user.name)}</div>
      <div>
        <div class="portal-user-name">${user.name || user.email}</div>
        <div class="portal-user-role">${user.role === 'staff' ? 'Staff' : user.role === 'admin' ? 'Admin' : 'Client'}</div>
      </div>
    </div>
    <button class="portal-logout" onclick="signOut()">Sign Out</button>`;
}

function signOut() {
  auth.signOut().then(() => { window.location.href = portalRoot() + 'index.html'; });
}

function initMobileSidebar() {
  const toggle  = document.getElementById('mobile-toggle');
  const sidebar = document.querySelector('.portal-sidebar');
  const overlay = document.getElementById('p-overlay');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

function initTabs() {
  document.querySelectorAll('.p-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('[data-tabs]') || document;
      group.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
      group.querySelectorAll('.p-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

function showModal(id) { document.getElementById(id)?.classList.add('show'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('show'); }

function loading(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = show ? `<div class="p-loading"><div class="p-spinner"></div> Loading…</div>` : '';
}

/* ── Reference generator ──────────────────────────────── */
async function uploadFile(file, storagePath) {
  if (!file || !file.size) return null;
  const ref = firebase.storage().ref(storagePath);
  await ref.put(file);
  return ref.getDownloadURL();
}

function genRef() {
  const y = new Date().getFullYear();
  const n = Math.floor(Math.random() * 900) + 100;
  return `BP/${y}/${n}`;
}

const MATTER_TYPES = [
  'Corporate & Commercial','Energy & Infrastructure','Disputes Resolution',
  'Governance & Compliance','Business Advisory','Construction & Real Estate',
  'Financial Services','Transport & Logistics','Regulatory Filing','General'
];
