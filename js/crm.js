/* Кабинет менеджера: заявки с сайта, воронка до отгрузки, список и доска */
(function () {
  var PO = window.PO, fmt = PO.fmt, $ = function (id) { return document.getElementById(id); };
  var ST = { 'new': 'Новая', work: 'В работе', sent: 'КП отправлено', agreed: 'Согласовано', paid: 'Оплачено', shipped: 'Отгружено', lost: 'Отказ' };
  var ORDER = ['new', 'work', 'sent', 'agreed', 'paid', 'shipped', 'lost'];
  var NEXT = { 'new': ['work', 'Взять в работу'], work: ['sent', 'КП отправлено клиенту'], sent: ['agreed', 'Клиент согласовал КП'], agreed: ['paid', 'Оплата поступила'], paid: ['shipped', 'Отгружено'] };
  var REASONS = ['Дорого', 'Не устроил срок', 'Нет нужной позиции', 'Выбрали другого поставщика', 'Клиент не отвечает', 'Другое'];
  var MANAGERS = ['Анна Сергеевна', 'Андрей Викторович', 'Михаил Петрович'];
  var GROUPS = { all: ORDER, 'new': ['new'], work: ['work'], wait: ['sent', 'agreed'], done: ['paid', 'shipped'], lost: ['lost'] };
  var f = { s: 'all', q: '', per: 0, man: 'all' };
  var view = 'list', openId = null;
  try { view = localStorage.getItem('po.crm.view') || 'list'; } catch (e) {}

  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dt(iso, full) {
    var d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    var hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var day = d.toDateString() === now.toDateString() ? 'сегодня' : d.toDateString() === y.toDateString() ? 'вчера' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return full ? day + ', ' + hm : day + ' · ' + hm;
  }
  function ago(iso) {
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'только что'; if (m < 60) return m + '&nbsp;мин назад';
    var h = Math.floor(m / 60); return h < 24 ? h + '&nbsp;ч назад' : '';
  }
  function pill(s) { return '<span class="pill pill--' + s + '"><i class="st st--' + s + '"></i>' + ST[s] + '</span>'; }

  function base() {
    var q = f.q.toLowerCase().replace(/ё/g, 'е').replace(/[хx]/g, '×');
    return PO.CRM.all().filter(function (r) {
      if (f.man !== 'all' && (f.man === '—' ? r.manager : r.manager !== f.man)) return false;
      if (f.per === 1 && new Date(r.date).toDateString() !== new Date().toDateString()) return false;
      if (f.per > 1 && Date.now() - Date.parse(r.date) > f.per * 864e5) return false;
      if (q) {
        var h = [r.id, r.company, r.contact, r.inn, r.city, r.email].concat(r.items.map(function (it) { var p = PO.byId(it.id); return p ? p.name + ' ' + p.id : ''; })).join(' ').toLowerCase().replace(/ё/g, 'е').replace(/[хx]/g, '×');
        if (q.split(/\s+/).some(function (t) { return h.indexOf(t) < 0; })) return false;
      }
      return true;
    }).sort(function (a, b) { return Date.parse(b.date) - Date.parse(a.date); });
  }
  function filtered() { return base().filter(function (r) { return GROUPS[f.s].indexOf(r.status) > -1; }); }
  function sumOf(list) { return list.reduce(function (a, r) { return a + PO.CRM.total(r.items).sum; }, 0); }

  function kpi() {
    var all = PO.CRM.all();
    var g = function (k) { return all.filter(function (r) { return GROUPS[k].indexOf(r.status) > -1; }); };
    var month = all.filter(function (r) { return r.status === 'shipped' && Date.now() - Date.parse(r.history[r.history.length - 1].t) < 30 * 864e5; });
    var tiles = [['new', 'Новые', 'ждут менеджера'], ['work', 'В работе', 'готовим КП'], ['wait', 'Ждём клиента', 'КП отправлено или согласовано'], ['done', 'Оплачено и отгружено', 'за всё время']];
    $('kpi').innerHTML = tiles.map(function (t) {
      var l = g(t[0]);
      return '<button type="button" class="kpi__i' + (f.s === t[0] ? ' on' : '') + '" data-s="' + t[0] + '"><span>' + t[1] + '</span><b>' + l.length + '</b><small>на ' + fmt(sumOf(l)) + '&nbsp;₽ · ' + t[2] + '</small></button>';
    }).join('');
    $('kpiM').innerHTML = 'Отгружено за&nbsp;30&nbsp;дней: <b>' + fmt(sumOf(month)) + '&nbsp;₽</b> · отказов: <b>' + g('lost').length + '</b>';
    var b = base(), cnt = function (k) { return b.filter(function (r) { return GROUPS[k].indexOf(r.status) > -1; }).length; };
    $('stabs').innerHTML = [['all', 'Все'], ['new', 'Новые'], ['work', 'В работе'], ['wait', 'Ждём клиента'], ['done', 'Оплачено'], ['lost', 'Отказ']].map(function (t) {
      return '<button type="button" role="tab" aria-selected="' + (f.s === t[0]) + '" data-s="' + t[0] + '">' + t[1] + ' <em>' + cnt(t[0]) + '</em></button>';
    }).join('');
  }

  function statusSel(r, cls) {
    return '<select class="ssel ssel--' + r.status + (cls ? ' ' + cls : '') + '" data-st="' + esc(r.id) + '" aria-label="Этап заявки ' + esc(r.id) + '">' +
      ORDER.map(function (k) { return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select>';
  }

  function listView() {
    var list = filtered();
    $('ctbl').hidden = !list.length; $('cE').hidden = !!list.length;
    $('crows').innerHTML = list.map(function (r) {
      var t = PO.CRM.total(r.items), first = r.items[0] && PO.byId(r.items[0].id);
      var comp = first ? first.name + (r.items.length > 1 ? ' <span class="mute">и&nbsp;ещё ' + (r.items.length - 1) + '</span>' : '') : (r.file ? 'Файл: ' + esc(r.file) : '<span class="mute">без позиций</span>');
      var fresh = r.status === 'new' && ago(r.date);
      return '<tr data-open="' + esc(r.id) + '" tabindex="0" class="' + (r.status === 'new' ? 'is-new' : '') + '">' +
        '<td class="ct__id"><b>' + esc(r.id) + '</b><small>' + dt(r.date) + '</small>' + (fresh ? '<span class="fresh">' + fresh + '</span>' : '') + '</td>' +
        '<td class="ct__cl"><b>' + esc(r.company) + '</b><small>' + esc(r.contact) + ' · ' + esc(r.city) + '</small></td>' +
        '<td class="ct__it">' + comp + '</td>' +
        '<td class="r ct__sum"><b>' + (r.items.length ? fmt(t.sum) + '&nbsp;₽' : '—') + '</b><small>' + (r.items.length ? fmt(t.kg, 0) + '&nbsp;кг' : '') + '</small></td>' +
        '<td class="ct__st">' + statusSel(r) + '</td>' +
        '<td class="ct__m">' + (r.manager ? esc(r.manager) : '<span class="mute">не назначен</span>') + '</td></tr>';
    }).join('');
  }

  function boardView() {
    var b = base();
    $('board').innerHTML = ORDER.map(function (s) {
      var l = b.filter(function (r) { return r.status === s; });
      return '<section class="col col--' + s + '" data-col="' + s + '" aria-label="' + ST[s] + '">' +
        '<header class="col__h"><span>' + pill(s) + '</span><em>' + l.length + '</em><small>' + (l.length ? fmt(sumOf(l)) + '&nbsp;₽' : '') + '</small></header>' +
        '<div class="col__b">' + (l.length ? l.map(function (r) {
          var t = PO.CRM.total(r.items);
          return '<article class="card" draggable="true" data-open="' + esc(r.id) + '" data-id="' + esc(r.id) + '" tabindex="0">' +
            '<div class="card__t"><b>' + esc(r.id) + '</b><span>' + dt(r.date) + '</span></div>' +
            '<p class="card__c">' + esc(r.company) + '</p>' +
            '<div class="card__f"><b>' + (r.items.length ? fmt(t.sum) + '&nbsp;₽' : 'по файлу') + '</b><span>' + (r.manager ? esc(r.manager.split(' ')[0]) : 'без менеджера') + '</span></div>' +
            (r.status === 'lost' && r.lostReason ? '<p class="card__r">' + esc(r.lostReason) + '</p>' : '') + '</article>';
        }).join('') : '<p class="col__e">Пусто</p>') + '</div></section>';
    }).join('');
  }

  function setStatus(id, s, reason) {
    var moved = false;
    PO.CRM.update(id, function (r) {
      if (r.status === s) return;
      moved = true;
      if (s !== 'new' && !r.manager) r.manager = MANAGERS[0];
      var note = s === 'work' ? 'Взял(а) в работу: ' + r.manager : s === 'sent' ? 'КП отправлено на ' + r.email : s === 'agreed' ? 'Клиент согласовал КП, выставлен счёт' :
        s === 'paid' ? 'Оплата поступила' : s === 'shipped' ? 'Отгружено, УПД и паспорт качества переданы' : s === 'lost' ? 'Отказ: ' + (reason || 'причина не указана') : 'Возвращена в новые';
      if (s === 'lost') r.lostReason = reason || ''; else r.lostReason = '';
      r.history.push({ t: new Date().toISOString(), s: s, note: note });
      r.status = s;
    });
    if (moved) PO.toast('Заявка ' + id + ': ' + ST[s].toLowerCase());
    renderAll();
  }

  /* Карточка заявки */
  function openCard(id) {
    var r = PO.CRM.all().filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    openId = id;
    var t = PO.CRM.total(r.items), nx = NEXT[r.status];
    var bar = ORDER.slice(0, 6).map(function (s, i) {
      var idx = ORDER.indexOf(r.status === 'lost' ? lastBeforeLost(r) : r.status);
      return '<li class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '">' + ST[s] + '</li>';
    }).join('');
    var act = r.status === 'lost'
      ? '<div class="drw__lost"><b>Отказ</b> — ' + esc(r.lostReason || 'причина не указана') + '</div><button class="btn btn--o" type="button" data-go="work">Вернуть в работу</button>'
      : (nx ? '<button class="btn" type="button" data-go="' + nx[0] + '">' + nx[1] + ' <span aria-hidden="true">→</span></button>' : '<span class="done-mark">Сделка закрыта: заказ отгружен</span>') +
        (r.status !== 'shipped' ? '<button class="btn btn--o" type="button" id="dLost">Отказ</button>' : '');
    $('dBody').innerHTML =
      '<p class="kick">' + dt(r.date, true) + ' · <a href="status.html?id=' + encodeURIComponent(r.id) + '&e=' + encodeURIComponent(r.email) + '">что видит клиент →</a></p>' +
      '<h2 class="drw__t" id="dT">' + esc(r.id) + '</h2>' +
      '<ol class="funnel">' + bar + '</ol>' +
      '<div class="drw__st">' + act + '</div>' +
      '<div class="lost-f" id="lostF" hidden><label class="fld">Причина отказа<select id="lostR">' + REASONS.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></label><div class="btns"><button class="btn" type="button" id="lostOk">Закрыть с отказом</button><button class="btn btn--o" type="button" id="lostNo">Не надо</button></div></div>' +
      '<div class="drw__row"><label class="fld">Этап<span class="sr"> заявки</span>' + statusSel(r, 'ssel--big') + '</label>' +
      '<label class="fld">Ответственный<select id="dMan" class="ssel ssel--big">' + ['<option value="">не назначен</option>'].concat(MANAGERS.map(function (m) { return '<option' + (r.manager === m ? ' selected' : '') + '>' + m + '</option>'; })).join('') + '</select></label></div>' +
      '<section class="drw__s"><h3>Клиент</h3><dl class="kv">' +
        '<div><dt>Компания</dt><dd>' + esc(r.company) + '</dd></div>' + (r.inn ? '<div><dt>ИНН</dt><dd>' + esc(r.inn) + '</dd></div>' : '') +
        '<div><dt>Контакт</dt><dd>' + esc(r.contact) + '</dd></div>' +
        '<div><dt>Телефон</dt><dd><a href="tel:+70000000000" data-demo="Звонок клиенту из кабинета">' + esc(r.phone) + '</a></dd></div>' +
        '<div><dt>Почта</dt><dd><a href="mailto:' + esc(r.email) + '" data-demo="Письмо клиенту из кабинета">' + esc(r.email) + '</a></dd></div>' +
        '<div><dt>Доставка</dt><dd>' + esc(r.delivery) + ' · ' + esc(r.city) + '</dd></div></dl></section>' +
      '<section class="drw__s"><h3>Состав · ' + r.items.length + '&nbsp;' + PO.plural(r.items.length, 'позиция', 'позиции', 'позиций') + '</h3>' +
        (r.items.length ? '<table class="dtab"><tbody>' + r.items.map(function (it) {
          var p = PO.byId(it.id); if (!p) return '';
          return '<tr><td><a href="izdelie.html?id=' + p.id + '">' + p.name + '</a><small>' + p.id + (it.cut ? ' · резка ' + it.cut.n + '&nbsp;×&nbsp;' + fmt(it.cut.len) + '&nbsp;мм' : '') + '</small></td>' +
            '<td class="r">' + fmt(it.qty, it.qty % 1 ? 1 : 0) + '&nbsp;' + (p.unit === 'лист' ? 'л.' : 'м') + '</td><td class="r"><b>' + fmt(it.qty * p.price) + '&nbsp;₽</b></td></tr>';
        }).join('') + '</tbody><tfoot><tr><td>Итого · ' + fmt(t.kg, 1) + '&nbsp;кг</td><td></td><td class="r"><b>' + fmt(t.sum) + '&nbsp;₽</b></td></tr></tfoot></table>' : '<p class="mute">Позиций нет — клиент приложил файл.</p>') +
        (r.file ? '<p class="drw__file">Файл: ' + esc(r.file) + '</p>' : '') + '</section>' +
      (r.comment ? '<section class="drw__s"><h3>Комментарий клиента</h3><p>' + esc(r.comment) + '</p></section>' : '') +
      '<section class="drw__s"><h3>История</h3><ol class="hist">' + r.history.slice().reverse().map(function (h) {
        return '<li><i class="st st--' + h.s + '"></i><div><b>' + esc(h.note) + '</b><small>' + dt(h.t, true) + '</small></div></li>';
      }).join('') + '</ol>' +
      '<form class="note" id="noteF"><label class="sr" for="noteT">Заметка</label><textarea id="noteT" rows="2" placeholder="Например: «перезвонить после обеда», «нужен паспорт на каждую партию»"></textarea><button class="btn btn--o" type="submit">Добавить заметку</button></form></section>';
    if ($('drw').hidden) { $('drw').hidden = false; document.body.classList.add('lock'); setTimeout(function () { $('dX').focus(); }, 20); }
    history.replaceState(null, '', '#' + encodeURIComponent(id));
  }
  function lastBeforeLost(r) { for (var i = r.history.length - 1; i >= 0; i--) if (r.history[i].s !== 'lost') return r.history[i].s; return 'new'; }
  function closeCard() { $('drw').hidden = true; document.body.classList.remove('lock'); openId = null; history.replaceState(null, '', location.pathname); }

  function renderAll() {
    kpi();
    $('vList').setAttribute('aria-pressed', view === 'list'); $('vBoard').setAttribute('aria-pressed', view === 'board');
    $('listWrap').hidden = view !== 'list'; $('board').hidden = view !== 'board'; $('stabs').hidden = view !== 'list';
    if (view === 'list') listView(); else boardView();
    if (openId) openCard(openId);
  }

  /* Перетаскивание на доске */
  var dragId = null;
  $('board').addEventListener('dragstart', function (e) { var c = e.target.closest('.card'); if (!c) return; dragId = c.getAttribute('data-id'); c.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  $('board').addEventListener('dragend', function (e) { var c = e.target.closest('.card'); if (c) c.classList.remove('is-drag'); document.querySelectorAll('.col.is-over').forEach(function (x) { x.classList.remove('is-over'); }); });
  $('board').addEventListener('dragover', function (e) { var col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.col.is-over').forEach(function (x) { if (x !== col) x.classList.remove('is-over'); }); col.classList.add('is-over'); });
  $('board').addEventListener('drop', function (e) {
    var col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault();
    var s = col.getAttribute('data-col'), id = dragId; dragId = null;
    if (s === 'lost') { openCard(id); showLost(); return; }
    setStatus(id, s);
  });

  function showLost() { var lf = $('lostF'); if (lf) { lf.hidden = false; $('lostR').focus(); } }

  /* События */
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-s]');
    if (s && (s.closest('#kpi') || s.closest('#stabs'))) { var k = s.getAttribute('data-s'); f.s = f.s === k && s.closest('#kpi') ? 'all' : k; if (view === 'board' && s.closest('#kpi')) view = 'list'; renderAll(); return; }
    var go = e.target.closest('[data-go]'); if (go && openId) { setStatus(openId, go.getAttribute('data-go')); return; }
    if (e.target.closest('#dLost')) { showLost(); return; }
    if (e.target.closest('#lostOk') && openId) { setStatus(openId, 'lost', $('lostR').value); return; }
    if (e.target.closest('#lostNo')) { $('lostF').hidden = true; return; }
    var row = e.target.closest('[data-open]');
    if (row && !e.target.closest('select')) openCard(row.getAttribute('data-open'));
  });
  document.addEventListener('keydown', function (e) {
    var row = e.target.closest && e.target.closest('[data-open]');
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCard(row.getAttribute('data-open')); }
    if (e.key === 'Escape' && openId && !document.querySelector('.demo.on')) closeCard();
  });
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-st]');
    if (sel) { var v = sel.value, id = sel.getAttribute('data-st'); if (v === 'lost') { openCard(id); showLost(); renderAll(); showLost(); return; } setStatus(id, v); return; }
    if (e.target.id === 'dMan' && openId) {
      var m = e.target.value;
      PO.CRM.update(openId, function (r) { r.manager = m; r.history.push({ t: new Date().toISOString(), s: r.status, note: m ? 'Ответственный: ' + m : 'Ответственный снят' }); });
      renderAll();
    }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'noteF') return;
    e.preventDefault(); var v = $('noteT').value.trim(); if (!v) { $('noteT').focus(); return; }
    PO.CRM.update(openId, function (r) { r.history.push({ t: new Date().toISOString(), s: r.status, note: 'Заметка: ' + v }); });
    renderAll();
  });
  $('dX').addEventListener('click', closeCard);
  $('drw').addEventListener('click', function (e) { if (e.target === $('drw')) closeCard(); });
  [['vList', 'list'], ['vBoard', 'board']].forEach(function (v) {
    $(v[0]).addEventListener('click', function () { view = v[1]; try { localStorage.setItem('po.crm.view', view); } catch (er) {} renderAll(); });
  });
  var qT; $('cq').addEventListener('input', function () { var v = this.value; clearTimeout(qT); qT = setTimeout(function () { f.q = v.trim(); renderAll(); }, 150); });
  $('cPer').addEventListener('change', function () { f.per = +this.value; renderAll(); });
  $('cMan').innerHTML = '<option value="all">Все менеджеры</option>' + MANAGERS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '<option value="—">Не назначен</option>';
  $('cMan').addEventListener('change', function () { f.man = this.value; renderAll(); });
  $('cReset').addEventListener('click', function () { f = { s: 'all', q: '', per: 0, man: 'all' }; $('cq').value = ''; $('cPer').value = '0'; $('cMan').value = 'all'; renderAll(); });
  window.addEventListener('storage', function (e) { if (e.key === 'po.crm.v2') renderAll(); });

  renderAll();
  var h = decodeURIComponent(location.hash.slice(1));
  if (h && h !== 'probnyj-sajt') openCard(h);
})();
