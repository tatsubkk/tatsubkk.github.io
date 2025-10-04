/* ===== jsonの内容ぶち込み（） ===== */
(async () => {
  const v = new Date().toISOString().slice(0,10); // 日替わりキャッシュバスター

  // 同じディレクトリ想定
  const m1Url = new URL('meta1.json', document.baseURI); m1Url.searchParams.set('v', v);
  const m2Url = new URL('meta2.json', document.baseURI); m2Url.searchParams.set('v', v);

  try {
    const [r1, r2] = await Promise.all([
      fetch(m1Url, { cache: 'no-store' }),
      fetch(m2Url, { cache: 'no-store' })
    ]);
    if (!r1.ok) throw new Error(`meta1.json ${r1.status}`);
    if (!r2.ok) throw new Error(`meta2.json ${r2.status}`);

    const [meta1, meta2] = await Promise.all([r1.json(), r2.json()]);

    // どのJSONを見るかを切り替えるテーブル
    const SRC = { meta1, meta2 };

    // "a.b.c" みたいなドット表記でネストを辿る
    const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

    // data-from（meta1/meta2） と data-bind（キー）に従って流し込み
    for (const el of document.querySelectorAll('[data-from][data-bind]')) {
      const src = SRC[el.dataset.from];      // 'meta1' or 'meta2'
      if (!src) continue;
      const val = get(src, el.dataset.bind); // 例: 'title' / 'explain' / 'date'
      if (val == null) continue;

      // 属性に入れたい時は data-attr="href" 等を付けてね
      const attr = el.dataset.attr;
      attr ? el.setAttribute(attr, String(val))
           : el.textContent = String(val);
    }
  } catch (e) {
    console.error('bind failed:', e);
  }
})();

