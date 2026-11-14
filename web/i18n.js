/* 언어 전환 (한국어 · English · 日本語)
 * - 페이지의 한국어 문장을 i18n-dict.js 사전에서 찾아 바꿉니다.
 * - 코드 안의 문장은 T('한국어 문장 {0}', 값) 으로 감싸서 씁니다.
 * - 고른 언어는 이 기기에 기억됩니다. 주소 뒤에 ?lang=en / ?lang=ja / ?lang=ko 로도 바꿀 수 있어요.
 */
(function () {
  var LANGS = { ko: '한국어', en: 'English', ja: '日本語' };
  function detect() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q && LANGS[q]) { localStorage.setItem('kc-lang', q); return q; }
      var s = localStorage.getItem('kc-lang');
      if (s && LANGS[s]) return s;
    } catch (e) {}
    var n = (navigator.language || 'ko').toLowerCase();
    if (n.indexOf('ko') === 0) return 'ko';
    if (n.indexOf('ja') === 0) return 'ja';
    return 'en';
  }
  var lang = detect();
  document.documentElement.lang = lang;
  var D = window.I18N_DICT || {};
  var dict = (lang !== 'ko' && D[lang]) || {};

  function T(s) {
    var r = (lang !== 'ko' && dict[s]) || s;
    var args = arguments;
    return r.replace(/\{(\d)\}/g, function (m, i) { var v = args[+i + 1]; return v == null ? '' : v; });
  }
  function norm(h) { return h.replace(/\s+/g, ' ').trim(); }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };

  function apply(root) {
    if (lang === 'ko') return;
    root = root || document.body;
    // 1) 글자 안에 <b>·<br>·<a> 등이 섞인 덩어리는 통째로
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = norm(el.innerHTML);
      if (dict[k]) el.innerHTML = dict[k];
    });
    // 2) 나머지 글자 조각
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        while (p && p !== root.parentNode) {
          if (p.nodeType === 1 && (SKIP[p.tagName] || p.hasAttribute('data-no-i18n') || p.hasAttribute('data-i18n-html'))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return /[가-힣]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var raw = node.nodeValue, k = norm(raw);
      if (dict[k]) node.nodeValue = raw.replace(raw.trim(), dict[k]);
    });
    // 3) 속성 (안내 문구, 툴팁 등)
    ['placeholder', 'title', 'aria-label', 'alt', 'label'].forEach(function (a) {
      root.querySelectorAll('[' + a + ']').forEach(function (el) {
        var k = norm(el.getAttribute(a));
        if (dict[k]) el.setAttribute(a, dict[k]);
      });
    });
    if (dict[norm(document.title)]) document.title = dict[norm(document.title)];
    var md = document.querySelector('meta[name="description"]');
    if (md && dict[norm(md.content)]) md.content = dict[norm(md.content)];
  }

  // 언어 고르기 상자
  function switcher(target, style) {
    var sel = document.createElement('select');
    sel.className = 'lang-switch';
    sel.setAttribute('aria-label', 'Language');
    sel.style.cssText = 'border:1px solid #e4dfd5;border-radius:8px;padding:6px 8px;background:#fff;font:inherit;font-size:13px;cursor:pointer;' + (style || '');
    Object.keys(LANGS).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = '🌐 ' + LANGS[k]; if (k === lang) o.selected = true; sel.appendChild(o);
    });
    sel.onchange = function () {
      try { localStorage.setItem('kc-lang', sel.value); } catch (e) {}
      var u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString();
    };
    if (target) target.appendChild(sel);
    return sel;
  }

  window.I18N = { lang: lang, T: T, apply: apply, switcher: switcher, LANGS: LANGS };
  window.T = T;
})();
