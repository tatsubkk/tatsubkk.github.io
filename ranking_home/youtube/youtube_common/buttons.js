/* ============================================
   Pager & switchbars（HTML-base resolver）
   - Resolve meta1/meta2.json relative to the *HTML* (document.baseURI)
   - Build pager for all <nav class="pager"> and #pager
   - Highlight genre/type switchbars from URL (?genre=, ?type=)
   ============================================ */
   (async () => {
    // keep: find current <script> for reading data-attrs if provided
    const thisScript = document.currentScript || (function(){
      const list = document.getElementsByTagName('script');
      return list[list.length - 1] || null;
    })();
    if (!thisScript) {
      console.warn('[pager] currentScript not found; abort.');
      return;
    }
  
    // ★ HTML基準に変更（<base> があればそれに従う）
    const DOC_BASE = document.baseURI;
  
    // ★ data-attr で上書きできるように（未指定なら既定名）
    //    例: <script ... data-meta1="meta1.json" data-meta2="meta2.json">
    const meta2URL = new URL(thisScript.dataset.meta2 || 'meta2.json', DOC_BASE);
    const meta1URL = new URL(thisScript.dataset.meta1 || 'meta1.json', DOC_BASE);
  
    // optional: 日替わりキャッシュバスター（必要なら有効化）
    // const v = new Date().toISOString().slice(0,10);
    // meta2URL.searchParams.set('v', v);
    // meta1URL.searchParams.set('v', v);
  
    // fetch helper（content-type は警告だけ）
    async function fetchJSON(url) {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.url}`);
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('json')) {
        console.warn('[pager] Non-JSON content-type:', ct, 'from', String(url));
      }
      return res.json();
    }
  
    // load metadata
    const meta  = await fetchJSON(meta2URL);              // { total_pages, ... }
    const meta1 = await fetchJSON(meta1URL).catch(()=> ({})); // { pager: {...} } optional
  
    // derive current/total page
    const TOTAL = Math.max(1, (meta.total_pages|0) || 1);
    const url = new URL(location.href);
    let current = parseInt(url.searchParams.get('p') || '1', 10);
    if (!Number.isFinite(current) || current < 1) current = 1;
    if (current > TOTAL) current = TOTAL;
  
    // pager config
    const cfg = meta1 && meta1.pager ? meta1.pager : {};
    const maxNumsDesktop = Number.isFinite(+cfg.max_numbers) ? +cfg.max_numbers : 5;
    const maxNumsMobile  = Number.isFinite(+cfg.mobile_max_numbers) ? +cfg.mobile_max_numbers : 3;
    const MAX_NUMS = matchMedia('(max-width:520px)').matches ? maxNumsMobile : maxNumsDesktop;
    const showPrevNext  = cfg.show_prev_next  !== false; // default ON
    const showFirstLast = cfg.show_first_last !== false; // default ON
  
    // containers
    const containers = document.querySelectorAll('nav.pager, #pager');
    if (!containers.length) console.warn('[pager] no containers found');
  
    // URL builder（1ページ目は?p削除でキレイに）
    function hrefFor(n) {
      const u = new URL(location.href);
      if (n === 1) u.searchParams.delete('p'); else u.searchParams.set('p', n);
      u.hash = '';
      return u.pathname + u.search;
    }
  
    // number block with gaps
    function buildNumbers(cur, total, maxNums) {
      if (maxNums >= total) return Array.from({length: total}, (_,i)=>i+1);
      const half = Math.floor(maxNums/2);
      let left = cur - half;
      let right = cur + (maxNums - 1 - half);
      if (left < 1) { right += (1 - left); left = 1; }
      if (right > total) { left -= (right - total); right = total; }
      left = Math.max(1, left);
  
      const out = [1];
      if (left > 2) out.push('gap');
      for (let i = Math.max(2, left); i <= Math.min(total-1, right); i++) out.push(i);
      if (right < total - 1) out.push('gap');
      if (total > 1) out.push(total);
      return out;
    }
  
    // element makers
    function mkLink(label, n, {cur=false, dis=false, rel=null} = {}) {
      const a = document.createElement('a');
      a.textContent = label;
      if (dis) { a.setAttribute('aria-disabled','true'); a.tabIndex = -1; }
      else { a.href = hrefFor(n); }
      if (cur) { a.classList.add('is-current'); a.setAttribute('aria-current','page'); }
      if (rel) a.setAttribute('rel', rel);
      return a;
    }
    function mkGap() {
      const s = document.createElement('span');
      s.className = 'gap';
      s.textContent = '…';
      return s;
    }
  
    // render
    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';
  
      if (showFirstLast) container.append( mkLink('«', 1, {dis: current===1}) );
      if (showPrevNext)  container.append( mkLink('‹', Math.max(1,current-1), {dis: current===1, rel:'prev'}) );
  
      let nums = buildNumbers(current, TOTAL, Math.max(1, MAX_NUMS));
      if (!nums.length && TOTAL >= 1) nums = [1];
  
      nums.forEach(n => container.append(n === 'gap' ? mkGap() : mkLink(String(n), n, {cur: n===current})));
  
      if (showPrevNext)  container.append( mkLink('›', Math.min(TOTAL,current+1), {dis: current===TOTAL, rel:'next'}) );
      if (showFirstLast) container.append( mkLink('»', TOTAL, {dis: current===TOTAL}) );
    });
  
  })().catch(e => {
    console.error('[pager] failed:', e);
    document.querySelectorAll('nav.pager, #pager').forEach(c => {
      if (c) c.innerHTML = `<span style="color:crimson">読み込み失敗：${String(e).replace(/</g,'&lt;')}</span>`;
    });
  });
  
  /* ============================================
  Switchbar link builder + current marker (path mode, robust)
  要件:
    - data-template="/ranking_home/youtube/{genre}/{type}/"
    - .switchbar--genre 内: <a data-genre>
    - .switchbar--rtype  内: <a data-type>
  対応:
    - 先頭/末尾スラッシュの有無
    - index.html の有無
    - GitHub Pages などサブパス配信
    - 不正テンプレや未知値のフォールバック
  ============================================ */
(() => {
  const parts = location.pathname.replace(/\/+$/,'').split('/');
  const i = parts.lastIndexOf('youtube');
  const cur = {
    genre: (i !== -1 && parts[i+1]) || 'all',
    type:  (i !== -1 && parts[i+2]) || 'views'
  };

  const linkify = (nav, isGenreBar) => {
    nav.querySelectorAll('.switchbar__btn').forEach(a => {
      const g = isGenreBar ? (a.dataset.genre || cur.genre) : cur.genre;
      const t = isGenreBar ? cur.type : (a.dataset.type || cur.type);
      a.href = `../../${encodeURIComponent(g)}/${encodeURIComponent(t)}/`;
      if ((isGenreBar ? g : t) === (isGenreBar ? cur.genre : cur.type)) {
        a.classList.add('is-current');
        a.setAttribute('aria-current','page');
      }
    });
  };

  document.querySelectorAll('.switchbar--genre').forEach(nav => linkify(nav, true));
  document.querySelectorAll('.switchbar--rtype').forEach(nav => linkify(nav, false));
})();