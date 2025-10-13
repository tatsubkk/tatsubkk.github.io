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
  // ===== 設定 =====
  const GENRES = [
    { key: "all",      label: "全て" },
    { key: "vocaloid", label: "ボカロ" },
    { key: "kpop",     label: "K-pop" },
    { key: "anime",    label: "アニメ主題歌" },
  ];
  const TYPES = [
    { key: "views",   label: "歴代再生回数" },
    { key: "likes",   label: "いいね数" },
    { key: "comments",label: "コメント数" },
    { key: "daily",   label: "デイリー" },
    { key: "weekly",  label: "ウィークリー" },
    { key: "monthly", label: "マンスリー" },
  ];

  // ===== 基準パスを「今いる場所から2階層上」に固定 =====
  // 例: /ranking_home/youtube/all/views/ にいるなら基準は /ranking_home/youtube/
  const loc = new URL(location.href);
  const path = loc.pathname.replace(/index\.html?$/i, "").replace(/\/+$/, "/");
  // パス末尾の 2 セグメントを削る（genre / type 分）
  const basePath = path.replace(/[^/]+\/[^/]+\/?$/, ""); // …/{genre}/{type}/ → …
  // 失敗保険：最低でも trailing slash にしとく
  const safeBase = basePath.endsWith("/") ? basePath : basePath + "/";

  // ===== 既存マークアップがあれば中身を消して再生成、なければ作る =====
  const ensureNav = (selector, ariaLabel) => {
    let nav = document.querySelector(selector);
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = selector.replace(/^\./, "");
      nav.setAttribute("aria-label", ariaLabel);
      document.body.prepend(nav);
    }
    nav.innerHTML = "";
    nav.classList.add("switchbar");
    return nav;
  };

  const navGenre = ensureNav(".switchbar--genre", "ジャンル切替");
  const navType  = ensureNav(".switchbar--rtype", "ランキング種別切替");

  // ===== 現在の genre/type をURLから推定（ハイライト用）=====
  const segs = path.split("/").filter(Boolean);
  const current = {
    genre: segs[segs.length - 2] || "",
    type : segs[segs.length - 1] || ""
  };

  // ===== a要素を量産するヘルパ =====
  const makeBtn = (text, href, {active} = {}) => {
    const a = document.createElement("a");
    a.className = "switchbar__btn";
    a.textContent = text;
    a.href = href;
    a.setAttribute("role", "button");
    if (active) a.classList.add("is-active");
    return a;
  };

  // ===== ジャンルバー：type は現在のを維持してリンク作成 =====
  const keepType = current.type && TYPES.some(t => t.key === current.type)
      ? current.type : "views";
  GENRES.forEach(g => {
    const href = new URL(`../../${g.key}/${keepType}/`, loc);
    navGenre.appendChild(makeBtn(g.label, href, { active: g.key === current.genre }));
  });

  // ===== 種別バー：genre は現在のを維持してリンク作成 =====
  const keepGenre = current.genre && GENRES.some(g => g.key === current.genre)
      ? current.genre : "all";
  TYPES.forEach(t => {
    const href = new URL(`../../${keepGenre}/${t.key}/`, loc);
    navType.appendChild(makeBtn(t.label, href, { active: t.key === current.type }));
  });

  // ===== キーボード操作(←/→で移動)の軽い配慮。なくても動くけど、つけてあげる♡ =====
  const roving = (nav) => {
    const btns = [...nav.querySelectorAll(".switchbar__btn")];
    btns.forEach((b, i) => b.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); btns[(i+1)%btns.length].focus(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); btns[(i-1+btns.length)%btns.length].focus(); }
    }));
  };
  roving(navGenre); roving(navType);
})();