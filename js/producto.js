/* Ficha de prenda: galería, tallas de SU tallaje, colores y pedido. */
(async function () {
  await BK.iniciar('tienda');
  const $ = s => document.querySelector(s);
  const id = new URLSearchParams(location.search).get('id');
  const p = id && BK.porId(id);

  if (!p || p.activo === false) {
    $('#contenido').innerHTML = `<div class="vacio">
      <h3>Esta prenda ya no está disponible</h3>
      <p>Puede que se haya agotado o que la hayamos retirado de temporada.</p>
      <a class="btn btn--linea" href="/tienda">Ver la tienda</a></div>`;
    return;
  }

  const col = BK.coleccion(p.coleccion);
  const tallas = BK.tallasDe(p);
  const tallaje = (BK.cat.tallajes || {})[p.tallaje] || {};
  document.title = p.nombre + ' · Bonita Kids';
  const abs = u => u && u.startsWith('/') ? location.origin + u : u;
  const meta = (prop, val) => {
    let m = document.querySelector(`meta[property="${prop}"]`);
    if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
    m.setAttribute('content', val);
  };
  meta('og:title', p.nombre + ' · Bonita Kids');
  meta('og:description', p.descripcion || '');
  meta('og:image', abs(BK.foto(p, 0)));
  document.querySelector('meta[name="description"]')?.setAttribute('content', (p.descripcion || '').slice(0, 160));
  // La canónica y el JSON-LD ya vienen del servidor (api/pagina.js); aquí solo si faltan.
  const yaSeo = !!document.querySelector('link[rel="canonical"]');
  const lnk = document.createElement('link');
  lnk.rel = 'canonical'; lnk.href = location.origin + '/producto?id=' + p.id; if (!yaSeo) document.head.appendChild(lnk);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: p.nombre,
    description: p.descripcion || '', image: (p.fotos || []).map(abs),
    brand: { '@type': 'Brand', name: 'Moda Infantil Bonita Kids' },
    category: p.tipo || 'Moda infantil',
    color: (p.colores || []).join(', '),
    size: BK.tallasDe(p),
  });
  if (!yaSeo) document.head.appendChild(ld);
  const lin = BK.linea(p.linea);
  $('#miga').innerHTML = `<a href="/tienda">Tienda</a> &nbsp;/&nbsp; <a href="/tienda?col=${p.coleccion}">${BK.esc(col ? col.nombre : '')}</a>`
    + (lin && BK.grupo(lin.grupo) ? ` &nbsp;/&nbsp; <a href="/tienda?col=${p.coleccion}&grupo=${lin.grupo}">${BK.esc(BK.grupo(lin.grupo).nombre)}</a>` : '')
    + (lin ? ` &nbsp;/&nbsp; <a href="/tienda?col=${p.coleccion}&linea=${lin.id}">${BK.esc(lin.nombre)}</a>` : '')
    + ` &nbsp;/&nbsp; ${BK.esc(p.nombre)}`;

  BK.verReciente(p.id);
  let sel = { talla: null, color: (p.colores || [])[0] || null, foto: 0 };

  $('#contenido').innerHTML = `
<div class="prod">
  <div class="galeria">
    <div class="galeria__mini" id="minis"></div>
    <div>
      <div class="galeria__grande" id="galeria">
        <div class="galeria__tira" id="tira"></div>
        <span class="galeria__cuenta" id="cuenta-fotos" aria-hidden="true"></span>
        <button class="galeria__amp" id="bt-ampliar" aria-label="Ver las fotos en grande">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5"/></svg></button>
      </div>
      <div class="galeria__puntos" id="puntos-fotos" aria-hidden="true"></div>
    </div>
  </div>
  <div class="prod__info">
    <div class="prod__cab">
      <div class="prod__col">${BK.esc(lin ? 'Colección ' + lin.nombre + (col ? ' · ' + col.nombre : '') : col ? col.nombre : p.tipo || '')}</div>
      <button class="compartir" id="bt-compartir" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>Compartir</button>
    </div>
    <h1 class="prod__nom">${BK.esc(p.nombre)}</h1>
    <p class="prod__precio">Precio bajo consulta <span>· te lo enviamos al momento por ${BK.canal()}</span></p>
    <p class="prod__desc">${BK.esc(p.descripcion || '')}</p>

    ${(p.colores || []).length ? `<div class="campo">
      <div class="campo__tit">Color <span id="color-sel">${BK.esc(sel.color || '')}</span></div>
      <div class="muestras" id="colores"></div>
    </div>` : ''}

    <div class="campo">
      <div class="campo__tit">Talla <span>${BK.esc(tallaje.nombre || '')}</span></div>
      <div class="tallas" id="tallas"></div>
      <div class="aviso-talla" id="aviso-talla">Elige una talla para añadirla al pedido.</div>
      <p style="margin:12px 0 0"><a class="enlace-sub" href="/tallas">Ver la guía de tallas</a></p>
    </div>

    <div class="acciones">
      <button class="btn btn--bloque" id="bt-anadir">Añadir a mi pedido</button>
      <a class="btn btn--wa btn--bloque" id="bt-wa" href="#" target="_blank" rel="noopener">Consultar precio y disponibilidad</a>
    </div>

    <ul class="prod__garantias">
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z"/><circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></svg>
        ${BK.esc((BK.cat.tienda || {}).envio || 'Envíos a toda España')}</li>
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M8 12l3 3 5-6"/></svg>
        Cambio de talla sin coste durante 14 días</li>
      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/></svg>
        Te decimos el precio antes de que pagues nada</li>
    </ul>

    <div class="acordeon">
      <div class="acordeon__it"><button class="acordeon__bt">Detalles de la prenda <i>+</i></button>
        <div class="acordeon__cu"><div>${BK.esc(p.descripcion || '')}
          <br><br>Tipo: ${BK.esc(p.tipo || '—')}${BK.nombreCol(p) ? ' · Colección ' + BK.esc(BK.nombreCol(p)) : ''}.
          ${(p.colores || []).length ? '<br>Colores disponibles: ' + BK.esc(p.colores.join(', ')) + '.' : ''}
        </div></div></div>
      <div class="acordeon__it"><button class="acordeon__bt">Tallaje de esta prenda <i>+</i></button>
        <div class="acordeon__cu"><div>
          <strong style="font-weight:400">${BK.esc(tallaje.nombre || '')}</strong><br>
          ${BK.esc(tallaje.nota || '')}<br><br>
          Tallas: ${BK.esc(tallas.join(' · '))}.<br><br>
          ${(tallaje.largos || []).length ? 'Largos: ' + BK.esc(tallaje.largos.map(l => l.nombre.toLowerCase() + ', ' + l.largo + ' cm').join(' · ')) + '.<br><br>' : ''}
          Si dudas entre dos tallas, escríbenos con la edad y la altura del peque y te decimos cuál pedir.
        </div></div></div>
      <div class="acordeon__it"><button class="acordeon__bt">Precio, envío y cambios <i>+</i></button>
        <div class="acordeon__cu"><div>
          No publicamos precios en la web: te los damos por ${BK.canal()} junto con la disponibilidad real y las
          ofertas del momento, sin ningún compromiso.<br><br>
          ${BK.esc((BK.cat.tienda || {}).envio || '')}. Si la talla no queda perfecta, te ayudamos con el cambio.
          <br><br><a class="enlace-sub" href="/ayuda">Ver todas las preguntas frecuentes</a>
        </div></div></div>
    </div>
  </div>
</div>`;

  /* ---------- galería ----------
     Una tira con todas las fotos: en el móvil se pasa con el dedo, en el ordenador con
     las miniaturas, y al pasar el ratón por encima hace de lupa. */
  const fotos = (p.fotos || []).length ? p.fotos : ['/img/marco.svg'];
  const tira = $('#tira');
  tira.innerHTML = fotos.map((f, i) =>
    `<figure class="${i === 0 ? 'on' : ''}"><img src="${f}" alt="${BK.esc(p.nombre)}${i ? ' · foto ' + (i + 1) : ''}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></figure>`).join('');
  $('#minis').innerHTML = fotos.map((f, i) =>
    `<button data-i="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><img src="${f}" alt="" loading="lazy"></button>`).join('');
  $('#puntos-fotos').innerHTML = fotos.length > 1 ? fotos.map((f, i) => `<i class="${i ? '' : 'on'}"></i>`).join('') : '';
  const figs = [...tira.children];
  const marcarFoto = i => {
    sel.foto = i;
    figs.forEach((f, k) => f.classList.toggle('on', k === i));
    $('#minis').querySelectorAll('button').forEach((x, k) => x.setAttribute('aria-current', k === i));
    $('#puntos-fotos').querySelectorAll('i').forEach((x, k) => x.classList.toggle('on', k === i));
    $('#cuenta-fotos').textContent = fotos.length > 1 ? (i + 1) + ' / ' + fotos.length : '';
  };
  const irFoto = i => {
    tira.scrollTo({ left: i * tira.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    marcarFoto(i);
  };
  $('#minis').querySelectorAll('button').forEach(b => b.onclick = () => irFoto(+b.dataset.i));
  let tDesl = null;
  tira.addEventListener('scroll', () => {
    clearTimeout(tDesl);
    tDesl = setTimeout(() => {
      const i = Math.round(tira.scrollLeft / tira.clientWidth);
      if (i !== sel.foto) marcarFoto(i);
    }, 60);
  }, { passive: true });
  if (fotos.length < 2) $('#minis').style.display = 'none';
  marcarFoto(0);

  // lupa al pasar el ratón (solo con ratón)
  const galeria = $('#galeria');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    galeria.addEventListener('mousemove', e => {
      if (e.target.closest('button')) { galeria.classList.remove('zoom'); return; }
      const r = galeria.getBoundingClientRect();
      const img = figs[sel.foto].querySelector('img');
      img.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      img.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      galeria.classList.add('zoom');
    });
    galeria.addEventListener('mouseleave', () => galeria.classList.remove('zoom'));
  }
  tira.addEventListener('click', () => abrirLupa(sel.foto));
  $('#bt-ampliar').onclick = () => abrirLupa(sel.foto);

  /* ---------- visor a pantalla completa ---------- */
  const ICO_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICO_I = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
  const ICO_D = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
  const lupa = document.createElement('div');
  lupa.className = 'lupa';
  lupa.setAttribute('role', 'dialog');
  lupa.setAttribute('aria-modal', 'true');
  lupa.setAttribute('aria-label', 'Fotos de ' + p.nombre);
  lupa.innerHTML = `<div class="lupa__tira">${fotos.map((f, i) =>
      `<figure><img src="${f}" alt="${BK.esc(p.nombre)} · foto ${i + 1}" loading="lazy"></figure>`).join('')}</div>
    <button class="lupa__x" aria-label="Cerrar">${ICO_X}</button>
    ${fotos.length > 1 ? `<button class="lupa__f lupa__f--i" aria-label="Foto anterior">${ICO_I}</button>
    <button class="lupa__f lupa__f--d" aria-label="Foto siguiente">${ICO_D}</button>
    <span class="lupa__cuenta" aria-live="polite"></span>` : ''}`;
  document.body.appendChild(lupa);
  const lTira = lupa.querySelector('.lupa__tira');
  const lFigs = [...lTira.children];
  let lIdx = 0, volverA = null;
  const lPintar = () => { const c = lupa.querySelector('.lupa__cuenta'); if (c) c.textContent = (lIdx + 1) + ' / ' + fotos.length; };
  const lIr = (i, suave) => {
    lIdx = (i + fotos.length) % fotos.length;
    lFigs.forEach(f => f.classList.remove('zoom'));
    lTira.scrollTo({ left: lIdx * lTira.clientWidth, behavior: suave ? 'smooth' : 'auto' });
    lPintar();
  };
  function abrirLupa(i) {
    volverA = document.activeElement;
    lupa.classList.add('on');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lIr(i, false));
    lupa.querySelector('.lupa__x').focus();
  }
  function cerrarLupa() {
    if (!lupa.classList.contains('on')) return;
    lupa.classList.remove('on');
    document.body.style.overflow = '';
    irFoto(lIdx);
    volverA && volverA.focus && volverA.focus();
  }
  lupa.querySelector('.lupa__x').onclick = cerrarLupa;
  lupa.querySelector('.lupa__f--i')?.addEventListener('click', () => lIr(lIdx - 1, true));
  lupa.querySelector('.lupa__f--d')?.addEventListener('click', () => lIr(lIdx + 1, true));
  let tL = null;
  lTira.addEventListener('scroll', () => {
    clearTimeout(tL);
    tL = setTimeout(() => { lIdx = Math.round(lTira.scrollLeft / lTira.clientWidth); lPintar(); }, 60);
  }, { passive: true });
  // un toque acerca la foto justo donde has tocado; otro la vuelve a alejar
  lFigs.forEach(f => f.querySelector('img').addEventListener('click', e => {
    const im = e.currentTarget, r = im.getBoundingClientRect();
    im.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    im.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    f.classList.toggle('zoom');
  }));
  lFigs.forEach(f => f.addEventListener('mousemove', e => {
    if (!f.classList.contains('zoom')) return;
    const im = f.querySelector('img'), r = f.getBoundingClientRect();
    im.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    im.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }));
  document.addEventListener('keydown', e => {
    if (!lupa.classList.contains('on')) return;
    if (e.key === 'Escape') cerrarLupa();
    if (e.key === 'ArrowLeft') lIr(lIdx - 1, true);
    if (e.key === 'ArrowRight') lIr(lIdx + 1, true);
  });

  /* ---------- compartir (las madres se lo mandan a la abuela) ---------- */
  $('#bt-compartir').onclick = async () => {
    const url = location.origin + '/producto?id=' + encodeURIComponent(p.id);
    const datos = { title: p.nombre + ' · ' + ((BK.cat.tienda || {}).nombre || ''), text: p.nombre, url };
    if (navigator.share) {
      try { await navigator.share(datos); } catch (e) { /* ha cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); BK.avisar ? BK.avisar('Enlace copiado: pégalo donde quieras') : 0; }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(p.nombre + ' ' + url), '_blank', 'noopener'); }
  };

  /* ---------- colores ---------- */
  const cajaCol = $('#colores');
  if (cajaCol) {
    cajaCol.innerHTML = (p.colores || []).map(c =>
      `<button data-c="${BK.esc(c)}" style="background:${BK.colorHex(c)}" aria-pressed="${c === sel.color}" aria-label="${BK.esc(c)}" title="${BK.esc(c)}"></button>`).join('');
    cajaCol.querySelectorAll('button').forEach(b => b.onclick = () => {
      sel.color = b.dataset.c;
      cajaCol.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      $('#color-sel').textContent = sel.color;
      actualizarWa();
    });
  }

  /* ---------- tallas ---------- */
  $('#tallas').innerHTML = tallas.map(t =>
    `<button data-t="${BK.esc(t)}" aria-pressed="false">${BK.esc(t)}</button>`).join('');
  $('#tallas').querySelectorAll('button').forEach(b => b.onclick = () => {
    sel.talla = b.dataset.t;
    $('#tallas').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#aviso-talla').classList.remove('on');
    const bc = document.getElementById('bc-talla');
    if (bc) bc.textContent = 'Talla ' + sel.talla + (sel.color ? ' · ' + sel.color : '');
    actualizarWa();
  });

  function actualizarWa() { $('#bt-wa').href = BK.wa(BK.textoWa(p, sel.talla, sel.color)); }
  actualizarWa();

  const anadir = () => {
    if (!sel.talla) {
      $('#aviso-talla').classList.add('on');
      $('#tallas').scrollIntoView({ block: 'center', behavior: 'smooth' });
      $('#tallas').classList.remove('tiembla'); void $('#tallas').offsetWidth; $('#tallas').classList.add('tiembla');
      return;
    }
    BK.anadir(p.id, sel.talla, sel.color);
  };
  $('#bt-anadir').onclick = anadir;

  /* ---------- barra fija de «Añadir» en el móvil ----------
     Sale mientras los botones de verdad no están a la vista. */
  const barra = document.createElement('div');
  barra.className = 'barra-compra';
  barra.innerHTML = `<img src="${BK.foto(p, 0)}" alt="">
    <div><b>${BK.esc(p.nombre)}</b><small id="bc-talla">Elige la talla</small></div>
    <button class="btn" id="bc-anadir">Añadir</button>`;
  document.body.appendChild(barra);
  barra.querySelector('#bc-anadir').onclick = anadir;
  // sale cuando los botones de verdad ya han quedado ARRIBA (al entrar no tapa el nombre)
  const acciones = $('.acciones');
  let pendBarra = false;
  const mirarBarra = () => {
    pendBarra = false;
    const r = acciones.getBoundingClientRect();
    document.documentElement.classList.toggle('con-barra', r.bottom < 0 && innerWidth <= 900);
  };
  addEventListener('scroll', () => { if (!pendBarra) { pendBarra = true; requestAnimationFrame(mirarBarra); } }, { passive: true });
  addEventListener('resize', mirarBarra);
  mirarBarra();

  /* ---------- acordeón ---------- */
  document.querySelectorAll('.acordeon__bt').forEach(b => b.onclick = () => {
    const it = b.parentElement, cu = b.nextElementSibling;
    const on = it.classList.toggle('on');
    cu.style.maxHeight = on ? cu.scrollHeight + 'px' : 0;
  });

  /* ---------- relacionados ----------
     Primero lo que viste al hermano (misma colección, otro «quién»): así se venden a juego. */
  const yo = BK.quien(p);
  // lo de SU colección (Mario, Abril…) primero y luego el resto de la categoría
  const hermanas = BK.activos().filter(x => x.coleccion === p.coleccion && x.id !== p.id);
  const misma = hermanas.filter(x => p.linea && x.linea === p.linea).concat(hermanas.filter(x => !p.linea || x.linea !== p.linea));
  // a una niña se le busca primero hermano, a un niño hermana, y el bebé va después
  const prioridad = { nina: ['nino', 'bebe', 'nina'], nino: ['nina', 'bebe', 'nino'], bebe: ['nina', 'nino', 'bebe'] }[yo] || [];
  const rel = prioridad.flatMap(q => misma.filter(x => BK.quien(x) === q)).slice(0, 4);
  if (rel.length) {
    if (rel.some(x => BK.quien(x) !== yo)) {
      document.querySelector('#sec-relacionados .cejilla').textContent = 'Hermanos a juego';
      document.querySelector('#sec-relacionados .titulo-sec').textContent = 'Para vestirlos a juego';
    }
    $('#relacionados').innerHTML = rel.map(BK.tarjeta).join('');
    $('#ver-col').href = '/tienda?col=' + p.coleccion + (lin ? '&linea=' + lin.id : '');
    $('#sec-relacionados').classList.remove('oculto');
  }
  BK.aparecer();
})();
