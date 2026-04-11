// JobTrack — popup script v2

(function () {
  "use strict";

  const SHEET_BASE = "https://docs.google.com/spreadsheets/d/";
  const STATUS_CYCLE = ["Applied", "Phone Screen", "Interview", "Offer", "Rejected"];

  const STATUS_EMOJI = {
    "Applied":      "📤",
    "Phone Screen": "📞",
    "Interview":    "🗓️",
    "Offer":        "🎉",
    "Rejected":     "❌",
  };

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function friendlyToday() {
    return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y.slice(2)}`;
  }

  function escape(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function nextStatus(current) {
    const idx = STATUS_CYCLE.indexOf(current);
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  }

  // ── Stale banner ───────────────────────────────────────────────────────────
  function renderStaleBanner(applications) {
    const banner   = document.getElementById("staleBanner");
    const staleEl  = document.getElementById("staleText");
    const cutoff   = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const stale = applications.filter(
      (a) => a.status === "Applied" && new Date(a.date) < cutoff
    );

    if (stale.length > 0) {
      staleEl.textContent = `${stale.length} application${stale.length > 1 ? "s" : ""} still "Applied" after 7+ days — time to follow up!`;
      banner.classList.add("visible");
    } else {
      banner.classList.remove("visible");
    }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async function renderDashboard() {
    const { applications = [], dailyCounts = {} } =
      await chrome.storage.local.get(["applications", "dailyCounts"]);

    const today = todayKey();
    document.getElementById("todayCount").textContent = dailyCounts[today] || 0;
    document.getElementById("totalCount").textContent = applications.length;
    document.getElementById("todayDate").textContent  = friendlyToday();

    renderStaleBanner(applications);

    const listEl = document.getElementById("appList");

    if (applications.length === 0) {
      listEl.innerHTML = `
        <li>
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No applications yet</div>
            <div class="empty-hint">Press <kbd>Ctrl+Shift+X</kbd> on a job page to log one.</div>
          </div>
        </li>`;
      return;
    }

    const recent = applications.slice(0, 5);
    listEl.innerHTML = recent.map((app, idx) => {
      const status  = app.status || "Applied";
      const emoji   = STATUS_EMOJI[status] || "📤";

      const notesHtml = app.notes
        ? `<div class="app-notes" title="${escape(app.notes)}">💬 ${escape(app.notes)}</div>`
        : "";

      const briefHtml = app.brief
        ? `<div class="app-brief">${escape(app.brief)}</div>`
        : "";

      let aiRowHtml = "";
      if (app.yoe || app.skills) {
        const yoeHtml = app.yoe && app.yoe !== "Not specified"
          ? `<span class="yoe-chip">⏱ ${escape(app.yoe)}</span>`
          : "";
        const skillChips = (app.skills || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 5)
          .map(s => `<span class="skill-chip">${escape(s)}</span>`)
          .join("");
        if (yoeHtml || skillChips) {
          aiRowHtml = `<div class="app-ai-row">${yoeHtml}${skillChips}</div>`;
        }
      }

      return `
        <li class="app-item">
          <div class="app-row1">
            <span class="app-title" title="${escape(app.title)}">${escape(app.title)}</span>
            <span class="app-date">${formatDate(app.date)}</span>
          </div>
          <div class="app-row2">
            <div class="app-left">
              <span class="app-company">${escape(app.company)}</span>
              <span class="site-chip">${escape(app.jobSite)}</span>
            </div>
            <span class="status-badge" data-status="${escape(status)}" data-index="${idx}"
                  title="Click to change status">
              <span class="spin">↻</span>
              <span class="label">${emoji} ${escape(status)}</span>
            </span>
          </div>
          ${briefHtml}
          ${aiRowHtml}
          ${notesHtml}
        </li>`;
    }).join("");

    // Attach status click handlers
    listEl.querySelectorAll(".status-badge").forEach((badge) => {
      badge.addEventListener("click", () => cycleStatus(badge));
    });
  }

  // ── Status cycle ───────────────────────────────────────────────────────────
  async function cycleStatus(badge) {
    if (badge.classList.contains("loading")) return;

    const idx       = parseInt(badge.dataset.index, 10);
    const current   = badge.dataset.status;
    const next      = nextStatus(current);

    badge.classList.add("loading");

    chrome.runtime.sendMessage({ action: "updateStatus", appIndex: idx, newStatus: next }, (res) => {
      if (res?.success) {
        renderDashboard(); // full re-render with fresh data
      } else {
        badge.classList.remove("loading");
      }
    });
  }

  // ── Open Sheet button ──────────────────────────────────────────────────────
  async function setupOpenSheetButton() {
    const btn = document.getElementById("openSheetBtn");
    const { sheetId } = await chrome.storage.local.get("sheetId");

    if (!sheetId) {
      btn.disabled = true;
      btn.title = "Set your Sheet ID in Settings first";
      return;
    }

    btn.disabled = false;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener("click", () => {
      chrome.tabs.create({ url: `${SHEET_BASE}${sheetId}/edit` });
    });
  }

  // ── Settings drawer ────────────────────────────────────────────────────────
  function setupSettings() {
    const gearBtn  = document.getElementById("gearBtn");
    const drawer   = document.getElementById("settingsDrawer");
    const input    = document.getElementById("sheetIdInput");
    const saveBtn  = document.getElementById("saveSettingsBtn");
    const saveMsg  = document.getElementById("saveMsg");

    chrome.storage.local.get("sheetId", ({ sheetId }) => {
      if (sheetId) input.value = sheetId;
    });

    gearBtn.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      gearBtn.classList.toggle("active", open);
      if (open) setTimeout(() => input.focus(), 220);
    });

    saveBtn.addEventListener("click", async () => {
      const raw = input.value.trim();
      if (!raw) { showMsg("Please enter a Sheet ID.", true); return; }

      let id = raw;
      const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (m) id = m[1];

      await chrome.storage.local.set({ sheetId: id });
      showMsg("Saved!", false);

      setTimeout(() => {
        saveMsg.textContent = "";
        drawer.classList.remove("open");
        gearBtn.classList.remove("active");
        setupOpenSheetButton();
      }, 1000);
    });

    function showMsg(text, isError) {
      saveMsg.textContent = text;
      saveMsg.className = "save-msg" + (isError ? " error" : "");
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    renderDashboard();
    setupOpenSheetButton();
    setupSettings();
  });
})();
