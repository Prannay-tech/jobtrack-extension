// JobTrack — popup script v4 (Supabase)

(function () {
  "use strict";

  const STATUS_CYCLE = ["Applied", "Phone Screen", "Interview", "Offer", "Rejected"];
  const STATUS_EMOJI = { "Applied":"📤","Phone Screen":"📞","Interview":"🗓️","Offer":"🎉","Rejected":"❌" };
  const FUNNEL_CLASS = { "Applied":"applied","Phone Screen":"phone-screen","Interview":"interview","Offer":"offer","Rejected":"rejected" };

  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function friendlyToday() { return new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" }); }
  function formatDate(iso) { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${m}/${d}/${y.slice(2)}`; }
  function escape(str) {
    return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function nextStatus(s) { return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s)+1) % STATUS_CYCLE.length]; }

  // ── Connection state ───────────────────────────────────────────────────────
  async function updateConnectionUI() {
    const { apiToken, connectedEmail } = await chrome.storage.local.get(["apiToken", "connectedEmail"]);
    const connected = !!apiToken;

    const dot   = document.getElementById("statusDot");
    const label = document.getElementById("statusLabel");
    const email = document.getElementById("statusEmail");
    const connectBtn    = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const banner        = document.getElementById("connectBanner");

    dot.className = "status-dot " + (connected ? "connected" : "disconnected");
    label.textContent = connected ? "Connected" : "Not connected";
    email.textContent = connected ? (connectedEmail || "") : "Connect your account to log applications";

    connectBtn.style.display    = connected ? "none" : "block";
    disconnectBtn.style.display = connected ? "block" : "none";
    banner.classList.toggle("visible", !connected);
  }

  // ── Tab switching ───────────────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        document.getElementById("tab-applications").style.display = tab === "applications" ? "block" : "none";
        const dash = document.getElementById("tab-dashboard");
        dash.style.display = tab === "dashboard" ? "block" : "none";
        if (tab === "dashboard") renderDashboardCharts();
      });
    });
    // Initial state
    document.getElementById("tab-dashboard").style.display = "none";
  }

  // ── Stale banner ────────────────────────────────────────────────────────────
  function renderStaleBanner(applications) {
    const banner = document.getElementById("staleBanner");
    const text   = document.getElementById("staleText");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const stale  = applications.filter(a => a.status === "Applied" && new Date(a.date) < cutoff);
    if (stale.length > 0) {
      text.textContent = `${stale.length} app${stale.length>1?"s":""} still "Applied" after 7+ days — follow up!`;
      banner.classList.add("visible");
    } else {
      banner.classList.remove("visible");
    }
  }

  // ── Applications tab ────────────────────────────────────────────────────────
  async function renderDashboard() {
    const { applications=[], dailyCounts={} } = await chrome.storage.local.get(["applications","dailyCounts"]);
    const today = todayKey();
    document.getElementById("todayCount").textContent = dailyCounts[today] || 0;
    document.getElementById("totalCount").textContent = applications.length;
    document.getElementById("todayDate").textContent  = friendlyToday();
    renderStaleBanner(applications);

    const listEl = document.getElementById("appList");
    if (applications.length === 0) {
      listEl.innerHTML = `<li><div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No applications yet</div>
        <div class="empty-hint">Press <kbd>Ctrl+Shift+X</kbd> on a job page.</div>
      </div></li>`;
      return;
    }

    listEl.innerHTML = applications.slice(0,10).map((app, idx) => {
      const status   = app.status || "Applied";
      const emoji    = STATUS_EMOJI[status] || "📤";
      const notesHtml = app.notes ? `<div class="app-notes" title="${escape(app.notes)}">💬 ${escape(app.notes)}</div>` : "";
      const briefHtml = app.brief ? `<div class="app-brief">${escape(app.brief)}</div>` : "";
      let aiRowHtml = "";
      if (app.yoe || app.skills || app.location) {
        const locH  = app.location ? `<span class="loc-chip">📍 ${escape(app.location)}</span>` : "";
        const yoeH  = app.yoe && app.yoe !== "Not specified" ? `<span class="yoe-chip">⏱ ${escape(app.yoe)}</span>` : "";
        const sklH  = (app.skills||"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,5)
                        .map(s=>`<span class="skill-chip">${escape(s)}</span>`).join("");
        if (locH||yoeH||sklH) aiRowHtml = `<div class="app-ai-row">${locH}${yoeH}${sklH}</div>`;
      }
      return `<li class="app-item">
        <div class="app-row1">
          <span class="app-title" title="${escape(app.title)}">${escape(app.title)}</span>
          <span class="app-date">${formatDate(app.date)}</span>
        </div>
        <div class="app-row2">
          <div class="app-left">
            <span class="app-company">${escape(app.company)}</span>
            <span class="site-chip">${escape(app.jobSite)}</span>
          </div>
          <span class="status-badge" data-status="${escape(status)}" data-index="${idx}" title="Click to change status">
            <span class="spin">↻</span><span class="label">${emoji} ${escape(status)}</span>
          </span>
        </div>
        ${briefHtml}${aiRowHtml}${notesHtml}
      </li>`;
    }).join("");

    listEl.querySelectorAll(".status-badge").forEach(badge => {
      badge.addEventListener("click", () => cycleStatus(badge));
    });
  }

  // ── Status cycling ──────────────────────────────────────────────────────────
  async function cycleStatus(badge) {
    if (badge.classList.contains("loading")) return;
    const idx     = parseInt(badge.dataset.index, 10);
    const current = badge.dataset.status;
    const next    = nextStatus(current);
    badge.classList.add("loading");

    chrome.runtime.sendMessage({ action:"updateStatus", appIndex:idx, newStatus:next }, (res) => {
      if (res?.success) renderDashboard();
      else badge.classList.remove("loading");
    });
  }

  // ── Dashboard charts ────────────────────────────────────────────────────────
  async function renderDashboardCharts() {
    const { applications=[], dailyCounts={} } = await chrome.storage.local.get(["applications","dailyCounts"]);

    drawActivityChart(dailyCounts);
    drawPipelineFunnel(applications);
    drawStreak(dailyCounts);
  }

  function drawActivityChart(dailyCounts) {
    const canvas = document.getElementById("activityChart");
    if (!canvas) return;

    // Build last 14 days data
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString("en-US", { month:"numeric", day:"numeric" });
      days.push({ key, label, count: dailyCounts[key] || 0 });
    }

    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    const W      = rect.width  || 320;
    const H      = 90;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx    = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const pad    = { top:12, right:4, bottom:22, left:4 };
    const cw     = W - pad.left - pad.right;
    const ch     = H - pad.top  - pad.bottom;
    const maxVal = Math.max(...days.map(d => d.count), 1);
    const bw     = cw / days.length;
    const barW   = bw * 0.6;
    const today  = new Date().toISOString().slice(0,10);

    ctx.clearRect(0, 0, W, H);

    days.forEach((d, i) => {
      const barH = Math.max((d.count / maxVal) * ch, d.count > 0 ? 2 : 0);
      const x    = pad.left + i * bw + (bw - barW) / 2;
      const y    = pad.top  + ch - barH;

      // Bar
      ctx.fillStyle = d.key === today ? "#2955d0" : (d.count > 0 ? "#3b6ff5" : "#e2e8f0");
      roundRect(ctx, x, y, barW, barH, 3);
      ctx.fill();

      // Count label
      if (d.count > 0) {
        ctx.fillStyle  = "#374151";
        ctx.font       = `bold ${Math.min(9, barW - 2)}px -apple-system, sans-serif`;
        ctx.textAlign  = "center";
        ctx.fillText(d.count, x + barW/2, y - 2);
      }

      // Date label (every other to avoid crowding)
      if (i % 2 === 0 || i === days.length - 1) {
        ctx.fillStyle  = d.key === today ? "#2955d0" : "#94a3b8";
        ctx.font       = `${d.key === today ? "bold " : ""}8px -apple-system, sans-serif`;
        ctx.textAlign  = "center";
        ctx.fillText(d.label, x + barW/2, H - 4);
      }
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    r = Math.min(r, h/2, w/2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPipelineFunnel(applications) {
    const el = document.getElementById("pipelineFunnel");
    if (!el) return;
    const total = applications.length || 1;
    el.innerHTML = STATUS_CYCLE.map(status => {
      const count = applications.filter(a => a.status === status).length;
      const pct   = Math.round((count / total) * 100);
      const cls   = FUNNEL_CLASS[status];
      return `<div class="funnel-row">
        <span class="funnel-label">${STATUS_EMOJI[status]} ${status}</span>
        <div class="funnel-bar-wrap">
          <div class="funnel-bar ${cls}" style="width:${pct}%"></div>
        </div>
        <span class="funnel-count">${count}</span>
      </div>`;
    }).join("");
  }

  function drawStreak(dailyCounts) {
    const el = document.getElementById("streakCount");
    if (!el) return;
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0,10);
      if ((dailyCounts[key] || 0) > 0) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    el.textContent = `${streak} day${streak !== 1 ? "s" : ""}`;
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────
  async function downloadCSV() {
    const { applications=[] } = await chrome.storage.local.get("applications");
    if (applications.length === 0) return;

    const headers = ["Date","Company","Job Title","URL","Job Site","Location","Status","Notes","Brief","YOE","Top Skills"];
    const rows = applications.map(a =>
      [a.date, a.company, a.title, a.url, a.jobSite, a.location, a.status, a.notes, a.brief, a.yoe, a.skills]
        .map(v => `"${(v||"").replace(/"/g,'""')}"`)
        .join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `jobtrack-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Settings / Connection ──────────────────────────────────────────────────
  function setupSettings() {
    const gearBtn       = document.getElementById("gearBtn");
    const drawer        = document.getElementById("settingsDrawer");
    const connectBtn    = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const bannerBtn     = document.getElementById("connectBannerBtn");

    gearBtn.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      gearBtn.classList.toggle("active", open);
    });

    connectBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "connectAccount" });
    });

    bannerBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "connectAccount" });
    });

    disconnectBtn.addEventListener("click", async () => {
      chrome.runtime.sendMessage({ action: "disconnect" }, () => {
        updateConnectionUI();
      });
    });
  }

  // ── Open Dashboard ─────────────────────────────────────────────────────────
  function setupDashboardButton() {
    const btn = document.getElementById("openDashboardBtn");
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openDashboard" });
    });
  }

  // ── Listen for token from connect page ─────────────────────────────────────
  // The connect page sends a message via content script when token is ready
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiToken || changes.connectedEmail) {
      updateConnectionUI();
      renderDashboard();
    }
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    updateConnectionUI();
    renderDashboard();
    setupDashboardButton();
    setupSettings();
    setupTabs();
    document.getElementById("csvBtn").addEventListener("click", downloadCSV);
  });
})();
