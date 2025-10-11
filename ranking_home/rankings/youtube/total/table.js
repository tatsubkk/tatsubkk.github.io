// table-4cols.js — tables/table.N.json を読み込んで「1アイテム=1行・4列」で描画
(async () => {
  // === ページ判定 & JSON読み込み ===
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get("p") || "1", 10);
  if (!Number.isFinite(p) || p < 1) p = 1;

  const pageUrl = new URL(`tables/table.${p}.json`, document.baseURI);
  pageUrl.searchParams.set("v", new Date().toISOString().slice(0,10)); // cache-buster

  const thead = document.querySelector("#data-table thead");
  const tbody = document.querySelector("#data-table tbody");
  if (!thead || !tbody) return console.error("missing #data-table thead/tbody");

  try {
    const res = await fetch(pageUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
    const j = await res.json();
    const rows = Array.isArray(j) ? j : (j.rows ?? []);
    renderTable4cols(rows, thead, tbody);
  } catch (e) {
    console.error(e);
    thead.innerHTML = `<tr><th>Rank</th><th>Thumb</th><th>Info</th><th>Views</th></tr>`;
    tbody.innerHTML = `<tr><td colspan="4" style="color:crimson;padding:12px">読み込み失敗：${String(e).replace(/</g,"&lt;")}</td></tr>`;
  }

  // === ここから描画ロジック ===
  function renderTable4cols(rows, thead, tbody){
    thead.innerHTML = `<tr><th>Rank</th><th>Thumb</th><th>Info</th><th>Views</th></tr>`;
    tbody.innerHTML = rows.map(renderRow4cols).join("");
  }

  // --- helpers（テキストはエスケープ、サムネだけ非エスケープで埋める）---
  function esc(s){ return String(s ?? "").replace(/[&<>"]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m])); }
  function escAttr(s){ return String(s ?? "").replace(/["&<>]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m])); }
  function toDotDate(s){ return typeof s==="string" ? s.replaceAll("-", ".") : ""; }

  // テキスト用（中身は必ずエスケープ）
  function aTag({url, text, target, rel, className}){
    if (!url) return esc(text ?? "");
    const t = target ?? "_blank";
    const r = rel ?? "noopener";
    const cls = className ? ` class="${escAttr(className)}"` : "";
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${esc(text ?? url)}</a>`;
  }

  // HTML埋め込み用（サムネ専用：中身はエスケープしない！）
  function aTagHTML({url, html, target, rel, className}){
    if (!url) return html ?? "";
    const t = target ?? "_blank";
    const r = rel ?? "noopener";
    const cls = className ? ` class="${escAttr(className)}"` : "";
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${html ?? ""}</a>`;
  }

  function thumbHTML(val){
    if (!val) return "";
    if (typeof val === "string") {
      // 文字列で <img ...> or URL が来るケースにも対応
      if (/^<img[\s>]/i.test(val)) return val;
      return `<img src="${escAttr(val)}" loading="lazy" decoding="async">`;
    }
    const src = val.img || val.src; if (!src) return "";
    const w = val.w || val.width || ""; 
    const h = val.h || val.height || "";
    const img = `<img src="${escAttr(src)}" alt="${escAttr(val.alt ?? "")}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
    return val.url ? aTagHTML({ url: val.url, html: img, target: val.target, rel: val.rel, className: val.linkClass })
                   : img;
  }

  // --- 1行=4列（Rank / Thumb / Info / Views）---
  function renderRow4cols(item){
    const rank  = esc(item.rank);
    const thumb = thumbHTML(item.thumb);

    const title = aTag({ url: item.title?.url, text: item.title?.text, target: item.title?.target });
    const ch    = aTag({ url: item.channel?.url, text: item.channel?.text, target: item.channel?.target });

    const pub   = toDotDate(item.publishedAt);
    const likes = esc(item.likeCount ?? "");
    const comm  = esc(item.commentCount ?? "");
    const inc   = esc(item.increment ?? "");
    const views = esc(item.viewCount ?? "");

    // Info列まとめ（タイトル、チャンネル、各種メタ）
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
        <td class="views">${views}</td>
      </tr>
    `;
  }
})();
