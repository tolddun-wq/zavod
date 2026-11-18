/* Страница изделия: характеристики, 3D-отрезок, расчёт хлыстов и резки, похожие позиции */
(function () {
  var PO = window.PO, fmt = PO.fmt, n = PO.num, $ = function (id) { return document.getElementById(id); };
  var id = new URLSearchParams(location.search).get('id') || 'PO-1104';
  var p = PO.byId(id);
  if (!p) { $('item').hidden = true; document.querySelector('.sim').hidden = true; $('nf').hidden = false; $('pname').textContent = 'Позиция не найдена'; return; }

  var c = PO.catById[p.cat], isSheet = p.unit === 'лист';
  document.title = p.name + ' — цена за ' + (isSheet ? 'лист' : 'метр') + ' · Профиль-Ока';
  $('crumbs').insertAdjacentHTML('beforeend', '<span aria-hidden="true">→</span><a href="katalog.html?cat=' + p.cat + '">' + c.name + '</a>');
  $('pname').textContent = p.name;
  $('psub').textContent = 'Артикул ' + p.id + ' · ' + p.gost + (isSheet ? ' · лист 1200×3000 мм' : ' · хлыст ' + n(p.len / 1000) + ' м');

  /* Изображение: 3D и чертёж */
  $('vdr').innerHTML = PO.drawing(p) + '<p class="view__cap">Размеры в&nbsp;миллиметрах. ' + (isSheet ? 'Показан фрагмент сечения листа.' : 'Масштаб условный.') + '</p>';
  var model = PO.Model($('cv'), p);
  [['t3d', 'v3d'], ['tdr', 'vdr']].forEach(function (pair) {
    $(pair[0]).addEventListener('click', function () {
      ['t3d', 'tdr'].forEach(function (t) { $(t).setAttribute('aria-selected', t === pair[0]); });
      $('v3d').hidden = pair[0] !== 't3d'; $('vdr').hidden = pair[0] !== 'tdr';
      if (pair[0] === 't3d') model.draw();
    });
  });

  /* Характеристики */
  var d = p.dims, rows = [];
  rows.push(['Металл', p.metal]);
  rows.push(['Сплав и состояние', p.alloy + ' ' + p.state + ' — ' + p.stateName]);
  if (p.cat === 'ugolok') rows.push(['Полка × полка × стенка', d.a + ' × ' + d.a + ' × ' + n(d.s) + ' мм']);
  if (p.cat === 'profil') rows.push(['Высота × ширина × стенка', d.a + ' × ' + d.b + ' × ' + n(d.s) + ' мм']);
  if (p.cat === 'shveller') rows.push(['Высота × полка × стенка', d.a + ' × ' + d.b + ' × ' + n(d.s) + ' мм']);
  if (p.cat === 'truba') rows.push(['Диаметр × стенка', n(d.d) + ' × ' + n(d.s) + ' мм']);
  if (p.cat === 'polosa') rows.push(['Ширина × толщина', d.a + ' × ' + n(d.s) + ' мм']);
  if (p.cat === 'prutok' || p.cat === 'cvet') rows.push(['Диаметр', n(d.d) + ' мм']);
  if (isSheet) rows.push(['Толщина × ширина × длина', n(d.s) + ' × 1200 × 3000 мм']);
  if (!isSheet) rows.push(['Площадь сечения', fmt(p.area, p.area < 100 ? 1 : 0) + ' мм²']);
  rows.push(['Масса 1 м', fmt(p.kgm, 3) + ' кг']);
  rows.push([isSheet ? 'Масса листа' : 'Масса хлыста', fmt(isSheet ? p.unitKg : p.kgm * p.len / 1000, 2) + ' кг']);
  if (!isSheet) rows.push(['Длина хлыста', fmt(p.len) + ' мм, мерная']);
  rows.push(['Плотность сплава', n(p.rho) + ' г/см³']);
  rows.push(['Временное сопротивление σв', 'не менее ' + p.sigma + ' МПа']);
  rows.push(['Стандарт', p.gost]);
  rows.push(['Покрытие', p.coat === 'анодированный' ? 'анодирование 15 мкм, серебро' : 'без покрытия']);
  rows.push(['Документы', 'паспорт качества на партию, УПД']);
  $('specTab').innerHTML = rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('');

  /* Цена и заказ */
  $('bPrice').innerHTML = fmt(p.price) + '&nbsp;₽/' + (isSheet ? 'лист' : 'м');
  $('bPriceS').innerHTML = 'с&nbsp;НДС · ' + fmt(p.priceKg) + '&nbsp;₽/кг · ' + fmt(p.unitKg, 3) + '&nbsp;кг/' + (isSheet ? 'лист' : 'м');
  $('bStock').innerHTML = p.stock > 0
    ? '<span class="dot"></span>На складе ' + fmt(p.stock) + '&nbsp;' + (isSheet ? PO.plural(p.stock, 'лист', 'листа', 'листов') : 'м — ' + Math.floor(p.stock * 1000 / p.len) + '&nbsp;хлыстов') + ', отгрузка завтра'
    : '<span class="dot dot--0"></span>Нет на&nbsp;складе — прессуем под заказ за&nbsp;5–9&nbsp;рабочих дней';
  if (isSheet) { $('bModeA').textContent = 'Целыми листами'; $('bUnit').textContent = 'листов'; $('bMode').querySelectorAll('label')[1].innerHTML = '<input type="radio" name="mode" value="cut" disabled><span>Раскрой — по&nbsp;эскизу</span>'; }

  var mode = 'bars', state = null;
  function calc() {
    state = null; $('bAdd').disabled = true;
    if (mode === 'bars') {
      var q = Math.round(+$('bQty').value);
      if (!q || q < 1) return out('<span class="err">Укажите количество.</span>');
      var meters = isSheet ? q : q * p.len / 1000, sum = isSheet ? q * p.price : meters * p.price, kg = isSheet ? q * p.unitKg : meters * p.kgm;
      out('<div class="calc__sum"><span>Итого с&nbsp;НДС</span><b>' + fmt(sum) + '&nbsp;₽</b></div><span class="calc__how">' +
        (isSheet ? q + '&nbsp;' + PO.plural(q, 'лист', 'листа', 'листов') : q + '&nbsp;' + PO.plural(q, 'хлыст', 'хлыста', 'хлыстов') + ' = ' + fmt(meters, meters % 1 ? 1 : 0) + '&nbsp;м') + ' · ' + fmt(kg, 1) + '&nbsp;кг</span>' + stockNote(meters));
      state = { id: p.id, qty: meters };
    } else {
      var cut = Math.round(+$('bLen').value), cnt = Math.round(+$('bN').value), r = PO.cutPlan(p, cut, cnt);
      if (r.err) return out('<span class="err">' + r.err + '</span>');
      out('<div class="calc__sum"><span>Итого с&nbsp;НДС</span><b>' + fmt(r.sum) + '&nbsp;₽</b></div><span class="calc__how">' + r.bars + '&nbsp;' + PO.plural(r.bars, 'хлыст', 'хлыста', 'хлыстов') + ' = ' + fmt(r.meters, r.meters % 1 ? 1 : 0) + '&nbsp;м · ' + fmt(r.kg, 1) + '&nbsp;кг · по&nbsp;' + r.per + '&nbsp;отрезка из&nbsp;хлыста</span>' +
        '<span>' + (r.rests.length ? 'Остатки ' + r.rests.join(' и ') + ' — ваши, отдадим с&nbsp;заказом.' : 'Почти без остатков.') + '</span>' + stockNote(r.meters));
      state = { id: p.id, qty: r.meters, cut: { len: cut, n: cnt } };
    }
    $('bAdd').disabled = false;
  }
  function stockNote(m) {
    if (p.stock <= 0) return '<span>Срок — 5–9 рабочих дней после оплаты.</span>';
    return p.stock >= m ? '<span class="ok">Хватает на&nbsp;складе.</span>' : '<span>На складе ' + fmt(p.stock) + '&nbsp;' + (isSheet ? 'листов' : 'м') + ', остальное — за&nbsp;5–9&nbsp;дней.</span>';
  }
  function out(h) { $('bRes').innerHTML = h; }

  $('bMode').addEventListener('change', function (e) {
    mode = e.target.value; $('inBars').hidden = mode !== 'bars'; $('inCut').hidden = mode !== 'cut'; calc();
  });
  ['bQty', 'bLen', 'bN'].forEach(function (k) { $(k).addEventListener('input', calc); });
  $('bForm').addEventListener('submit', function (e) {
    e.preventDefault(); calc(); if (!state) return;
    PO.Request.add(state);
    PO.toast('В заявке: ' + p.name + (state.cut ? ', резка ' + state.cut.n + '&nbsp;×&nbsp;' + fmt(state.cut.len) + '&nbsp;мм' : ' — ' + fmt(state.qty, state.qty % 1 ? 1 : 0) + '&nbsp;' + (isSheet ? 'л.' : 'м')) + '. <a href="zayavka.html">Открыть заявку →</a>');
  });
  function cmpBtn() { var on = PO.Compare.has(p.id); $('bCmp').textContent = on ? '✓ В сравнении — открыть' : 'Добавить к сравнению'; $('bCmp').setAttribute('aria-pressed', on); }
  $('bCmp').addEventListener('click', function () {
    if (PO.Compare.has(p.id)) { location.href = 'sravnenie.html'; return; }
    if (!PO.Compare.toggle(p.id)) { PO.toast('Сравнить можно до&nbsp;4 позиций. <a href="sravnenie.html">Открыть сравнение →</a>'); return; }
    cmpBtn(); PO.toast('Добавлено к сравнению. <a href="sravnenie.html">Сравнить →</a>');
  });
  cmpBtn(); calc();

  /* Похожие позиции */
  $('simAll').href = 'katalog.html?cat=' + p.cat;
  var sim = PO.PRODUCTS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).sort(function (a, b) { return Math.abs(a.main - p.main) - Math.abs(b.main - p.main); }).slice(0, 5);
  $('sim').innerHTML = sim.map(function (x) {
    return '<tr><td class="ptab__s">' + PO.section(x.cat) + '</td><td class="ptab__n"><a href="izdelie.html?id=' + x.id + '">' + x.name + '</a><small>' + x.id + '</small></td>' +
      '<td class="r ptab__st"><span class="lbl">На складе</span>' + (x.stock > 0 ? fmt(x.stock) + '&nbsp;' + (x.unit === 'лист' ? 'л.' : 'м') : '<span class="mute">под заказ</span>') + '</td>' +
      '<td class="r ptab__p"><b>' + fmt(x.price) + '&nbsp;₽/' + (x.unit === 'лист' ? 'лист' : 'м') + '</b></td></tr>';
  }).join('');
})();
