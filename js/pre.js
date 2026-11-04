/* Se carga en la cabecera: decide ANTES de pintar si toca la intro de marca
   (solo la primera vez de cada visita, y nunca si se pide menos movimiento). */
(function () {
  var h = document.documentElement;
  h.classList.add('js');
  try {
    if (!sessionStorage.getItem('bk_intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      h.classList.add('con-intro');
      sessionStorage.setItem('bk_intro', '1');
    }
  } catch (e) {}
})();
