/*
  Ficha da administradora em pilha de cartões.
  Adaptado de "FAQ Gaveta de Fichas" © 2026 Upward Creative Academy (licença: uso em projetos próprios e de clientes;
  proibido revender ou redistribuir como template). Versão do Mapa Comercial: visual de vidro nas cores da PRG.
*/

(function () {
  // Textos que o script escreve na tela (troque à vontade)
  var TXT = { ficha: 'Contato', carimbo: 'Registrado', fichas: 'contatos', umaFicha: 'contato', todas: 'Histórico completo' };
  var POS = [0, .5, 1]; // posição das abas das pastas: esquerda, meio, direita (e repete)
  var CLIP = '';
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function all(el, s) { return [].slice.call(el.querySelectorAll(s)); }
  function tag(cls, txt) { var s = document.createElement('span'); s.className = cls; s.setAttribute('aria-hidden', 'true'); s.textContent = txt; return s; }

  function ligar(escopo) { (escopo || document).querySelectorAll('.upw-sec-files').forEach(function (root) {
    if (root.dataset.upwOn) return;
    root.dataset.upwOn = '1';
    var drawer = root.querySelector('.upw-sec-files__drawer'), list = root.querySelector('.upw-sec-files__list');
    var items = all(root, '.upw-sec-files__item'), tabs = all(root, '.upw-sec-files__f');
    var label = root.querySelector('.upw-sec-files__label'), lt = root.querySelector('.upw-sec-files__lt'), lc = root.querySelector('.upw-sec-files__lc');
    if (!drawer || !list || !items.length) return;
    var uid = 'upw-files-' + Math.random().toString(36).slice(2, 8), h2 = root.querySelector('h2');
    var open = null, cur = 'todas', anims = [], wait = 0, mixT = 0, rifT = 0, rifN = 0, touched = false, seen = false, hover = false, lastW = 0;
    root.classList.add('upw-js');
    if (h2) { h2.id = uid + '-t'; root.setAttribute('aria-labelledby', h2.id); }

    // prepara cada pasta: ids únicos, número na aba, clipe, cabeçalho e carimbo na ficha
    items.forEach(function (li, i) {
      var q = li.querySelector('.upw-sec-files__q'), a = li.querySelector('.upw-sec-files__a');
      var tab = li.querySelector('.upw-sec-files__tab'), paper = li.querySelector('.upw-sec-files__paper'), name = tab ? tab.textContent.trim() : '';
      if (!q || !a) return;
      q.id = uid + '-q' + i; a.id = uid + '-a' + i;
      q.setAttribute('aria-controls', a.id); q.setAttribute('aria-expanded', 'false');
      if (tab) { tab.setAttribute('aria-hidden', 'true'); }
      q.appendChild(tag('upw-sec-files__ic', ''));
      if (paper) {
        paper.insertBefore(tag('upw-sec-files__stamp', li.getAttribute('data-carimbo') || TXT.carimbo), paper.firstChild);
        paper.insertBefore(tag('upw-sec-files__ref', TXT.ficha + ' ' + pad(+li.getAttribute('data-num') || items.length - i) + (li.getAttribute('data-quando') ? ' · ' + li.getAttribute('data-quando') : '')), paper.firstChild);
        paper.insertAdjacentHTML('afterbegin', CLIP);
      }
      q.addEventListener('click', function () { toggle(li); });
      q.addEventListener('keydown', function (e) {
        var vis = visible(), k = vis.indexOf(li), to = { ArrowDown: k + 1, ArrowUp: k - 1, Home: 0, End: vis.length - 1 }[e.key];
        if (to == null || !vis[to]) return;
        e.preventDefault();
        vis[to].querySelector('.upw-sec-files__q').focus();
      });
    });
    tabs.forEach(function (b, i) {
      b.style.setProperty('--upw-i', i);
      b.addEventListener('click', function () { pick(b.getAttribute('data-filter') || 'todas'); });
      b.addEventListener('keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to == null || !tabs[to]) return;
        e.preventDefault();
        tabs[to].focus();
      });
    });

    function visible() { return items.filter(function (li) { return !li.classList.contains('is-out'); }); }
    // perspectiva: as pastas do fundo ficam mais estreitas e um pouco mais escuras
    function layout() {
      var vis = visible(), n = vis.length, w = list.clientWidth || 600, step = Math.max(3, Math.min(7, w * .011)), base = w < 520 ? 12 : 16;
      vis.forEach(function (li, k) {
        var s = li.style;
        s.setProperty('--upw-fin', (base + (n - 1 - k) * step).toFixed(1) + 'px');
        s.setProperty('--upw-fin2', (base + (n - 2 - k) * step).toFixed(1) + 'px');
        s.setProperty('--upw-fpos', POS[k % POS.length]);
        s.setProperty('--upw-fdk', n > 1 ? ((n - 1 - k) / (n - 1) * .15).toFixed(3) : 0);
        s.setProperty('--upw-k', k);
      });
      drawer.style.setProperty('--upw-fback', (base + (n - 1) * step).toFixed(1) + 'px');
      drawer.style.setProperty('--upw-fbase', (base - step).toFixed(1) + 'px');
    }
    function lab(anim) {
      var n = visible().length, b = tabs.filter(function (x) { return x.getAttribute('data-filter') === cur; })[0];
      if (lt) lt.textContent = cur === 'todas' || !b ? TXT.todas : b.textContent.trim();
      if (lc) lc.textContent = pad(n) + ' ' + (n === 1 ? TXT.umaFicha : TXT.fichas);
      if (anim && label && label.animate) label.animate([{ transform: 'perspective(300px) rotateX(85deg)', opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
    }
    function set(li, on) {
      li.classList.toggle('is-open', on);
      li.querySelector('.upw-sec-files__q').setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    // segura a pasta clicada no mesmo lugar da tela enquanto a de cima fecha (para se a pessoa rolar a página)
    function anchor(el) {
      var y0 = el.getBoundingClientRect().top, t0 = 0, quit = false, ev = ['wheel', 'touchstart', 'keydown'];
      if (y0 < 0 || y0 > innerHeight) return;
      function stop() { quit = true; }
      function done() { ev.forEach(function (n) { window.removeEventListener(n, stop, true); }); }
      ev.forEach(function (n) { window.addEventListener(n, stop, { capture: true, passive: true }); });
      requestAnimationFrame(function f(t) {
        var d = el.getBoundingClientRect().top - y0;
        t0 = t0 || t;
        if (quit) return done();
        if (Math.abs(d) > .5) window.scrollBy({ top: d, left: 0, behavior: 'instant' });
        if (t - t0 < 750) requestAnimationFrame(f); else done();
      });
    }
    function toggle(li) {
      touched = true;
      list.classList.remove('is-riffle');
      if (open === li) { set(li, false); open = null; return; }
      var was = open, above = was && items.indexOf(was) < items.indexOf(li);
      if (was) set(was, false);
      set(li, true); open = li;
      if (above) anchor(li);
      root.dispatchEvent(new CustomEvent('gaveta-abriu', { bubbles: true, detail: li.getAttribute('data-id') }));
    }
    // filtro: as pastas que saem afundam na gaveta, as que ficam trocam de lugar num arco e as novas sobem
    function pick(cat) {
      if (cat === cur) return;
      cur = cat; touched = true;
      list.classList.remove('is-riffle');
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === cat ? 'true' : 'false'); });
      clearTimeout(wait);
      var show = items.filter(function (li) { return cat === 'todas' || li.getAttribute('data-cat') === cat; });
      var out = visible().filter(function (li) { return show.indexOf(li) < 0; });
      if (open && show.indexOf(open) < 0) { set(open, false); open = null; }
      if (still || !document.body.animate) { swap(show); return; }
      anims.forEach(function (a) { a.cancel(); });
      anims = out.map(function (li, j) {
        return li.querySelector('.upw-sec-files__folder').animate([{ translate: '0 0', opacity: 1 }, { opacity: 0, offset: .65 }, { translate: '0 60px', opacity: 0 }], { duration: 260, delay: j * 30, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
      });
      wait = setTimeout(function () { swap(show); }, out.length ? 260 + (out.length - 1) * 30 : 0);
    }
    function swap(show) {
      var was = show.map(function (li) { return li.classList.contains('is-out') ? null : li.getBoundingClientRect().top; }), h0 = list.offsetHeight, h1;
      anims.forEach(function (a) { a.cancel(); });
      anims = [];
      items.forEach(function (li) { li.classList.toggle('is-out', show.indexOf(li) < 0); });
      layout(); lab(!still);
      if (still || !document.body.animate) return;
      h1 = list.offsetHeight; // a gaveta encolhe ou cresce junto
      if (h0 !== h1) anims.push(list.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 650, easing: 'cubic-bezier(.3,.7,.2,1)' }));
      list.classList.add('is-mix');
      clearTimeout(mixT);
      mixT = setTimeout(function () { list.classList.remove('is-mix'); }, 720 + show.length * 50);
      show.forEach(function (li, k) {
        var d = was[k] == null ? null : was[k] - li.getBoundingClientRect().top;
        anims.push(li.querySelector('.upw-sec-files__folder').animate(d == null
          ? [{ translate: '0 90px', opacity: 0 }, { translate: '0 -8px', opacity: 1, offset: .7 }, { translate: '0 0', opacity: 1 }]
          : [{ translate: '0 ' + d + 'px' }, { translate: '0 ' + (d * .3 - 24) + 'px', offset: .45 }, { translate: '0 0' }],
          { duration: 620, delay: k * 50, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' }));
      });
    }

    // sem ninguém mexendo: de vez em quando um "dedo" passa pelas pastas (para chamar o clique); para depois de 4 vezes
    function plan(ms) { clearTimeout(rifT); if (!still && !touched && seen && rifN < 4) rifT = setTimeout(riffle, ms); }
    function riffle() {
      if (touched || !seen) return;
      if (!open && !hover && !document.hidden) {
        rifN++;
        list.classList.remove('is-riffle');
        void list.offsetWidth;
        list.classList.add('is-riffle');
        setTimeout(function () { list.classList.remove('is-riffle'); }, 700 + visible().length * 80);
      }
      plan(7000);
    }
    list.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; }, { passive: true });
    list.addEventListener('pointerleave', function () { hover = false; }, { passive: true });

    layout(); lab(false);
    var ini = root.querySelector('.upw-sec-files__item[data-aberto]');
    if (ini) { ini.classList.add('sem-puxar'); set(ini, true); open = ini; setTimeout(function () { ini.classList.remove('sem-puxar'); }, 50); }
    if (label) label.setAttribute('role', 'status'); // avisa o leitor de tela quando o filtro muda
    if (window.ResizeObserver) new ResizeObserver(function () { var w = list.clientWidth; if (w && w !== lastW) { lastW = w; layout(); } }).observe(list);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) {
        seen = en[en.length - 1].isIntersecting;
        if (seen) { root.classList.add('is-in'); if (!root.hasAttribute('data-visto')) plan(3800); } else clearTimeout(rifT);
      }, { threshold: .06 }).observe(root);
    } else root.classList.add('is-in');
  });
}
  window.Gaveta = { ligar: function (e) { ligar(e); extras(); } };
  function extras() {


  document.querySelectorAll('.upw-sec-files:not([data-mc])').forEach(function (root) { root.setAttribute('data-mc', '1');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // holofote: a luz segue o mouse dentro do cartão
  root.addEventListener('pointermove', function (e) {
    var f = e.target.closest && e.target.closest('.upw-sec-files__folder'); if (!f) return;
    var r = f.getBoundingClientRect(); f.style.setProperty('--mx', (e.clientX - r.left) + 'px'); f.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  // números contam quando a ficha aparece
  function contar() {
    root.querySelectorAll('[data-conta]').forEach(function (el) {
      var fim = +el.getAttribute('data-conta'); if (still || root.hasAttribute('data-visto')) { el.textContent = fim; return; }
      var t0 = 0; requestAnimationFrame(function passo(t) { t0 = t0 || t; var p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(fim * e); if (p < 1) requestAnimationFrame(passo); });
    });
  }
  var foi = false;
  if (window.IntersectionObserver) new IntersectionObserver(function (en) { if (!foi && en[0].isIntersecting) { foi = true; setTimeout(contar, 500); } }, { threshold: .1 }).observe(root); else contar();
});
  }

})();
