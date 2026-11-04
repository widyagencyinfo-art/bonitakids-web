/* ============================================================
   Bonita Kids · portada
   Pase de fotos, carruseles, hermanos a juego y buscador por edad.
   ============================================================ */
(async function () {
  await BK.iniciar('inicio');
  const $ = s => document.querySelector(s);
  const act = BK.activos();
  const T = BK.cat.tienda || {};
  const FLECHA = d => `<svg viewBox="0 0 24 24"><path d="M${d === 'i' ? '15 5l-7 7 7 7' : '9 5l7 7-7 7'}"/></svg>`;

  /* ---------- utilidades ----------
     La portada NO puede repetir una foto: se lleva un registro de lo ya gastado. */
  const fotosUsadas = new Set();
  const prodUsados = new Set();
  const conModelo = p => (p.fotos || []).find(f => f.includes('/modelo_')) || BK.foto(p, 0);

  /** Marca una foto como gastada y la devuelve. */
  const gastar = f => { if (f) fotosUsadas.add(f); return f; };

  // las fotos de ambiente están reservadas para la portada y el lookbook
  const ESCENAS = ['esc_hero_nina', 'esc_hero_nina2', 'esc_hero_nino', 'esc_hero_nino2',
                   'esc_look_nina', 'esc_look_nino', 'esc_look_bebe'];
  ESCENAS.forEach(k => fotosUsadas.add(`/img/p/${k}.jpg`));
  if (BK.cat.detalle && BK.cat.detalle.foto) gastar(BK.cat.detalle.foto);
  (BK.cat.detalle && BK.cat.detalle.puntos || []).forEach(p => gastar(p.f));

  // prendas ya comprometidas: las del hero, las de las portadas de colección y las del lookbook
  ['leonor-encaje', 'adele-lila', 'leonor-conjunto-pajarita', 'abril-conjunto-burdeos',
   'adele-rosa', 'camel-conjunto', 'leonor-lazo-camel', 'abril-verde-empolvado',
   'abril-celeste-lazo', 'abril-celeste-hermanos', 'abril-recien-nacido']
    .forEach(id => prodUsados.add(id));

  /** Una foto de este producto que aún no se haya usado (la de modelo primero). */
  function fotoLibre(p) {
    const fs = (p.fotos || []).slice()
      .sort((a, b) => (b.includes('/modelo_') ? 1 : 0) - (a.includes('/modelo_') ? 1 : 0));
    return gastar(fs.find(f => !fotosUsadas.has(f)) || fs[0] || '/img/l/marco.svg');
  }

  /** El primer producto de la lista que no se haya usado todavía. */
  function prodLibre(lista) {
    const p = lista.find(x => !prodUsados.has(x.id)) || lista[0];
    if (p) prodUsados.add(p.id);
    return p;
  }

  /** Comprueba si existe un archivo (para las escenas editoriales, que pueden faltar). */
  function existe(url) {
    return new Promise(ok => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = url; });
  }

  /** La prenda que lleva esta foto entre las suyas (para las escenas de ambiente). */
  const prendaDe = f => act.find(p => (p.fotos || []).includes(f));
  const FLECHITA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /** Sello redondo con texto que gira alrededor del isotipo. */
  function sello(id, claro) {
    const txt = `${T.nombre || 'Bonita Kids'} · ${(T.ciudad || 'Hecho con mimo')} · `.toUpperCase();
    return `<svg class="sello__giro" viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id="${id}" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>
        <text><textPath href="#${id}" textLength="498" lengthAdjust="spacing">${BK.esc(txt)}</textPath></text>
      </svg><img class="sello__iso" src="/img/m/pajaro.webp" alt="" width="260" height="311">`;
  }
  document.querySelectorAll('[data-sello]').forEach((s, i) => { s.innerHTML = sello('giro' + i, s.dataset.sello === 'claro'); });

  /* ══════════ 1 · PASE DE FOTOS DE LA PORTADA ══════════ */
  function heroPase() {
    const caja = $('#hero-paneles'); if (!caja) return;
    // cada columna rota entre fotos de AMBIENTE (nunca mezclar con estudio blanco: canta)
    let pilas = [
      ['esc_hero_nina', 'esc_hero_nina2'],
      ['esc_hero_nino', 'esc_hero_nino2'],
    ].map(ks => ks.map(k => `/img/p/${k}.jpg`));
    // red de seguridad: si faltan las escenas en el catálogo, se tira de fotos de estudio
    const relleno = (pool, n) => {
      const l = [];
      while (l.length < n && pool.length) { const p = prodLibre(pool); if (!p) break; l.push(fotoLibre(p)); }
      return l;
    };
    // fotos REALES con niños elegidas en el catálogo (Ana no quiere modelos de IA)
    if (Array.isArray(T.heroPilas)) {
      const reales = T.heroPilas.map(l => (l || []).filter(prendaDe));
      if (reales.every(l => l.length)) { pilas = reales; pilas.flat().forEach(f => { gastar(f); prodUsados.add(prendaDe(f).id); }); }
    }
    if (!pilas[0].some(prendaDe)) pilas[0] = relleno(act.filter(p => BK.quien(p) === 'nina'), 2);
    if (!pilas[1].some(prendaDe)) pilas[1] = relleno(act.filter(p => BK.quien(p) !== 'nina'), 2);
    // en el móvil va una sola columna a pantalla completa: niña, niño, niña, niño…
    if (matchMedia('(max-width: 900px)').matches) {
      const una = [];
      for (let i = 0; i < Math.max(pilas[0].length, pilas[1].length); i++) {
        if (pilas[0][i]) una.push(pilas[0][i]);
        if (pilas[1][i]) una.push(pilas[1][i]);
      }
      pilas = [una];
    }
    // de qué prenda es cada foto, para la etiqueta «lo que lleva»
    const quien = pilas.map(fs => fs.map(f => prendaDe(f)));

    caja.innerHTML = pilas.map((fotos, c) => {
      const p0 = quien[c][0];
      return `<a class="hero__pila" data-pila="${c}" href="${p0 ? '/producto?id=' + encodeURIComponent(p0.id) : '/tienda'}">
      ${fotos.map((f, i) => `<img src="${f}" alt="${BK.esc(quien[c][i] ? quien[c][i].nombre : '')}"${i === 0 ? ' fetchpriority="high"' : ' decoding="async"'} class="${i === 0 ? 'on' : ''}" data-par="${c ? -0.2 : -0.11}">`).join('')}
      <span class="hero__eti"><small>Lleva</small><b>${BK.esc(p0 ? p0.nombre : '')}</b>${FLECHITA}</span>
    </a>`;
    }).join('');

    const n = Math.min(...pilas.map(p => p.length));
    const barra = $('#hero-barra');
    barra.innerHTML = Array.from({ length: n }, (_, i) =>
      `<button data-p="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><i></i></button>`).join('');

    let idx = 0, reloj = null;
    function ir(k) {
      idx = (k + n) % n;
      caja.querySelectorAll('.hero__pila').forEach((pila, c) => {
        pila.querySelectorAll('img').forEach((im, i) => im.classList.toggle('on', i === idx));
        const p = quien[c][idx];
        const eti = pila.querySelector('.hero__eti');
        if (!p) { eti.style.display = 'none'; return; }
        pila.href = '/producto?id=' + encodeURIComponent(p.id);
        eti.style.display = '';
        if (eti.querySelector('b').textContent !== p.nombre) {
          eti.classList.add('cambia');
          setTimeout(() => { eti.querySelector('b').textContent = p.nombre; eti.classList.remove('cambia'); }, 320);
        }
      });
      barra.querySelectorAll('button').forEach((b, i) => {
        b.setAttribute('aria-current', i === idx);
        const l = b.querySelector('i'); l.style.transition = 'none'; l.style.width = '0';
        if (i === idx) requestAnimationFrame(() => { l.style.transition = 'width 5s linear'; l.style.width = '100%'; });
      });
    }
    function arrancar() { clearInterval(reloj); reloj = setInterval(() => ir(idx + 1), 5200); }
    barra.querySelectorAll('button').forEach(b => b.onclick = () => { ir(+b.dataset.p); arrancar(); });
    if (n > 1) { ir(0); arrancar(); }
    else barra.style.display = 'none';
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(reloj) : arrancar());
  }
  /* ══════════ 1b · PORTADA PANORÁMICA (sept-2026) ══════════
     Una foto ancha de los hermanos a juego en el ordenador y su versión vertical en el móvil
     (<picture>). Si alguna pareja de prendas ya no está activa, esa foto no sale; si no queda
     ninguna, vuelve el pase de dos columnas de siempre. */
  const PANORAMAS = [
    { n: 'hero_leonor', ids: ['leonor-encaje', 'leonor-conjunto-pajarita'] },
    { n: 'hero_burdeos', ids: ['abril-burdeos', 'abril-conjunto-burdeos'] },
  ];
  function heroPanorama() {
    const caja = $('#hero-paneles'); if (!caja) return false;
    const pan = PANORAMAS
      .map(p => ({ ...p, prendas: p.ids.map(BK.porId).filter(x => x && x.activo !== false) }))
      .filter(p => p.prendas.length === p.ids.length);
    if (!pan.length) return false;
    pan.forEach(p => p.ids.forEach(id => prodUsados.add(id)));
    document.querySelector('.hero')?.classList.add('hero--panorama');
    document.documentElement.classList.add('pano-claro');   // portada panorámica: titular oscuro sobre la foto clara

    caja.innerHTML = `<div class="hero__pano">${pan.map((p, i) => `
        <picture class="${i ? '' : 'on'}">
          <source media="(max-width: 900px)" srcset="/img/p/${p.n}_v.jpg">
          <img src="/img/p/${p.n}_h.jpg" srcset="/img/p/${p.n}_h-1400.jpg 1400w, /img/p/${p.n}_h.jpg 2400w" sizes="100vw"
               alt="${BK.esc(p.prendas.map(x => x.nombre).join(' y '))}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} data-par="-0.1">
        </picture>`).join('')}</div>
      <div class="hero__lleva">${pan.map((p, i) => `
        <div class="hero__lleva-it${i ? '' : ' on'}"><small>En la foto</small>${p.prendas.map(x =>
          `<a href="/producto?id=${encodeURIComponent(x.id)}">${BK.esc(x.nombre)}</a>`).join('<i aria-hidden="true">·</i>')}</div>`).join('')}
      </div>`;

    const n = pan.length;
    const barra = $('#hero-barra');
    barra.innerHTML = n > 1 ? Array.from({ length: n }, (_, i) =>
      `<button data-p="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><i></i></button>`).join('') : '';
    const fotos = [...caja.querySelectorAll('.hero__pano picture')];
    const pies = [...caja.querySelectorAll('.hero__lleva-it')];
    let idx = 0, reloj = null;
    function ir(k) {
      idx = (k + n) % n;
      fotos.forEach((f, i) => f.classList.toggle('on', i === idx));
      pies.forEach((f, i) => f.classList.toggle('on', i === idx));
      barra.querySelectorAll('button').forEach((b, i) => {
        b.setAttribute('aria-current', i === idx);
        const l = b.querySelector('i'); l.style.transition = 'none'; l.style.width = '0';
        if (i === idx) requestAnimationFrame(() => { l.style.transition = 'width 6.8s linear'; l.style.width = '100%'; });
      });
    }
    function arrancar() { clearInterval(reloj); if (n > 1) reloj = setInterval(() => ir(idx + 1), 7000); }
    barra.querySelectorAll('button').forEach(b => b.onclick = () => { ir(+b.dataset.p); arrancar(); });
    ir(0); arrancar();
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(reloj) : arrancar());
    return true;
  }
  if (!heroPanorama()) heroPase();

  /* ══════════ 2 · TIRA DE MARCA ══════════ */
  (function tira() {
    if (!$('#tira')) return;
    const palabras = ['Ceremonia', 'Bautizo', 'Arras', 'Puntilla valenciana', 'Plumeti', 'Encaje',
      'Recién nacido', 'Hermanos a juego', 'Hecho en España'];
    const bloque = palabras.map(p => `<span>${BK.esc(p)}</span>`).join('');
    $('#tira').innerHTML = bloque + bloque;
  })();

  /* ══════════ 3 · POR OCASIÓN ══════════ */
  (function ocasiones() {
    const ocs = BK.ocasiones().filter(o => BK.porOcasion(o.n).length);
    // se reparten de la ocasión más específica a la más general, para que no se pisen
    const orden = ocs.slice().sort((a, b) => BK.porOcasion(a.n).length - BK.porOcasion(b.n).length);
    const elegido = {};
    orden.forEach(o => { elegido[o.n] = prodLibre(BK.porOcasion(o.n)); });
    // foto de ambiente propia de cada ocasión (oc_<ocasión>.jpg); si falta, la de una prenda
    const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const PROPIAS = [];   // las oc_*.jpg eran de IA: ahora sale la foto real de una prenda
    $('#lista-ocasiones').innerHTML = ocs.map(o => {
      const ps = BK.porOcasion(o.n);
      const suya = PROPIAS.includes(slug(o.n)) ? gastar(`/img/p/oc_${slug(o.n)}.jpg`) : null;
      const reserva = suya ? conModelo(elegido[o.n] || ps[0]) : fotoLibre(elegido[o.n] || ps[0]);
      const foto = suya || reserva;
      return `<a class="ocasion aparece" href="/tienda?ocasion=${encodeURIComponent(o.n)}">
        <figure><img src="${foto}" alt="${BK.esc(o.n)}" loading="lazy"${suya ? ` onerror="this.onerror=null;this.src='${reserva}'"` : ''}>
          ${o.d ? `<span class="ocasion__d">${BK.esc(o.d)}</span>` : ''}</figure>
        <span class="ocasion__t"><strong>${BK.esc(o.n)}</strong><em>${ps.length} prendas ${FLECHITA}</em></span>
      </a>`;
    }).join('');
  })();

  /* ══════════ 4 · COLECCIONES ══════════ */
  (function colecciones() {
    const cols = (BK.cat.colecciones || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    $('#lista-colecciones').innerHTML = cols.map((c, i) => {
      const n = act.filter(p => p.coleccion === c.id).length;
      const lins = BK.lineasDe(c.id);
      return `
      <a class="col-tarj aparece${n ? '' : ' col-tarj--pronto'}" href="${n ? '/tienda?col=' + c.id : BK.wa('¡Hola! Me interesa la colección ' + c.nombre + '. ¿Cuándo llega?')}"${n ? '' : ' target="_blank" rel="noopener"'}>
        <figure><img src="${gastar(c.portada || '/img/p/cols_' + c.id + '.jpg')}" alt="${BK.esc(c.nombre)}" loading="lazy">
          <span class="col-tarj__num">${String(i + 1).padStart(2, '0')}</span>
          ${n ? '' : '<span class="col-tarj__pronto">Muy pronto</span>'}
          ${c.desc ? `<span class="col-tarj__velo"><span>${BK.esc(c.desc)}</span><b>${n ? 'Ver la colección' : 'Avísame cuando llegue'} ${FLECHITA}</b></span>` : ''}
        </figure>
        <span class="col-tarj__txt"><h3>${BK.esc(c.nombre)}</h3><p>${n ? (BK.gruposDe(c.id).length ? BK.gruposDe(c.id).map(g => g.nombre.replace(new RegExp('^' + c.nombre.replace(/s$/, '') + 's? ', 'i'), '')).join(', ').replace(/^./, x => x.toUpperCase())
            : lins.length ? 'Colecciones ' + lins.map(l => l.nombre).join(', ') : n + ' prendas') : 'Próximamente'}</p>
          ${c.desc ? `<span class="col-tarj__desc">${BK.esc(c.desc)}</span>` : ''}</span>
      </a>`;
    }).join('');
  })();

  /* ══════════ 5 · NOVEDADES ══════════ */
  (function novedades() {
    const libres = act.filter(p => !prodUsados.has(p.id));
    const resto = act.filter(p => prodUsados.has(p.id));
    const fuente = libres.concat(resto);            // las no vistas primero
    const pref = fuente.filter(p => p.destacado).concat(fuente.filter(p => !p.destacado));
    const cubos = { nina: [], nino: [], bebe: [] };
    pref.forEach(p => cubos[BK.quien(p)].push(p));
    const lista = [];
    const turnos = ['nina', 'nino', 'nina', 'bebe'];
    let t = 0;
    while (lista.length < 8 && (cubos.nina.length || cubos.nino.length || cubos.bebe.length)) {
      const q = turnos[t++ % turnos.length];
      const cubo = cubos[q].length ? cubos[q] : (cubos.nina.length ? cubos.nina : (cubos.nino.length ? cubos.nino : cubos.bebe));
      const p = cubo.shift();
      lista.push(p); prodUsados.add(p.id);
    }
    // cada tarjeta con una foto que no se haya usado ya en otra sección
    const conFoto = lista.map(p => ({ p, foto: fotoLibre(p) }));
    $('#pista-novedades').innerHTML = conFoto.map(x => BK.tarjeta(x.p, { foto: x.foto })).join('');
    $('#nav-nov').innerHTML = `<button data-izq aria-label="Anterior">${FLECHA('i')}</button><button data-der aria-label="Siguiente">${FLECHA('d')}</button>`;
    BK.carrusel($('#car-novedades'), $('#nav-nov'));
  })();

  /* ══════════ 5b · MIRA DE CERCA ══════════ */
  (function detalle() {
    const D = BK.cat.detalle;
    const sec = document.getElementById('detalle');
    if (!D || !(D.puntos || []).length) { sec?.remove(); return; }

    $('#det-cejilla').textContent = D.cejilla || '';
    $('#det-titulo').textContent = D.titulo || '';
    $('#det-texto').textContent = D.texto || '';

    const prod = D.producto && BK.porId(D.producto);
    const foto = D.foto || (prod ? conModelo(prod) : '/img/l/marco.svg');
    $('#det-foto').innerHTML =
      `<img src="${foto}" alt="${BK.esc(prod ? prod.nombre : '')}" loading="lazy">` +
      D.puntos.map((p, i) =>
        `<button class="chincheta" data-p="${i}" style="left:${p.x}%;top:${p.y}%"
           aria-label="${BK.esc(p.t)}">${i + 1}</button>`).join('');

    $('#det-lista').innerHTML = D.puntos.map((p, i) => `
      <button class="det" data-d="${i}" type="button">
        <figure><img src="${p.f}" alt="${BK.esc(p.t)}" loading="lazy"></figure>
        <div>
          <span class="det__n">Detalle ${i + 1}</span>
          <h3>${BK.esc(p.t)}</h3>
          <p>${BK.esc(p.d)}</p>
        </div>
      </button>`).join('');

    const puntos = [...$('#det-foto').querySelectorAll('.chincheta')];
    const filas = [...$('#det-lista').querySelectorAll('.det')];
    const lista = $('#det-lista');
    let actual = 0;
    const marcar = i => {
      actual = i;
      puntos.forEach((b, k) => b.classList.toggle('on', k === i));
      filas.forEach((b, k) => {
        b.classList.toggle('on', k === i);
        b.setAttribute('aria-pressed', k === i);
      });
    };

    // se va paseando solo por los detalles mientras la sección está a la vista,
    // hasta que la clienta toca algo: entonces manda ella
    let reloj = null, tocado = false;
    const parar = () => { clearInterval(reloj); reloj = null; lista.classList.remove('auto'); };
    const seguir = () => {
      if (tocado || reloj || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      lista.classList.add('auto');
      reloj = setInterval(() => marcar((actual + 1) % filas.length), 3600);
    };
    const tomar = i => { tocado = true; parar(); marcar(i); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? seguir() : parar()),
        { threshold: .35 }).observe(sec);
    }

    filas.forEach((b, i) => {
      b.addEventListener('mouseenter', () => tomar(i));
      b.addEventListener('focus', () => tomar(i));
      b.addEventListener('click', () => tomar(i));
    });
    puntos.forEach((b, i) => {
      b.addEventListener('mouseenter', () => tomar(i));
      b.addEventListener('click', () => {
        tomar(i);
        filas[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
    marcar(0);

    if (prod) {
      const a = $('#det-cta');
      a.href = '/producto?id=' + encodeURIComponent(prod.id);
      a.textContent = 'Ver el ' + prod.nombre.charAt(0).toLowerCase() + prod.nombre.slice(1);
      prodUsados.add(prod.id);
    }
  })();

  /* ══════════ 6 · HERMANOS A JUEGO ══════════ */
  (function hermanos() {
    const cols = (BK.cat.colecciones || []).filter(c => {
      const d = act.filter(p => p.coleccion === c.id);
      return d.some(p => BK.quien(p) === 'nina') && d.some(p => BK.quien(p) !== 'nina');
    });
    if (!cols.length) { $('.hermanos')?.closest('section')?.remove(); return; }

    let col = (cols.find(c => act.some(p => p.coleccion === c.id && !prodUsados.has(p.id))) || cols[0]).id;
    let iA = 0, iB = 0;
    const ladoA = () => act.filter(p => p.coleccion === col && BK.quien(p) === 'nina');
    const ladoB = () => act.filter(p => p.coleccion === col && BK.quien(p) !== 'nina');

    $('#hermanos-cols').innerHTML = cols.map(c =>
      `<button data-c="${c.id}" aria-pressed="${c.id === col}">${BK.esc(c.nombre)}</button>`).join('');
    $('#hermanos-cols').querySelectorAll('button').forEach(b => b.onclick = () => {
      col = b.dataset.c; iA = 0; iB = 0; cambia = 'ambos';
      $('#hermanos-duo').classList.add('ya');
      $('#hermanos-cols').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      pintar();
    });

    function lado(clave, p, i, total) {
      return `<div class="hermanos__lado" data-lado="${clave}">
        <figure><a href="/producto?id=${encodeURIComponent(p.id)}"><img src="${conModelo(p)}" alt="${BK.esc(p.nombre)}" loading="lazy"></a>
          ${total > 1 ? `<div class="hermanos__flechas">
            <button data-mov="${clave}" data-d="-1" aria-label="Anterior">${FLECHA('i')}</button>
            <button data-mov="${clave}" data-d="1" aria-label="Siguiente">${FLECHA('d')}</button>
          </div>` : ''}
        </figure>
        <div class="hermanos__pie">
          <div>
            <small>${clave === 'a' ? 'Para ella' : 'Para él'}</small>
            <h4><a href="/producto?id=${encodeURIComponent(p.id)}">${BK.esc(p.nombre)}</a></h4>
            <span style="font-size:11.5px;color:var(--tinta-tenue)">${BK.esc(BK.rangoTallas(p))}</span>
          </div>
        </div>
      </div>`;
    }

    let primeraVez = true, cambia = null;
    function pintar() {
      const A = ladoA(), B = ladoB();
      if (!A.length || !B.length) return;
      if (primeraVez) {
        primeraVez = false;
        const fresco = l => {
          let i = l.findIndex(p => !prodUsados.has(p.id));
          if (i < 0) i = l.findIndex(p => !fotosUsadas.has(conModelo(p)));
          return i > 0 ? i : 0;
        };
        iA = fresco(A); iB = fresco(B);
      }
      // primero se da la vuelta al índice (pasar de la última vuelve a la primera) y luego se usa
      iA = ((iA % A.length) + A.length) % A.length; iB = ((iB % B.length) + B.length) % B.length;
      gastar(conModelo(A[iA])); gastar(conModelo(B[iB]));
      const duo = $('#hermanos-duo');
      duo.innerHTML = lado('a', A[iA], iA, A.length) + lado('b', B[iB], iB, B.length)
        + '<span class="hermanos__mas" aria-hidden="true"><i>+</i></span>';
      if (cambia) {
        duo.querySelectorAll('.hermanos__lado').forEach(l => {
          if (cambia === 'ambos' || l.dataset.lado === cambia) l.classList.add('nuevo');
        });
        cambia = null;
      }
      const mover = (clave, d) => {
        duo.querySelector(`[data-lado="${clave}"]`)?.classList.add('cambiando');
        duo.classList.add('ya');           // a partir de aquí la cortina corre más y solo en el lado que cambia
        setTimeout(() => {
          if (clave === 'a') iA += d; else iB += d;
          cambia = clave;
          pintar();
        }, 180);
      };
      duo.querySelectorAll('[data-mov]').forEach(b => b.onclick = () => mover(b.dataset.mov, +b.dataset.d));
      // en el móvil se pasa deslizando el dedo sobre la foto
      duo.querySelectorAll('.hermanos__lado').forEach(el => {
        let x0 = null;
        el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
        el.addEventListener('touchend', e => {
          if (x0 == null) return;
          const dx = e.changedTouches[0].clientX - x0; x0 = null;
          const total = el.dataset.lado === 'a' ? A.length : B.length;
          if (Math.abs(dx) > 40 && total > 1) mover(el.dataset.lado, dx < 0 ? 1 : -1);
        });
      });
      const a = A[iA], b = B[iB];
      const c = BK.coleccion(col);
      $('#hermanos-pedir').onclick = () => {
        const m = `¡Hola ${T.nombre || ''}! Quiero vestir a los hermanos a juego con la colección ${c ? c.nombre : ''}:\n\n`
          + `• ${a.nombre}\n• ${b.nombre}\n\n¿Me decís precio, tallas disponibles y si os quedan? Gracias 🙂`;
        window.open(BK.wa(m), '_blank', 'noopener');
      };
    }
    pintar();
  })();

  /* ══════════ 7 · CIFRAS ══════════ */
  (function cifras() {
    if (!$('#cifras')) return;
    const nTallas = new Set();
    Object.values(BK.cat.tallajes || {}).forEach(t => (t.tallas || []).forEach(x => nTallas.add(x)));
    const datos = [
      { n: act.length, suf: '', l: 'Prendas en la tienda' },
      { n: (BK.cat.lineas || []).length || (BK.cat.colecciones || []).length, suf: '', l: 'Colecciones' },
      { n: nTallas.size, suf: '', l: 'Tallas, de 1 mes a 10 años' },
      { n: 48, suf: ' h', pre: '24/', l: 'Envíos a toda España' },
    ];
    $('#cifras').innerHTML = datos.map(d =>
      `<div class="cifra aparece"><strong data-n="${d.n}" data-pre="${d.pre || ''}" data-suf="${d.suf}">${(d.pre || '') + d.n + d.suf}</strong><span>${d.l}</span></div>`).join('');

    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, fin = +el.dataset.n, pre = el.dataset.pre, suf = el.dataset.suf;
      const t0 = performance.now(), dur = 1100;
      (function paso(t) {
        const k = Math.min(1, (t - t0) / dur);
        const val = Math.round(fin * (1 - Math.pow(1 - k, 3)));
        el.textContent = pre + val + suf;
        if (k < 1) requestAnimationFrame(paso);
      })(t0);
    }), { threshold: .5 });
    document.querySelectorAll('.cifra strong').forEach(n => io.observe(n));
  })();

  /* ══════════ 8 · LOOKBOOK ══════════ */
  async function look() {
    const cls = ['look__a', 'look__b', 'look__c'];
    const escenas = [
      { k: 'esc_look_nina', id: 'abril-celeste-lazo' },
      { k: 'esc_look_nino', id: 'abril-celeste-hermanos' },
      { k: 'esc_look_bebe', id: 'abril-recien-nacido' },
    ];
    const piezas = [];
    for (const e of escenas) {
      const u = `/img/p/${e.k}.jpg`;
      const p = BK.porId(e.id);
      if (p && p.activo !== false && await existe(u)) piezas.push({ f: gastar(u), id: e.id });
    }
    // si alguna escena no está, se completa con prendas que no hayan salido
    const resto = act.filter(p => !prodUsados.has(p.id));
    let r = 0;
    while (piezas.length < 3 && r < resto.length) {
      const p = resto[r++]; prodUsados.add(p.id);
      piezas.push({ f: fotoLibre(p), id: p.id });
    }
    const vel = [0.05, -0.07, 0.11];
    $('#look').innerHTML = piezas.slice(0, 3).map((x, i) => {
      const p = BK.porId(x.id);
      return `<figure class="${cls[i]}" data-par="${vel[i]}"><a href="/producto?id=${encodeURIComponent(x.id)}">
        <img src="${x.f}" alt="${BK.esc(p ? p.nombre : '')}" loading="lazy">
        ${p ? `<span class="look__eti"><small>Lleva</small><b>${BK.esc(p.nombre)}</b>${FLECHITA}</span>` : ''}</a></figure>`;
    }).join('');
    BK.aparecer();
  }
  look();

  /* ══════════ 9 · BUSCADOR POR EDAD ══════════ */
  (function edad() {
    const EDADES = [
      { e: 'Recién nacido', t: ['1 mes', '3 meses'] },
      { e: '6 meses', t: ['6 meses'] },
      { e: '1 año', t: ['12 meses'] },
      { e: '2 años', t: ['24 meses', '18 meses'] },
      { e: '3 años', t: ['3 años'] },
      { e: '4 años', t: ['4 años'] },
      { e: '5 años', t: ['5 años'] },
      { e: '6-8 años', t: ['6 años', '7 años', '8 años'] },
    ];
    $('#edad-opts').innerHTML = EDADES.map((x, i) =>
      `<button data-i="${i}" aria-pressed="false">${BK.esc(x.e)}</button>`).join('');
    const res = $('#edad-res');
    res.innerHTML = `<p class="edad__vacio">Elige una edad y te enseñamos solo lo que le vale.</p>`;

    $('#edad-opts').querySelectorAll('button').forEach(b => b.onclick = () => {
      $('#edad-opts').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const x = EDADES[+b.dataset.i];
      const lista = act.filter(p => BK.tallasDe(p).some(t => x.t.includes(t)));
      if (!lista.length) {
        res.innerHTML = `<p class="edad__vacio">Ahora mismo no tenemos nada de esa talla. Escríbenos y te avisamos en cuanto entre.</p>`;
        return;
      }
      res.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-bottom:18px;flex-wrap:wrap">
          <span class="cuenta">${lista.length} ${lista.length === 1 ? 'prenda' : 'prendas'} para ${BK.esc(x.e)}</span>
          <a class="enlace-sub" href="/tienda?talla=${encodeURIComponent(x.t[0])}">Verlas en la tienda</a>
        </div>
        <div class="rejilla rejilla--4">${lista.slice(0, 4).map(BK.tarjeta).join('')}</div>`;
      res.querySelectorAll('.aparece').forEach(n => n.classList.add('visto'));
    });
  })();

  /* ══════════ 10 · OPINIONES ══════════ */
  (function opiniones() {
    const ops = (BK.cat.valoraciones && BK.cat.valoraciones.length ? BK.cat.valoraciones : [
      { texto: 'La calidad no tiene nada que ver con lo que encuentras en una tienda normal. La puntilla es preciosa y aguanta los lavados.', autor: 'Marta R.', rol: 'Mamá de Lucía' },
      { texto: 'Dudaba con la talla del bautizo y me asesoraron por WhatsApp en cinco minutos. Acertaron de pleno.', autor: 'Sara G.', rol: 'Mamá de Hugo' },
      { texto: 'Vestí a los dos hermanos a juego para la boda y no veas las fotos. Repito seguro para la comunión.', autor: 'Noelia P.', rol: 'Mamá de Martina y Pablo' },
      { texto: 'El faldón de bautizo era una preciosidad y llegó en dos días. Se nota que eligen con muchísimo gusto.', autor: 'Ana M.', rol: 'Mamá de Jimena' },
      { texto: 'Me encanta poder preguntar por privado sin agobios y que te contesten al momento. Trato de diez.', autor: 'Rocío L.', rol: 'Mamá de Alonso' },
    ]);
    $('#pista-opiniones').innerHTML = ops.map(o => {
      const ini = (o.autor || '·').trim().charAt(0).toUpperCase();
      return `<blockquote class="opinion">
        <div class="estrellas">★★★★★</div>
        <p>${BK.esc(o.texto)}</p>
        <cite><i>${BK.esc(ini)}</i><span><b>${BK.esc(o.autor)}</b>${o.rol ? BK.esc(o.rol) : ''}</span></cite>
      </blockquote>`;
    }).join('');
    $('#nav-op').innerHTML = `<button data-izq aria-label="Anterior">${FLECHA('i')}</button><button data-der aria-label="Siguiente">${FLECHA('d')}</button>`;
    BK.carrusel($('#car-opiniones'), $('#nav-op'));
  })();

  /* ══════════ 11 · COMUNIDAD ══════════ */
  (function comunidad() {
    // fotos de ambiente: las de niños reales de la tienda, si las hay
    const todas = act.flatMap(p => (p.fotos || []).map(f => ({ f, p })));
    // las fotos «de colección» (las más bonitas, con niños) que aún no hayan salido en la portada
    const amb = (BK.cat.lineas || []).slice().sort((a, b) => (b.ninos ? 1 : 0) - (a.ninos ? 1 : 0))
      .flatMap(l => (l.fotos || []).map(f => ({ f, p: prendaDe(f) })))
      .filter(x => x.p && !fotosUsadas.has(x.f));
    const fotos = (amb.length >= 6 ? amb : todas).slice(0, 6);
    $('#comunidad').innerHTML = fotos.map(x =>
      `<a href="/producto?id=${encodeURIComponent(x.p.id)}"><img src="${x.f}" alt="${BK.esc(x.p.nombre)}" loading="lazy"></a>`).join('');
    $('#redes-botones').innerHTML = BK.redes().map(r =>
      `<a class="btn btn--red btn--${r.n.toLowerCase()}" href="${r.url}" target="_blank" rel="noopener">${r.ico}<span>Síguenos en ${r.n}</span></a>`).join('');
  })();

  /* ---------- remates ---------- */
  $('#cta-wa').href = BK.wa('¡Hola! Quiero que me ayudéis a elegir una prenda.');
  const sw = $('#servicio-wa');
  if (sw) sw.href = BK.wa('¡Hola! Me gustaría que me asesorarais para elegir una prenda.');
  const se = $('#servicio-envio');
  if (se && T.envio) se.textContent = 'Preparamos cada pedido con mimo. ' + T.envio + '.';
  const firma = $('#manif-firma');
  if (firma) firma.textContent = (T.nombre || 'Bonita Kids') + (T.ciudad ? ' · ' + T.ciudad : '');
  BK.aparecer();
})();
