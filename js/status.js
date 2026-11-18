/* Статус заявки для покупателя: ищем по номеру и почте, показываем только эту заявку */
(function () {
  var PO = window.PO, fmt = PO.fmt, $ = function (id) { return document.getElementById(id); };
  var form = $('tf'), cur = null;

  function norm(id) { return String(id || '').trim().toUpperCase().replace(/^KP/, 'КП').replace(/\s+/g, '').replace(/^КП(?!-)/, 'КП-'); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function when(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function at(r, s) { var h = r.history.filter(function (x) { return x.s === s; }); return h.length ? h[h.length - 1].t : null; }

  function find(id, email) {
    id = norm(id); email = String(email || '').trim().toLowerCase();
    return PO.CRM.all().filter(function (r) { return r.id === id && r.email.toLowerCase() === email; })[0] || null;
  }

  function show(r) {
    cur = r;
    var order = PO.STAGES, lost = r.status === 'lost', t = PO.CRM.total(r.items);
    var lastSt = r.status; if (lost) { for (var j = r.history.length - 1; j >= 0; j--) if (r.history[j].s !== 'lost') { lastSt = r.history[j].s; break; } }
    var idx = order.indexOf(lastSt);
    var steps = [
      { k: 'new', title: 'Заявка получена', text: 'Номер ' + esc(r.id) + '. Менеджер увидит её в течение рабочего часа.' },
      { k: 'work', title: 'Менеджер готовит КП', text: r.manager ? 'Ответственный — ' + esc(r.manager) + '. Проверяет остатки, резку и сроки; позвонит, если что-то неясно.' : 'Проверяем остатки, резку и сроки.' },
      { k: 'sent', title: 'КП отправлено', text: 'Цена, срок отгрузки и условия — на ' + esc(r.email) + '. Если письма нет, проверьте папку «Спам».' },
      { k: 'agreed', title: 'КП согласовано, счёт выставлен', text: 'Договор и счёт — по ЭДО или на почту. Цену держим 5 рабочих дней.' },
      { k: 'paid', title: 'Оплата получена', text: 'Комплектуем заказ: режем, упаковываем, готовим паспорт качества.' },
      { k: 'shipped', title: 'Отгружено', text: r.delivery === 'Самовывоз' ? 'Заказ выдан на складе в Калуге.' : 'Заказ в пути: ' + esc(r.delivery).toLowerCase() + ', ' + esc(r.city) + '. УПД и паспорт — с водителем.' }
    ];
    var NAMES = { 'new': 'Получена', work: 'В работе', sent: 'КП отправлено', agreed: 'Согласовано', paid: 'Оплачено', shipped: 'Отгружено', lost: 'Закрыта' };
    $('tRes').innerHTML =
      '<div class="trk__h"><div><p class="kick">' + esc(r.company) + '</p><h2 class="trk__n">' + esc(r.id) + '</h2><p class="mute">от ' + when(r.date) + (r.items.length ? ' · ' + r.items.length + '&nbsp;' + PO.plural(r.items.length, 'позиция', 'позиции', 'позиций') + ' на&nbsp;' + fmt(t.sum) + '&nbsp;₽' : ' · спецификация файлом') + '</p></div>' +
      '<span class="trk__st trk__st--' + r.status + '"><i class="st st--' + r.status + '"></i>' + NAMES[r.status] + '</span></div>' +
      (lost ? '<p class="trk__lost">Заявка закрыта без заказа' + (r.lostReason ? ' (' + esc(r.lostReason.toLowerCase()) + ')' : '') + '. Если передумаете — позвоните менеджеру, восстановим её за минуту.</p>' : '') +
      '<ol class="tl">' + steps.map(function (s, i) {
        var state = i < idx ? 'done' : i === idx ? (lost ? 'done' : 'now') : 'next', tm = at(r, s.k);
        return '<li class="tl__i tl__i--' + state + '"><i aria-hidden="true"></i><div><b>' + s.title + '</b>' + (tm && i <= idx ? '<small>' + when(tm) + '</small>' : i > idx ? '<small>' + (lost ? '—' : 'ожидает') + '</small>' : '') + '<span>' + s.text + '</span></div></li>';
      }).join('') + '</ol>' +
      '<div class="trk__a"><a class="btn" href="tel:+70000000000" data-demo="Звонок менеджеру по заявке ' + esc(r.id) + '">Позвонить менеджеру</a><a class="btn btn--o" href="kabinet.html#' + encodeURIComponent(r.id) + '">Как это видит менеджер <span aria-hidden="true">→</span></a></div>' +
      '<p class="trk__live">Статус обновится сам, как только менеджер изменит его в&nbsp;кабинете.</p>';
    $('tRes').hidden = false;
    if (typeof myList === 'function') myList();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('tErr'), id = form.id.value, em = form.email.value;
    if (!id.trim() || !em.trim()) { err.hidden = false; err.textContent = 'Нужны и номер заявки, и почта — так никто, кроме вас, не увидит заявку.'; return; }
    var r = find(id, em);
    if (!r) { err.hidden = false; err.textContent = 'Не нашли заявку с таким номером и почтой. Проверьте номер в письме — он вида КП-1611-101.'; $('tRes').hidden = true; return; }
    err.hidden = true; show(r);
    history.replaceState(null, '', '?id=' + encodeURIComponent(r.id) + '&e=' + encodeURIComponent(r.email));
  });

  // Подсказка для демо: берём настоящую заявку-пример из этого браузера
  var ex = PO.CRM.all().filter(function (r) { return r.demo && r.status === 'agreed'; })[0];
  var hint = document.querySelector('.trk__hint');
  if (ex) hint.innerHTML = 'Номер приходит в письме после отправки. Посмотреть на готовой заявке: <button type="button" class="lnkb" id="fillEx">' + ex.id + '</button>.';
  document.addEventListener('click', function (e) { if (e.target.id === 'fillEx') { form.id.value = ex.id; form.email.value = ex.email; form.requestSubmit(); } });

  /* Ваши заявки с этого устройства */
  var NM = { 'new': 'Получена', work: 'В работе', sent: 'КП отправлено', agreed: 'Согласовано', paid: 'Оплачено', shipped: 'Отгружено', lost: 'Закрыта' };
  function myList() {
    var mine = PO.My.all().map(function (m) { return find(m.id, m.email); }).filter(Boolean);
    $('my').hidden = !mine.length;
    $('myL').innerHTML = mine.map(function (r) {
      var t = PO.CRM.total(r.items);
      return '<li><button type="button" data-my="' + esc(r.id) + '" data-e="' + esc(r.email) + '"' + (cur && cur.id === r.id ? ' aria-current="true"' : '') + '><b>' + esc(r.id) + '</b><span>' + when(r.date) + (r.items.length ? ' · ' + fmt(t.sum) + '&nbsp;₽' : '') + '</span>' +
        '<em><i class="st st--' + r.status + '"></i>' + NM[r.status] + '</em></button></li>';
    }).join('');
  }
  $('myL').addEventListener('click', function (e) {
    var b = e.target.closest('[data-my]'); if (!b) return;
    form.id.value = b.getAttribute('data-my'); form.email.value = b.getAttribute('data-e'); form.requestSubmit();
  });
  myList();

  // Ссылка из письма или со страницы «Заявка отправлена» сразу показывает статус
  var u = new URLSearchParams(location.search);
  if (u.get('id')) { form.id.value = u.get('id'); form.email.value = u.get('e') || ''; if (u.get('e')) form.requestSubmit(); }

  // Если менеджер меняет статус в другой вкладке — обновляем
  window.addEventListener('storage', function (e) { if (e.key === 'po.crm.v2') { if (cur) { var r = find(cur.id, cur.email); if (r) show(r); } myList(); } });
  setInterval(function () { if (cur && !document.hidden) { var r = find(cur.id, cur.email); if (r && JSON.stringify(r.history) !== JSON.stringify(cur.history)) show(r); } }, 3000);
})();
