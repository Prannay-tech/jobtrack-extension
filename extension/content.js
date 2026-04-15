// JobTrack — content script v4 (universal scraper + connect page bridge)
// Architecture:
//   1. JSON-LD fast-path   → instant, covers ~70% of job sites
//   2. AI fallback         → Groq extracts title+company from raw text
//   3. Optimistic overlay  → shows instantly, updates when AI responds
//   4. Connect page bridge → detects token on /connect page, sends to background

(function () {
  "use strict";

  // ── Connect page bridge ─────────────────────────────────────────────────────
  // When the extension opens the web app's /connect page, this detects the
  // generated token and sends it back to the extension's background script.
  function setupConnectBridge() {
    if (!window.location.pathname.startsWith("/connect")) return;

    const observer = new MutationObserver(() => {
      const tokenEl = document.querySelector("[data-jobtrack-token]");
      if (tokenEl) {
        const token = tokenEl.getAttribute("data-jobtrack-token");
        const email = tokenEl.getAttribute("data-jobtrack-email") || "";
        if (token) {
          chrome.runtime.sendMessage({ action: "saveToken", token, email });
          observer.disconnect();
        }
      }
    });

    // Start observing once body exists
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-jobtrack-token"] });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-jobtrack-token"] });
      });
    }

    // Also check immediately in case it's already there
    setTimeout(() => {
      const tokenEl = document.querySelector("[data-jobtrack-token]");
      if (tokenEl) {
        const token = tokenEl.getAttribute("data-jobtrack-token");
        const email = tokenEl.getAttribute("data-jobtrack-email") || "";
        if (token) {
          chrome.runtime.sendMessage({ action: "saveToken", token, email });
          observer.disconnect();
        }
      }
    }, 1000);
  }

  setupConnectBridge();

  // ── Utility ─────────────────────────────────────────────────────────────────
  function meta(property) {
    return (
      document.querySelector(`meta[property="${property}"]`)?.getAttribute("content")?.trim() ||
      document.querySelector(`meta[name="${property}"]`)?.getAttribute("content")?.trim() ||
      null
    );
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // ── LinkedIn Easy Apply detection ────────────────────────────────────────────
  function scrapeLinkedInEasyApply() {
    if (!window.location.hostname.includes("linkedin.com")) return null;

    const title = (
      document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.innerText ||
      document.querySelector("h1.t-24")?.innerText ||
      document.querySelector(".jobs-unified-top-card__job-title h1")?.innerText ||
      document.querySelector("h1")?.innerText
    )?.trim() || null;

    const company = (
      document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.innerText ||
      document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText ||
      document.querySelector(".jobs-unified-top-card__company-name a")?.innerText
    )?.trim() || null;

    if (title || company) return { title, company, source: "linkedin-easy-apply" };
    return null;
  }

  // ── Fast-path: structured data sources (no AI, instant) ─────────────────────
  function fastExtract() {
    // 0. LinkedIn Easy Apply
    const easyApply = scrapeLinkedInEasyApply();
    if (easyApply) return easyApply;

    // 1. JSON-LD JobPosting
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const raw  = el.textContent;
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const nodes = item["@graph"] ? item["@graph"] : [item];
          for (const node of nodes) {
            if (node["@type"] === "JobPosting" && node.title) {
              return {
                title:   node.title.trim(),
                company: node.hiringOrganization?.name?.trim() || null,
                source:  "json-ld",
              };
            }
          }
        }
      } catch {}
    }

    // 2. OG title with "Role at Company" pattern
    const ogTitle = meta("og:title");
    if (ogTitle) {
      const m = ogTitle.match(/^(.+?)\s+at\s+(.+)$/i);
      if (m && !/\?|looking for|find jobs|search jobs|browse/i.test(ogTitle)) {
        return { title: m[1].trim(), company: m[2].trim(), source: "og-at" };
      }
    }

    // 3. document.title patterns
    const docTitle = document.title;
    const titleSep = docTitle.match(/^(.+?)\s*[-–|]\s*(.+?)(?:\s*[-–|].*)?$/);
    if (titleSep) {
      const [, part1, part2] = titleSep;
      const badWords = /careers|jobs|hiring|apply|portal|home|search|linkedin|indeed|glassdoor/i;
      if (!badWords.test(part1) && part1.length < 80) {
        return { title: part1.trim(), company: badWords.test(part2) ? null : part2.trim(), source: "doc-title" };
      }
    }

    // 4. Bare h1 + og:site_name
    const h1 = document.querySelector("h1")?.innerText?.trim() || null;
    const siteName = meta("og:site_name");
    const company  = (siteName && !/\.com|\.io|\.co|jobs|careers/i.test(siteName)) ? siteName : null;

    return { title: h1, company, source: "h1-fallback" };
  }

  // ── Visible page text for AI fallback ────────────────────────────────────────
  function getPageText() {
    const candidates = [
      "main", "article",
      '[role="main"]',
      '[class*="job-detail"]', '[class*="jobDetail"]',
      '[class*="job-description"]', '[class*="jobDescription"]',
      '[class*="posting"]', '[class*="content"]',
      "section", "body",
    ];

    for (const sel of candidates) {
      for (const el of document.querySelectorAll(sel)) {
        const text = el.innerText?.trim();
        if (text && text.length > 300) {
          return text.slice(0, 5000);
        }
      }
    }

    return document.body.innerText.slice(0, 5000);
  }

  // ── Site label ───────────────────────────────────────────────────────────────
  function getSiteLabel() {
    const host   = window.location.hostname.replace(/^www\./, "");
    const search = window.location.search;

    if (host.includes("linkedin.com"))          return "LinkedIn";
    if (host.includes("indeed.com"))            return "Indeed";
    if (host.includes("glassdoor.com"))         return "Glassdoor";
    if (host.includes("greenhouse.io") || search.includes("gh_jid")) return "Greenhouse";
    if (host.includes("lever.co"))              return "Lever";
    if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) return "Workday";
    if (host.includes("careers.google.com") || (host.includes("google.com") && window.location.pathname.startsWith("/careers"))) return "Google Careers";
    if (host.includes("smartrecruiters.com"))   return "SmartRecruiters";
    if (host.includes("ashbyhq.com") || search.includes("ashby_jid")) return "Ashby";
    if (host.includes("rippling.com"))          return "Rippling";
    if (host.includes("wellfound.com") || host.includes("angel.co")) return "Wellfound";
    if (host.includes("microsoft.com"))         return "Microsoft";
    if (host.includes("metacareers.com"))       return "Meta";
    if (host.includes("amazon.jobs"))           return "Amazon Jobs";
    if (host.includes("ibm.com"))               return "IBM";
    if (host.includes("bamboohr.com"))          return "BambooHR";
    if (host.includes("icims.com"))             return "iCIMS";
    if (host.includes("taleo.net"))             return "Taleo";
    if (host.includes("successfactors.com"))    return "SAP SuccessFactors";
    if (host.includes("workable.com"))          return "Workable";
    if (host.includes("recruitee.com"))         return "Recruitee";
    if (host.includes("breezy.hr"))             return "Breezy";
    if (host.includes("jobvite.com"))           return "Jobvite";
    if (host.includes("adp.com"))               return "ADP";
    if (host.includes("ziprecruiter.com"))      return "ZipRecruiter";
    if (host.includes("dice.com"))              return "Dice";
    if (host.includes("builtin.com"))           return "BuiltIn";
    if (host.includes("monster.com"))           return "Monster";

    const parts = host.split(".");
    const skip  = new Set(["careers","jobs","hire","apply","talent","work","recruiting","ats","boards"]);
    const label = parts.find(p => !skip.has(p) && p.length > 1);
    return label ? capitalize(label) : host;
  }

  // ── Main extraction ──────────────────────────────────────────────────────────
  function extractJobDetails() {
    const fast     = fastExtract();
    const siteLabel = getSiteLabel();

    let jobSite = siteLabel;
    if (fast.company && siteLabel.toLowerCase() === fast.company.toLowerCase()) {
      const sub = window.location.hostname.replace(/^www\./, "").split(".")[0];
      const subLabel = ["careers","jobs","hire","apply"].includes(sub) ? capitalize(sub) : "Careers";
      jobSite = `${fast.company} ${subLabel}`;
    }

    return {
      title:          fast.title   || "",
      company:        fast.company || "",
      url:            window.location.href,
      jobSite,
      date:           new Date().toISOString().slice(0, 10),
      pageText:       getPageText(),
      fastSourceType: fast.source,
    };
  }

  // ── Overlay ──────────────────────────────────────────────────────────────────
  function showLogOverlay(details, sendResponse) {
    document.getElementById("__jobtrack_host__")?.remove();

    const host = document.createElement("div");
    host.id = "__jobtrack_host__";
    Object.assign(host.style, {
      position: "fixed", inset: "0", zIndex: "2147483647",
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(10, 18, 42, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: fadeIn .2s ease;
        }

        .modal {
          position: relative; z-index: 1;
          background: #ffffff;
          border-radius: 22px;
          width: 460px;
          overflow: hidden;
          box-shadow:
            0 2px 4px rgba(0,0,0,.04),
            0 8px 24px rgba(0,0,0,.10),
            0 32px 72px rgba(0,0,0,.18),
            0 0 0 1px rgba(0,0,0,.06);
          animation: slideUp .24s cubic-bezier(.16,1,.3,1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px) scale(.98) }
          to   { opacity:1; transform:translateY(0)    scale(1)   }
        }

        .modal-header {
          background: linear-gradient(135deg, #2d5de0 0%, #1a3fbc 100%);
          padding: 22px 26px 20px;
          display: flex; align-items: center; gap: 14px;
        }
        .brand-mark {
          width: 42px; height: 42px; border-radius: 13px;
          background: rgba(255,255,255,0.18);
          border: 1.5px solid rgba(255,255,255,0.30);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-style: italic;
          font-size: 16px; color: #fff; letter-spacing: -0.5px;
          flex-shrink: 0;
        }
        .modal-titles { flex: 1; }
        .modal-title  { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -.2px; }
        .modal-sub    { font-size: 12px; color: rgba(255,255,255,.62); margin-top: 2px; }

        .modal-body { padding: 22px 26px 24px; }

        .job-card {
          border-radius: 13px;
          border: 1px solid #e4ecff;
          background: #f5f8ff;
          padding: 14px 16px 14px 18px;
          margin-bottom: 20px;
          position: relative; overflow: hidden;
          min-height: 64px;
        }
        .job-card::before {
          content: "";
          position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
          background: linear-gradient(180deg, #3b6ff5, #2146c7);
          border-radius: 4px 0 0 4px;
        }

        .job-title {
          font-size: 14.5px; font-weight: 700; color: #0d1526;
          line-height: 1.35; padding-right: 4px;
          min-height: 20px;
        }
        .job-meta {
          display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap;
        }
        .job-company { font-size: 12.5px; color: #3b6ff5; font-weight: 600; }
        .job-dot     { width: 3px; height: 3px; border-radius: 50%; background: #94a3b8; flex-shrink: 0; }
        .job-site    {
          font-size: 10.5px; font-weight: 700; letter-spacing: .2px;
          background: #dbeafe; color: #1d4ed8;
          border-radius: 99px; padding: 2px 9px; border: 1px solid #bfdbfe;
        }

        .shimmer {
          display: inline-block;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px; height: 14px;
        }
        .shimmer-title   { width: 75%; margin-bottom: 4px; }
        .shimmer-company { width: 40%; height: 12px; }
        @keyframes shimmer { from { background-position:200% 0 } to { background-position:-200% 0 } }

        .ai-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 600; color: #6366f1;
          background: #eef2ff; border: 1px solid #c7d2fe;
          border-radius: 99px; padding: 2px 8px; margin-top: 8px;
          opacity: 0; transition: opacity .3s;
        }
        .ai-badge.visible { opacity: 1; }

        .field { margin-bottom: 14px; }
        .field-label {
          display: block; font-size: 11px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: .7px; margin-bottom: 7px;
        }
        textarea {
          width: 100%; height: 76px; padding: 11px 13px;
          border: 1.5px solid #e2e8f0; border-radius: 11px;
          font-size: 13.5px; color: #0d1526; resize: none; outline: none;
          font-family: inherit; line-height: 1.6;
          transition: border-color .15s, box-shadow .15s;
          background: #fff;
        }
        textarea:focus { border-color: #3b6ff5; box-shadow: 0 0 0 3px rgba(59,111,245,.12); }
        textarea::placeholder { color: #c4cdd8; }

        .followup-row {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px;
          background: #f8faff; border: 1.5px solid #e0e7ff; border-radius: 11px;
        }
        .followup-check-wrap {
          display: flex; align-items: center; gap: 8px; cursor: pointer;
        }
        .followup-check-wrap input[type="checkbox"] {
          width: 15px; height: 15px; accent-color: #3b6ff5;
          cursor: pointer; flex-shrink: 0; margin: 0;
        }
        .followup-check-wrap span {
          font-size: 12.5px; font-weight: 500; color: #475569;
          white-space: nowrap; user-select: none;
        }
        .date-input {
          flex: 1; padding: 5px 9px;
          border: 1.5px solid #dde5f0; border-radius: 8px;
          font-size: 12.5px; color: #0d1526; outline: none;
          display: none; transition: border-color .15s; font-family: inherit; background: #fff;
        }
        .date-input:focus { border-color: #3b6ff5; }
        .date-input.visible { display: block; }

        .divider { height: 1px; background: #f0f4f8; margin: 18px 0 16px; }

        .actions { display: flex; gap: 9px; }
        .btn {
          border: none; border-radius: 12px;
          font-size: 13.5px; font-weight: 600; cursor: pointer;
          padding: 12px 20px;
          transition: all .15s; font-family: inherit;
        }
        .btn:active { transform: scale(.97); }
        .btn-cancel { background: #f1f5f9; color: #64748b; flex: 0 0 auto; }
        .btn-cancel:hover { background: #e5eaf1; color: #475569; }
        .btn-log {
          flex: 1;
          background: linear-gradient(135deg, #3b6ff5 0%, #2146c7 100%);
          color: #fff;
          box-shadow: 0 1px 3px rgba(59,111,245,.2), 0 4px 12px rgba(59,111,245,.3);
        }
        .btn-log:hover {
          box-shadow: 0 2px 6px rgba(59,111,245,.25), 0 6px 20px rgba(59,111,245,.38);
          transform: translateY(-1px);
        }

        .shortcut-tip {
          text-align: center; font-size: 11px; color: #b0bec5; margin-top: 13px;
        }
        .shortcut-tip strong { font-weight: 600; color: #94a3b8; }
      </style>

      <div class="backdrop" id="backdrop"></div>
      <div class="modal">

        <div class="modal-header">
          <div class="brand-mark">J+</div>
          <div class="modal-titles">
            <div class="modal-title">Log Application</div>
            <div class="modal-sub" id="jt-sub">Review and add notes before saving</div>
          </div>
        </div>

        <div class="modal-body">
          <div class="job-card" id="jt-card">
            <div class="job-title" id="jt-title"></div>
            <div class="job-meta" id="jt-meta"></div>
            <div class="ai-badge" id="jt-ai-badge">✦ AI verified</div>
          </div>

          <div class="field">
            <label class="field-label" for="jt-notes">Notes</label>
            <textarea id="jt-notes" placeholder="e.g. Referred by Jane · $130k–$150k · hybrid…"></textarea>
          </div>

          <div class="followup-row">
            <label class="followup-check-wrap">
              <input type="checkbox" id="jt-followup-check" />
              <span>Set follow-up reminder</span>
            </label>
            <input type="date" id="jt-followup-date" class="date-input" />
          </div>

          <div class="divider"></div>

          <div class="actions">
            <button class="btn btn-cancel" id="jt-cancel">Cancel</button>
            <button class="btn btn-log" id="jt-confirm">✓&nbsp; Log Application</button>
          </div>
          <div class="shortcut-tip"><strong>⌘ Enter</strong> to log &nbsp;·&nbsp; <strong>Esc</strong> to cancel</div>
        </div>
      </div>
    `;

    // ── Populate card ────────────────────────────────────────────────────────
    function renderCard(title, company, jobSite, aiVerified) {
      const titleEl = shadow.getElementById("jt-title");
      const metaEl  = shadow.getElementById("jt-meta");
      const badge   = shadow.getElementById("jt-ai-badge");

      if (title || company) {
        titleEl.textContent = title || "Detecting…";
        metaEl.innerHTML = `
          <span class="job-company">${company || "Detecting…"}</span>
          ${jobSite ? `<div class="job-dot"></div><span class="job-site">${jobSite}</span>` : ""}
        `;
      } else {
        titleEl.innerHTML   = `<div class="shimmer shimmer-title"></div>`;
        metaEl.innerHTML    = `<div class="shimmer shimmer-company"></div>`;
      }

      badge.classList.toggle("visible", !!aiVerified);
    }

    renderCard(details.title, details.company, details.jobSite, false);

    // Follow-up date setup
    const notesEl      = shadow.getElementById("jt-notes");
    const backdrop     = shadow.getElementById("backdrop");
    const followupChk  = shadow.getElementById("jt-followup-check");
    const followupDate = shadow.getElementById("jt-followup-date");

    const defaultFollowUp = new Date();
    defaultFollowUp.setDate(defaultFollowUp.getDate() + 7);
    followupDate.value = defaultFollowUp.toISOString().slice(0, 10);
    followupDate.min   = new Date().toISOString().slice(0, 10);

    followupChk.addEventListener("change", () => {
      followupDate.classList.toggle("visible", followupChk.checked);
    });

    let finalDetails = { ...details };
    let confirmed    = false;

    function doConfirm() {
      if (confirmed) return;
      confirmed = true;
      host.remove();
      sendResponse({
        confirmed:    true,
        notes:        notesEl.value.trim(),
        followUpDate: followupChk.checked ? followupDate.value : null,
        details:      finalDetails,
      });
    }

    function doCancel() {
      if (confirmed) return;
      confirmed = true;
      host.remove();
      sendResponse({ confirmed: false });
    }

    shadow.getElementById("jt-confirm").addEventListener("click", doConfirm);
    shadow.getElementById("jt-cancel").addEventListener("click", doCancel);
    backdrop.addEventListener("click", doCancel);

    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape")                           { doCancel();  document.removeEventListener("keydown", handler); }
      if (e.key === "Enter" && (e.metaKey||e.ctrlKey))  { doConfirm(); document.removeEventListener("keydown", handler); }
    });

    document.body.appendChild(host);
    setTimeout(() => notesEl.focus(), 50);

    // ── Listen for AI update from background ─────────────────────────────────
    const aiHandler = (message) => {
      if (message.action !== "aiDetailsReady" || confirmed) return;
      const ai = message.aiDetails;
      if (ai.title)   finalDetails.title   = ai.title;
      if (ai.company) finalDetails.company = ai.company;
      if (ai.brief)   finalDetails.brief   = ai.brief;
      if (ai.yoe)     finalDetails.yoe     = ai.yoe;
      if (ai.skills)  finalDetails.skills  = ai.skills;

      renderCard(finalDetails.title, finalDetails.company, finalDetails.jobSite, true);
      shadow.getElementById("jt-sub").textContent = "AI verified · add notes before saving";
    };
    chrome.runtime.onMessage.addListener(aiHandler);
  }

  // ── Message listener ─────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "extractJobDetails") {
      try { sendResponse(extractJobDetails()); }
      catch (err) { sendResponse({ error: err.message }); }
      return true;
    }

    if (message.action === "showLogOverlay") {
      showLogOverlay(message.details, sendResponse);
      return true;
    }
  });
})();
