/* ============================================ *\
   Pager (fixed-config version)
   - Loads meta.json only ({ total_pages })
\* ============================================ */

(async () => {
  // Find current <script>
  const thisScript =
    document.currentScript ||
    (() => {
      const list = document.getElementsByTagName("script");
      return list[list.length - 1] || null;
    })();
  if (!thisScript) {
    console.warn("[pager] currentScript not found; abort.");
    return;
  }

  // Base URI (respects <base>)
  const DOC_BASE = document.baseURI;

  // meta.json (required)
  const metaURL = new URL(thisScript.dataset.meta || "meta.json", DOC_BASE);

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.url}`);
    return res.json();
  }

  // ---- load metadata ----
  const meta = await fetchJSON(metaURL); // { total_pages }

  // ---- derive current / total ----
  const TOTAL = Math.max(1, (meta.total_pages | 0) || 1);
  const url = new URL(location.href);
  let current = parseInt(url.searchParams.get("p") || "1", 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  if (current > TOTAL) current = TOTAL;

  // ---- fixed pager config ----
  const MAX_NUMS = matchMedia("(max-width:520px)").matches ? 3 : 7;
  const showPrevNext = false;
  const showFirstLast = false;

  // ---- containers ----
  const containers = document.querySelectorAll("nav.pager, #pager");
  if (!containers.length) console.warn("[pager] no containers found");

  // ---- URL builder ----
  function hrefFor(n) {
    const u = new URL(location.href);
    if (n === 1) u.searchParams.delete("p");
    else u.searchParams.set("p", n);
    u.hash = "";
    return u.pathname + u.search;
  }

  // ---- number block ----
  function buildNumbers(cur, total, maxNums) {
    if (maxNums >= total)
      return Array.from({ length: total }, (_, i) => i + 1);

    const half = Math.floor(maxNums / 2);
    let left = cur - half;
    let right = cur + (maxNums - 1 - half);

    if (left < 1) { right += (1 - left); left = 1; }
    if (right > total) { left -= (right - total); right = total; }
    left = Math.max(1, left);

    const out = [1];
    if (left > 2) out.push("gap");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) {
      out.push(i);
    }
    if (right < total - 1) out.push("gap");
    if (total > 1) out.push(total);
    return out;
  }

  // ---- element makers ----
  function mkLink(label, n, { cur = false } = {}) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = hrefFor(n);
    if (cur) {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
    }
    return a;
  }

  function mkGap() {
    const s = document.createElement("span");
    s.className = "gap";
    s.textContent = "…";
    return s;
  }

  // ---- render ----
  containers.forEach((container) => {
    container.innerHTML = "";

    let nums = buildNumbers(current, TOTAL, Math.max(1, MAX_NUMS));
    if (!nums.length && TOTAL >= 1) nums = [1];

    nums.forEach((n) =>
      container.append(n === "gap" ? mkGap() : mkLink(String(n), n, { cur: n === current }))
    );
  });
})().catch((e) => {
  console.error("[pager] failed:", e);
  document.querySelectorAll("nav.pager, #pager").forEach((c) => {
    if (c) c.textContent = "ページャーの読み込みに失敗しました";
  });
});
