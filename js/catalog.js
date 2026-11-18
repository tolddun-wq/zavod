/* Каталог: разделы, фильтры, поиск, сортировка, сравнение. Состояние хранится в адресе страницы. */
(function () {
  var PO = window.PO, fmt = PO.fmt, $ = function (id) { return document.getElementById(id); };
  var SIZE = { ugolok: 'Полка', truba: 'Диаметр', profil: 'Высота', shveller: 'Высота', polosa: 'Ширина', prutok: 'Диаметр', list: 'Толщина', cvet: 'Диаметр' };

  var st = readUrl();

  function readUrl() {
    var u = new URLSearchParams(location.search);
    var arr = function (k) { var v = u.get(k); return v ? v.split(',') : []; };
    return { cat: PO.catById[u.get('cat')] ? u.get('cat') : '', q: u.get('q') || '', metal: arr('metal'), alloy: arr('alloy'),
      min: u.get('min') || '', max: u.get('max') || '', wall: arr('wall'), coat: arr('coat'), stock: u.get('stock') === '1', sort: u.get('sort') || 'size' };
  }
  function writeUrl() {
    var u = new URLSearchParams();
    if (st.cat) u.set('cat', st.cat);
    if (st.q) u.set('q', st.q);
    ['metal', 'alloy', 'wall', 'coat'].forEach(function (k) { if (st[k].length) u.set(k, st[k].join(',')); });
    if (st.min) u.set('min', st.min); if (st.max) u.set('max', st.max);
    if (st.stock) u.set('stock', '1'); if (st.sort !== 'size') u.set('sort', st.sort);
    var s = u.toString();
    history.replaceState(null, '', (s ? '?' + s : location.pathname) + location.hash);
  }

  /* Поиск: «40х3», «40x3», «д16т», «ф20», «ø20» — всё приводим к одному виду */
  function norm(s) {
    return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[хx*]/g, '×').replace(/(^|\s)(ф|d)(\d)/g, '$1ø$3')
      .replace(/(\d)\s*×\s*(\d)/g, '$1×$2').replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ').trim();
  }
  var SYN = { ugolok: 'уголок угол', truba: 'труба круглая трубка', profil: 'труба профильная квадратная прямоугольная профиль', shveller: 'швеллер п-образный',
    polosa: 'шина полоса электротехническая', prutok: 'пруток круг', list: 'лист плита', cvet: 'пруток круг' };
  PO.PRODUCTS.forEach(function (p) {
    p._h = norm([p.name, p.alloy + p.state, p.alloy + ' ' + p.state, p.metal, p.cat === 'cvet' ? '' : p.catName, SYN[p.cat], p.size, p.size.replace('Ø', ''), p.id, p.gost, p.coat].join(' '));
  });
  function matchQ(p, q) {
    if (!q) return true;
    return norm(q).split(' ').every(function (t) {
      if (t.indexOf('ø') === 0) { var n = t.slice(1).replace('.', ','); return p.size === 'Ø' + n || (p.cat === 'truba' && p.size.indexOf(n + '×') === 0); }
      return p._h.indexOf(t) > -1;
    });
  }

  function base() { return PO.PRODUCTS.filter(function (p) { return (!st.cat || p.cat === st.cat) && matchQ(p, st.q); }); }
  function pass(p, skip) {
    if (skip !== 'metal' && st.metal.length && st.metal.indexOf(p.metal) < 0) return false;
    if (skip !== 'alloy' && st.alloy.length && st.alloy.indexOf(p.alloy + ' ' + p.state) < 0) return false;
    if (skip !== 'wall' && st.wall.length && st.wall.indexOf(String(p.wall)) < 0) return false;
    if (skip !== 'coat' && st.coat.length && st.coat.indexOf(p.coat) < 0) return false;
    if (st.stock && p.stock <= 0) return false;
    var m = st.cat ? p.main : (p.dims.d || p.dims.a || p.dims.s);
    if (st.min !== '' && m < +st.min) return false;
    if (st.max !== '' && m > +st.max) return false;
    return true;
  }

  /* Вкладки разделов */
  function tabs() {
    var all = PO.PRODUCTS.filter(function (p) { return matchQ(p, st.q); });
    var html = '<button type="button" data-cat=""' + (!st.cat ? ' aria-current="true"' : '') + '><b>Все</b><span>' + all.length + '</span></button>';
    html += PO.CATS.map(function (c) {
      var n = all.filter(function (p) { return p.cat === c.id; }).length;
      return '<button type="button" data-cat="' + c.id + '"' + (st.cat === c.id ? ' aria-current="true"' : '') + (n ? '' : ' class="is-0"') + '>' + PO.section(c.id) + '<b>' + c.name + '</b><span>' + n + '</span></button>';
    }).join('');
    $('ctabs').innerHTML = html;
  }

  function checks(el, key, values) {
    var b = base();
    el.innerHTML = values.map(function (v) {
      var n = b.filter(function (p) { return pass(p, key) && (key === 'metal' ? p.metal : key === 'alloy' ? p.alloy + ' ' + p.state : p.coat) === v; }).length;
      var on = st[key].indexOf(v) > -1;
      return '<label class="ck' + (n || on ? '' : ' is-0') + '"><input type="checkbox" value="' + v + '"' + (on ? ' checked' : '') + (n || on ? '' : ' disabled') + '><span>' + v + '</span><em>' + n + '</em></label>';
    }).join('');
  }
  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  function facets() {
    var b = base(), inCat = PO.PRODUCTS.filter(function (p) { return !st.cat || p.cat === st.cat; });
    var metals = uniq(inCat.map(function (p) { return p.metal; }));
    checks($('fMetal'), 'metal', metals);
    $('fMetal').closest('.fg').hidden = metals.length < 2;
    checks($('fAlloy'), 'alloy', uniq(inCat.map(function (p) { return p.alloy + ' ' + p.state; })).sort());
    var coats = uniq(inCat.map(function (p) { return p.coat; }));
    checks($('fCoat'), 'coat', coats);
    $('fCoat').closest('.fg').hidden = coats.length < 2;
    var walls = uniq(inCat.filter(function (p) { return p.wall && p.cat !== 'list'; }).map(function (p) { return p.wall; })).sort(function (a, c) { return a - c; });
    $('fWall').innerHTML = walls.map(function (w) {
      var on = st.wall.indexOf(String(w)) > -1;
      return '<label class="chip"><input type="checkbox" value="' + w + '"' + (on ? ' checked' : '') + '><span>' + PO.num(w) + '</span></label>';
    }).join('');
    $('fWall').closest('.fg').hidden = !walls.length;
    var sizes = inCat.map(function (p) { return st.cat ? p.main : (p.dims.d || p.dims.a || p.dims.s); });
    $('fSizeL').textContent = (st.cat ? SIZE[st.cat] : 'Основной размер') + ', мм';
    $('fSizeH').textContent = 'В разделе: от ' + PO.num(Math.min.apply(null, sizes)) + ' до ' + PO.num(Math.max.apply(null, sizes)) + ' мм';
    $('fMin').value = st.min; $('fMax').value = st.max; ['fq', 'fq2'].forEach(function (k) { if (document.activeElement !== $(k)) $(k).value = st.q; }); $('fStock').checked = st.stock; $('fSort').value = st.sort;
    void b;
  }

  function chosen() {
    var out = [];
    if (st.q) out.push(['q', '', 'Поиск: «' + st.q + '»']);
    st.metal.forEach(function (v) { out.push(['metal', v, v]); });
    st.alloy.forEach(function (v) { out.push(['alloy', v, v]); });
    st.wall.forEach(function (v) { out.push(['wall', v, 'стенка ' + PO.num(v) + ' мм']); });
    st.coat.forEach(function (v) { out.push(['coat', v, v]); });
    if (st.min !== '' || st.max !== '') out.push(['size', '', 'размер ' + (st.min !== '' ? 'от ' + st.min + ' ' : '') + (st.max !== '' ? 'до ' + st.max : '') + ' мм']);
    if (st.stock) out.push(['stock', '', 'в наличии']);
    $('chosen').innerHTML = out.map(function (o) { return '<button type="button" data-k="' + o[0] + '" data-v="' + o[1] + '">' + o[2] + ' <span aria-hidden="true">×</span><span class="sr">убрать</span></button>'; }).join('');
    $('fCount').textContent = out.length ? out.length : '';
  }

  function sorted(list) {
    var k = st.sort.replace('-', ''), dir = st.sort[0] === '-' ? -1 : 1;
    return list.sort(function (a, b) {
      if (k === 'size') return (PO.CATS.indexOf(PO.catById[a.cat]) - PO.CATS.indexOf(PO.catById[b.cat])) || (a.main - b.main) || ((a.wall || 0) - (b.wall || 0)) || a.price - b.price;
      return dir * (a[k] - b[k]);
    });
  }

  function stockTxt(p) {
    if (p.stock <= 0) return '<span class="mute">под заказ, 5–9 дн.</span>';
    return fmt(p.stock) + '&nbsp;' + (p.unit === 'лист' ? PO.plural(p.stock, 'лист', 'листа', 'листов') : 'м');
  }

  function rows() {
    var list = sorted(base().filter(function (p) { return pass(p); }));
    var per = function (p) { return p.unit === 'лист' ? 'лист' : 'м'; };
    $('rows').innerHTML = list.map(function (p) {
      var inCmp = PO.Compare.has(p.id);
      return '<tr>' +
        '<td class="ptab__s">' + PO.section(p.cat) + '</td>' +
        '<td class="ptab__n"><a href="izdelie.html?id=' + p.id + '">' + p.name + '</a><small>' + p.id + ' · ' + p.gost + (p.unit === 'м' ? ' · хлыст&nbsp;' + PO.num(p.len / 1000) + '&nbsp;м' : ' · 1200×3000&nbsp;мм') + '</small></td>' +
        '<td class="ptab__al"><span class="lbl">Сплав</span>' + p.alloy + '&nbsp;' + p.state + '</td>' +
        '<td class="r ptab__m"><span class="lbl">Масса</span>' + fmt(p.unitKg, p.unitKg < 10 ? 3 : 1) + '&nbsp;кг' + (p.unit === 'лист' ? '/лист' : '') + '</td>' +
        '<td class="r ptab__st">' + (p.stock > 0 ? '<span class="lbl">На складе</span>' : '') + stockTxt(p) + '</td>' +
        '<td class="r ptab__p"><b>' + fmt(p.price) + '&nbsp;₽/' + per(p) + '</b><small>' + fmt(p.priceKg) + '&nbsp;₽/кг</small></td>' +
        '<td class="ptab__a"><button type="button" class="cmp' + (inCmp ? ' on' : '') + '" data-cmp="' + p.id + '" aria-pressed="' + inCmp + '">' + (inCmp ? 'В сравнении' : 'Сравнить') + '</button>' +
        '<button type="button" class="btn add" data-add="' + p.id + '">В заявку</button></td></tr>';
    }).join('');
    var n = list.length;
    $('resN').innerHTML = n ? '<b>' + n + '</b> ' + PO.plural(n, 'позиция', 'позиции', 'позиций') + (st.cat ? ' в разделе «' + PO.catById[st.cat].name + '»' : '') : '';
    $('ptab').hidden = !n; $('empty').hidden = !!n;
    if (!n) $('emptyT').innerHTML = (st.q ? 'По запросу «' + escapeHtml(st.q) + '» с&nbsp;такими фильтрами позиций нет. ' : 'С&nbsp;такими фильтрами позиций нет. ') +
      'Проверьте размер или пришлите спецификацию — подберём аналог или спрессуем профиль по&nbsp;чертежу.';
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function head() {
    var c = PO.catById[st.cat];
    $('pageTitle').textContent = c ? c.name : 'Каталог';
    $('crumbCat').innerHTML = c ? '<a href="katalog.html">Каталог</a> <span aria-hidden="true">→</span> ' + c.name : 'Каталог';
    document.title = (c ? c.name + ' — ' : 'Каталог — ') + 'Профиль-Ока';
  }

  function cmpbar() {
    var ids = PO.Compare.ids(), bar = $('cmpbar');
    bar.hidden = !ids.length;
    $('cmpT').innerHTML = '<span class="hide-m">В сравнении </span><b>' + ids.length + '</b>&nbsp;из&nbsp;4';
  }

  function render() { writeUrl(); head(); tabs(); facets(); chosen(); rows(); cmpbar(); }

  /* События */
  $('ctabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    st.cat = b.getAttribute('data-cat'); st.min = st.max = ''; st.wall = []; st.alloy = []; render();
  });
  ['fMetal', 'fAlloy', 'fCoat', 'fWall'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var key = { fMetal: 'metal', fAlloy: 'alloy', fCoat: 'coat', fWall: 'wall' }[id];
      st[key] = [].slice.call($(id).querySelectorAll('input:checked')).map(function (i) { return i.value; });
      render();
    });
  });
  var qT;
  // Поиск есть в фильтрах (компьютер) и над списком (телефон). Пробелы не съедаем, пока человек печатает.
  ['fq', 'fq2'].forEach(function (k) {
    $(k).addEventListener('input', function () {
      clearTimeout(qT); var v = this.value, other = $(k === 'fq' ? 'fq2' : 'fq');
      other.value = v;
      qT = setTimeout(function () { st.q = v.trim(); render(); }, 200);
    });
  });
  $('msearch').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(qT); st.q = $('fq2').value.trim(); render(); $('fq2').blur(); });
  $('ff').addEventListener('submit', function (e) { e.preventDefault(); });
  ['fMin', 'fMax'].forEach(function (id) { $(id).addEventListener('change', function () { var v = this.value; st[id === 'fMin' ? 'min' : 'max'] = v === '' || isNaN(+v) ? '' : String(Math.max(0, +v)); render(); }); });
  $('fStock').addEventListener('change', function () { st.stock = this.checked; render(); });
  $('fSort').addEventListener('change', function () { st.sort = this.value; render(); });
  function reset() { var c = st.cat; st = readUrl(); st = { cat: c, q: '', metal: [], alloy: [], min: '', max: '', wall: [], coat: [], stock: false, sort: st.sort }; render(); }
  $('fReset').addEventListener('click', reset);
  $('emptyReset').addEventListener('click', reset);
  $('chosen').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
    if (k === 'q') st.q = ''; else if (k === 'size') st.min = st.max = ''; else if (k === 'stock') st.stock = false;
    else st[k] = st[k].filter(function (x) { return x !== v; });
    render();
  });
  $('rows').addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'), c = e.target.closest('[data-cmp]');
    if (a) {
      var p = PO.byId(a.getAttribute('data-add'));
      var qty = p.unit === 'лист' ? 1 : p.len / 1000;
      PO.Request.add({ id: p.id, qty: qty });
      PO.toast('В заявке: ' + p.name + ' — ' + PO.num(qty) + '&nbsp;' + (p.unit === 'лист' ? 'лист' : 'м') + '. Количество поправите в&nbsp;заявке. <a href="zayavka.html">Открыть →</a>');
    }
    if (c) {
      var id = c.getAttribute('data-cmp');
      if (!PO.Compare.toggle(id)) { PO.toast('Сравнить можно до&nbsp;4 позиций. Уберите одну из&nbsp;списка. <a href="sravnenie.html">Открыть сравнение →</a>'); return; }
      rows(); cmpbar();
    }
  });
  $('cmpClear').addEventListener('click', function () { PO.Compare.clear(); rows(); cmpbar(); });

  /* Фильтры на телефоне — выезжающая панель */
  var filt = $('filt');
  $('filtOpen').addEventListener('click', function () { filt.classList.add('on'); document.body.classList.add('lock'); this.setAttribute('aria-expanded', 'true'); });
  $('filtClose').addEventListener('click', function () { filt.classList.remove('on'); document.body.classList.remove('lock'); $('filtOpen').setAttribute('aria-expanded', 'false'); });

  render();
})();
