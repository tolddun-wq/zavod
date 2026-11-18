/* Общие скрипты: заявка на КП (хранится в браузере), счётчик в шапке,
   меню на телефоне, плашка пробного сайта, чертежи сечений. */
(function () {
  var KEY = 'po.request.v1';
  var mem = null; // запасной вариант, если браузер не даёт localStorage

  function read() {
    try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : []; }
    catch (e) { return mem || []; }
  }
  function write(list) {
    mem = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    updateCount();
    document.dispatchEvent(new CustomEvent('request:change'));
  }

  var Request = {
    items: read,
    count: function () { return read().length; },
    add: function (item) {
      var list = read(), key = item.id + '|' + (item.cut ? item.cut.len + 'x' + item.cut.n : '');
      var found = null;
      list.forEach(function (it) { if (it.id + '|' + (it.cut ? it.cut.len + 'x' + it.cut.n : '') === key) found = it; });
      if (found && !item.cut) found.qty = +(found.qty + item.qty).toFixed(2);
      else if (!found) list.push(item);
      else found.qty = item.qty;
      write(list);
    },
    set: function (i, qty) { var l = read(); if (l[i]) { l[i].qty = qty; write(l); } },
    remove: function (i) { var l = read(); l.splice(i, 1); write(l); },
    clear: function () { write([]); }
  };

  function updateCount() {
    var n = read().length;
    document.querySelectorAll('[data-req-count]').forEach(function (el) { el.textContent = n; });
  }

  /* Короткое уведомление внизу экрана */
  var toastEl, toastT;
  function toast(html) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = html; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 4200);
  }

  /* Плашка пробного сайта */
  var demo;
  function openDemo(text, extra) {
    if (!demo) {
      demo = document.createElement('div');
      demo.className = 'demo'; demo.setAttribute('role', 'dialog'); demo.setAttribute('aria-modal', 'true'); demo.setAttribute('aria-labelledby', 'demoT');
      demo.innerHTML = '<div class="demo__box"><i class="rv rv--1"></i><i class="rv rv--2"></i><i class="rv rv--3"></i><i class="rv rv--4"></i>' +
        '<button class="demo__x" type="button" aria-label="Закрыть">×</button>' +
        '<p class="demo__k" id="demoCtx"></p><h2 class="demo__t" id="demoT">Это пробный сайт</h2>' +
        '<p class="demo__p">Завод «Профиль-Ока», его цены и&nbsp;сотрудники придуманы. Хотите такой же сайт для своего производства — напишите в&nbsp;Telegram.</p>' +
        '<div class="demo__a"><a class="btn" href="https://t.me/isthisthedaggr" target="_blank" rel="noopener">Написать в Telegram <span aria-hidden="true">→</span></a>' +
        '<button class="btn btn--o" type="button" data-close>Вернуться на сайт</button><a class="btn btn--o" id="demoExtra" hidden></a></div>' +
        '<p class="demo__no">№&nbsp;ПО-0001 · АД31&nbsp;Т1 · 2026</p></div>';
      document.body.appendChild(demo);
      demo.addEventListener('click', function (e) { if (e.target === demo || e.target.closest('.demo__x,[data-close]')) closeDemo(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDemo(); });
    }
    demo.querySelector('#demoCtx').textContent = text || '';
    var ex = demo.querySelector('#demoExtra'), back = demo.querySelector('[data-close]');
    ex.hidden = !extra; back.hidden = !!extra;
    if (extra) { ex.href = extra.href; ex.innerHTML = extra.label + ' <span aria-hidden="true">→</span>'; }
    demo.classList.add('on'); document.body.classList.add('lock');
    setTimeout(function () { demo.querySelector('.btn').focus(); }, 30);
  }
  function closeDemo() { if (demo) { demo.classList.remove('on'); document.body.classList.remove('lock'); } }

  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-demo]');
    if (d) { e.preventDefault(); openDemo(d.getAttribute('data-demo')); }
  });

  /* Меню в шапке листается вбок колёсиком; у края убираем затухание */
  function initNavScroll() {
    var n = document.querySelector('.nav'); if (!n) return;
    function edge() { n.classList.toggle('at-end', n.scrollLeft + n.clientWidth >= n.scrollWidth - 2); }
    n.addEventListener('scroll', edge); window.addEventListener('resize', edge); edge();
    n.addEventListener('wheel', function (e) { if (n.scrollWidth > n.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX) && getComputedStyle(n).position !== 'fixed') { n.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    var cur = n.querySelector('[aria-current]'); if (cur && cur.offsetLeft + cur.offsetWidth > n.clientWidth) n.scrollLeft = cur.offsetLeft - 24;
  }
  /* На главной пункты меню прокручивают к своему блоку, не перезагружая страницу */
  function initAnchors() {
    var home = /(^|\/)(index\.html)?$/.test(location.pathname);
    document.querySelectorAll('a[href^="index.html#"]').forEach(function (a) {
      if (home) a.setAttribute('href', a.getAttribute('href').replace('index.html', ''));
    });
    if (home && location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
    // подсветить пункт меню того блока, который сейчас на экране
    if (!home || !('IntersectionObserver' in window)) return;
    var links = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { if (l.getAttribute('href') === '#' + e.target.id) { links.forEach(function (x) { x.removeAttribute('aria-current'); }); l.setAttribute('aria-current', 'true'); } }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var t = document.getElementById(l.getAttribute('href').slice(1)); if (t) io.observe(t); });
  }
  function initMenu() {
    var b = document.querySelector('.burger'), m = document.getElementById('menu');
    if (!b || !m) return;
    b.addEventListener('click', function () {
      var on = !m.classList.contains('on');
      m.classList.toggle('on', on); b.setAttribute('aria-expanded', on); document.body.classList.toggle('lock', on);
    });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) { m.classList.remove('on'); document.body.classList.remove('lock'); b.setAttribute('aria-expanded', false); } });
  }

  /* Чертёж сечения для раздела или изделия (SVG) */
  function section(cat, opt) {
    opt = opt || {};
    var k = '#111', f = opt.fill || '#D9D9D5', w = opt.stroke || 1.6;
    var g = '';
    switch (cat) {
      case 'ugolok': g = '<path d="M14 6V66H74V58H22V6Z"/>'; break;
      case 'truba': g = '<circle cx="40" cy="36" r="30"/><circle cx="40" cy="36" r="23" fill="var(--bg,#EEEEEB)"/>'; break;
      case 'profil': g = '<rect x="10" y="12" width="60" height="48"/><rect x="17" y="19" width="46" height="34" fill="var(--bg,#EEEEEB)"/>'; break;
      case 'shveller': g = '<path d="M10 10H70V18H18V54H70V62H10Z"/>'; break;
      case 'polosa': g = '<rect x="6" y="28" width="68" height="16"/>'; break;
      case 'prutok': g = '<circle cx="40" cy="36" r="28"/>'; break;
      case 'list': g = '<path d="M6 46L54 30H76L28 46Z"/><path d="M6 46V52H28V46M28 52L76 36V30" fill="none"/>'; break;
      case 'cvet': g = '<circle cx="28" cy="40" r="20"/><circle cx="58" cy="28" r="14"/>'; break;
    }
    return '<svg class="sec" viewBox="0 0 80 72" aria-hidden="true"><g fill="' + f + '" stroke="' + k + '" stroke-width="' + w + '" stroke-linejoin="miter">' + g + '</g></svg>';
  }

  /* Сравнение: до 4 позиций */
  var CKEY = 'po.compare.v1', cmem = [];
  function cread() { try { var v = localStorage.getItem(CKEY); return v ? JSON.parse(v) : []; } catch (e) { return cmem; } }
  function cwrite(l) { cmem = l; try { localStorage.setItem(CKEY, JSON.stringify(l)); } catch (e) {} document.dispatchEvent(new CustomEvent('compare:change')); }
  var Compare = {
    ids: cread,
    has: function (id) { return cread().indexOf(id) > -1; },
    toggle: function (id) {
      var l = cread(), i = l.indexOf(id);
      if (i > -1) { l.splice(i, 1); cwrite(l); return true; }
      if (l.length >= 4) return false;
      l.push(id); cwrite(l); return true;
    },
    clear: function () { cwrite([]); }
  };

  /* Расчёт резки: сколько хлыстов, остатки, сумма. Пропил пилы 3 мм */
  function cutPlan(p, cut, n) {
    var KERF = 3, L = p.len;
    if (!cut || cut < 50) return { err: 'Режем отрезки от&nbsp;50&nbsp;мм. Укажите длину отрезка.' };
    if (cut > L) return { err: 'Хлыст этого изделия — ' + window.PO.fmt(L) + '&nbsp;мм. Длиннее не&nbsp;режем: напишите в&nbsp;заявке, подберём стыковку или профиль по&nbsp;чертежу.' };
    if (!n || n < 1) return { err: 'Укажите, сколько отрезков нужно.' };
    if (n > 5000) return { err: 'Больше 5&nbsp;000 отрезков считаем вручную — добавьте позицию в&nbsp;заявку без резки.' };
    var per = Math.floor((L + KERF) / (cut + KERF)), bars = Math.ceil(n / per);
    var rest = L - per * (cut + KERF) + KERF, lastCuts = n - per * (bars - 1), lastRest = L - lastCuts * (cut + KERF) + KERF;
    var rests = [];
    if (bars > 1 && Math.abs(rest - lastRest) < 1 && rest >= 300) rests.push(bars + '&nbsp;×&nbsp;' + window.PO.fmt(rest) + '&nbsp;мм');
    else {
      if (bars > 1 && rest >= 300) rests.push((bars - 1) + '&nbsp;×&nbsp;' + window.PO.fmt(rest) + '&nbsp;мм');
      if (lastRest >= 300) rests.push('1&nbsp;×&nbsp;' + window.PO.fmt(lastRest) + '&nbsp;мм');
    }
    var meters = bars * L / 1000;
    return { per: per, bars: bars, meters: meters, kg: meters * p.kgm, sum: meters * p.price, rests: rests };
  }

  /* Демо-CRM: заявки хранятся в браузере. При первом входе кладём примеры. */
  var RKEY = 'po.crm.v2', rmem = null;
  var DAY = 864e5;
  /* Этапы сделки. lost — отказ, стоит отдельно от цепочки. */
  var STAGES = ['new', 'work', 'sent', 'agreed', 'paid', 'shipped'];
  var NOTE = { work: 'Взял(а) в работу', sent: 'КП отправлено на почту клиента', agreed: 'Клиент согласовал КП, выставлен счёт', paid: 'Оплата поступила', shipped: 'Отгружено, УПД и паспорт качества переданы' };
  function seed() {
    var now = Date.now();
    function ago(d, h, m) { var t = new Date(now - d * DAY); t.setHours(h, m, 0, 0); return t.toISOString(); }
    // компания, контакт, почта, город, доставка, этап, дата, позиции, комментарий, файл, ответственный
    var S = [
      ['ООО «Северный витраж»', 'Елена Викторовна', 'snab@sev-vitrazh.demo', 'Москва', 'Наша машина', 'new', ago(0, 9, 12), [['PO-1104', 0, { len: 2400, n: 25 }], ['PO-1119', 30]], 'Нужно до пятницы, разгрузка манипулятором.', 'спецификация_витраж.xlsx', ''],
      ['ИП Демидов А. С.', 'Алексей Сергеевич', 'demidov@mail.demo', 'Калуга', 'Самовывоз', 'new', ago(0, 8, 40), [['PO-1133', 9], ['PO-1134', 6]], '', '', ''],
      ['АО «Щитовой цех»', 'Ольга Павловна', 'zakupki@shchit.demo', 'Тула', 'Транспортная компания', 'work', ago(1, 15, 5), [['PO-1128', 120], ['PO-1129', 80], ['PO-1130', 40]], 'Шины под сборку щитов, нужен паспорт на каждую партию.', '', 'Анна Сергеевна'],
      ['ООО «Вент-Сборка»', 'Игорь Николаевич', 'order@vent-sborka.demo', 'Москва', 'Наша машина', 'work', ago(2, 11, 30), [['PO-1116', 300], ['PO-1118', 120]], 'Повторный заказ, как в прошлом месяце.', '', 'Анна Сергеевна'],
      ['ООО «Опытный цех»', 'Марина Олеговна', 'mo@opyt-ceh.demo', 'Обнинск', 'Самовывоз', 'sent', ago(3, 14, 20), [['PO-1113', 0, { len: 1500, n: 11 }], ['PO-1136', 9]], '', 'чертёж_вал.pdf', 'Андрей Викторович'],
      ['ООО «Фасад-Систем»', 'Дмитрий Андреевич', 'da@fasad-sys.demo', 'Калуга', 'Наша машина', 'agreed', ago(6, 10, 0), [['PO-1121', 240], ['PO-1123', 120], ['PO-1105', 60]], 'Анодирование серебро, упаковка в плёнку.', '', 'Андрей Викторович'],
      ['ООО «Латунный ряд»', 'Светлана Игоревна', 'snab@latun-ryad.demo', 'Ярославль', 'Транспортная компания', 'paid', ago(9, 16, 45), [['PO-1144', 30], ['PO-1146', 15]], '', '', 'Михаил Петрович'],
      ['ООО «Стеллаж-Про»', 'Роман Евгеньевич', 'rp@stellazh-pro.demo', 'Калуга', 'Наша машина', 'shipped', ago(14, 9, 30), [['PO-1106', 120], ['PO-1110', 60]], 'Каждую пачку подписать номером стеллажа.', '', 'Анна Сергеевна'],
      ['ООО «Свет-Линия»', 'Ксения Андреевна', 'ka@svet-line.demo', 'Москва', 'Наша машина', 'shipped', ago(21, 12, 10), [['PO-1117', 180], ['PO-1111', 60]], '', '', 'Андрей Викторович'],
      ['ООО «Кровля-Опт»', 'Павел Иванович', 'pi@krovlya-opt.demo', 'Владимир', 'Транспортная компания', 'lost', ago(10, 13, 0), [['PO-1138', 20]], '', '', 'Михаил Петрович']
    ];
    return S.map(function (r, i) {
      var items = r[7].map(function (x) {
        var q = x[1];
        if (x[2]) q = cutPlan(window.PO.byId(x[0]), x[2].len, x[2].n).meters;
        return { id: x[0], qty: q, cut: x[2] || null };
      });
      var t0 = Date.parse(r[6]), dt = new Date(r[6]), hist = [{ t: r[6], s: 'new', note: 'Заявка с сайта' }];
      var last = r[5] === 'lost' ? 'sent' : r[5], idx = STAGES.indexOf(last), step = [0, 40, 110, 60 * 24, 60 * 48, 60 * 72];
      for (var k = 1; k <= idx; k++) hist.push({ t: new Date(t0 + step[k] * 60000).toISOString(), s: STAGES[k], note: k === 1 ? NOTE.work + ': ' + r[10] : NOTE[STAGES[k]] });
      if (r[5] === 'lost') hist.push({ t: new Date(t0 + 3 * DAY).toISOString(), s: 'lost', note: 'Отказ: нашли дешевле у другого поставщика' });
      return { id: 'КП-' + String(dt.getDate()).padStart(2, '0') + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(101 + (i % 2)), date: r[6],
        company: r[0], inn: '', contact: r[1], phone: '+7 (000) 000-00-00', email: r[2], city: r[3], delivery: r[4], status: r[5], manager: r[10],
        items: items, comment: r[8], file: r[9], history: hist, lostReason: r[5] === 'lost' ? 'Нашли дешевле у другого поставщика' : '', demo: true };
    });
  }
  var CRM = {
    all: function () {
      var l = null;
      try { var v = localStorage.getItem(RKEY); l = v ? JSON.parse(v) : null; } catch (e) { l = rmem; }
      if (!l) { l = seed(); CRM.save(l); }
      return l;
    },
    save: function (l) { rmem = l; try { localStorage.setItem(RKEY, JSON.stringify(l)); } catch (e) {} },
    add: function (r) { var l = CRM.all(); l.unshift(r); CRM.save(l); return r; },
    update: function (id, fn) { var l = CRM.all(); l.forEach(function (r) { if (r.id === id) fn(r); }); CRM.save(l); },
    reset: function () { var l = seed(); CRM.save(l); return l; },
    nextId: function () {
      var d = new Date(), base = 'КП-' + String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0') + '-';
      var n = CRM.all().filter(function (r) { return r.id.indexOf(base) === 0; }).length + 101;
      return base + n;
    },
    /* итог заявки по текущему прайсу */
    total: function (items) {
      var sum = 0, kg = 0;
      items.forEach(function (it) { var p = window.PO.byId(it.id); if (!p) return; sum += it.qty * p.price; kg += p.unit === 'лист' ? it.qty * p.unitKg : it.qty * p.kgm; });
      return { sum: sum, kg: kg };
    }
  };

  /* Заявки, отправленные с этого устройства (для страницы «Статус заявки») */
  var MKEY = 'po.my.v1';
  var My = {
    all: function () { try { return JSON.parse(localStorage.getItem(MKEY) || '[]'); } catch (e) { return []; } },
    add: function (id, email) { var l = My.all().filter(function (x) { return x.id !== id; }); l.unshift({ id: id, email: email }); try { localStorage.setItem(MKEY, JSON.stringify(l.slice(0, 20))); } catch (e) {} }
  };

  /* Когда менеджер ответит: пн–пт 8:00–16:00 */
  function workWhen(d) {
    d = d || new Date();
    var day = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
    if (day >= 1 && day <= 5 && h >= 8 && h < 14) return 'В&nbsp;течение 2&nbsp;часов';
    if (day >= 1 && day <= 5 && h >= 14 && h < 16) return 'Сегодня до&nbsp;16:00 или завтра утром';
    if (day >= 1 && day <= 4 && h < 8) return 'Сегодня до&nbsp;10:00';
    if (day >= 1 && day <= 4) return 'Завтра до&nbsp;10:00';
    return 'В&nbsp;понедельник до&nbsp;10:00';
  }

  /* Enter в однострочном поле переводит к следующему полю, а не отправляет форму */
  function enterNext(form) {
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      var t = e.target;
      if (t.tagName !== 'INPUT' || /^(checkbox|radio|file|submit|button)$/.test(t.type)) return;
      e.preventDefault();
      var f = [].slice.call(form.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=file]), textarea, select, button[type=submit]')).filter(function (x) { return !x.disabled && x.offsetParent; });
      var n = f[f.indexOf(t) + 1]; if (n) n.focus();
    });
  }

  window.PO = window.PO || {};
  window.PO.My = My;
  window.PO.workWhen = workWhen;
  window.PO.enterNext = enterNext;
  window.PO.CRM = CRM;
  window.PO.STAGES = STAGES;
  window.PO.Compare = Compare;
  window.PO.cutPlan = cutPlan;
  window.PO.Request = Request;
  window.PO.toast = toast;
  window.PO.openDemo = openDemo;
  window.PO.section = section;

  /* Появление при прокрутке. Без JS или при «уменьшить движение» всё видно сразу. */
  var RV_SEL = ['main > section', 'main > div', 'main > aside', '.sec-pad > *', '.hero__row > *', '.cat', '.man', '.steps__l > li', '.duo__i',
    '.rows tr', '.kpi__i', '.ptab tbody tr', '.cats__grid > *', '.accept__l > li', '.gal > *', '.doc', '.price-l tr', '.foot > *', 'main img'].join(',');
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    // при «уменьшить движение» в системе — только мягкое проявление, без сдвигов
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('rv-soft');
    var els = [].slice.call(document.querySelectorAll(RV_SEL)).filter(function (el) {
      return !el.closest('.demo, .drw, .filt, .top, .hero__word') && !el.parentElement.closest('.rv-in');
    });
    var fired = false;
    var io = new IntersectionObserver(function (en) {
      fired = true;
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    var sib = new Map();
    els.forEach(function (el) {
      var p = el.parentElement, n = sib.get(p) || 0; sib.set(p, n + 1);
      el.classList.add('rv-in'); if (el.tagName === 'IMG' || el.tagName === 'PICTURE') el.classList.add('rv-img');
      el.style.setProperty('--d', Math.min(n, 6) * 0.07 + 's');
      io.observe(el);
    });
    document.documentElement.classList.add('js-rv');
    // страховка: если наблюдатель так и не сработал (старый браузер, фоновая вкладка) — показать всё
    setTimeout(function () { if (!fired) els.forEach(function (el) { el.classList.add('is-on'); }); }, 4000);
  }
  window.PO = window.PO || {}; window.PO.reveal = function (root) {
    if (!document.documentElement.classList.contains('js-rv')) return;
    (root || document).querySelectorAll('.rv-in:not(.is-on)').forEach(function (el) { el.classList.add('is-on'); });
  };

  document.addEventListener('DOMContentLoaded', function () { updateCount(); initAnchors(); initMenu(); initNavScroll(); initReveal(); if (location.hash === '#probnyj-sajt') openDemo('Ссылка на плашку пробного сайта'); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) updateCount(); });
})();
