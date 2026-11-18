/* Инструменты на страницах «Профиль по чертежу» и «Доставка» */
(function () {
  var PO = window.PO, fmt = PO.fmt, $ = function (id) { return document.getElementById(id); };

  /* Оценка партии по площади сечения */
  if ($('estF')) {
    var PRICE = { 'АД31': 436, '6063': 452 }, DIE = 38000;
    var calc = function () {
      var A = parseFloat(String($('eA').value).replace(',', '.')), L = Math.round(+$('eL').value), al = $('eAl').value, an = $('eAn').checked;
      var out = $('eR');
      if (!A || A < 20) { out.innerHTML = '<span class="err">Укажите площадь сечения от&nbsp;20&nbsp;мм². Её показывает CAD-программа.</span>'; return; }
      if (A > 25000) { out.innerHTML = '<span class="err">Такое сечение не&nbsp;поместится в&nbsp;круг Ø&nbsp;180&nbsp;мм. Пришлите чертёж — технолог предложит решение.</span>'; return; }
      if (!L || L < 1) { out.innerHTML = '<span class="err">Укажите, сколько метров нужно.</span>'; return; }
      var kgm = A * 2.70 / 1000, kg = kgm * L, perKg = PRICE[al] * (an ? 1.18 : 1);
      var metal = kg * perKg, minKg = 300, short = kg < minKg;
      var payKg = Math.max(kg, minKg);
      var back = payKg >= 3000; // матрицу возвращаем скидкой от 3 т
      out.innerHTML =
        '<div class="calc__sum"><span>Ориентир с&nbsp;НДС</span><b>' + fmt(payKg * perKg + (back ? 0 : DIE)) + '&nbsp;₽</b></div>' +
        '<span class="calc__how">' + fmt(kgm, 3) + '&nbsp;кг/м · ' + fmt(kg, 0) + '&nbsp;кг · ' + fmt(perKg) + '&nbsp;₽/кг</span>' +
        (short ? '<span>Минимальная партия — 300&nbsp;кг, это ' + fmt(minKg / kgm, 0) + '&nbsp;м вашего профиля. Цена посчитана за&nbsp;300&nbsp;кг; лишнее отгрузим или оставим на&nbsp;складе под следующий заказ.</span>' : '') +
        '<span>' + (back ? 'Матрица 38&nbsp;000&nbsp;₽ — за&nbsp;наш счёт: при партии от&nbsp;3&nbsp;т её стоимость возвращаем скидкой.' : 'Включая матрицу 38&nbsp;000&nbsp;₽ — платите один раз, повторные партии без неё. От&nbsp;3&nbsp;т в&nbsp;заказе возвращаем её стоимость.') + '</span>';
    };
    ['eA', 'eL', 'eAl', 'eAn'].forEach(function (k) { $(k).addEventListener('input', calc); $(k).addEventListener('change', calc); });
    calc();
  }

  /* Запрос технологу — попадает в кабинет менеджера как заявка */
  if ($('drawF')) {
    var f = $('drawF');
    PO.enterNext(f);
    f.file.addEventListener('change', function () { f.querySelector('[data-ft]').textContent = this.files[0] ? 'Файл: ' + this.files[0].name : 'Приложить чертёж сечения'; });
    f.phone.addEventListener('input', function () {
      var d = this.value.replace(/\D/g, ''); if (d[0] === '8') d = '7' + d.slice(1); if (d && d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
      var o = d ? '+7' : ''; if (d.length > 1) o += ' (' + d.slice(1, 4); if (d.length >= 4) o += ')'; if (d.length > 4) o += ' ' + d.slice(4, 7); if (d.length > 7) o += '-' + d.slice(7, 9); if (d.length > 9) o += '-' + d.slice(9, 11);
      this.value = o;
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var errs = [];
      if (!f.file.files.length && f.comment.value.trim().length < 10) errs.push('Приложите чертёж или опишите сечение словами — хотя бы габарит и толщину стенки.');
      if (f.company.value.trim().length < 2) errs.push('Напишите компанию — так технолог найдёт вас в&nbsp;базе.');
      if (f.phone.value.replace(/\D/g, '').length !== 11 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) errs.push('Нужен телефон или почта, чтобы прислать расчёт.');
      var box = $('dErr');
      if (errs.length) { box.hidden = false; box.innerHTML = '<b>Почти готово:</b><ul>' + errs.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; return; }
      box.hidden = true;
      var rec = {
        id: PO.CRM.nextId(), date: new Date().toISOString(), company: f.company.value.trim(), inn: '', contact: f.contact.value.trim() || '—',
        phone: f.phone.value || '—', email: f.email.value.trim() || '—', city: '—', delivery: 'обсудить', status: 'new', manager: '',
        items: [], comment: 'Профиль по чертежу. ' + f.comment.value.trim(), file: f.file.files[0] ? f.file.files[0].name : '',
        history: [{ t: new Date().toISOString(), s: 'new', note: 'Запрос технологу с сайта' }]
      };
      PO.CRM.add(rec);
      if (rec.email !== '—') PO.My.add(rec.id, rec.email);
      f.innerHTML = '<div class="sent-ok"><p class="kick">Запрос отправлен</p><h3 class="h2">№ ' + rec.id + '</h3><p>Технолог ответит за&nbsp;1&nbsp;рабочий день' + (rec.email !== '—' ? ' на&nbsp;' + rec.email.replace(/</g, '') : '') + '.</p><div class="btns"><a class="btn" href="kabinet.html#' + encodeURIComponent(rec.id) + '">Посмотреть в кабинете менеджера <span aria-hidden="true">→</span></a></div></div>';
      PO.openDemo('Запрос ' + rec.id + ' сохранён в кабинете менеджера', { href: 'kabinet.html#' + encodeURIComponent(rec.id), label: 'Открыть в кабинете' });
    });
  }

  /* Калькулятор доставки */
  if ($('dcF')) {
    var Z = {
      kaluga: { name: 'Калуга и область', price: 2500, free: 150000, crane: false, when: 'на следующий рабочий день' },
      msk: { name: 'Москва и Подмосковье', price: 9000, free: 400000, crane: true, when: 'ближайший вторник или пятница' },
      tk: { name: 'другой город через ТК', price: 0, free: 0, crane: false, when: 'передаём в ТК в день оплаты' },
      self: { name: 'самовывоз из Калуги', price: 0, free: 0, crane: false, when: 'через 2 часа после оплаты' }
    };
    var dc = function () {
      var z = Z[$('dcF').zone.value], sum = Math.max(0, +$('dcSum').value || 0);
      $('dcCraneL').hidden = !z.crane; if (!z.crane) $('dcCrane').checked = false;
      var crane = $('dcCrane').checked ? 3000 : 0, free = z.free && sum >= z.free, price = (free ? 0 : z.price) + crane;
      var h = '<div class="calc__sum"><span>Доставка</span><b>' + (price ? fmt(price) + '&nbsp;₽' : 'бесплатно') + '</b></div><span class="calc__how">' + z.name + ' · ' + z.when + '</span>';
      if (z.free && !free) h += '<span>До&nbsp;бесплатной доставки не&nbsp;хватает ' + fmt(z.free - sum) + '&nbsp;₽ в&nbsp;заказе.</span>';
      if (free) h += '<span class="ok">Заказ от&nbsp;' + fmt(z.free) + '&nbsp;₽ — машину оплачиваем мы' + (crane ? ', манипулятор — 3&nbsp;000&nbsp;₽' : '') + '.</span>';
      if ($('dcF').zone.value === 'tk') h += '<span>До&nbsp;терминала в&nbsp;Калуге везём бесплатно, дальше — по&nbsp;тарифу ТК. Точную сумму пришлём в&nbsp;КП.</span>';
      $('dcR').innerHTML = h;
    };
    $('dcF').addEventListener('input', dc); $('dcF').addEventListener('change', dc); $('dcF').addEventListener('submit', function (e) { e.preventDefault(); });
    dc();
  }
})();
