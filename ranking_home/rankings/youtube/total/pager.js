/* ===== ページ切り替えボタン ===== */
(async () => {
  const BASE = "meta2.json"; // meta2.json の場所
  const meta = await fetch(`${BASE}/meta2.json`, {cache:"no-store"}).then(r=>r.json());

  // 総ページ数
  const TOTAL = meta.total_pages || 1;

  // 現在ページ（?p=）
  const u = new URL(location.href);
  let current = parseInt(u.searchParams.get('p') || '1', 10);
  if (!Number.isFinite(current) || current < 1) current = 1;
  if (current > TOTAL) current = TOTAL;

  // ===== ページャ設定を JSON から反映 =====
  const meta1 = await fetch(`${BASE}/meta1.json`, { cache: "no-store" })
    .then(r => r.json())
    .catch(() => ({}));

    const cfg = (meta1 && meta1.pager) ? meta1.pager : {};

    const maxNumsDesktop = Number.isFinite(+cfg.max_numbers) ? +cfg.max_numbers : 5;     // 既定: 5
    const maxNumsMobile  = Number.isFinite(+cfg.mobile_max_numbers) ? +cfg.mobile_max_numbers : 3; // 既定: 3

    const mql = matchMedia("(max-width:520px)");
    let MAX_NUMS = mql.matches ? maxNumsMobile : maxNumsDesktop;


    const showPrevNext  = cfg.show_prev_next  !== false; // 既定ON
    const showFirstLast = cfg.show_first_last !== false; // 既定ON

  const container = document.getElementById('pager');
  container.innerHTML = ""; // クリア

  // nページのURL（1ページ目は ?p を消して綺麗に）
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
    if (dis) a.style.pointerEvents = 'none', a.style.opacity = '.45';
    if (rel) a.setAttribute('rel', rel);
    return a;
  };
  const gap = () => { const s=document.createElement('span'); s.className='gap'; s.textContent='…'; return s; };

  // ===== 数字ボタンの並びを作る（省略あり） =====
  function buildNumbers(cur, total, maxNums){
    // maxNums >= total なら全部出す
    if (maxNums >= total) return Array.from({length: total}, (_,i)=>i+1);

    const half = Math.floor(maxNums/2);
    let left = cur - half;
    let right = cur + (maxNums - 1 - half);

    if (left < 1) { right += (1 - left); left = 1; }
    if (right > total) { left -= (right - total); right = total; }
    left = Math.max(1, left);

    const nums = [];
    // 先頭ブロック
    nums.push(1);
    if (left > 2) nums.push('gap');

    for (let i = Math.max(2, left); i <= Math.min(total-1, right); i++) {
      nums.push(i);
    }

    if (right < total - 1) nums.push('gap');
    if (total > 1) nums.push(total);

    return nums;
  }

  // 先頭/前
  if (showFirstLast) container.append( mk('«', 1, {dis: current===1}) );
  if (showPrevNext)  container.append( mk('‹', Math.max(1,current-1), {dis: current===1, rel:'prev'}) );

  // 数字本体
  const nums = buildNumbers(current, TOTAL, Math.max(1, MAX_NUMS));
  nums.forEach(n => {
    if (n === 'gap') container.append(gap());
    else container.append( mk(String(n), n, {cur: n===current}) );
  });

  // 次/末尾
  if (showPrevNext)  container.append( mk('›', Math.min(TOTAL,current+1), {dis: current===TOTAL, rel:'next'}) );
  if (showFirstLast) container.append( mk('»', TOTAL, {dis: current===TOTAL}) );
})();