// table.js — tables/table.N.json を読み込んで 1アイテム=4行で描画
(async () => {
  const v = new Date().toISOString().slice(0,10); // キャッシュバスター
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
    const { rows = [] } = await res.json();

    // 見出し（Rank＋Info）
    thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;

    // 中身（1アイテム=4行）
    tbody.innerHTML = rows.map(renderItem4rows).join('');
  } catch (e) {
    console.error(e);
    thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
    tbody.innerHTML = `<tr><td colspan="3" style="color:crimson;padding:12px">読み込み失敗：${String(e).replace(/</g,'&lt;')}</td></tr>`;
  }

  // ===== helper =====
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escAttr(s){ return String(s ?? '').replace(/["&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  const toDotDate = s => typeof s==='string' ? s.replaceAll('-', '.') : '';

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
    return val.url ? aTag({url:val.url, text:img, target:val.target, rel:val.rel, className:val.linkClass})
                   : img;
  }

  function renderItem4rows(item){
    const rank  = esc(item.rank);
    const thumb = thumbHTML(item.thumb);
    const title = aTag({ url:item.title?.url, text:item.title?.text, target:item.title?.target });
    const ch    = aTag({ url:item.channel?.url, text:item.channel?.text, target:item.channel?.target });

    // 文字列のまま扱う（"9億3987万" 等を崩さない）
    const views = esc(item.views ?? '');
    const likes = esc(item.likes ?? '');
    const comm  = esc(item.comments ?? '');
    const inc   = esc(item.increment ?? '');
    const rel   = toDotDate(item.release);

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
          ${rel ? `<div class="release">Release: ${rel}</div>` : ''}
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
})();
