/* ===== ページ切り替えボタン（script基準で安全版） ===== */
(async () => {
  // ★ このJSファイル(pager.js)が置かれているディレクトリを基準にする
  const SCRIPT_BASE = new URL('.', document.currentScript.src);

  // これで “二重meta2.json” は絶対に起きない
  const meta2URL = new URL('meta2.json', SCRIPT_BASE);
  const meta1URL = new URL('meta1.json', SCRIPT_BASE);

  // ---- 取得（404や非JSONをガード）----
  const meta2Res = await fetch(meta2URL, { cache: 'no-store' });
  if (!meta2Res.ok) throw new Error(`HTTP ${meta2Res.status} ${meta2Res.url}`);
  const ct2 = meta2Res.headers.get('content-type') || '';
  if (!ct2.includes('application/json')) throw new Error(`Not JSON: ${meta2Res.url}`);
  const meta = await meta2Res.json();

  const meta1Res = await fetch(meta1URL, { cache: 'no-store' });
  if (!meta1Res.ok) throw new Error(`HTTP ${meta1Res.status} ${meta1Res.url}`);
  const ct1 = meta1Res.headers.get('content-type') || '';
  if (!ct1.includes('application/json')) throw new Error(`Not JSON: ${meta1Res.url}`);
  const meta1 = await meta1Res.json();

  // ---- 総ページ数＆現在ページ ----
  const TOTAL = Math.max(1, meta.total_pages | 0);

  const u = new URL(location.href);
  let current = parseInt(u.searchParams.get('p') || '1', 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  if (current > TOTAL) current = TOTAL;

  // ---- ページャ設定（meta1.jsonのpager）----
  const cfg = meta1?.pager ?? {};
  const maxNumsDesktop = Number.isFinite(+cfg.max_numbers) ? +cfg.max_numbers : 5;
  const maxNumsMobile  = Number.isFinite(+cfg.mobile_max_numbers) ? +cfg.mobile_max_numbers : 3;
  const MAX_NUMS = matchMedia('(max-width:520px)').matches ? maxNumsMobile : maxNumsDesktop;
  const showPrevNext  = cfg.show_prev_next  !== false;
  const showFirstLast = cfg.show_first_last !== false;

  // ---- DOM描画（.pager を全部描くのが吉。id固定ならそのままでもOK）----
  const containers = document.querySelectorAll('nav.pager, #pager');
  containers.forEach(container => {
    if (!container) return;
    container.innerHTML = '';

    const hrefFor = (n) => {
      const u = new URL(location.href);
      if (n === 1) u.searchParams.delete('p'); else u.searchParams.set('p', n);
      u.hash = '';
      return u.pathname + u.search;
    };
    const mk = (label, n, {cur=false, dis=false, rel=null}={}) => {
      const a = document.createElement('a');
      a.textContent = label;
      a.href = dis ? 'javascript:void(0)' : hrefFor(n);
      if (cur) { a.classList.add('is-current'); a.setAttribute('aria-current','page'); }
      if (dis) { a.style.pointerEvents = 'none'; a.style.opacity = '.45'; }
      if (rel) a.setAttribute('rel', rel);
      return a;
    };
    const gap = () => { const s=document.createElement('span'); s.className='gap'; s.textContent='…'; return s; };

    function buildNumbers(cur, total, maxNums){
      if (maxNums >= total) return Array.from({length: total}, (_,i)=>i+1);
      const half = Math.floor(maxNums/2);
      let left = cur - half;
      let right = cur + (maxNums - 1 - half);
      if (left < 1) { right += (1 - left); left = 1; }
      if (right > total) { left -= (right - total); right = total; }
      left = Math.max(1, left);

      const nums = [1];
      if (left > 2) nums.push('gap');
      for (let i = Math.max(2, left); i <= Math.min(total-1, right); i++) nums.push(i);
      if (right < total - 1) nums.push('gap');
      if (total > 1) nums.push(total);
      return nums;
    }

    if (showFirstLast) container.append( mk('«', 1, {dis: current===1}) );
    if (showPrevNext)  container.append( mk('‹', Math.max(1,current-1), {dis: current===1, rel:'prev'}) );

    const nums = buildNumbers(current, TOTAL, Math.max(1, MAX_NUMS));
    nums.forEach(n => container.append(n === 'gap' ? gap() : mk(String(n), n, {cur: n===current})));

    if (showPrevNext)  container.append( mk('›', Math.min(TOTAL,current+1), {dis: current===TOTAL, rel:'next'}) );
    if (showFirstLast) container.append( mk('»', TOTAL, {dis: current===TOTAL}) );
  });
})().catch(e => {
  console.error('[pager] failed:', e);
  const c = document.getElementById('pager');
  if (c) c.innerHTML = `<span style="color:crimson">読み込み失敗：${String(e).replace(/</g,'&lt;')}</span>`;
});
