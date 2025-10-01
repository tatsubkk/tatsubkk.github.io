/* ===== jsonの内容ぶち込み ===== */
(async () => {
  // v= でキャッシュ更新（毎日1回なら日付で十分）
  const v = new Date().toISOString().slice(0,10);

  // 2つの JSON を並列で取得
  const [m, e] = await Promise.all([
    fetch(`meta.json?v=${v}`,  { cache: 'no-store' }).then(r => r.json()),
    fetch(`entry.json?v=${v}`, { cache: 'no-store' }).then(r => r.json()),
  ]);
  const SRC = { meta: m, entry: e };

  // "a.b.c" を辿るやつ（ネストOK / 配列OK: items.0.title）
  const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

  // data-from & data-bind を一括バインド
  for (const el of document.querySelectorAll('[data-from][data-bind]')) {
    const src = SRC[el.dataset.from];         // 'meta' or 'entry'
    if (!src) continue;
    const val = get(src, el.dataset.bind);    // 例: 'date' / 'title' / 'explain'
    if (val == null) continue;                // 無ければフォールバック表示を残す

    // 属性に入れたい場合は data-attr="href" などを付ければ対応
    const attr = el.dataset.attr;
    if (attr) el.setAttribute(attr, String(val));
    else      el.textContent = String(val);   // 基本はテキストで安全に
  }
})();
