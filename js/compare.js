/* Сравнение позиций в одной таблице */
(function () {
  var PO = window.PO, fmt = PO.fmt, n = PO.num, $ = function (id) { return document.getElementById(id); };

  var ROWS = [
    ['Раздел', function (p) { return p.catName; }],
    ['Металл', function (p) { return p.metal; }],
    ['Сплав и состояние', function (p) { return p.alloy + ' ' + p.state; }],
    ['Размер, мм', function (p) { return p.size; }],
    ['Стенка или толщина, мм', function (p) { return p.wall ? n(p.wall) : '—'; }],
    ['Площадь сечения, мм²', function (p) { return p.unit === 'лист' ? '—' : fmt(p.area, p.area < 100 ? 1 : 0); }],
    ['Масса 1 м, кг', function (p) { return fmt(p.kgm, 3); }],
    ['σв не менее, МПа', function (p) { return String(p.sigma); }, function (p) { return p.sigma; }, 'max'],
    ['Покрытие', function (p) { return p.coat; }],
    ['Стандарт', function (p) { return p.gost; }],
    ['Длина хлыста', function (p) { return p.unit === 'лист' ? 'лист 1200×3000' : fmt(p.len) + ' мм'; }],
    ['На складе', function (p) { return p.stock > 0 ? fmt(p.stock) + ' ' + (p.unit === 'лист' ? 'л.' : 'м') : 'под заказ'; }, function (p) { return p.unit === 'лист' ? p.stock * 3 : p.stock; }, 'max'],
    ['Цена с НДС', function (p) { return fmt(p.price) + ' ₽/' + (p.unit === 'лист' ? 'лист' : 'м'); }],
    ['Цена за кг', function (p) { return fmt(p.priceKg) + ' ₽'; }, function (p) { return p.priceKg; }, 'min']
  ];

  function render() {
    var list = PO.Compare.ids().map(PO.byId).filter(Boolean);
    $('cEmpty').hidden = list.length > 0; $('ctab').hidden = !list.length; $('cmpBar').hidden = !list.length;
    if (!list.length) { $('ctab').innerHTML = ''; return; }
    var only = $('onlyDiff').checked;
    var head = '<thead><tr><th class="ctab__k" scope="col"><span class="sr">Характеристика</span>' + list.length + '&nbsp;из&nbsp;4</th>' + list.map(function (p) {
      return '<th scope="col">' + PO.section(p.cat) + '<a href="izdelie.html?id=' + p.id + '">' + p.name + '</a><small>' + p.id + '</small>' +
        '<div class="ctab__b"><button type="button" class="btn add" data-add="' + p.id + '">В заявку</button><button type="button" class="cmp" data-rm="' + p.id + '">Убрать</button></div></th>';
    }).join('') + (list.length < 4 ? '<th class="ctab__more"><a href="katalog.html">+ Добавить позицию</a></th>' : '') + '</tr></thead>';
    var body = ROWS.map(function (r) {
      var vals = list.map(r[1]), same = vals.every(function (v) { return v === vals[0]; });
      if (only && same && list.length > 1) return '';
      var best = null;
      if (r[2] && list.length > 1) {
        var nums = list.map(r[2]); best = r[3] === 'max' ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
        if (nums.every(function (x) { return x === best; })) best = null;
      }
      return '<tr' + (same ? '' : ' class="diff"') + '><th scope="row">' + r[0] + '</th>' + list.map(function (p, i) {
        var hit = best !== null && r[2](p) === best;
        return '<td' + (hit ? ' class="best"' : '') + '>' + vals[i] + (hit ? '<span class="sr"> — лучшее значение</span>' : '') + '</td>';
      }).join('') + (list.length < 4 ? '<td class="ctab__more"></td>' : '') + '</tr>';
    }).join('');
    $('ctab').innerHTML = head + '<tbody>' + body + '</tbody>';
  }

  $('ctab').addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'), r = e.target.closest('[data-rm]');
    if (a) { var p = PO.byId(a.getAttribute('data-add')); var q = p.unit === 'лист' ? 1 : p.len / 1000; PO.Request.add({ id: p.id, qty: q }); PO.toast('В заявке: ' + p.name + '. <a href="zayavka.html">Открыть заявку →</a>'); }
    if (r) { PO.Compare.toggle(r.getAttribute('data-rm')); render(); }
  });
  $('onlyDiff').addEventListener('change', render);
  $('clearAll').addEventListener('click', function () { PO.Compare.clear(); render(); });
  $('addAll').addEventListener('click', function () {
    var list = PO.Compare.ids().map(PO.byId).filter(Boolean);
    list.forEach(function (p) { PO.Request.add({ id: p.id, qty: p.unit === 'лист' ? 1 : p.len / 1000 }); });
    PO.toast('В заявку добавлено ' + list.length + '&nbsp;' + PO.plural(list.length, 'позиция', 'позиции', 'позиций') + ' по&nbsp;одному хлысту. <a href="zayavka.html">Открыть заявку →</a>');
  });
  $('demoSet').addEventListener('click', function () { PO.Compare.clear(); ['PO-1113', 'PO-1112', 'PO-1110'].forEach(PO.Compare.toggle); render(); });
  // Ссылкой можно поделиться: sravnenie.html?ids=PO-1113,PO-1112
  var shared = new URLSearchParams(location.search).get('ids');
  if (shared) { PO.Compare.clear(); shared.split(',').slice(0, 4).forEach(function (id) { if (PO.byId(id)) PO.Compare.toggle(id); }); history.replaceState(null, '', location.pathname + location.hash); }
  render();
})();
