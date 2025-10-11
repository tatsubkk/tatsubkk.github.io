// table.js — tables/table.N.json を読み込んで 1アイテム=4行で描画（衝突回避・TDZ回避）
(function () {
  // ===== helpers（宣言関数 & ローカル名で衝突回避）=====
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escAttr(s){ return String(s ?? '').replace(/["&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function toDotDate_(s){ return typeof s === 'string' ? s.replaceAll('-', '.') : ''; }
  function aTag({url, text, target, rel, className}) {
    if (!url) return esc(text ?? '');
    const t = target ?? '_blank';
    const r = rel ?? 'noopener';
    const cls = className ? ` class="${escAttr(className)}"` : '';
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${esc(text ?? url)}</a>`;
  }
  function thumbHTML(val){
    if (!val) return '';
    const src = val.img || val.src; if (!src) return '';
    const w = val.w || val.width || ''; const h = val.h || val.height || '';
    const img = `<img src="${escAttr(src)}" alt="${escAttr(val.alt ?? '')}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
    return val.url ? aTag({url:val.url, text:img, target:val.target, rel:val.rel, className:val.linkClass}) : img;
  }
  function renderItem4rows(item){
    const rank  = esc(item.rank);
    const thumb = thumbHTML(item.thumb);
    const title = aTag({ url:item.title?.url, text:item.title?.text, target:item.title?.target });
    const ch    = aTag({ url:item.channel?.url, text:item.channel?.text, target:item.channel?.target });

    const pub   = toDotDate_(item.publishedAt);
    const likes = esc(item.likeCount ?? '');
    const comm  = esc(item.commentCount ?? '');
    const inc   = esc(item.increment ?? '');
    const views = esc(item.viewCount ?? '');

    return `
      <tr class="r1">
        <th scope="rowgroup" class="rank" rowspan="4">${rank}</th>
        <td class="image" colspan="2">${thumb}</td>
      </tr>
      <tr class="r2">
        <td class="title" colspan="2">${title}</td>
      </tr>
      <tr class="r3">
        <td class="meta">
          <div class="channel">${ch}</div>
          ${pub ? `<div class="published">Release: ${pub}</div>` : ''}
        </td>
        <td class="stats">
          ${likes ? `<span class="chip likes">👍 ${likes}</span>` : ''}
          ${comm  ? `<span class="chip comments">💬 ${comm}</span>` : ''}
          ${inc   ? `<span class="chip increment">↗︎ ${inc}</span>` : ''}
        </td>
      </tr>
      <tr class="r4">
        <td class="views-label">Views</td>
        <td class="views">${views}</td>
      </tr>
    `;
  }

  // ===== main（defer想定。DOMできてなければ待つ）=====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once:true });
  } else {
    main();
  }

  async function main(){
    const v = new Date().toISOString().slice(0,10); // JSONキャッシュバスター
    const u = new URL(location.href);
    let p = parseInt(u.searchParams.get('p') || '1', 10);
    if (!Number.isFinite(p) || p < 1) p = 1;

    const pageUrl = new URL(`tables/table.${p}.json`, document.baseURI);
    pageUrl.searchParams.set('v', v);

    const thead = document.querySelector('#data-table thead');
    const tbody = document.querySelector('#data-table tbody');
    if (!thead || !tbody) return console.error('missing #data-table thead/tbody');

    try {
      const res = await fetch(pageUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
      const j = await res.json();
      const rows = Array.isArray(j) ? j : (j.rows ?? []);

      thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
      tbody.innerHTML = rows.map(renderItem4rows).join('');
    } catch (e) {
      console.error(e);
      thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
      tbody.innerHTML = `<tr><td colspan="3" style="color:crimson;padding:12px">読み込み失敗：${String(e).replace(/</g,'&lt;')}</td></tr>`;
    }
  }
})();
