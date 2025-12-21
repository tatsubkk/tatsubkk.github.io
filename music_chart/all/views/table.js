/* ============================================ *\
  card-grid.js (updated for new JSON schema)
  - artist field supported
  - thumb/title/artist: {text,url,target}
\* ============================================ */

(async () => {
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get("p") || "1", 10);
  if (!Number.isFinite(p) || p < 1) p = 1;
  
  const pageUrl = new URL(`./tables/table.${p}.json`, location.href);
  
  // get date from meta.json
  const metaUrl = new URL("./meta.json", location.href);
  let v = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // fallback
  
  try {
    const metaRes = await fetch(metaUrl, { cache: "no-store" });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const metaDate = meta?.date ?? meta?.meta?.date;
      if (typeof metaDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(metaDate)) v = metaDate;
    }
  } catch (e) {
    console.warn("[meta] fetch error:", e);
  }
  
  pageUrl.searchParams.set("v", v);
  
  const grid = document.querySelector("#card-grid");
  if (!grid) {
    console.error("[card] missing #card-grid");
    return;
  }
  
  try {
    const res = await fetch(pageUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
  
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.rows ?? []);
  
    renderCards(rows, grid);
  } catch (e) {
    console.error("[card] fetch/render failed:", e);
    grid.innerHTML = `
      <div style="color:crimson;padding:12px">
        読み込み失敗：${esc(String(e))}
        </div>
    `;
  }
  
  function renderCards(rows, grid) {
    if (!rows || rows.length === 0) {
      grid.innerHTML = `<div style="padding:12px">データがありません</div>`;
      return;
    }
    grid.innerHTML = rows.map(renderCard).join("");
  }
  
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
    }[m]));
  }
  
  function escAttr(s) {
    return String(s ?? "").replace(/["&<>]/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
    }[m]));
  }
  
  // Safe text link
  function aTag({ url, text, target } = {}) {
    const label = text ?? url ?? "";
    if (!url) return esc(label);
    const t = target ?? "_blank";
    return `<a href="${escAttr(url)}" target="${escAttr(t)}" rel="noopener">${esc(label)}</a>`;
  }
  
  // Raw HTML link (for thumbnail <img>)
  function aTagHTML({ url, html, target } = {}) {
    if (!url) return html ?? "";
    const t = target ?? "_blank";
    return `<a href="${escAttr(url)}" target="${escAttr(t)}" rel="noopener">${html ?? ""}</a>`;
  }
  
  // Thumbnail builder: accepts string URL, <img...> string, or object {img/src,url,target,...}
  function thumbHTML(val) {
    if (!val) return "";
  
    if (typeof val === "string") {
      if (/^<img[\s>]/i.test(val)) return val;
      return `<img src="${escAttr(val)}" loading="lazy" decoding="async" alt="">`;
    }
  
    const src = val.img || val.src;
    if (!src) return "";
  
    const img = `<img src="${escAttr(src)}" loading="lazy" decoding="async" alt="">`;
  
    return val.url
      ? aTagHTML({ url: val.url, html: img, target: val.target })
      : img;
  }
    
  function renderArtists(artists) {
    if (!Array.isArray(artists)) return "";
  
    const parts = [];
    for (const a of artists) {
      if (!a || typeof a !== "object") continue;
  
      const text = (a.text ?? "").toString().trim();
      const url = (a.url ?? "").toString().trim();
      const target = (a.target ?? "_blank").toString().trim();
  
      if (!text) continue;

      parts.push(url ? aTag({ url, text, target }) : esc(text));
    }
  
    return parts.join('<span class="sep">, </span>');
  }
  
  function renderCard(item) {
    const rank  = esc(item.rank);
    const thumb = thumbHTML(item.thumb);
  
    const title = aTag({
      url: item.title?.url,
      text: item.title?.text,
      target: item.title?.target
    });
  
    const artistHTML = renderArtists(item.artist);
  
    const viewcount = esc(item.viewcount ?? "");
    const increment_d = esc(item.increment_d ?? "");
  
    return `
      <article class="card">
        <div class="rank">#${rank}</div>
        <div class="thumb">${thumb}</div>
        <div class="title">${title}</div>
        <div class="artist">${artistHTML}</div>
        <div class="metric">${viewcount}</div>
        <div class="sub">(+${increment_d})</div>
      </article>
    `;
  }
})();
  