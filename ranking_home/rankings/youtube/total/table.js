/* ===== pagenation, table埋め ===== */
(async () => {
  const vClient = new Date().toISOString().slice(0,10);

  // ---- 設定ロード（同階層） ----
  const m1Url = new URL('meta1.json', document.baseURI); m1Url.searchParams.set('v', vClient);
  const m2Url = new URL('meta2.json', document.baseURI); m2Url.searchParams.set('v', vClient);

  const [m1Res, m2Res] = await Promise.all([
    fetch(m1Url, {cache:'no-store'}), fetch(m2Url, {cache:'no-store'})
  ]);
  if (!m1Res.ok) throw new Error('meta1.json '+m1Res.status);
  if (!m2Res.ok) throw new Error('meta2.json '+m2Res.status);

  const meta1 = await m1Res.json();
  const meta2 = await m2Res.json();

  const TOTAL = Math.max(1, Number(meta2.total_pages || 1));
  const ver   = encodeURIComponent(meta1.build || vClient); // キャッシュバスター統一

  // ---- 現在ページ（?p=、1始まり） ----
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get('p') || '1', 10);
  if (!Number.isFinite(p) || p < 1) p = 1;
  if (p > TOTAL) p = TOTAL;

  // ---- ページャ描画（上下 .pager に同じ内容を配る）----
  const cfg = meta1.pager || {};
  const maxNums = (matchMedia('(max-width:520px)').matches ? cfg.mobile_max_numbers : cfg.max_numbers) || 5;
  const pagerHTML = renderPager({
    current: p, total: TOTAL, maxNums,
    showPrevNext: cfg.show_prev_next !== false,
    showFirstLast: cfg.show_first_last !== false,
    param: 'p'
  });
  document.querySelectorAll('.pager').forEach(el => el.innerHTML = pagerHTML);

  // ---- Nページ目のデータを取得 ----
  const TABLE_DIR = 'tables/'; // ← ここでフォルダを指定
  const pageUrl = new URL(`${TABLE_DIR}table.${p}.json`, document.baseURI);
  pageUrl.searchParams.set('v', ver);

  const pageRes = await fetch(pageUrl, {cache:'no-store'});
  if (!pageRes.ok) throw new Error(`${pageUrl.pathname} ${pageRes.status}`);

  const { rows = [] } = await pageRes.json();

  // ---- テーブル描画：thead + 4行レイアウト tbody ----
  const thead = document.querySelector('#data-table thead');
  const tbody = document.querySelector('#data-table tbody');

  thead.innerHTML = `<tr><th>Rank</th><th colspan="2">Info</th></tr>`;
  tbody.innerHTML = rows.map(renderItem4rows).join('');

  // ========= Helper =========
  function renderItem4rows(item){
    const rank   = esc(item.rank);
    const thumb  = cellThumb(item.thumb);
    const title  = cellLinkOrText(item.title);
    const ch     = cellLinkOrText(item.channel);
    const likes  = num(item.likes);
    const comm   = num(item.comments);
    const views  = num(item.views);

    // 1: rank(rowspan=4) + thumb（横2セル）
    // 2: title（横2セル）
    // 3: channel | likes & comments
    // 4: "Views" | views
    return `
      <tr class="r1">
        <th scope="rowgroup" class="rank" rowspan="4">${rank}</th>
        <td class="image" colspan="2">${thumb}</td>
      </tr>
      <tr class="r2">
        <td class="title" colspan="2">${title}</td>
      </tr>
      <tr class="r3">
        <td class="channel">${ch}</td>
        <td class="stats">
          <span class="likes">👍 ${likes}</span>
          <span class="comments" style="margin-left:.8em;">💬 ${comm}</span>
        </td>
      </tr>
      <tr class="r4">
        <td class="views-label">Views</td>
        <td class="views">${views}</td>
      </tr>
    `;
  }

  function renderPager({ current, total, maxNums, showPrevNext, showFirstLast, param }) {
    const href = (n)=>{ const u=new URL(location.href); if(n===1) u.searchParams.delete(param); else u.searchParams.set(param, n); u.hash=''; return u.pathname+u.search; };
    const gap = `<span class="gap">…</span>`;
    const mk  = (lbl,n,opt={})=>{
      const dis = opt.dis? ' style="pointer-events:none;opacity:.5"' : '';
      const cur = opt.cur? ' class="is-current" aria-current="page"' : '';
      const rel = opt.rel? ` rel="${opt.rel}"` : '';
      const h   = opt.dis ? 'javascript:void(0)' : href(n);
      return `<a href="${h}"${cur}${dis}${rel} data-page="${n}">${lbl}</a>`;
    };
    const nums = buildNums(current,total,Math.max(1,maxNums));
    return [
      showFirstLast ? mk('«',1,{dis:current===1}) : '',
      showPrevNext  ? mk('‹',Math.max(1,current-1),{dis:current===1,rel:'prev'}) : '',
      ...nums.map(n => n==='gap' ? gap : mk(String(n), n, {cur:n===current})),
      showPrevNext  ? mk('›',Math.min(total,current+1),{dis:current===total,rel:'next'}) : '',
      showFirstLast ? mk('»',total,{dis:current===total}) : ''
    ].join('');
  }

  function buildNums(cur,total,max){
    if (max>=total) return Array.from({length:total},(_,i)=>i+1);
    const half=Math.floor(max/2); let L=cur-half, R=cur+(max-1-half);
    if (L<1){R+=1-L;L=1;} if (R>total){L-=R-total;R=total;} L=Math.max(1,L);
    const arr=[1]; if(L>2)arr.push('gap'); for(let i=Math.max(2,L); i<=Math.min(total-1,R); i++) arr.push(i);
    if (R<total-1) arr.push('gap'); if (total>1) arr.push(total); return arr;
  }

  // ---- セル用ユーティリティ ----
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escAttr(s){ return String(s ?? '').replace(/["&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function num(v){ return (typeof v==='number') ? v.toLocaleString('ja-JP') : esc(v ?? ''); }

  function cellLinkOrText(val){
    if (val == null) return '';
    if (typeof val === 'string') return esc(val);
    if (val.url && val.text) return `<a href="${escAttr(val.url)}" target="_blank" rel="noopener">${esc(val.text)}</a>`;
    if (Array.isArray(val)) return val.map(cellLinkOrText).join('<br>');
    if (val.text != null) return esc(String(val.text));
    return esc(String(val));
  }

  function cellThumb(val){
    if (!val) return '';
    const src = val.img || val.src; if(!src) return '';
    const alt = escAttr(val.alt || '');
    const w = val.w || val.width || ''; const h = val.h || val.height || '';
    const img = `<img src="${escAttr(src)}" alt="${alt}"${w?` width="${w}"`:''}${h?` height="${h}"`:''} loading="lazy" decoding="async">`;
    return val.url ? `<a href="${escAttr(val.url)}" target="_blank" rel="noopener">${img}</a>` : img;
  }
})().catch(e => console.error(e));