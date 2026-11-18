/* Заявка на КП: состав, количество, форма, отправка в демо-CRM */
(function () {
  var PO = window.PO, fmt = PO.fmt, $ = function (id) { return document.getElementById(id); };
  var form = $('rf');

  function unitOf(p) { return p.unit === 'лист' ? 'л.' : 'м'; }

  function render() {
    var list = PO.Request.items().filter(function (it) { return PO.byId(it.id); });
    $('rEmpty').hidden = list.length > 0; $('tot').hidden = !list.length;
    $('items').innerHTML = list.map(function (it, i) {
      var p = PO.byId(it.id), sum = it.qty * p.price;
      var qty = it.cut
        ? '<div class="ri__cut"><label>Отрезок, мм<input type="number" min="50" step="1" value="' + it.cut.len + '" data-cl="' + i + '"></label><label>Штук<input type="number" min="1" step="1" value="' + it.cut.n + '" data-cn="' + i + '"></label></div>' +
          '<small class="ri__how">= ' + fmt(it.qty, it.qty % 1 ? 1 : 0) + '&nbsp;м, ' + Math.round(it.qty * 1000 / p.len) + '&nbsp;' + PO.plural(Math.round(it.qty * 1000 / p.len), 'хлыст', 'хлыста', 'хлыстов') + '</small>'
        : '<label class="ri__q"><span class="sr">Количество, ' + unitOf(p) + '</span><button type="button" data-dec="' + i + '" aria-label="Меньше">−</button><input type="number" min="' + (p.unit === 'лист' ? 1 : 0.5) + '" step="' + (p.unit === 'лист' ? 1 : 0.5) + '" value="' + PO.num(it.qty).replace(',', '.') + '" data-q="' + i + '"><button type="button" data-inc="' + i + '" aria-label="Больше">+</button><em>' + unitOf(p) + '</em></label>';
      return '<article class="ri">' + PO.section(p.cat) +
        '<div class="ri__n"><a href="izdelie.html?id=' + p.id + '">' + p.name + '</a><small>' + p.id + ' · ' + fmt(p.price) + '&nbsp;₽/' + (p.unit === 'лист' ? 'лист' : 'м') + (p.stock > 0 ? ' · на складе ' + fmt(p.stock) + '&nbsp;' + unitOf(p) : ' · под заказ, 5–9 дн.') + '</small></div>' +
        '<div class="ri__qty">' + qty + '</div>' +
        '<div class="ri__s"><b>' + fmt(sum) + '&nbsp;₽</b><small>' + fmt(p.unit === 'лист' ? it.qty * p.unitKg : it.qty * p.kgm, 1) + '&nbsp;кг</small></div>' +
        '<button type="button" class="ri__x" data-rm="' + i + '" aria-label="Убрать ' + p.name + '">×</button></article>';
    }).join('');
    var t = PO.CRM.total(list);
    $('tot').innerHTML = '<div><span>Позиций</span><b>' + list.length + '</b></div><div><span>Масса</span><b>' + fmt(t.kg, 1) + '&nbsp;кг</b></div>' +
      '<div class="req__sum"><span>Ориентировочно с&nbsp;НДС</span><b>' + fmt(t.sum) + '&nbsp;₽</b></div>' +
      '<p>Точную цену с&nbsp;учётом объёма и&nbsp;доставки пришлём в&nbsp;КП. Если резка или остатки не&nbsp;сойдутся — менеджер позвонит.</p>';
    $('send').textContent = list.length ? 'Отправить заявку' : 'Отправить спецификацию';
  }

  /* Пустая заявка: быстрые кнопки «часто берут» */
  $('quick').innerHTML = ['PO-1104', 'PO-1119', 'PO-1110', 'PO-1134'].map(function (id) {
    var p = PO.byId(id); return '<button type="button" class="btn btn--o" data-quick="' + id + '">+ ' + p.title.replace('равнополочный', '').replace('круглый', '') + ' ' + p.size + '</button>';
  }).join('');
  $('quick').addEventListener('click', function (e) {
    var b = e.target.closest('[data-quick]'); if (!b) return;
    var p = PO.byId(b.getAttribute('data-quick')); PO.Request.add({ id: p.id, qty: p.len / 1000 });
  });

  /* Изменение количества */
  function list() { return PO.Request.items(); }
  $('items').addEventListener('click', function (e) {
    var t = e.target, l = list(), i;
    if ((i = t.getAttribute('data-rm')) !== null) { PO.Request.remove(+i); return; }
    if ((i = t.getAttribute('data-inc')) !== null || (i = t.getAttribute('data-dec')) !== null) {
      var p = PO.byId(l[i].id), step = p.unit === 'лист' ? 1 : p.len / 1000, min = p.unit === 'лист' ? 1 : 0.5;
      var q = l[i].qty + (t.hasAttribute('data-inc') ? step : -step);
      PO.Request.set(+i, Math.max(min, +q.toFixed(2)));
    }
  });
  $('items').addEventListener('change', function (e) {
    var t = e.target, l = list(), i;
    if ((i = t.getAttribute('data-q')) !== null) {
      var p = PO.byId(l[i].id), v = parseFloat(String(t.value).replace(',', '.'));
      if (!v || v <= 0) { PO.toast('Количество должно быть больше нуля. Чтобы убрать позицию, нажмите ×.'); render(); return; }
      PO.Request.set(+i, p.unit === 'лист' ? Math.ceil(v) : +v.toFixed(2));
    }
    if ((i = t.getAttribute('data-cl')) !== null || (i = t.getAttribute('data-cn')) !== null) {
      var it = l[i], p2 = PO.byId(it.id);
      var len = t.hasAttribute('data-cl') ? Math.round(+t.value) : it.cut.len, n = t.hasAttribute('data-cn') ? Math.round(+t.value) : it.cut.n;
      var r = PO.cutPlan(p2, len, n);
      if (r.err) { PO.toast(r.err.replace(/&nbsp;/g, ' ')); render(); return; }
      var all = list(); all[i].cut = { len: len, n: n }; all[i].qty = r.meters;
      try { localStorage.setItem('po.request.v1', JSON.stringify(all)); } catch (er) {}
      document.dispatchEvent(new CustomEvent('request:change'));
      document.querySelectorAll('[data-req-count]').forEach(function (el) { el.textContent = all.length; });
    }
  });
  document.addEventListener('request:change', render);

  /* Форма */
  var delivery = form.querySelectorAll('[name=delivery]');
  delivery.forEach(function (r) { r.addEventListener('change', function () { $('cityF').hidden = form.delivery.value === 'Самовывоз'; }); });
  $('file').addEventListener('change', function () {
    var f = this.files[0];
    if (f && f.size > 20 * 1024 * 1024) { this.value = ''; $('fileT').textContent = 'Файл больше 20 МБ — пришлите ссылку в комментарии'; return; }
    $('fileT').textContent = f ? 'Файл: ' + f.name : 'Приложить спецификацию или чертёж';
  });
  // телефон: оставляем цифры и собираем в +7 (XXX) XXX-XX-XX
  form.phone.addEventListener('input', function () {
    var d = this.value.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d && d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var o = d ? '+7' : '';
    if (d.length > 1) o += ' (' + d.slice(1, 4);
    if (d.length >= 4) o += ')';
    if (d.length > 4) o += ' ' + d.slice(4, 7);
    if (d.length > 7) o += '-' + d.slice(7, 9);
    if (d.length > 9) o += '-' + d.slice(9, 11);
    this.value = o;
  });
  form.inn.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 12); });

  function check() {
    var errs = [], f = form, items = list();
    function bad(el, msg) { el.closest('.fld, .ck').classList.add('is-err'); el.setAttribute('aria-invalid', 'true'); errs.push([el, msg]); }
    form.querySelectorAll('.is-err').forEach(function (x) { x.classList.remove('is-err'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (f.company.value.trim().length < 2) bad(f.company, 'Напишите название компании — его поставим в КП и счёт.');
    if (f.inn.value && !/^(\d{10}|\d{12})$/.test(f.inn.value)) bad(f.inn, 'В ИНН 10 цифр у компании или 12 у ИП. Можно оставить поле пустым.');
    if (f.contact.value.trim().length < 2) bad(f.contact, 'Как к вам обращаться?');
    if (f.phone.value.replace(/\D/g, '').length !== 11) bad(f.phone, 'Телефон нужен полностью, 10 цифр после +7 — менеджер позвонит, если резка не сойдётся.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) bad(f.email, 'Проверьте почту — на неё придёт КП.');
    if (!items.length && !f.file.files.length && f.comment.value.trim().length < 5) bad(f.comment, 'Заявка пустая: добавьте позиции из каталога, приложите спецификацию или опишите, что нужно, в комментарии.');
    if (!f.agree.checked) bad(f.agree, 'Нужно согласие на обработку контактных данных.');
    var sum = $('errSum');
    if (errs.length) {
      sum.hidden = false;
      sum.innerHTML = '<b>Почти готово, поправьте ' + errs.length + '&nbsp;' + PO.plural(errs.length, 'поле', 'поля', 'полей') + ':</b><ul>' + errs.map(function (e) { return '<li>' + e[1] + '</li>'; }).join('') + '</ul>';
      errs[0][0].focus();
    } else sum.hidden = true;
    return !errs.length;
  }
  form.addEventListener('input', function (e) { var w = e.target.closest('.is-err'); if (w) { w.classList.remove('is-err'); e.target.removeAttribute('aria-invalid'); } });

  PO.enterNext(form);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!check()) return;
    var f = form, items = list();
    var rec = {
      id: PO.CRM.nextId(), date: new Date().toISOString(), company: f.company.value.trim(), inn: f.inn.value, contact: f.contact.value.trim(),
      phone: f.phone.value, email: f.email.value.trim(), city: f.delivery.value === 'Самовывоз' ? 'Калуга, самовывоз' : (f.city.value.trim() || '—'),
      delivery: f.delivery.value, status: 'new', manager: '', items: items, comment: f.comment.value.trim(), file: f.file.files[0] ? f.file.files[0].name : '',
      history: [{ t: new Date().toISOString(), s: 'new', note: 'Заявка с сайта' }], fresh: true
    };
    PO.CRM.add(rec);
    PO.Request.clear();
    $('reqWrap').hidden = true;
    document.querySelector('.pagehead').hidden = true;
    $('done').hidden = false;
    $('doneN').textContent = '№ ' + rec.id;
    var t = PO.CRM.total(items), esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    $('doneT').innerHTML = esc(rec.company) + ' · ' + (items.length ? items.length + '&nbsp;' + PO.plural(items.length, 'позиция', 'позиции', 'позиций') + ' на&nbsp;' + fmt(t.sum) + '&nbsp;₽' : 'спецификация файлом') + '. КП придёт на&nbsp;<b>' + esc(rec.email) + '</b>.';
    $('trackLink').href = 'status.html?id=' + encodeURIComponent(rec.id) + '&e=' + encodeURIComponent(rec.email);
    $('doneWhen').innerHTML = PO.workWhen();
    PO.My.add(rec.id, rec.email);
    window.scrollTo(0, 0);
    setTimeout(function () { PO.openDemo('Заявка ' + rec.id + ' сохранена в кабинете менеджера', { href: 'kabinet.html#' + encodeURIComponent(rec.id), label: 'Открыть в кабинете' }); }, 500);
  });

  render();
})();
