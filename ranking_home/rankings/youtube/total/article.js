/* ===== jsonの内容ぶち込み（） ===== */
(async () => {
  // 1) キャッシュバスター（日替わりで十分）
  const v = new Date().toISOString().slice(0,10);

  // 2) このHTMLからの相対でURLを作る（安全）
  const metaUrl  = new URL('meta.json',  document.baseURI);  metaUrl.searchParams.set('v', v);
  const entryUrl = new URL('entry.json', document.baseURI); entryUrl.searchParams.set('v', v);

  try {
    // 3) 並列で取得してJSON化
    const [metaRes, entryRes] = await Promise.all([
      fetch(metaUrl,  { cache: 'no-store' }),
      fetch(entryUrl, { cache: 'no-store' })
    ]);
    if (!metaRes.ok)  throw new Error(`meta.json ${metaRes.status} ${metaUrl}`);
    if (!entryRes.ok) throw new Error(`entry.json ${entryRes.status} ${entryUrl}`);

    const [meta, entry] = await Promise.all([metaRes.json(), entryRes.json()]);

    // 4) data-from（meta/entry）と data-bind（キー）に従って流し込み
    const SRC = { meta, entry };
    const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o); // "a.b.c" を辿る

    for (const el of document.querySelectorAll('[data-from][data-bind]')) {
      const from = el.dataset.from;        // 'meta' or 'entry'
      const key  = el.dataset.bind;        // 例: 'date' / 'title' / 'explain'
      const src  = SRC[from];
      if (!src) continue;

      const val = get(src, key);
      if (val == null) continue;           // 無ければプレースホルダ（初期テキスト）を残す

      // 属性に入れたいときは data-attr="href" 等を足す。今回はテキストでOK
      const attr = el.dataset.attr;
      if (attr) el.setAttribute(attr, String(val));
      else      el.textContent = String(val);
    }
  } catch (err) {
    console.error('bind failed:', err);
  }
})();

/* ===== jsonの内容ぶち込み（table、pager） ===== */
(async () => {
  // 1) meta.json を取得（v=でキャッシュ更新）
  const vClient = new Date().toISOString().slice(0,10);
  const metaUrl = new URL('meta.json', document.baseURI); metaUrl.searchParams.set('v', vClient);

  const metaRes = await fetch(metaUrl, {cache:'no-store'});
  if (!metaRes.ok) throw new Error(`meta.json ${metaRes.status}`);
  const meta = await metaRes.json();

  // 2) 現在ページを決定（?p=、1始まり＆範囲内に丸め）
  const u = new URL(location.href);
  let p = parseInt(u.searchParams.get('p') || '1', 10);
  const TOTAL = meta.total_pages || 1;
  if (!Number.isFinite(p) || p < 1) p = 1;
  if (p > TOTAL) p = TOTAL;

  // 3) ページ JSON を取得（table.N.json）
  const ver = encodeURIComponent(meta.build || vClient);
  const pageUrl = new URL(`table.${p}.json`, document.baseURI); pageUrl.searchParams.set('v', ver);

  const pageRes = await fetch(pageUrl, {cache:'no-store'});
  if (!pageRes.ok) throw new Error(`table.${p}.json ${pageRes.status}`);
  const page = await pageRes.json();
  const rows = page.rows || [];

  // 4) テーブル描画
  const thead = document.querySelector('#data-table thead');
  const tbody = document.querySelector('#data-table tbody');
  thead.innerHTML = `<tr>${(meta.columns||[]).map(c=>`<th class="${c.align||''}">${esc(c.label)}</th>`).join('')}</tr>`;
  tbody.innerHTML = rows.map(r =>
    `<tr>${meta.columns.map(c=>{
      const val = r[c.key];
      return `<td class="${c.align||''}">${esc(fmt(val,c))}</td>`;
    }).join('')}</tr>`
  ).join('');

  // 5) 上下ページャ描画（数は meta.pager で制御）
  const cfg = meta.pager || {};
  const maxNums = (matchMedia('(max-width:520px)').matches ? cfg.mobile_max_numbers : cfg.max_numbers) || 5;
  const pagerHTML = renderPager({ current:p, total:TOTAL, maxNums,
                                  showPrevNext: cfg.show_prev_next !== false,
                                  showFirstLast: cfg.show_first_last !== false });

  document.querySelectorAll('.pager').forEach(el => el.innerHTML = pagerHTML);

  // ===== Helper =====
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function fmt(v,c){ if(v==null) return ''; if(typeof v==='number') return v.toLocaleString('ja-JP'); return String(v); }

  function renderPager({current,total,maxNums,showPrevNext,showFirstLast}){
    const href = (n)=>{ const u=new URL(location.href); if(n===1) u.searchParams.delete('p'); else u.searchParams.set('p',n); u.hash=''; return u.pathname+u.search; };
    const gap = `<span class="gap">…</span>`;
    const mk  = (lbl,n,opt={}) => {
      const dis = opt.dis? ' style="pointer-events:none;opacity:.5"' : '';
      const cur = opt.cur? ' class="is-current" aria-current="page"' : '';
      const rel = opt.rel? ` rel="${opt.rel}"` : '';
      const h   = opt.dis ? 'javascript:void(0)' : href(n);
      return `<a href="${h}"${cur}${dis}${rel}>${lbl}</a>`;
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
    if (max >= total) return Array.from({length: total}, (_,i)=>i+1);
    const half = Math.floor(max/2);
    let L = cur - half, R = cur + (max - 1 - half);
    if (L < 1){ R += 1 - L; L = 1; }
    if (R > total){ L -= R - total; R = total; }
    L = Math.max(1, L);
    const arr = [1];
    if (L > 2) arr.push('gap');
    for (let i=Math.max(2,L); i<=Math.min(total-1,R); i++) arr.push(i);
    if (R < total-1) arr.push('gap');
    if (total > 1) arr.push(total);
    return arr;
  }
})().catch(e => console.error(e));
