// table.js — ゼロから書き直し版（4分割 & レイアウト切替）
(async () => {
  // ===== 設定 =====
  const MODE = "rows4"; // "rows4" | "cols4" | "cards"
  const JSON_DIR = "tables"; // JSON置き場
  const v = new Date().toISOString().slice(0,10); // キャッシュバスター

  // ===== 小物（安全 & 画像は非エスケープ） =====
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escAttr(s){ return String(s ?? '').replace(/["&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function toDotDate(s){ return typeof s==='string' ? s.replaceAll('-', '.') : ''; }

  function aTag({ url, text, target, rel, className }) { // テキスト用（エスケープする）
    if (!url) return esc(text ?? '');
    const t = target ?? '_blank', r = rel ?? 'noopener';
    const cls = className ? ` class="${escAttr(className)}"` : '';
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${esc(text ?? url)}</a>`;
  }
  function aTagHTML({ url, html, target, rel, className }) { // HTML用（エスケしない）
    if (!url) return html ?? '';
    const t = target ?? '_blank', r = rel ?? 'noopener';
    const cls = className ? ` class="${escAttr(className)}"` : '';
    return `<a href="${escAttr(url)}"${cls} target="${escAttr(t)}" rel="${escAttr(r)}">${html ?? ''}</a>`;
  }
  function thumbHTML(val){
    if (!val) return '';
    if (typeof val === 'string') {
      if (/^<img[\s>]/i.test(val)) return val; // 既に<img>ならそのまま
      return `<img src="${escAttr(val)}" loading="lazy" decoding="async">`;
    }
    const src = val.img || val.src; if (!src) return '';
    const w = val.w || val.width || ''; const h = val.h || val.height || '';
    const img = `<img src="${escAttr(src)}" alt="${escAttr(val.alt ?? '')}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
    return val.url ? aTagHTML({ url: val.url, html: img, target: val.target, rel: val.rel, className: val.linkClass }) : img;
  }

  // ===== データ取得（?p=） =====
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get('p') || '1', 10);
  if (!Number.isFinite(p) || p < 1) p = 1;

  const pageUrl = new URL(`${JSON_DIR}/table.${p}.json`, document.baseURI);
  pageUrl.searchParams.set('v', v);

  let rows;
  try {
    const res = await fetch(pageUrl, { cache:'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${pageUrl.href}`);
    const j = await res.json();
    rows = Array.isArray(j) ? j : (j.rows ?? []);
  } catch (e) {
    console.error(e);
    const thead = document.querySelector('#data-table thead') || document.querySelector('#data-table')?.createTHead();
    const tbody = document.querySelector('#data-table tbody') || document.querySelector('#data-table')?.createTBody();
    if (thead) thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="color:crimson;padding:12px">読み込み失敗：${String(e).replace(/</g,'&lt;')}</td></tr>`;
    return;
  }

  // ===== レンダラ：4分割パーツを生成 =====
  function parts(item){
    // 1) Rank
    const rank = esc(item.rank);

    // 2) Thumb（画像はエスケしない）
    const thumb = thumbHTML(item.thumb);

    // 3) 情報ブロック（title / channel / publishedAt / like/comment/increment）
    const title = aTag({ url:item.title?.url, text:item.title?.text, target:item.title?.target });
    const ch    = aTag({ url:item.channel?.url, text:item.channel?.text, target:item.channel?.target });
    const pub   = toDotDate(item.publishedAt);
    const likes = esc(item.likeCount ?? '');
    const comm  = esc(item.commentCount ?? '');
    const inc   = esc(item.increment ?? '');

    const info = `
      <div class="info">
        <div class="title">${title}</div>
        <div class="channel">${ch}</div>
        ${pub ? `<div class="published">Release: ${pub}</div>` : ''}
        <div class="stats">
          ${likes ? `<span class="chip likes">👍 ${likes}</span>` : ''}
          ${comm  ? `<span class="chip comments">💬 ${comm}</span>` : ''}
          ${inc   ? `<span class="chip increment">↗︎ ${inc}</span>` : ''}
        </div>
      </div>
    `;

    // 4) ViewCount
    const views = esc(item.viewCount ?? '');

    return { rank, thumb, info, views };
  }

  // ===== レイアウト：rows4（1アイテム=4行, 既存テーブル） =====
  function renderRows4(data){
    const table = document.getElementById('data-table');
    const thead = table.tHead || table.createTHead();
    const tbody = table.tBodies[0] || table.createTBody();

    thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
    tbody.innerHTML = data.map(item => {
      const {rank, thumb, info, views} = parts(item);
      return `
        <tr class="r1">
          <th scope="rowgroup" class="rank" rowspan="4">${rank}</th>
          <td class="image" colspan="2">${thumb}</td>
        </tr>
        <tr class="r2">
          <td class="title" colspan="2">${/class="title"/.test(info)? info.replace(/^<div class="info">|<\/div>$/g,'') : info}</td>
        </tr>
        <tr class="r3">
          <td class="meta" colspan="2">${info}</td>
        </tr>
        <tr class="r4">
          <td class="views-label">Views</td>
          <td class="views">${views}</td>
        </tr>
      `;
    }).join('');
  }

  // ===== レイアウト：cols4（1アイテム=1行×4列） =====
  function renderCols4(data){
    const table = document.getElementById('data-table');
    const thead = table.tHead || table.createTHead();
    const tbody = table.tBodies[0] || table.createTBody();

    thead.innerHTML = `<tr><th>Rank</th><th>Thumb</th><th>Info</th><th>Views</th></tr>`;
    tbody.innerHTML = data.map(item => {
      const {rank, thumb, info, views} = parts(item);
      return `
        <tr class="row">
          <th class="rank">${rank}</th>
          <td class="image">${thumb}</td>
          <td class="info">${info}</td>
          <td class="views">${views}</td>
        </tr>
      `;
    }).join('');
  }

  // ===== レイアウト：cards（テーブル使わずカード）※任意 =====
  function renderCards(data){
    // #data-table を空にして、その直後にグリッドを作る
    const table = document.getElementById('data-table');
    table.innerHTML = '';
    const grid = document.createElement('div');
    grid.id = 'cards';
    grid.className = 'cards';
    table.parentNode.insertBefore(grid, table);

    grid.innerHTML = data.map(item => {
      const {rank, thumb, info, views} = parts(item);
      return `
        <article class="card">
          <div class="card__rank">#${rank}</div>
          <div class="card__thumb">${thumb}</div>
          <div class="card__body">${info}</div>
          <div class="card__views"><span>Views</span> ${views}</div>
        </article>
      `;
    }).join('');
  }

  // ===== 実行 =====
  if (MODE === 'rows4') renderRows4(rows);
  else if (MODE === 'cols4') renderCols4(rows);
  else renderCards(rows);
})();
