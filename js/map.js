/* Схема заезда: шаг в списке подсвечивает метку на схеме */
(function () {
  var y = document.getElementById('yard'); if (!y) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { var t = document.getElementById('truck'); if (t) t.parentNode.removeChild(t); }
  var items = document.querySelectorAll('.map2__s li');
  function clear() { document.querySelectorAll('.map2 .on').forEach(function (x) { x.classList.remove('on'); }); }
  items.forEach(function (li) {
    var p = y.querySelector('.pin[data-pin="' + li.getAttribute('data-pin') + '"]');
    function on() { clear(); p.classList.add('on'); li.classList.add('on'); }
    li.addEventListener('mouseenter', on); li.addEventListener('focus', on); li.addEventListener('click', on);
    li.addEventListener('mouseleave', clear); li.addEventListener('blur', clear);
  });
})();
