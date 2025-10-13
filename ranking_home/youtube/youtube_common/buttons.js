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