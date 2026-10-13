// ─── Config ───────────────────────────────────────────────────────────────────
const cfg = window.HYBRID_METER_CONFIG || {};
const API_URL = cfg.apiUrl || "";

// ─── Credentials ───────────────────────────────────────────────────────────────
const USERS = {
  admin: { password: "gajanan@24", role: "admin", label: "Administrator" },
  "H-001": { password: "house123", role: "owner", house: "H-001", label: "House 01 Owner" },
  "H-002": { password: "house123", role: "owner", house: "H-002", label: "House 02 Owner" },
  "H-003": { password: "house123", role: "owner", house: "H-003", label: "House 03 Owner" }
};

// ─── Demo data ─────────────────────────────────────────────────────────────────
const demoMeters = [
  { meter_id: "MTR001", source: "NODE01", voltage: 234.2, current: 3.41, power: 798.62, frequency: 49.6, energy: 129.7, sequence: 470, hops: 0, timestamp: new Date().toISOString() },
  { meter_id: "MTR002", source: "NODE02", voltage: 233.1, current: 3.76, power: 876.46, frequency: 50.5, energy: 129.39, sequence: 439, hops: 0, timestamp: new Date().toISOString() },
  { meter_id: "MTR003", source: "NODE03", voltage: 232.6, current: 3.48, power: 809.45, frequency: 50.1, energy: 129.7, sequence: 470, hops: 0, timestamp: new Date().toISOString() }
];

const houseMap = {
  MTR001: { house: "H-001", owner: "House 01", area: "North Block" },
  MTR002: { house: "H-002", owner: "House 02", area: "East Block" },
  MTR003: { house: "H-003", owner: "House 03", area: "West Block" }
};

// ─── App State ─────────────────────────────────────────────────────────────────
const state = {
  loggedIn: false,
  role: null,
  userLabel: "",
  userPhone: "",
  selectedHouse: "H-001",
  meters: demoMeters,
  rate: Number(localStorage.getItem("hybridMeterRate") || 7.5),
  connected: false,
  loading: true,
  error: "",
  billPaidStatus: {},
  currentView: "dashboard",
  transactions: JSON.parse(localStorage.getItem("hybridMeterTxns") || "[]")
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function money(n) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: cfg.currency || "INR", maximumFractionDigits: 2 }).format(n || 0); }
function num(n, d = 2) { return Number(n || 0).toFixed(d); }
function timeLabel(v) { const d = new Date(v); return isNaN(d) ? String(v || "-") : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

// ─── Transaction Store ─────────────────────────────────────────────────────────
function saveTransaction(txn) {
  state.transactions.unshift(txn); // newest first
  localStorage.setItem("hybridMeterTxns", JSON.stringify(state.transactions));
}

function clearTransactions() {
  state.transactions = [];
  localStorage.removeItem("hybridMeterTxns");
  render();
  showToast("Cleared", "All transaction records have been removed.", "🗑️");
}

// ─── Toast System ──────────────────────────────────────────────────────────────
function showToast(title, message, icon = "✓") {
  const container = document.getElementById("toast-container") || (function () {
    const c = document.createElement("div");
    c.id = "toast-container";
    c.className = "toast-container";
    document.body.appendChild(c);
    return c;
  })();

  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<div class="toast-icon">${icon}</div><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
  container.appendChild(t);

  requestAnimationFrame(() => {
    t.classList.add("show");
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 400);
    }, 4500);
  });
}

// ─── Login Screen ──────────────────────────────────────────────────────────────
function renderLogin(errorMsg) {
  const loginEl = document.getElementById("login-screen");
  loginEl.innerHTML = `
    <div class="login-bg">
      <div class="login-glow g1"></div>
      <div class="login-glow g2"></div>
      <div class="login-card">
        <div class="login-brand">
          <div class="login-brand-icon">⚡</div>
          <div>
            <b>HYBRID SMART METER</b>
            <span>Smart Metering System</span>
          </div>
        </div>
        <h2 class="login-title">Welcome back</h2>
        <p class="login-sub">Sign in to access your meter dashboard and billing information.</p>

        <div class="login-role-tabs">
          <button id="tab-admin" class="role-tab active" onclick="switchLoginTab('admin')">
            <span class="tab-icon">🛡️</span>Admin
          </button>
          <button id="tab-owner" class="role-tab" onclick="switchLoginTab('owner')">
            <span class="tab-icon">🏠</span>House Owner
          </button>
        </div>

        <form id="login-form" onsubmit="handleLogin(event)">
          <div id="admin-fields">
            <div class="field-group">
              <label>Username</label>
              <input id="admin-username" type="text" placeholder="admin" autocomplete="username" />
            </div>
            <div class="field-group">
              <label>Password</label>
              <div class="pw-wrap">
                <input id="admin-password" type="password" placeholder="Enter your password" autocomplete="current-password" oninput="checkAdminPasswordStrength()" />
                <button type="button" class="pw-toggle" onclick="togglePw('admin-password', this)">👁</button>
              </div>
              <div id="pwd-strength-container" class="pw-strength-box" style="display:none">
                <div class="pw-bar"><div id="pwd-bar-fill" class="weak" style="width:33%"></div></div>
                <div class="pw-status"><span id="pwd-text" class="weak">Weak</span></div>
                <ul class="pw-rules">
                  <li id="rule-len">8+ chars</li>
                  <li id="rule-upper">Uppercase</li>
                  <li id="rule-lower">Lowercase</li>
                  <li id="rule-num">Number</li>
                  <li id="rule-spec">Symbol</li>
                </ul>
              </div>
            </div>
          </div>

          <div id="owner-fields" style="display:none">
            <div class="field-group">
              <label>House ID</label>
              <select id="owner-house">
                <option value="H-001">H-001 — House 01 (North Block)</option>
                <option value="H-002">H-002 — House 02 (East Block)</option>
                <option value="H-003">H-003 — House 03 (West Block)</option>
              </select>
            </div>
            <div class="field-group">
              <label>Phone Number (for SMS reminders)</label>
              <input id="owner-phone" type="tel" placeholder="+91 9999999999" autocomplete="tel" />
            </div>
            <div class="field-group">
              <label>Password</label>
              <div class="pw-wrap">
                <input id="owner-password" type="password" placeholder="Enter your password" autocomplete="current-password" />
                <button type="button" class="pw-toggle" onclick="togglePw('owner-password', this)">👁</button>
              </div>
            </div>
          </div>

          ${errorMsg ? `<div class="login-error">⚠ ${esc(errorMsg)}</div>` : ""}

          <button type="submit" class="login-btn">Sign in</button>
          <div class="forgot-link"><button type="button" onclick="showForgotPassword()">Forgot password?</button></div>
        </form>

        <div class="login-hint">
          <div><b>Admin:</b> enter any name and any <strong>strong</strong> password</div>
          <div><b>Owner:</b> select house · password <code>house123</code></div>
        </div>
      </div>
    </div>`;
}

let activeTab = "admin";

function switchLoginTab(tab) {
  activeTab = tab;
  document.getElementById("admin-fields").style.display = tab === "admin" ? "" : "none";
  document.getElementById("owner-fields").style.display = tab === "owner" ? "" : "none";
  document.getElementById("tab-admin").classList.toggle("active", tab === "admin");
  document.getElementById("tab-owner").classList.toggle("active", tab === "owner");
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === "password") { inp.type = "text"; btn.textContent = "🔒"; }
  else { inp.type = "password"; btn.textContent = "👁"; }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
const SECURITY = {
  admin: {
    question: "What is the name of this project's developer?",
    answer: "gajanan",
    hint: "Your password is: <code>gajanan@24</code>"
  },
  owner: {
    question: "What is the shared password prefix for all house accounts?",
    answer: "house",
    hint: "Your password is: <code>house123</code>"
  }
};

function showForgotPassword() { renderForgotPassword("admin", ""); }

function renderForgotPassword(selectedRole, errorMsg, revealed) {
  const loginEl = document.getElementById("login-screen");
  const sq = SECURITY[selectedRole];
  loginEl.innerHTML = `
    <div class="login-bg">
      <div class="login-glow g1"></div>
      <div class="login-glow g2"></div>
      <div class="login-card">
        <div class="login-brand">
          <div class="login-brand-icon">⚡</div>
          <div><b>HYBRID SMART METER</b><span>Password Recovery</span></div>
        </div>
        <h2 class="login-title">Forgot password?</h2>
        <p class="login-sub">Answer the security question to recover your access credentials.</p>

        <div class="field-group">
          <label>Account type</label>
          <select id="fp-role" onchange="renderForgotPassword(this.value, '')">
            <option value="admin" ${selectedRole === "admin" ? "selected" : ""}>🛡️ Admin</option>
            <option value="owner" ${selectedRole === "owner" ? "selected" : ""}>🏠 House Owner</option>
          </select>
        </div>

        <form id="fp-form" onsubmit="handleForgotRecover(event)">
          <div class="fp-question-box">
            <span class="fp-q-label">Security question</span>
            <p class="fp-q-text">${esc(sq.question)}</p>
          </div>
          <div class="field-group">
            <label>Your answer</label>
            <input id="fp-answer" type="text" placeholder="Type your answer here…" autocomplete="off" />
          </div>
          ${errorMsg ? `<div class="login-error">⚠ ${esc(errorMsg)}</div>` : ""}
          ${revealed ? `<div class="fp-reveal">${sq.hint}<br><small>Keep this safe. Do not share it.</small></div>` : ""}
          ${!revealed ? `<button type="submit" class="login-btn" style="margin-top:8px">Verify &amp; reveal</button>` : ""}
        </form>

        <div class="forgot-link" style="margin-top:14px">
          <button type="button" onclick="renderLogin()">← Back to sign in</button>
        </div>
      </div>
    </div>`;
}

function handleForgotRecover(e) {
  e.preventDefault();
  const role = document.getElementById("fp-role").value;
  const answer = document.getElementById("fp-answer").value.trim().toLowerCase();
  const expected = SECURITY[role].answer.toLowerCase();
  if (answer === expected) {
    renderForgotPassword(role, "", true);
  } else {
    renderForgotPassword(role, "Incorrect answer. Please try again.");
    document.getElementById("fp-role").value = role;
  }
}

let adminIsStrong = false;
function checkAdminPasswordStrength() {
  const p = document.getElementById("admin-password").value;
  const cEl = document.getElementById("pwd-strength-container");
  if (!p) { if (cEl) cEl.style.display = "none"; adminIsStrong = false; return; }
  if (cEl) cEl.style.display = "block";

  const hasLen = p.length >= 8;
  const hasUp = /[A-Z]/.test(p);
  const hasLow = /[a-z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  const hasSpec = /[^A-Za-z0-9]/.test(p);

  document.getElementById("rule-len").className = hasLen ? "pass" : "";
  document.getElementById("rule-upper").className = hasUp ? "pass" : "";
  document.getElementById("rule-lower").className = hasLow ? "pass" : "";
  document.getElementById("rule-num").className = hasNum ? "pass" : "";
  document.getElementById("rule-spec").className = hasSpec ? "pass" : "";

  const passed = [hasLen, hasUp, hasLow, hasNum, hasSpec].filter(Boolean).length;
  adminIsStrong = passed === 5;

  const fill = document.getElementById("pwd-bar-fill");
  const txt = document.getElementById("pwd-text");
  if (passed <= 2) { fill.style.width = "33%"; fill.className = "weak"; txt.textContent = "Weak"; txt.className = "text-weak"; }
  else if (passed <= 4) { fill.style.width = "66%"; fill.className = "fair"; txt.textContent = "Fair"; txt.className = "text-fair"; }
  else { fill.style.width = "100%"; fill.className = "strong"; txt.textContent = "Strong"; txt.className = "text-strong"; }
}

function handleLogin(e) {
  e.preventDefault();
  if (activeTab === "admin") {
    const u = document.getElementById("admin-username").value.trim();
    if (!u) { renderLogin("Please enter your name."); switchLoginTab("admin"); return; }
    if (!adminIsStrong) { renderLogin("Admin password must be strong. It must meet all requirements."); switchLoginTab("admin"); return; }
    loginSuccess("admin", null, u);
  } else {
    const house = document.getElementById("owner-house").value;
    const phone = document.getElementById("owner-phone").value.trim();
    const p = document.getElementById("owner-password").value;

    if (!phone) { renderLogin("Please enter your phone number to receive monthly reminders."); switchLoginTab("owner"); return; }

    const user = USERS[house];
    if (user && user.role === "owner" && user.password === p) {
      loginSuccess("owner", house, user.label, phone);
      setTimeout(() => {
        showToast("Reminders Active", `Monthly SMS payment reminders are configured for ${phone} on the 1st of every month.`, "📱");
      }, 800);
    } else {
      renderLogin("Incorrect password for this house account.");
      switchLoginTab("owner");
    }
  }
}

function loginSuccess(role, house, label, phone = "") {
  state.loggedIn = true;
  state.role = role;
  state.userLabel = label;
  state.userPhone = phone;
  if (house) state.selectedHouse = house;
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "";
  render();
  loadTelemetry();
}

function logout() {
  state.loggedIn = false;
  state.role = null;
  state.meters = demoMeters;
  state.connected = false;
  state.error = "";
  document.getElementById("login-screen").style.display = "";
  document.getElementById("app").style.display = "none";
  renderLogin();
}

// ─── Telemetry ─────────────────────────────────────────────────────────────────
async function loadTelemetry() {
  state.loading = true;
  render();
  try {
    const response = await fetch(API_URL, { method: "GET", headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const payload = await response.json();
    if (payload.status !== "success" || !Array.isArray(payload.meters)) throw new Error("Unexpected telemetry response");
    state.meters = payload.meters;
    state.connected = true;
    state.error = "";
  } catch (error) {
    state.connected = false;
    state.error = error.message || "Unable to reach telemetry API";
  } finally {
    state.loading = false;
    render();
  }
}

function totals() {
  return state.meters.reduce((a, m) => {
    a.power += Number(m.power || 0); a.energy += Number(m.energy || 0); return a;
  }, { power: 0, energy: 0 });
}

function currentHouseMeter() {
  const entry = Object.entries(houseMap).find(([, v]) => v.house === state.selectedHouse);
  return entry ? state.meters.find(m => m.meter_id === entry[0]) || state.meters[0] : state.meters[0];
}

function meterCard(m) {
  const h = houseMap[m.meter_id] || { house: "House", owner: "Resident", area: "" };
  return `<article class="meter-card">
    <div class="meter-head"><div><span class="eyebrow">${esc(h.house)}</span><h3>${esc(m.meter_id)}</h3></div><span class="online"><i></i> Online</span></div>
    <div class="meter-owner">${esc(h.owner)} · ${esc(h.area)}</div>
    <div class="metric-grid">
      <div><span>Voltage</span><strong>${num(m.voltage, 1)} V</strong></div>
      <div><span>Current</span><strong>${num(m.current, 2)} A</strong></div>
      <div><span>Power</span><strong>${num(m.power, 2)} W</strong></div>
      <div><span>Frequency</span><strong>${num(m.frequency, 1)} Hz</strong></div>
    </div>
    <div class="energy-row"><span>Energy consumed</span><strong>${num(m.energy, 2)} kWh</strong></div>
    <div class="meter-foot"><span>${esc(m.source)} · seq ${esc(m.sequence)}</span><span>${timeLabel(m.timestamp)}</span></div>
  </article>`;
}

// ─── Admin View ────────────────────────────────────────────────────────────────
function adminView() {
  const t = totals();

  // Build transactions table
  const txns = state.transactions;
  const txnRows = txns.length
    ? txns.map((tx, i) => `
      <tr>
        <td>${txns.length - i}</td>
        <td><span class="txn-house-badge">${esc(tx.house)}</span></td>
        <td>${esc(tx.meterId)}</td>
        <td><strong style="color:#4ade80">${esc(tx.amount)}</strong></td>
        <td>${esc(tx.method)}</td>
        <td><code style="font-size:11px;color:#94a3b8">${esc(tx.txnId)}</code></td>
        <td>${esc(tx.timestamp)}</td>
        <td><span class="txn-status-badge">✔ Success</span></td>
        <td><button class="download-btn-sm" onclick="downloadReceipt('${esc(tx.txnId)}')">⬇ PDF</button></td>
      </tr>`).join("")
    : `<tr><td colspan="9" class="txn-empty">No payment transactions recorded yet.</td></tr>`;

  const totalCollected = txns.reduce((sum, tx) => {
    const val = Number(String(tx.rawAmount || 0));
    return sum + val;
  }, 0);

  return `<section class="page">
    <div class="page-title">
      <div><span class="eyebrow">ADMIN CONSOLE</span><h1>Grid overview</h1><p>Monitor all connected homes and manage the current electricity tariff.</p></div>
      <div class="sync ${state.connected ? "ok" : "bad"}"><i></i>${state.connected ? "Live API" : "API offline"}</div>
    </div>
    ${state.error ? `<div class="alert">${esc(state.error)} · Showing last available readings.</div>` : ""}

    <div class="stat-grid">
      <div class="stat"><span>Connected meters</span><strong>${state.meters.length}</strong><small>Across registered houses</small></div>
      <div class="stat"><span>Total live power</span><strong>${num(t.power, 1)} W</strong><small>Current combined load</small></div>
      <div class="stat"><span>Total recorded energy</span><strong>${num(t.energy, 2)} kWh</strong><small>Latest meter readings</small></div>
      <div class="stat"><span>Current unit price</span><strong>${money(state.rate)}</strong><small>Per kWh · admin controlled</small></div>
    </div>

    <div class="section-head"><div><h2>All houses</h2><p>Live telemetry from the smart-meter network.</p></div><button class="secondary" onclick="loadTelemetry()">↻ Refresh</button></div>
    <div class="meter-grid">${state.meters.map(meterCard).join("")}</div>

    <div class="lower-grid">
      <section class="panel">
        <div class="panel-head"><div><span class="eyebrow">TARIFF MANAGEMENT</span><h2>Electricity unit price</h2></div><span class="tag">Admin only</span></div>
        <p class="muted">Set the current per-unit electricity price according to the applicable government/utility order.</p>
        <div class="rate-form"><label>Price per kWh<input id="rateInput" type="number" min="0" step="0.01" value="${esc(state.rate)}"></label><button onclick="saveRate()">Save tariff</button></div>
        <div class="note">Demo setting is stored locally in this browser.</div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><span class="eyebrow">NETWORK</span><h2>Mesh status</h2></div><span class="tag green">ESP-NOW</span></div>
        <div class="network"><div class="node fixed"><b>NODE01</b><span>Gateway · USB</span></div><div class="link"></div><div class="node"><b>NODE02</b><span>MTR002 · Mesh</span></div><div class="link"></div><div class="node"><b>NODE03</b><span>MTR003 · Mesh</span></div></div>
      </section>
    </div>

  </section>`;
}

// ─── Admin Billing View ────────────────────────────────────────────────────────
function adminBillingView() {
  const txns = state.transactions;
  const totalCollected = txns.reduce((s, tx) => s + Number(tx.rawAmount || 0), 0);
  const housesPaid = [...new Set(txns.map(tx => tx.house))];

  const txnRows = txns.length
    ? txns.map((tx, i) => `
      <tr>
        <td style="color:#94a3b8;font-weight:600">${txns.length - i}</td>
        <td><span class="txn-house-badge">${esc(tx.house)}</span></td>
        <td style="color:#64748b;font-size:11px">${esc(tx.meterId)}</td>
        <td><strong style="color:#16a34a;font-size:14px">${esc(tx.amount)}</strong></td>
        <td><span style="background:#f1f5f9;color:#475569;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600">${esc(tx.method)}</span></td>
        <td><code style="font-size:10px;color:#7c3aed;background:#f5f3ff;padding:2px 6px;border-radius:4px">${esc(tx.txnId)}</code></td>
        <td style="font-size:12px;color:#64748b">${esc(tx.month)}</td>
        <td style="font-size:11px;color:#64748b">${esc(tx.timestamp)}</td>
        <td><span class="txn-status-badge">✔ Success</span></td>
        <td><button class="download-btn-sm" onclick="downloadReceipt('${esc(tx.txnId)}')">⬇ PDF</button></td>
      </tr>`).join("")
    : `<tr><td colspan="10" class="txn-empty">
        <div style="padding:40px 20px;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">🧾</div>
          <div style="font-size:15px;font-weight:600;color:#475569;margin-bottom:6px">No payments yet</div>
          <div style="font-size:12px;color:#94a3b8">Transactions will appear here as house owners make payments.</div>
        </div>
      </td></tr>`;

  return `<section class="page">
    <div class="page-title">
      <div>
        <span class="eyebrow">ADMIN CONSOLE</span>
        <h1>Billing &amp; Payments</h1>
        <p>Real-time payment records from all house owners.</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        ${txns.length ? `<button class="secondary danger-btn" onclick="clearTransactions()">🗑 Clear All</button>` : ""}
        <div class="sync ok"><i></i>Live records</div>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat">
        <span>Total Collected</span>
        <strong style="color:#16a34a">${money(totalCollected)}</strong>
        <small>All successful payments</small>
      </div>
      <div class="stat">
        <span>Total Transactions</span>
        <strong>${txns.length}</strong>
        <small>Across all houses</small>
      </div>
      <div class="stat">
        <span>Houses Paid</span>
        <strong>${housesPaid.length} / 3</strong>
        <small>${housesPaid.length ? housesPaid.join(", ") : "None yet"}</small>
      </div>
      <div class="stat">
        <span>Current Tariff</span>
        <strong>${money(state.rate)}</strong>
        <small>Per kWh · Set in Dashboard</small>
      </div>
    </div>

    <!-- Transaction table -->
    <section class="panel txn-panel">
      <div class="panel-head">
        <div>
          <span class="eyebrow">PAYMENT RECORDS</span>
          <h2>All Transactions</h2>
          <p class="muted" style="margin-top:4px">Every payment made by house owners — stored persistently in this browser.</p>
        </div>
        ${txns.length ? `<span style="font-size:13px;color:#94a3b8">Total: <strong style="color:#16a34a">${money(totalCollected)}</strong> &nbsp;|&nbsp; <span class="tag">${txns.length} record${txns.length !== 1 ? "s" : ""}</span></span>` : ""}
      </div>

      <div class="txn-table-wrap">
        <table class="txn-table">
          <thead>
            <tr>
              <th>#</th>
              <th>House</th>
              <th>Meter</th>
              <th>Amount Paid</th>
              <th>Payment Method</th>
              <th>Transaction ID</th>
              <th>Billing Month</th>
              <th>Date &amp; Time</th>
              <th>Status</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>${txnRows}</tbody>
        </table>
      </div>
      <div class="note" style="margin-top:12px">
        ℹ Transactions are saved in browser localStorage and persist across page refreshes and logins.
        ${txns.length ? `Click <strong>⬇ PDF</strong> on any row to download that owner's receipt.` : ""}
      </div>
    </section>
  </section>`;
}

// ─── Owner Dashboard View ──────────────────────────────────────────────────────
function ownerDashboardView() {
  const m = currentHouseMeter() || demoMeters[0];
  const bill = Number(m.energy || 0) * state.rate;

  return `<section class="page"><div class="page-title"><div><span class="eyebrow">RESIDENT PORTAL</span><h1>${esc((houseMap[m.meter_id] || {}).house || "My House")}</h1><p>${esc((houseMap[m.meter_id] || {}).owner || "Home owner")} · Smart meter ${esc(m.meter_id)}</p></div><div class="sync ${state.connected ? "ok" : "bad"}"><i></i>${state.connected ? "Meter connected" : "Using last reading"}</div></div>
    ${state.error ? `<div class="alert">${esc(state.error)}</div>` : ""}
    <div class="section-head"><div><h2>My meter reading</h2><p>Latest telemetry received from your smart meter.</p></div></div>
    <div class="owner-grid"><div class="reading"><span>Voltage</span><strong>${num(m.voltage, 1)} <em>V</em></strong></div><div class="reading"><span>Current</span><strong>${num(m.current, 2)} <em>A</em></strong></div><div class="reading"><span>Power</span><strong>${num(m.power, 2)} <em>W</em></strong></div><div class="reading"><span>Frequency</span><strong>${num(m.frequency, 1)} <em>Hz</em></strong></div></div>
    <section class="panel usage-panel"><div class="panel-head"><div><span class="eyebrow">CONSUMPTION</span><h2>Billing summary</h2></div><span class="tag">${money(state.rate)} / kWh</span></div><div class="billing-lines"><div><span>Energy consumed</span><strong>${num(m.energy, 2)} kWh</strong></div><div><span>Unit price set by admin</span><strong>${money(state.rate)}</strong></div><div class="total"><span>Estimated amount payable</span><strong>${money(bill)}</strong></div></div><div class="note">Last reading: ${timeLabel(m.timestamp)} · Source ${esc(m.source)}</div></section>
  </section>`;
}

// ─── Owner Bill View ───────────────────────────────────────────────────────────
function ownerBillView() {
  const m = currentHouseMeter() || demoMeters[0];
  const bill = Number(m.energy || 0) * state.rate;
  const isPaid = state.billPaidStatus[m.meter_id];

  // My transactions (filtered to this owner's meter)
  const myTxns = state.transactions.filter(tx => tx.meterId === m.meter_id);

  const historyRows = myTxns.length
    ? myTxns.map(tx => `
      <div class="txn-history-row">
        <div>
          <strong style="color:#f8fafc;font-size:14px">${esc(tx.month)}</strong><br>
          <span style="color:#94a3b8;font-size:12px">${esc(tx.method)} · <code style="font-size:11px">${esc(tx.txnId)}</code></span>
        </div>
        <div style="text-align:right">
          <strong style="font-size:15px;color:#4ade80">${esc(tx.amount)}</strong><br>
          <small style="color:#4ade80;font-size:11px">✔ Successful</small>
        </div>
        <div>
          <button class="download-btn" onclick="downloadReceipt('${esc(tx.txnId)}')">⬇ Download Receipt</button>
        </div>
      </div>`).join("")
    : `<div style="padding:30px 20px;text-align:center;color:#64748b;font-size:13px">No recent payments for this meter.</div>`;

  return `<section class="page"><div class="page-title"><div><span class="eyebrow">BILLING &amp; PAYMENTS</span><h1>My Bill</h1><p>Manage your electricity bills and payments.</p></div></div>

    <div class="bill-hero ${isPaid ? 'paid' : ''}" style="margin-top:20px">
      <div>
        <span class="eyebrow">${isPaid ? "CURRENT BILL PAID" : "ESTIMATED CURRENT BILL"}</span>
        <div class="bill-amount">${money(bill)}</div>
        <p>${num(m.energy, 2)} units × ${money(state.rate)} per unit</p>
      </div>
      <div class="bill-status">
        ${isPaid
      ? `<div class="paid-badge">✔ PAID IN FULL</div><strong>Transaction complete</strong>`
      : `<button class="pay-btn" onclick="renderPaymentModal(${bill})">Pay bill securely</button><br><strong>Due by 5th of next month</strong>`
    }
      </div>
    </div>

    <div class="section-head" style="margin-top:30px"><div><h2>Payment history</h2><p>All past transactions for meter ${esc(m.meter_id)}.</p></div></div>
    <div class="panel">${historyRows}</div>
  </section>`;
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function renderPaymentModal(amount) {
  const modalContainer = document.getElementById("modal-root") || (function () {
    const c = document.createElement("div"); c.id = "modal-root"; document.body.appendChild(c); return c;
  })();

  const txnId = "TXN" + Math.floor(Math.random() * 1000000000);
  const now = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card payment-modal" id="payment-card">
        <div class="modal-close" onclick="closePaymentModal()">×</div>
        <div class="modal-header">
          <div class="modal-logo">⚡</div>
          <div><h3>Hybrid Smart Pay</h3><p>Secure SSL checkout</p></div>
        </div>
        <div class="payment-amount-box">
          <span class="eyebrow">AMOUNT TO PAY</span>
          <div class="pay-amount">${money(amount)}</div>
        </div>
        <div class="payment-options">
          <label class="pay-radio active" onclick="selectPayOpt(this)">
            <input type="radio" name="paymethod" checked />
            <div class="pay-opt-info"><b>UPI</b><span>Google Pay, PhonePe, Paytm</span></div>
          </label>
          <label class="pay-radio" onclick="selectPayOpt(this)">
            <input type="radio" name="paymethod" />
            <div class="pay-opt-info"><b>Credit / Debit Card</b><span>Visa, MasterCard, RuPay</span></div>
          </label>
          <label class="pay-radio" onclick="selectPayOpt(this)">
            <input type="radio" name="paymethod" />
            <div class="pay-opt-info"><b>Netbanking</b><span>All major Indian banks</span></div>
          </label>
        </div>
        <button class="pay-submit-btn" onclick="processPayment('${txnId}', ${amount}, '${now}')">Proceed to Pay</button>
      </div>

      <div class="modal-card processing-view" id="processing-card" style="display:none">
        <div class="pay-spinner"></div>
        <h3>Processing securely...</h3>
        <p>Please do not close this window or press back.</p>
      </div>

      <div class="modal-card success-view" id="success-card" style="display:none">
        <div class="pay-success-icon">✓</div>
        <h3>Payment Successful!</h3>
        <p>Your bill of <strong>${money(amount)}</strong> has been paid.</p>
        <div class="pay-receipt">
          <div><span>Transaction ID</span><strong id="modal-txn-id"></strong></div>
          <div><span>Date &amp; Time</span><strong id="modal-txn-time"></strong></div>
          <div><span>Payment Method</span><strong id="modal-txn-method"></strong></div>
          <div><span>House</span><strong>${esc(state.selectedHouse)}</strong></div>
        </div>
        <button class="download-btn" style="margin-top:16px;width:100%" id="modal-download-btn">⬇ Download Receipt (PDF)</button>
        <button class="secondary" style="margin-top:10px;width:100%" onclick="closePaymentModal()">Close</button>
      </div>
    </div>`;
}

function selectPayOpt(el) {
  document.querySelectorAll(".pay-radio").forEach(r => r.classList.remove("active"));
  el.classList.add("active");
}

function closePaymentModal() {
  const root = document.getElementById("modal-root");
  if (root) root.innerHTML = "";
}

function processPayment(txnId, amount, now) {
  document.getElementById("payment-card").style.display = "none";
  document.getElementById("processing-card").style.display = "flex";

  setTimeout(() => {
    document.getElementById("processing-card").style.display = "none";
    const successCard = document.getElementById("success-card");
    successCard.style.display = "flex";

    // Determine selected method
    const activeOpt = document.querySelector(".pay-radio.active .pay-opt-info b");
    const method = activeOpt ? activeOpt.textContent : "UPI";

    // Fill success card
    document.getElementById("modal-txn-id").textContent = txnId;
    document.getElementById("modal-txn-time").textContent = now;
    document.getElementById("modal-txn-method").textContent = method;

    // Wire download button
    document.getElementById("modal-download-btn").onclick = () => downloadReceipt(txnId);

    // Mark as paid
    const currentMeterId = currentHouseMeter().meter_id;
    state.billPaidStatus[currentMeterId] = true;

    // Record transaction
    const hInfo = houseMap[currentMeterId] || {};
    const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
    saveTransaction({
      txnId,
      house: state.selectedHouse,
      meterId: currentMeterId,
      ownerLabel: state.userLabel,
      ownerPhone: state.userPhone,
      meterOwner: hInfo.owner || "",
      area: hInfo.area || "",
      energy: num(currentHouseMeter().energy, 2),
      rate: money(state.rate),
      amount: money(amount),
      rawAmount: amount,
      method,
      timestamp: now,
      month: monthLabel
    });

    render();
    showToast("Payment Complete", "Receipt saved. Tap ⬇ Download to get your PDF.", "🧾");

  }, 2500);
}

// ─── PDF Receipt (jsPDF) ──────────────────────────────────────────────────────
function downloadReceipt(txnId) {
  const tx = state.transactions.find(t => t.txnId === txnId);
  if (!tx) { showToast("Error", "Transaction not found.", "⚠"); return; }

  if (!window.jspdf) { showToast("Error", "PDF library not loaded yet. Please wait and try again.", "⚠"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const margin = 18;
  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(22, 33, 49);
  doc.rect(0, 0, W, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("HYBRID SMART METER", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 175, 195);
  doc.text("Electricity Payment Receipt", margin, 22);

  // PAID stamp
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(34, 197, 94);
  doc.text("PAID", W - margin - 16, 18);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.7);
  doc.roundedRect(W - margin - 21, 11, 21, 10, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 135, 155);
  doc.text("Txn: " + tx.txnId, margin, 36);
  doc.text("Date: " + tx.timestamp, W / 2, 36);

  y = 52;

  function sectionTitle(title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, W - margin, y + 1.5);
    y += 7;
  }

  function row(label, value, highlight) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(120, 135, 155);
    doc.text(label, margin, y);
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    doc.setTextColor(highlight ? 22 : 38, 33, highlight ? 49 : 67);
    doc.text(String(value || "-"), margin + 65, y);
    doc.setDrawColor(240, 242, 246);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 9;
  }

  // ── Bill details ──────────────────────────────────────────────────────────────
  sectionTitle("Bill Details");
  row("House ID", tx.house);
  row("Owner", tx.ownerLabel);
  row("Area / Block", tx.area);
  row("Meter ID", tx.meterId);
  row("Billing Month", tx.month);
  row("Energy Consumed", tx.energy + " kWh");
  row("Unit Rate", tx.rate);

  y += 2;

  // ── Amount highlight box ──────────────────────────────────────────────────────
  doc.setFillColor(240, 250, 244);
  doc.roundedRect(margin, y, W - margin * 2, 16, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Total Amount Paid", margin + 4, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text(tx.amount, W - margin - 4, y + 10, { align: "right" });
  y += 22;

  // ── Payment details ───────────────────────────────────────────────────────────
  sectionTitle("Payment Details");
  row("Transaction ID", tx.txnId, true);
  row("Payment Method", tx.method);
  row("Date & Time", tx.timestamp);
  row("Status", "Successful");
  if (tx.ownerPhone) row("Phone Number", tx.ownerPhone);

  y += 4;

  // ── Footer band ───────────────────────────────────────────────────────────────
  doc.setFillColor(247, 249, 251);
  doc.rect(0, y, W, 297 - y, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(150, 160, 175);
  const footerY = 285;
  doc.text("This is an electronically generated receipt and does not require a signature.", W / 2, footerY - 8, { align: "center" });
  doc.text("Hybrid Smart Metering System · Final-year project prototype", W / 2, footerY - 3, { align: "center" });
  doc.text("Generated: " + new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" }), W / 2, footerY + 2, { align: "center" });

  // ── Save ──────────────────────────────────────────────────────────────────────
  const filename = "Receipt_" + tx.house + "_" + tx.txnId + ".pdf";
  doc.save(filename);
  showToast("Receipt Downloaded", filename + " saved to your Downloads.", "📄");
}

// ─── Main Render ───────────────────────────────────────────────────────────────
function render() {
  const root = document.getElementById("app");
  const avatarChar = state.role === "admin" ? "A" : state.selectedHouse.slice(-1);
  root.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">⚡</div><div><b>HYBRID</b><span>SMART METER</span></div></div>
      <div class="user-badge">
        <div class="user-badge-avatar">${avatarChar}</div>
        <div>
          <strong>${esc(state.userLabel)}</strong>
          <span>${state.role === "admin" ? "Administrator" : "House Owner Account"}</span>
        </div>
      </div>
      <nav>
        <button class="${state.currentView === 'dashboard' ? 'nav-active' : ''}" onclick="changeView('dashboard')">▦ <span>Dashboard</span></button>
        ${state.role === "admin"
          ? `<button class="${state.currentView === 'billing' ? 'nav-active' : ''}" onclick="changeView('billing')">◷ <span>Billing</span></button>`
          : `<button class="${state.currentView === 'mybill' ? 'nav-active' : ''}" onclick="changeView('mybill')">◷ <span>My Bill</span></button>`}
      </nav>
      <div class="side-bottom">
        <div class="status"><i></i><span>System operational</span></div>
        <small>ESP32 mesh · Raspberry Pi · AWS</small>
        <button class="logout-btn" onclick="logout()">⬡ Sign out</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="mobile-brand">HYBRID SMART METER</div>
        <div class="top-actions">
          <span>Last sync ${new Date().toLocaleTimeString("en-IN")}</span>
          <div class="role-pill ${state.role === "admin" ? "pill-admin" : "pill-owner"}">${state.role === "admin" ? "🛡️ Admin" : "🏠 " + esc(state.selectedHouse)}</div>
          <button class="avatar" title="${esc(state.userLabel)}">${avatarChar}</button>
        </div>
      </header>
      ${state.role === "admin"
        ? (state.currentView === 'billing' ? adminBillingView() : adminView())
        : (state.currentView === 'mybill' ? ownerBillView() : ownerDashboardView())}
      <footer>Hybrid Smart Metering System · Final-year project prototype</footer>
    </main>
  </div>`;
}

function changeView(v) { state.currentView = v; render(); }
function changeHouse(house) { state.selectedHouse = house; render(); }
function saveRate() { const v = Number(document.getElementById("rateInput").value); if (v >= 0) { state.rate = v; localStorage.setItem("hybridMeterRate", v); render(); } }

// ─── Expose globals ────────────────────────────────────────────────────────────
window.handleLogin = handleLogin;
window.switchLoginTab = switchLoginTab;
window.togglePw = togglePw;
window.logout = logout;
window.loadTelemetry = loadTelemetry;
window.changeHouse = changeHouse;
window.saveRate = saveRate;
window.showForgotPassword = showForgotPassword;
window.renderForgotPassword = renderForgotPassword;
window.handleForgotRecover = handleForgotRecover;
window.checkAdminPasswordStrength = checkAdminPasswordStrength;
window.renderPaymentModal = renderPaymentModal;
window.selectPayOpt = selectPayOpt;
window.closePaymentModal = closePaymentModal;
window.processPayment = processPayment;
window.changeView = changeView;
window.downloadReceipt = downloadReceipt;
window.clearTransactions = clearTransactions;

// ─── Boot ──────────────────────────────────────────────────────────────────────
renderLogin();