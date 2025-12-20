/* ============================================ *\
  Meta binder (date-only version)
   - Loads meta.json
   - Binds date fields only
   - Daily cache buster (?v=YYYY-MM-DD)
\* ============================================ */

(async () => {
  // ---------- cache buster (daily) ----------
  const v = new Date().toISOString().slice(0, 10);

  // ---------- resolve meta.json ----------
  const metaUrl = new URL('meta.json', document.baseURI);
  metaUrl.searchParams.set('v', v);

  // ---------- helpers ----------
  const get = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce(
      (acc, key) => (acc == null ? acc : acc[key]),
      obj
    );
  };

  const formatDate = (s) =>
    typeof s === 'string' ? s.replaceAll('-', '.') : s;

  try {
    const res = await fetch(metaUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    const meta = await res.json();

    for (const el of document.querySelectorAll('[data-date]')) {
      const key = el.dataset.date; // e.g. "date" or "updated"
      let val = get(meta, key);
      if (val == null) continue;

      val = formatDate(val);
      el.textContent = String(val);
    }
  } catch (e) {
    console.error('[bind-date] failed:', e);
  }
})();
