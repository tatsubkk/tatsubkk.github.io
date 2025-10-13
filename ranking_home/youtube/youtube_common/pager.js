/* ============================================
   Pager & metadata loader (HTML-based resolver)
   - Resolves meta1.json / meta2.json relative to the HTML document
     (uses document.baseURI, therefore honors a <base> tag if present).
   - Loads:
       * meta2.json (required): expected to contain { total_pages, ... }.
       * meta1.json (optional): may contain { pager: { ...config } }.
   - Renders a pager into all <nav class="pager"> and the element #pager.
   - URL scheme:
       * Uses the search param "?p=" for page numbers.
       * For page 1, "?p" is removed to keep URLs clean.
   - Accessibility:
       * Current page link has aria-current="page".
       * Disabled nav items get aria-disabled="true" and tabindex="-1".
   - Networking:
       * Fetches with { cache: "no-store" }.
       * Warns if response Content-Type is not JSON.
   - Error handling:
       * Logs to console and shows a fallback error message in containers.
   ============================================ */
(async () => {
  // Keep: find current <script> to read data-attrs if provided
  const thisScript =
    document.currentScript ||
    (function () {
      const list = document.getElementsByTagName("script");
      return list[list.length - 1] || null;
    })();
  if (!thisScript) {
    console.warn("[pager] currentScript not found; abort.");
    return;
  }

  // HTML base (respects <base> if present)
  const DOC_BASE = document.baseURI;

  // Allow overriding file names via data attributes on the script tag
  // e.g. <script ... data-meta1="meta1.json" data-meta2="meta2.json">
  const meta2URL = new URL(thisScript.dataset.meta2 || "meta2.json", DOC_BASE);
  const meta1URL = new URL(thisScript.dataset.meta1 || "meta1.json", DOC_BASE);

  // Optional: daily cache buster (enable if needed)
  // const v = new Date().toISOString().slice(0, 10);
  // meta2URL.searchParams.set('v', v);
  // meta1URL.searchParams.set('v', v);

  // Fetch helper (warns on non-JSON content type)
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.url}`);
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("json")) {
      console.warn("[pager] Non-JSON content-type:", ct, "from", String(url));
    }
    return res.json();
  }

  // Load metadata
  const meta = await fetchJSON(meta2URL); // { total_pages, ... }
  const meta1 = await fetchJSON(meta1URL).catch(() => ({})); // optional { pager: {...} }

  // Derive current / total page
  const TOTAL = Math.max(1, (meta.total_pages | 0) || 1);
  const url = new URL(location.href);
  let current = parseInt(url.searchParams.get("p") || "1", 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  if (current > TOTAL) current = TOTAL;

  // Pager config
  const cfg = (meta1 && meta1.pager) ? meta1.pager : {};
  const maxNumsDesktop = Number.isFinite(+cfg.max_numbers) ? +cfg.max_numbers : 5;
  const maxNumsMobile = Number.isFinite(+cfg.mobile_max_numbers) ? +cfg.mobile_max_numbers : 3;
  const MAX_NUMS = matchMedia("(max-width:520px)").matches ? maxNumsMobile : maxNumsDesktop;
  const showPrevNext = cfg.show_prev_next !== false;   // default ON
  const showFirstLast = cfg.show_first_last !== false; // default ON

  // Containers
  const containers = document.querySelectorAll("nav.pager, #pager");
  if (!containers.length) console.warn("[pager] no containers found");

  // Build URL (remove ?p for the first page)
  function hrefFor(n) {
    const u = new URL(location.href);
    if (n === 1) u.searchParams.delete("p");
    else u.searchParams.set("p", n);
    u.hash = "";
    return u.pathname + u.search;
  }

  // Number block with gaps (…)
  function buildNumbers(cur, total, maxNums) {
    if (maxNums >= total) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(maxNums / 2);
    let left = cur - half;
    let right = cur + (maxNums - 1 - half);
    if (left < 1) { right += (1 - left); left = 1; }
    if (right > total) { left -= (right - total); right = total; }
    left = Math.max(1, left);

    const out = [1];
    if (left > 2) out.push("gap");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) out.push(i);
    if (right < total - 1) out.push("gap");
    if (total > 1) out.push(total);
    return out;
  }

  // Element makers
  function mkLink(label, n, { cur = false, dis = false, rel = null } = {}) {
    const a = document.createElement("a");
    a.textContent = label;
    if (dis) {
      a.setAttribute("aria-disabled", "true");
      a.tabIndex = -1;
    } else {
      a.href = hrefFor(n);
    }
    if (cur) {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
    }
    if (rel) a.setAttribute("rel", rel);
    return a;
  }

  function mkGap() {
    const s = document.createElement("span");
    s.className = "gap";
    s.textContent = "…";
    return s;
  }

  // Render
  containers.forEach((container) => {
    if (!container) return;
    container.innerHTML = "";

    if (showFirstLast) container.append(mkLink("«", 1, { dis: current === 1 }));
    if (showPrevNext) container.append(mkLink("‹", Math.max(1, current - 1), { dis: current === 1, rel: "prev" }));

    let nums = buildNumbers(current, TOTAL, Math.max(1, MAX_NUMS));
    if (!nums.length && TOTAL >= 1) nums = [1];

    nums.forEach((n) => container.append(n === "gap" ? mkGap() : mkLink(String(n), n, { cur: n === current })));

    if (showPrevNext) container.append(mkLink("›", Math.min(TOTAL, current + 1), { dis: current === TOTAL, rel: "next" }));
    if (showFirstLast) container.append(mkLink("»", TOTAL, { dis: current === TOTAL }));
  });
})().catch((e) => {
  console.error("[pager] failed:", e);
  document.querySelectorAll("nav.pager, #pager").forEach((c) => {
    if (c) c.innerHTML = `<span style="color:crimson">読み込み失敗：${String(e).replace(/</g, "&lt;")}</span>`;
  });
});
