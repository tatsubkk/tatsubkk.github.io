/* ============================================
   Switchbar link builder + current marker (path mode, robust)
   - data-template="/ranking_home/youtube/{genre}/{type}/"
   - .switchbar--genre : <a data-genre>
   - .switchbar--rtype : <a data-type>
   - Handles leading/trailing slashes, index.html, subpath hosting, fallbacks
   ============================================ */
(() => {
  // ===== Config =====
  const GENRES = [
    { key: "all",      label: "全て" },
    { key: "vocaloid", label: "ボカロ" },
    { key: "kpop",     label: "K-pop" },
    { key: "anime",    label: "アニメ主題歌" },
  ];
  const TYPES = [
    { key: "views",    label: "歴代再生回数" },
    { key: "likes",    label: "いいね数" },
    { key: "comments", label: "コメント数" },
    { key: "daily",    label: "デイリー" },
    { key: "weekly",   label: "ウィークリー" },
    { key: "monthly",  label: "マンスリー" },
  ];

  // ===== Path base (2 levels up: /{genre}/{type}/) =====
  const loc  = new URL(location.href);
  const path = loc.pathname.replace(/index\.html?$/i, "").replace(/\/+$/, "/");
  const basePath = path.replace(/[^/]+\/[^/]+\/?$/, ""); // drop last 2 segments
  const safeBase = basePath.endsWith("/") ? basePath : basePath + "/";

  // ===== Ensure containers =====
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
  const navType  = ensureNav(".switchbar--rtype",  "ランキング種別切替");

  // ===== Current from URL =====
  const segs = path.split("/").filter(Boolean);
  const current = {
    genre: segs[segs.length - 2] || "",
    type : segs[segs.length - 1] || ""
  };

  // ===== Button helper (adds current marker) =====
  const makeBtn = (text, href, { currentMark = false } = {}) => {
    const a = document.createElement("a");
    a.className = "switchbar__btn";
    a.textContent = text;
    a.href = href;
    a.setAttribute("role", "button");
    if (currentMark) {
      a.classList.add("is-current", "is-active"); // keep .is-active for legacy styles
      a.setAttribute("aria-current", "page");     // your CSS hooks this
    }
    return a;
  };

  // ===== Build genre bar (keep current type) =====
  const keepType = current.type && TYPES.some(t => t.key === current.type)
    ? current.type : "views";
  GENRES.forEach(g => {
    const href = new URL(`../../${g.key}/${keepType}/`, loc);
    navGenre.appendChild(
      makeBtn(g.label, href, { currentMark: g.key === current.genre })
    );
  });

  // ===== Build type bar (keep current genre) =====
  const keepGenre = current.genre && GENRES.some(g => g.key === current.genre)
    ? current.genre : "all";
  TYPES.forEach(t => {
    const href = new URL(`../../${keepGenre}/${t.key}/`, loc);
    navType.appendChild(
      makeBtn(t.label, href, { currentMark: t.key === current.type })
    );
  });

  // ===== Simple keyboard roving =====
  const roving = (nav) => {
    const btns = [...nav.querySelectorAll(".switchbar__btn")];
    btns.forEach((b, i) => b.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); btns[(i+1)%btns.length].focus(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); btns[(i-1+btns.length)%btns.length].focus(); }
    }));
  };
  roving(navGenre); roving(navType);
})();
