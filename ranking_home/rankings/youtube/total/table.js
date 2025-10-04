// table.js — TDZ回避版
(async () => {
  const v = new Date().toISOString().slice(0,10);
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get('p') || '1', 10);
  if (!Number.isFinite(p) || p < 1) p = 1;

  // ===== helpers（先に宣言）=====
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escAttr(s){ return String(s ?? '').replace(/["&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function toDotDate(s){ return typeof s==='string' ? s.replace(/-/g, '.') : ''; }

  function aTag({url, text, target, rel, className}) {
    if (!url) return esc(text ?? '');
    const t = target ?? '_blank', r = rel ?? 'noopener';
    const cls = className ? ` class="${escAttr(className)}"` : '';
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${esc(text ?? url)}</a>`;
  }
  function thumbHTML(val){
    if (!val) return '';
    const src = val.img || val.src; if (!src) return '';
    const w = val.w || val.width || '', h = val.h || val.height || '';
    const img = `<img src="${escAttr(src)}" alt="${escAttr(val.alt ?? '')}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
    return val.url ? aTag({url:val.url, text:img, target:val.target, rel:val.rel, className:val.linkClass}) : img;
  }
  function renderItem4rows(item){
    const rank  = esc(item.rank);
    const thumb = thumbHTML(item.thumb);
    const title = aTag({ url:item.title?.url, text:item.title?.text, target:item.title?.target });
    const ch    = aTag({ url:item.channel?.url, text:item.channel?.text, target:item.channel?.target });
    const rel   = toDotDate(item.release);
    const likes = esc(item.likes ?? ''), comm = esc(item.comments ?? ''), inc = esc(item.increment ?? ''), views = esc(item.views ?? '');
    return `
      <tr class="r1"><th scope="rowgroup" class="rank" rowspan="4">${rank}</th><td class="image" colspan="2">${thumb}</td></tr>
      <tr class="r2"><td class="title" colspan="2">${title}</td></tr>
      <tr class="r3">
        <td class="meta"><div class="channel">${ch}</div>${rel?`<div class="release">Release: ${rel}</div>`:''}</td>
        <td class="stats">
          ${likes?`<span class="chip likes">👍 ${likes}</span>`:''}
          ${comm ?`<span class="chip comments">💬 ${comm}</span>`:''}
          ${inc  ?`<span class="chip increment">↗︎ ${inc}</span>`:''}
        </td>
      </tr>
      <tr class="r4"><td class="views-label">Views</td><td class="views">${views}</td></tr>
    `;
  }

  // ===== fetch & render =====
  const pageUrl = new URL(`tables/table.${p}.json`, document.baseURI); pageUrl.searchParams.set('v', v);
  const thead = document.querySelector('#data-table thead'); const tbody = document.querySelector('#data-table tbody');
  try{
    const res = await fetch(pageUrl, {cache:'no-store'}); if(!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
    const { rows=[] } = await res.json();
    thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
    tbody.innerHTML = rows.map(renderItem4rows).join('');
  }catch(e){
    console.error(e);
    thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
    tbody.innerHTML = `<tr><td colspan="3" style="color:crimson;padding:12px">読み込み失敗：${esc(String(e))}</td></tr>`;
  }
})();
