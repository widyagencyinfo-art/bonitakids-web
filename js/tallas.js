/* Guía de tallas: una tabla por tallaje + la paleta de colores. */
(async function () {
  await BK.iniciar('tallas');

  const ejemplos = t => BK.activos().filter(p => p.tallaje === t).map(p => p.nombre).slice(0, 3);
  // medidas de un tallaje (largo y contorno por talla), si la tienda las ha dado
  const medidas = m => !(m && m.length) ? '' : `<table class="medidas">
      <thead><tr><th>Talla</th><th>Largo</th><th>Contorno</th></tr></thead>
      <tbody>${m.map(f => `<tr><th>${BK.esc(f.talla)}</th><td>${BK.esc(f.largo)} cm</td><td>${BK.esc(f.contorno)} cm</td></tr>`).join('')}</tbody>
    </table>`;
  // largos de un tallaje (los batones se piden en tres largos), si la tienda los ha dado
  const largos = l => !(l && l.length) ? '' : `<table class="medidas">
      <thead><tr><th>Largo</th><th>Medida</th></tr></thead>
      <tbody>${l.map(f => `<tr><th>${BK.esc(f.nombre)}</th><td>${BK.esc(f.largo)} cm</td></tr>`).join('')}</tbody>
    </table>`;
  const html = Object.entries(BK.cat.tallajes || {}).map(([clave, t]) => {
    const ej = ejemplos(clave);
    const n = BK.activos().filter(p => p.tallaje === clave).length;
    return `<div class="bloque-talla aparece">
      <div class="tallaje__cab">
        <h2>${BK.esc(t.nombre)}</h2>
        ${n ? `<a class="enlace-sub" href="/tienda?talla=${encodeURIComponent(t.tallas[0])}">${n === 1 ? 'Ver la prenda' : 'Ver las ' + n + ' prendas'}</a>` : ''}
      </div>
      <ul class="tallaje__tallas">
        ${t.tallas.map(x => `<li><a href="/tienda?talla=${encodeURIComponent(x)}">${BK.esc(x)}</a></li>`).join('')}
      </ul>
      <p>${BK.esc(t.nota || '')}${ej.length ? ' Por ejemplo: ' + BK.esc(ej.join(', ')) + '.' : ''}</p>
      ${medidas(t.medidas)}
      ${largos(t.largos)}
    </div>`;
  }).join('');
  document.getElementById('tablas').innerHTML = html;

  // la tabla de medidas de la casa (largo y contorno por talla), tal cual la mandó la tienda
  const tm = (BK.cat.tienda || {}).tablaMedidas;
  const caja = document.getElementById('tabla-medidas');
  if (tm && caja) {
    caja.innerHTML = `<img src="${BK.esc(tm)}" alt="Tabla de medidas: largo y contorno de pecho por talla" loading="lazy">
      <p>Largo y contorno de pecho por talla. El largo puede variar un poco según el modelo.</p>`;
    caja.classList.remove('oculto');
  }

  document.getElementById('paleta').innerHTML = (BK.cat.colores || []).map(c =>
    `<div><i style="background:${BK.fondoColor(c)}"></i>${BK.esc(c.n)}</div>`).join('');

  document.getElementById('cta-wa').href = BK.wa('¡Hola! Tengo una duda con la talla.');
  BK.aparecer();
})();
