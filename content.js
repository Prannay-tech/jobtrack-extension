// JobTrack — content script v2

(function () {
  "use strict";

  // ── Utility helpers ─────────────────────────────────────────────────────────
  function firstText(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.innerText?.trim() || el?.textContent?.trim();
      if (text) return text;
    }
    return null;
  }

  function meta(property) {
    return (
      document.querySelector(`meta[property="${property}"]`)?.getAttribute("content")?.trim() ||
      document.querySelector(`meta[name="${property}"]`)?.getAttribute("content")?.trim() ||
      null
    );
  }

  function parseAtPattern(str) {
    const m = str?.match(/^(.+?)\s+at\s+(.+)$/i);
    return m ? { title: m[1].trim(), company: m[2].trim() } : null;
  }

  function hostnameCompany() {
    let host = window.location.hostname.replace(/^www\./, "");
    const parts = host.split(".");
    return capitalize(parts.length >= 3 ? parts[0] : parts[0]);
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // ── Site detection ──────────────────────────────────────────────────────────
  function detectSite(host) {
    if (host.includes("linkedin.com"))        return "LinkedIn";
    if (host.includes("indeed.com"))          return "Indeed";
    if (host.includes("glassdoor.com"))       return "Glassdoor";
    if (host.includes("greenhouse.io"))       return "Greenhouse";
    if (host.includes("lever.co"))            return "Lever";
    if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) return "Workday";
    if ((host.includes("google.com") && window.location.pathname.includes("/careers")) ||
         host.includes("careers.google.com")) return "Google Careers";
    if (host.includes("smartrecruiters.com")) return "SmartRecruiters";
    if (host.includes("icims.com"))           return "iCIMS";
    if (host.includes("taleo.net"))           return "Taleo";
    if (host.includes("ashbyhq.com"))         return "Ashby";
    if (host.includes("rippling.com"))        return "Rippling";
    if (host.includes("wellfound.com") || host.includes("angel.co")) return "Wellfound";
    if (host.includes("builtin.com"))         return "BuiltIn";
    if (host.includes("dice.com"))            return "Dice";
    if (host.includes("ziprecruiter.com"))    return "ZipRecruiter";
    if (host.includes("monster.com"))         return "Monster";
    if (host.includes("jobvite.com"))         return "Jobvite";
    if (host.includes("successfactors.com"))  return "SAP SuccessFactors";
    if (host.includes("adp.com"))             return "ADP";
    if (host.includes("amazon.jobs"))         return "Amazon Jobs";
    if (host.includes("careers.microsoft.com")) return "Microsoft";
    if (host.includes("metacareers.com"))     return "Meta";
    if (host.includes("apple.com/careers") ||
        host.includes("jobs.apple.com"))      return "Apple";
    if (host.includes("careers.netflix.com")) return "Netflix";
    if (host.includes("nvidia.com"))          return "NVIDIA";
    if (host.includes("careers.ibm.com"))     return "IBM";
    if (host.includes("paylocity.com"))       return "Paylocity";
    if (host.includes("ultipro.com") ||
        host.includes("ukg.com"))             return "UKG";
    if (host.includes("bamboohr.com"))        return "BambooHR";
    if (host.includes("recruitee.com"))       return "Recruitee";
    if (host.includes("breezy.hr"))           return "Breezy";
    if (host.includes("pinpointhq.com"))      return "Pinpoint";
    if (host.includes("dover.com"))           return "Dover";
    return "Other";
  }

  // ── Site-specific scrapers ──────────────────────────────────────────────────
  function scrapeLinkedIn() {
    return {
      title: firstText("h1.t-24","h1.jobs-unified-top-card__job-title",".job-details-jobs-unified-top-card__job-title h1","h1"),
      company: firstText(".job-details-jobs-unified-top-card__company-name a",".job-details-jobs-unified-top-card__company-name",".jobs-unified-top-card__company-name a",".topcard__org-name-link"),
    };
  }

  function scrapeIndeed() {
    return {
      title: firstText("h1[data-jk]","h1.jobsearch-JobInfoHeader-title","h1.jobTitle",'[data-testid="jobsearch-JobInfoHeader-title"]',"h1"),
      company: firstText('[data-testid="inlineHeader-companyName"] a','[data-testid="inlineHeader-companyName"]',".jobsearch-InlineCompanyRating-companyName",'[data-company-name="true"]'),
    };
  }

  function scrapeGlassdoor() {
    return {
      title: firstText('h1[data-test="job-title"]',".JobDetails_jobTitle__Rw_gn","h1"),
      company: firstText('[data-test="employer-name"]',".EmployerProfile_employerName__Xemli",".JobDetails_companyName__t0_G1"),
    };
  }

  function scrapeGreenhouse() {
    const title = firstText("h1.app-title",".job-post h1","h1");
    let company = null;
    const parts = window.location.hostname.split(".");
    if (parts.length >= 3 && parts[1] === "greenhouse") {
      company = capitalize(parts[0].replace(/-/g, " "));
    }
    if (!company) company = parseAtPattern(document.title)?.company || null;
    return { title, company };
  }

  function scrapeLever() {
    let title = firstText("h2.posting-headline",".posting-headline h2","h2");
    let company = null;
    const m = window.location.pathname.match(/^\/([^/]+)\//);
    if (m) company = m[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (title) {
      const pm = title.match(/^\(([^)]+)\)\s+(.+)$/);
      if (pm) { if (!company) company = pm[1].trim(); title = pm[2].trim(); }
    }
    company = company || parseAtPattern(document.title)?.company || null;
    return { title, company };
  }

  function scrapeWorkday() {
    const title = firstText('[data-automation-id="jobPostingHeader"]','[data-automation-id="Job_Posting_Title"]',"h2");
    let company = null;
    const host = window.location.hostname;
    if (host.includes("myworkdayjobs.com")) {
      company = host.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
    return { title, company };
  }

  function scrapeGoogleCareers() {
    try {
      const ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        const d = JSON.parse(ld.textContent);
        if (d.title) return { title: d.title, company: d.hiringOrganization?.name || "Google" };
      }
    } catch {}
    return { title: firstText("h2","h1"), company: "Google" };
  }

  function scrapeAshby() {
    const title = firstText("h1.ashby-job-posting-heading",".ashby-job-posting h1","h1");
    const m = window.location.pathname.match(/^\/([^/]+)\//);
    const company = m ? m[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null;
    return { title, company };
  }

  function scrapeSmartRecruiters() {
    const title = firstText("h1.job-title",".job-header h1","h1");
    const m = window.location.pathname.match(/^\/([^/]+)\//);
    const company = m ? m[1].replace(/([A-Z])/g, " $1").trim() : null;
    return { title, company };
  }

  function scrapeADP() {
    // ADP Workforcenow is a heavy SPA — title often lives in the document title
    // Format: "Job Title - Company Name" or just in a heading
    const title =
      firstText(
        "[class*='jss'][class*='title']",
        "[class*='job-title']",
        "[class*='jobTitle']",
        ".mdf-main-title",
        "h1", "h2"
      ) ||
      // Parse from document.title: "Job Title - Company | ADP"
      (document.title.split(/[-|]/)[0]?.trim()) ||
      null;

    // Company is usually the second segment of the page title
    let company = null;
    const titleParts = document.title.split(/[-|]/);
    if (titleParts.length >= 2) {
      const candidate = titleParts[1]?.trim();
      if (candidate && !candidate.toLowerCase().includes("adp")) company = candidate;
    }
    company = company || firstText("[class*='company']","[class*='employer']") || null;

    return { title, company };
  }

  function scrapeAmazonJobs() {
    const title = firstText(
      "h1.title",
      ".job-title",
      "[class*='job-title']",
      "h1"
    );
    return { title, company: "Amazon" };
  }

  function scrapeMicrosoft() {
    const title = firstText(
      "h1.ms-Stack",
      "[class*='job-title']",
      ".job-title",
      "h1"
    );
    return { title, company: "Microsoft" };
  }

  function scrapeMeta() {
    const title = firstText(
      "h1[data-testid='job-detail-title']",
      ".job-detail-header h1",
      "h1"
    );
    return { title, company: "Meta" };
  }

  function scrapeBambooHR() {
    const title = firstText(".BambooHR-ATS-Title", "h2", "h1");
    // BambooHR subdomain: company.bamboohr.com
    const parts = window.location.hostname.split(".");
    const company = parts.length >= 3
      ? parts[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : null;
    return { title, company };
  }

  function scrapeUKG() {
    const title = firstText("[data-automation='job-title']", "h1", "h2");
    // Parse company from document title
    const parts = document.title.split(/[-|]/);
    const company = parts.length > 1 ? parts[parts.length - 1].trim() : null;
    return { title, company };
  }

  // Returns true if string looks like a domain (e.g. "Amazon.jobs", "site.com")
  function looksLikeDomain(str) {
    return /^[\w.-]+\.(com|jobs|io|co|net|org|ai|dev)$/i.test(str?.trim());
  }

  function scrapeGeneric() {
    // 1. JSON-LD JobPosting (most reliable)
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const d = JSON.parse(el.textContent);
        const item = Array.isArray(d) ? d[0] : d;
        if (item["@type"] === "JobPosting" && item.title) {
          return { title: item.title, company: item.hiringOrganization?.name || null };
        }
      } catch {}
    }
    // 2. OG title with "at Company" pattern
    const ogTitle = meta("og:title");
    if (ogTitle) {
      const parsed = parseAtPattern(ogTitle);
      if (parsed) return parsed;
    }
    // 3. og:site_name — skip if it looks like a domain name
    const siteName = meta("og:site_name");
    const company  = (siteName && !looksLikeDomain(siteName)) ? siteName : hostnameCompany();
    return { title: firstText("h1"), company };
  }

  // ── Job description scraper ─────────────────────────────────────────────────
  function scrapeJobDescription(site) {
    // Site-specific selectors first
    const siteSelectors = {
      "LinkedIn":        [".jobs-description-content__text", ".job-view-layout .description__text", "#job-details"],
      "Indeed":          ["#jobDescriptionText", ".jobsearch-jobDescriptionText"],
      "Glassdoor":       [".jobDescriptionContent", "[class*='JobDescription_jobDescriptionContainer']"],
      "Greenhouse":      ["#content .section-wrapper", "#app_body"],
      "Lever":           [".section-wrapper", ".posting-requirements", ".posting"],
      "Workday":         ["[data-automation-id='job-posting-details']", "[data-automation-id='jobPostingDescription']"],
      "Google Careers":  [".gc-job-detail-main", "[jsname='bBqBXd']", "article"],
      "Ashby":           [".ashby-job-posting-brief-description", "[class*='jobPostingDescription']"],
      "SmartRecruiters": [".job-sections", ".details-container"],
    };

    const selectors = siteSelectors[site] || [];

    // Try site-specific selectors
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 100) {
        return el.innerText.trim().slice(0, 4000);
      }
    }

    // Generic fallback — find the largest text block on the page
    const candidates = [
      "article",
      '[class*="description"]',
      '[class*="job-desc"]',
      '[class*="jobDesc"]',
      '[class*="posting"]',
      '[id*="description"]',
      '[id*="job-detail"]',
      "main",
    ];

    let best = null;
    let bestLen = 100;
    for (const sel of candidates) {
      for (const el of document.querySelectorAll(sel)) {
        const text = el.innerText?.trim();
        if (text && text.length > bestLen) { best = text; bestLen = text.length; }
      }
    }

    return best ? best.slice(0, 4000) : "";
  }

  // ── Main extraction ─────────────────────────────────────────────────────────
  function extractJobDetails() {
    const hostname = window.location.hostname;
    const site = detectSite(hostname);

    const scrapers = {
      "LinkedIn": scrapeLinkedIn, "Indeed": scrapeIndeed,
      "Glassdoor": scrapeGlassdoor, "Greenhouse": scrapeGreenhouse,
      "Lever": scrapeLever, "Workday": scrapeWorkday,
      "Google Careers": scrapeGoogleCareers, "SmartRecruiters": scrapeSmartRecruiters,
      "Ashby": scrapeAshby, "ADP": scrapeADP,
      "Amazon Jobs": scrapeAmazonJobs, "Microsoft": scrapeMicrosoft,
      "Meta": scrapeMeta, "BambooHR": scrapeBambooHR, "UKG": scrapeUKG,
    };

    let scraped = (scrapers[site] || scrapeGeneric)();

    if (!scraped.title || !scraped.company) {
      const fb = scrapeGeneric();
      scraped.title   = scraped.title   || fb.title;
      scraped.company = scraped.company || fb.company;
    }

    // Strip parenthetical "(Company) Title" patterns
    if (scraped.title) {
      const pm = scraped.title.match(/^\(([^)]+)\)\s+(.+)$/);
      if (pm) { if (!scraped.company) scraped.company = pm[1].trim(); scraped.title = pm[2].trim(); }
    }

    // For "Other" sites, try to derive a friendlier site label from the hostname
    let jobSite = site;
    if (site === "Other") {
      const host = window.location.hostname.replace(/^www\./, "");
      const parts = host.split(".");
      // e.g. "careers.oracle.com" → "Oracle", "jobs.stripe.com" → "Stripe"
      const meaningful = parts.find(p => !["careers","jobs","hire","apply","talent","recruiting","work"].includes(p));
      jobSite = meaningful
        ? meaningful.charAt(0).toUpperCase() + meaningful.slice(1)
        : host;
    }

    return {
      title:           scraped.title   || "Unknown Title",
      company:         scraped.company || "Unknown Company",
      url:             window.location.href,
      jobSite:         jobSite,
      date:            new Date().toISOString().slice(0, 10),
      jobDescription:  scrapeJobDescription(site),
    };
  }

  // ── Log overlay (v2) ────────────────────────────────────────────────────────
  function showLogOverlay(details, sendResponse) {
    // Remove any existing overlay
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
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(3px);
          animation: fadeIn .15s ease;
        }

        .modal {
          position: relative; z-index: 1;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,.06);
          animation: slideUp .2s ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }

        .header { display:flex; align-items:center; gap:10px; margin-bottom:16px; }

        .brand-mark {
          width:36px; height:36px; border-radius:10px;
          background:linear-gradient(135deg,#3b6ff5,#1d4ed8);
          display:flex; align-items:center; justify-content:center;
          font-weight:900; font-size:13px; color:#fff; letter-spacing:-0.5px;
          flex-shrink:0;
        }

        .header-text { flex:1; min-width:0; }
        .modal-title { font-size:15px; font-weight:700; color:#0d1526; }
        .modal-sub   { font-size:12px; color:#64748b; margin-top:1px; }

        .job-card {
          background:#f8faff; border:1px solid #e0e7ff;
          border-radius:10px; padding:12px 14px; margin-bottom:14px;
        }

        .job-title   { font-size:13px; font-weight:600; color:#0d1526; line-height:1.4; }
        .job-company { font-size:12px; color:#3b6ff5; margin-top:3px; font-weight:500; }
        .job-site    {
          display:inline-block; font-size:10px; font-weight:600;
          background:#eff6ff; color:#3b6ff5; border:1px solid #bfdbfe;
          border-radius:99px; padding:1px 7px; margin-top:5px;
        }

        label { display:block; font-size:11px; font-weight:600; color:#475569;
                text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }

        textarea {
          width:100%; height:72px; padding:9px 11px;
          border:1.5px solid #e2e8f0; border-radius:8px;
          font-size:13px; color:#0d1526; resize:none; outline:none;
          font-family:inherit; line-height:1.5;
          transition:border-color .15s, box-shadow .15s;
        }
        textarea:focus { border-color:#3b6ff5; box-shadow:0 0 0 3px rgba(59,111,245,.12); }
        textarea::placeholder { color:#94a3b8; }

        .actions { display:flex; gap:8px; margin-top:14px; }

        .btn {
          flex:1; padding:10px; border:none; border-radius:9px;
          font-size:13px; font-weight:600; cursor:pointer;
          transition:background .15s, transform .1s;
        }
        .btn:active { transform:scale(.98); }

        .btn-cancel {
          background:#f1f5f9; color:#475569;
        }
        .btn-cancel:hover { background:#e2e8f0; }

        .btn-log {
          background:linear-gradient(135deg,#3b6ff5,#2955d0);
          color:#fff;
          box-shadow:0 2px 8px rgba(59,111,245,.35);
        }
        .btn-log:hover { background:linear-gradient(135deg,#2955d0,#1e40af); }

        .shortcut-tip {
          text-align:center; font-size:11px; color:#94a3b8; margin-top:10px;
        }
      </style>

      <div class="backdrop" id="backdrop"></div>
      <div class="modal">
        <div class="header">
          <div class="brand-mark">JT</div>
          <div class="header-text">
            <div class="modal-title">Log Application</div>
            <div class="modal-sub">Add optional notes before saving</div>
          </div>
        </div>

        <div class="job-card">
          <div class="job-title" id="jt-title"></div>
          <div class="job-company" id="jt-company"></div>
          <span class="job-site" id="jt-site"></span>
        </div>

        <label for="jt-notes">Notes (optional)</label>
        <textarea id="jt-notes" placeholder="e.g. Referred by Jane, $140k–$160k, hybrid…"></textarea>

        <div class="actions">
          <button class="btn btn-cancel" id="jt-cancel">Cancel</button>
          <button class="btn btn-log" id="jt-confirm">✓ Log Application</button>
        </div>
        <div class="shortcut-tip">Press <strong>Enter</strong> to log · <strong>Esc</strong> to cancel</div>
      </div>
    `;

    // Populate job details
    shadow.getElementById("jt-title").textContent   = details.title;
    shadow.getElementById("jt-company").textContent = details.company;
    shadow.getElementById("jt-site").textContent    = details.jobSite;

    const notesEl  = shadow.getElementById("jt-notes");
    const backdrop = shadow.getElementById("backdrop");

    function confirm() {
      host.remove();
      sendResponse({ confirmed: true, notes: notesEl.value.trim() });
    }

    function cancel() {
      host.remove();
      sendResponse({ confirmed: false, notes: "" });
    }

    shadow.getElementById("jt-confirm").addEventListener("click", confirm);
    shadow.getElementById("jt-cancel").addEventListener("click", cancel);
    backdrop.addEventListener("click", cancel);

    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { cancel(); document.removeEventListener("keydown", handler); }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { confirm(); document.removeEventListener("keydown", handler); }
    });

    document.body.appendChild(host);
    setTimeout(() => notesEl.focus(), 50);
  }

  // ── Message listener ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "extractJobDetails") {
      try { sendResponse(extractJobDetails()); }
      catch (err) { sendResponse({ error: err.message }); }
      return true;
    }

    if (message.action === "showLogOverlay") {
      showLogOverlay(message.details, sendResponse);
      return true; // keep channel open until user confirms/cancels
    }
  });
})();
