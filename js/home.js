/* Главная: слово «ПРОФИЛЬ» во всю ширину, разделы каталога, калькулятор резки */
(function () {
  var PO = window.PO, fmt = PO.fmt, plural = PO.plural;

  /* Слово растягиваем ровно на ширину колонки */
  var word = document.getElementById('word');
  function fit() {
    if (!word) return;
    word.style.fontSize = '';
    var cs = getComputedStyle(word);
    var box = word.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var r = document.createRange(); r.selectNodeContents(word.lastChild);
    var w = r.getBoundingClientRect().width, fs = parseFloat(cs.fontSize);
    if (w > 0) word.style.fontSize = Math.floor(fs * box / w * 10) / 10 + 'px';
  }
  fit();
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(fit);
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', fit);
    if (document.fonts.load) document.fonts.load('900 100px Tektur').then(fit);
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);

  /* Разделы каталога */
  var grid = document.getElementById('catGrid');
  if (grid) {
    grid.innerHTML = PO.CATS.map(function (c) {
      var per = c.unit === 'лист' ? 'лист' : 'м';
      return '<a class="cat" href="katalog.html?cat=' + c.id + '">' + PO.section(c.id) +
        '<b>' + c.name + '</b><span>' + c.count + ' ' + plural(c.count, 'позиция', 'позиции', 'позиций') +
        ' · <strong>от ' + fmt(c.minPrice) + '&nbsp;₽/' + per + '</strong></span></a>';
    }).join('');
  }

  /* Калькулятор резки */
  var sel = document.getElementById('cP'), inL = document.getElementById('cL'), inN = document.getElementById('cN'),
      out = document.getElementById('cR'), form = document.getElementById('calcForm'), addBtn = document.getElementById('cAdd');
  if (!sel) return;
  var list = PO.PRODUCTS.filter(function (p) { return p.unit === 'м'; });
  var groups = {};
  list.forEach(function (p) { (groups[p.catName] = groups[p.catName] || []).push(p); });
  sel.innerHTML = Object.keys(groups).map(function (g) {
    return '<optgroup label="' + g + '">' + groups[g].map(function (p) {
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('') + '</optgroup>';
  }).join('');
  sel.value = 'PO-1104';

  var state = null;

  function calc() {
    var p = PO.byId(sel.value), cut = Math.round(+inL.value), n = Math.round(+inN.value);
    state = null; addBtn.disabled = true;
    var r = PO.cutPlan(p, cut, n);
    if (r.err) return err(r.err);
    var stockTxt = p.stock >= r.meters
      ? '<span class="ok">На складе ' + fmt(p.stock) + '&nbsp;м — хватит, отгрузим завтра.</span>'
      : (p.stock > 0 ? 'На складе ' + fmt(p.stock) + '&nbsp;м, остальное допрессуем за&nbsp;5–9&nbsp;дней.' : 'Сейчас нет на&nbsp;складе — допрессуем за&nbsp;5–9&nbsp;рабочих дней.');
    out.innerHTML =
      '<div class="calc__sum"><span>Итого с&nbsp;НДС</span><b>' + fmt(r.sum) + '&nbsp;₽</b></div>' +
      '<span class="calc__how">' + fmt(r.meters, r.meters % 1 ? 1 : 0) + '&nbsp;м × ' + fmt(p.price) + '&nbsp;₽/м · ' + r.bars + '&nbsp;' + plural(r.bars, 'хлыст', 'хлыста', 'хлыстов') + ' · ' + fmt(r.kg, 1) + '&nbsp;кг</span>' +
      '<span>' + (r.rests.length ? 'Остатки ' + r.rests.join(' и ') + ' — ваши, отдадим с&nbsp;заказом.' : 'Почти без остатков: обрезки короче 300&nbsp;мм уходят в&nbsp;переплавку.') + '</span>' +
      '<span>' + stockTxt + '</span>';
    state = { id: p.id, qty: r.meters, cut: { len: cut, n: n } };
    addBtn.disabled = false;
  }
  function err(t) { out.innerHTML = '<span class="err">' + t + '</span>'; }

  [sel, inL, inN].forEach(function (el) { el.addEventListener('input', calc); });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); calc();
    if (!state) return;
    PO.Request.add(state);
    var p = PO.byId(state.id);
    PO.toast('В заявке: ' + p.name + ', резка ' + state.cut.n + '&nbsp;×&nbsp;' + fmt(state.cut.len) + '&nbsp;мм. <a href="zayavka.html">Открыть заявку →</a>');
  });
  calc();
})();
