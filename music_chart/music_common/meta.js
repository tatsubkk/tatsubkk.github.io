/* ============================================
   Meta binder: inject JSON fields into DOM
   - Loads meta1.json / meta2.json (same dir as the HTML)
   - Binds to any [data-from][data-bind] element
   - Optional:
       data-attr="href"   -> set attribute instead of text
       data-html="true"   -> set innerHTML (for <br> などを使いたい時)
       data-format="dotdate|date|trim" -> simple formatters
   - Adds a daily cache buster (?v=YYYY-MM-DD)
   ============================================ */
   (async () => {
    // ---------- cache buster (rotates daily) ----------
    const v = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
    // ---------- resolve URLs relative to the current HTML document ----------
    // （GitHub Pagesなどの素直な静的ホスティング前提）
    const m1Url = new URL('meta1.json', document.baseURI); m1Url.searchParams.set('v', v);
    const m2Url = new URL('meta2.json', document.baseURI); m2Url.searchParams.set('v', v);
  
    // ---------- tiny helpers ----------
    const get = (obj, path) => String(path || '')
      .split('.')
      .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  
    const formatters = {
      dotdate: (s) => typeof s === 'string' ? s.replaceAll('-', '.') : s,
      date:    (s) => s,        // ここで日付の整形ロジックを入れたいなら後で拡張
      trim:    (s) => typeof s === 'string' ? s.trim() : s,
      none:    (s) => s,
    };
  
    // ---------- fetch with basic guards ----------
    async function fetchJSON(url){
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      // GitHub Pages は content-type が text/plain の時があるので中身勝負にする
      return res.json();
    }
  
    try {
      const [meta1, meta2] = await Promise.all([ fetchJSON(m1Url), fetchJSON(m2Url) ]);
      const SRC = { meta1, meta2 };
  
      // ---------- main bind loop ----------
      for (const el of document.querySelectorAll('[data-from][data-bind]')) {
        const from = (el.dataset.from || '').toLowerCase();  // 'meta1' | 'meta2'
        const bind = el.dataset.bind || '';                   // 'title' | 'explain' | 'date' | 'a.b.c'
        const src  = SRC[from];
        if (!src || !bind) continue;
  
        let val = get(src, bind);
        if (val == null) continue;
  
        // optional formatter
        const fmtKey = (el.dataset.format || 'none').toLowerCase();
        const fmt = formatters[fmtKey] || formatters.none;
        val = fmt(val);
  
        // write to attribute or content
        const attr = el.dataset.attr;
        const useHTML = (el.dataset.html || '').toLowerCase() === 'true';
  
        if (attr) {
          el.setAttribute(attr, String(val));
        } else if (useHTML) {
          // ※危険な外部入力はNG。ここは自分の JSON 前提で使うこと
          el.innerHTML = String(val);
        } else {
          el.textContent = String(val);
        }
      }
    } catch (e) {
      console.error('[bind] failed:', e);
    }
  })();
  