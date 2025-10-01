/* ===== jsonの内容ぶち込み ===== */
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
