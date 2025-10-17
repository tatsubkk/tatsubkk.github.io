/* ============================================
   table-4cols.js
   Render 1 row / 4 columns from tables/table.{p}.json
   Columns: Rank | Thumb | Info | Views
   - Page is taken from ?p= (default 1)
   - Daily cache-buster (?v=YYYY-MM-DD)
   - Text is escaped; thumbnail HTML only is injected as raw HTML
   ============================================ */
   (async () => {
    /* ---------- resolve page & build URL ---------- */
    const u = new URL(location.href);
    let p = parseInt(u.searchParams.get("p") || "1", 10);
    if (!Number.isFinite(p) || p < 1) p = 1;
  
    const pageUrl = new URL(`tables/table.${p}.json`, document.baseURI);
    pageUrl.searchParams.set("v", new Date().toISOString().slice(0, 10)); // cache-buster (daily)
  
    /* ---------- grab table roots ---------- */
    const thead = document.querySelector("#data-table thead");
    const tbody = document.querySelector("#data-table tbody");
    if (!thead || !tbody) {
      console.error("[table] missing #data-table thead/tbody");
      return;
    }
  
    /* ---------- fetch & render ---------- */
    try {
      const res = await fetch(pageUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
  
      // allow either {rows:[...]} or a plain array
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.rows ?? []);
  
      renderTable4cols(rows, thead, tbody);
    } catch (e) {
      console.error("[table] fetch/render failed:", e);
      thead.innerHTML = `<tr><th>Rank</th><th>Thumb</th><th>Info</th><th>Likes</th></tr>`;
      tbody.innerHTML = `<tr><td colspan="4" style="color:crimson;padding:12px">読み込み失敗：${String(e).replace(/</g,"&lt;")}</td></tr>`;
    }
  
    /* ============================================
       render: header + body
       ============================================ */
    function renderTable4cols(rows, thead, tbody) {
      thead.innerHTML = `<tr><th>Rank</th><th>Thumb</th><th>Info</th><th>Likes</th></tr>`;
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:12px">データがありません</td></tr>`;
        return;
      }
      tbody.innerHTML = rows.map(renderRow4cols).join("");
    }
  
    /* ============================================
       helpers: escaping & HTML builders
       - esc/escAttr: escape user-visible text and attributes
       - aTag: safe text link (escaped)
       - aTagHTML: raw HTML link (for thumbnails only)
       ============================================ */
    function esc(s){
      return String(s ?? "").replace(/[&<>"]/g, m => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;"
      }[m]));
    }
    function escAttr(s){
      return String(s ?? "").replace(/["&<>]/g, m => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;"
      }[m]));
    }
    function toDotDate(s){
      return typeof s === "string" ? s.replaceAll("-", ".") : "";
    }
  
    // Safe text link
    function aTag({url, text, target, rel, className} = {}){
      if (!url) return esc(text ?? "");
      const t = target ?? "_blank";
      const r = rel ?? "noopener";
      const cls = className ? ` class="${escAttr(className)}"` : "";
      return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${esc(text ?? url)}</a>`;
    }
  
    // Raw HTML link (only for controlled HTML like <img>)
    function aTagHTML({url, html, target, rel, className} = {}){
      if (!url) return html ?? "";
      const t = target ?? "_blank";
      const r = rel ?? "noopener";
      const cls = className ? ` class="${escAttr(className)}"` : "";
      return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${html ?? ""}</a>`;
    }
  
    // Thumbnail builder (accepts string URL, <img...> string, or object)
    function thumbHTML(val){
      if (!val) return "";
      if (typeof val === "string") {
        // if "<img ...>" string is provided, trust it (controlled source)
        if (/^<img[\s>]/i.test(val)) return val;
        return `<img src="${escAttr(val)}" loading="lazy" decoding="async" alt="">`;
      }
      const src = val.img || val.src;
      if (!src) return "";
      const w = val.w || val.width || "";
      const h = val.h || val.height || "";
      const img = `<img src="${escAttr(src)}" alt="${escAttr(val.alt ?? "")}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
      return val.url
        ? aTagHTML({ url: val.url, html: img, target: val.target, rel: val.rel, className: val.linkClass })
        : img;
    }
  
    /* ============================================
       per-row renderer (Rank / Thumb / Info / Views)
       ============================================ */
    function renderRow4cols(item){
      const rank  = esc(item.rank);
      const thumb = thumbHTML(item.thumb);
  
      const title = aTag({
        url: item.title?.url,
        text: item.title?.text,
        target: item.title?.target
      });
      const ch = aTag({
        url: item.channel?.url,
        text: item.channel?.text,
        target: item.channel?.target
      });
  
      const pub   = toDotDate(item.publishedAt);
      const likes = esc(item.likeCount ?? "");
      const comm  = esc(item.commentCount ?? "");
      const inc   = esc(item.increment ?? "");
      const views = esc(item.viewCount ?? "");
  
      const infoHTML = `
        <div class="title">${title}</div>
        <div class="channel">${ch}</div>
        <div class="meta">
          ${pub   ? `<span class="published">Release: ${pub}</span>` : ""}
          ${likes ? `<span class="chip likes">👍 ${likes}</span>` : ""}
          ${comm  ? `<span class="chip comments">💬 ${comm}</span>` : ""}
          ${inc   ? `<span class="chip increment">↗︎ ${inc}</span>` : ""}
        </div>
      `;
  
      return `
        <tr>
          <th class="rank" scope="row">${rank}</th>
          <td class="thumb">${thumb}</td>
          <td class="info">${infoHTML}</td>
          <td class="highlight">${views}</td>
        </tr>
      `;
    }
  })();
  