/* ============================================================
   Bonita Kids · núcleo de la tienda
   Carga el catálogo, pinta cabecera y pie, y lleva el pedido.
   ============================================================ */
(function () {
  'use strict';

  const LS_PEDIDO = 'bk_pedido_v3';
  // copia del catálogo en el navegador: así la página siguiente se pinta al instante,
  // sin esperar a la red. Caduca a los 5 minutos y el panel la borra al publicar.
  const LS_CAT = 'bk_cat_v1';
  const VIDA_CAT = 5 * 60 * 1000;

  const ICO_RED = {
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.6-.3-3.9-1.1v5.9c0 3.6-2.5 5.8-5.6 5.8-3.3 0-5.6-2.6-5.2-5.9.3-2.6 2.6-4.7 5.5-4.5v2.8c-.4-.1-.8-.1-1.2 0-1.2.3-2 1.3-1.8 2.6.2 1.2 1.2 2 2.4 2 1.4-.1 2.4-1.1 2.4-2.8V3h3.5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.4H7.8v3h2.6V21h3.1z"/></svg>',
  };

  const BK = window.BK = {
    cat: null,
    pedido: [],

    /* ---------- carga del catálogo ---------- */
    async cargar() {
      if (BK.cat) return BK.cat;
      let copia = null;
      try { copia = JSON.parse(localStorage.getItem(LS_CAT) || 'null'); } catch (e) {}
      if (copia && copia.d && Date.now() - copia.t < VIDA_CAT) {
        BK.cat = BK.igualarColores(copia.d);
        BK.traerCatalogo().catch(() => {});   // se refresca por detrás para la próxima página
        return BK.cat;
      }
      BK.cat = BK.igualarColores(await BK.traerCatalogo());
      return BK.cat;
    },
    /* Ana: «los colores son los mismos en todos los modelos de las colecciones, más beige
       o blanco». Cada prenda de una colección ofrece los colores de todas sus hermanas
       + Blanco y Beige; primero los suyos, para que el color elegido de entrada sea el
       de su foto. El panel guarda los de cada prenda tal cual.
       Si la colección trae `colores` (Ana, 19-oct: «LIDIA, solo rojo con beige»), son
       esos y solo esos, sin añadir nada. */
    igualarColores(cat) {
      if (!cat || !Array.isArray(cat.productos)) return cat;
      const fijos = {};
      (cat.lineas || []).forEach(l => { if (Array.isArray(l.colores) && l.colores.length) fijos[l.id] = l.colores; });
      // Colección con `sueltos` (los abrigos): cada prenda con sus colores, sin mezclar ni añadir
      const sueltos = new Set((cat.lineas || []).filter(l => l.sueltos).map(l => l.id));
      const porLinea = {};
      cat.productos.forEach(p => {
        if (p.activo === false || !p.linea || p.aJuego || sueltos.has(p.linea)) return;
        (porLinea[p.linea] = porLinea[p.linea] || []).push(...(p.colores || []));
      });
      cat.productos.forEach(p => {
        if (p.aJuego || sueltos.has(p.linea)) return;   // pajarita, diadema…: «a juego con cualquier colección», sus colores tal cual
        if (fijos[p.linea]) {
          const f = fijos[p.linea];
          p.colores = [...new Set([...(p.colores || []).filter(c => f.includes(c)), ...f])];
          return;
        }
        if (!p.linea || !porLinea[p.linea]) return;
        p.colores = [...new Set([...(p.colores || []), ...porLinea[p.linea], 'Blanco', 'Beige'])];
      });
      return cat;
    },
    async traerCatalogo() {
      let datos = null;
      try {
        const r = await fetch('/api/catalogo', { cache: 'no-store' });
        if (r.ok && r.status === 200) datos = await r.json();
      } catch (e) { /* sin conexión con el panel: seguimos con el de serie */ }
      if (!datos) {
        const r = await fetch('/data/catalogo.json?v=' + Date.now());
        datos = await r.json();
      }
      try { localStorage.setItem(LS_CAT, JSON.stringify({ t: Date.now(), d: datos })); } catch (e) {}
      return datos;
    },

    activos() { return (BK.cat.productos || []).filter(p => p.activo !== false); },
    porId(id) { return (BK.cat.productos || []).find(p => p.id === id); },
    coleccion(id) { return (BK.cat.colecciones || []).find(c => c.id === id); },
    /* Las colecciones de verdad (Mario, Abril, Laura…) viven DENTRO de una categoría
       (las «colecciones» de arriba: Bautizos, Ceremonias, Temporada…). */
    linea(id) { return (BK.cat.lineas || []).find(l => l.id === id); },
    lineasDe(cat, grupo) {
      return (BK.cat.lineas || []).filter(l => l.categoria === cat && (!grupo || l.grupo === grupo)
        && BK.activos().some(p => p.linea === l.id))
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    },
    /* Apartados dentro de una categoría (Flamenca → bebé, punto bebé, niñas, niños): cada
       colección dice a cuál pertenece con «grupo». Solo salen los que tienen prendas. */
    grupo(id) { return (BK.cat.grupos || []).find(g => g.id === id); },
    gruposDe(cat) {
      return (BK.cat.grupos || []).filter(g => g.categoria === cat && BK.lineasDe(cat, g.id).length)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    },
    /** Nombre corto para enseñar en tarjetas y fichas: la colección si la tiene, si no la categoría. */
    nombreCol(p) { const l = BK.linea(p.linea); const c = BK.coleccion(p.coleccion); return l ? l.nombre : (c ? c.nombre : ''); },
    /* Los colores combinados («Burdeos con rosa») llevan hex2: muestra partida en dos tonos. */
    fondoColor(c) { return c.hex2 ? `linear-gradient(135deg,${c.hex} 50%,${c.hex2} 50%)` : c.hex; },
    colorHex(n) { const c = (BK.cat.colores || []).find(x => x.n === n); return c ? BK.fondoColor(c) : '#DDD3C9'; },
    tallasDe(p) {
      if (Array.isArray(p.tallas) && p.tallas.length) return p.tallas;
      const t = (BK.cat.tallajes || {})[p.tallaje];
      return t ? t.tallas : [];
    },
    foto(p, i) { return (p.fotos && p.fotos[i]) || (p.fotos && p.fotos[0]) || '/img/l/marco.svg'; },
    rangoTallas(p) {
      const t = BK.tallasDe(p);
      if (!t.length) return '';
      return t.length === 1 ? t[0] : t[0] + ' – ' + t[t.length - 1];
    },

    /* ---------- WhatsApp ---------- */
    tieneWa() { return !!(BK.cat.tienda && BK.cat.tienda.whatsapp); },
    /* Cómo se llama el canal por el que se escribe: mientras no tengamos su
       WhatsApp, los mensajes van al buzón de Instagram, y los botones deben
       decir la verdad. */
    canal() { return BK.tieneWa() ? 'WhatsApp' : 'Instagram'; },
    wa(texto) {
      const t = BK.cat.tienda || {};
      const n = (t.whatsapp || '').replace(/\D/g, '');
      if (n) return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
      // mientras no tengamos su WhatsApp, el mensaje va al buzón de sus redes
      if (t.instagram) return 'https://ig.me/m/' + t.instagram;
      if (t.facebook) return 'https://m.me/' + t.facebook;
      return 'https://ig.me/m/bonitakidsmodainfantil';
    },
    /* Redes de la tienda, en el orden en que se enseñan (TikTok, Instagram, Facebook). */
    redes() {
      const t = BK.cat.tienda || {};
      return [
        t.tiktok && { n: 'TikTok', url: 'https://www.tiktok.com/@' + t.tiktok, ico: ICO_RED.tiktok },
        t.instagram && { n: 'Instagram', url: 'https://instagram.com/' + t.instagram, ico: ICO_RED.instagram },
        t.facebook && { n: 'Facebook', url: 'https://facebook.com/' + t.facebook, ico: ICO_RED.facebook },
      ].filter(Boolean);
    },
    textoWa(p, talla, color) {
      const t = BK.cat.tienda || {};
      let m = '¡Hola ' + (t.nombre || '') + '! Me interesa esta prenda de vuestra web:\n\n';
      m += '• ' + p.nombre;
      if (BK.nombreCol(p)) m += ' (colección ' + BK.nombreCol(p) + ')';
      if (talla) m += '\n  Talla: ' + talla;
      if (color) m += '\n  Color: ' + color;
      m += '\n\n¿Me decís precio y si tenéis disponibilidad? Gracias 🙂';
      return m;
    },

    /* ---------- pedido ---------- */
    leerPedido() {
      try { BK.pedido = JSON.parse(localStorage.getItem(LS_PEDIDO) || '[]'); }
      catch (e) { BK.pedido = []; }
      return BK.pedido;
    },
    guardarPedido() {
      localStorage.setItem(LS_PEDIDO, JSON.stringify(BK.pedido));
      BK.pintarPastilla();
      BK.pintarCajon();
    },
    anadir(id, talla, color) {
      const k = BK.pedido.find(l => l.id === id && l.talla === talla && l.color === color);
      if (k) k.n++; else BK.pedido.push({ id, talla, color, n: 1 });
      const i = BK.pedido.findIndex(l => l.id === id && l.talla === talla && l.color === color);
      // la foto vuela hasta la bolsa (efectos.js) y después se abre el cajón con la línea marcada
      const vuelo = BK.volar ? BK.volar() : Promise.resolve();
      vuelo.then(() => {
        BK.guardarPedido();
        BK.abrirCajon();
        const fila = document.getElementById('cajon-lista')?.children[i];
        if (fila) { fila.classList.remove('nueva'); void fila.offsetWidth; fila.classList.add('nueva'); }
      });
    },
    quitar(i) { BK.pedido.splice(i, 1); BK.guardarPedido(); },
    cambiar(i, d) {
      BK.pedido[i].n += d;
      if (BK.pedido[i].n < 1) BK.pedido.splice(i, 1);
      BK.guardarPedido();
    },
    unidades() { return BK.pedido.reduce((s, l) => s + l.n, 0); },
    mensajePedido() {
      const t = BK.cat.tienda || {};
      let m = '¡Hola ' + (t.nombre || '') + '! Os dejo mi pedido desde la web:\n\n';
      BK.pedido.forEach((l, i) => {
        const p = BK.porId(l.id); if (!p) return;
        m += (i + 1) + '. ' + p.nombre;
        if (BK.nombreCol(p)) m += ' — col. ' + BK.nombreCol(p);
        m += '\n   Talla: ' + (l.talla || 'por confirmar');
        if (l.color) m += ' · Color: ' + l.color;
        if (l.n > 1) m += ' · ' + l.n + ' uds.';
        m += '\n';
      });
      m += '\n¿Me confirmáis precio y disponibilidad? Gracias 🙂';
      return m;
    },

    /* ---------- utilidades ---------- */
    ocasiones() { return BK.cat.ocasiones || []; },
    porOcasion(n) { return BK.activos().filter(p => (p.ocasion || []).includes(n)); },
    quien(p) { return p.quien || (p.tallaje === 'bebe' ? 'bebe' : (p.tipo === 'Conjunto niño' ? 'nino' : 'nina')); },
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    /* Encuadre: las fotos se recortan a 4:5; «foco» dice dónde mirar en cada una para no cortar
       la cara de los niños. Se aplica a cualquier <img> que aparezca en la página. */
    encuadrar() {
      const foco = BK.cat.foco || {};
      if (!Object.keys(foco).length) return;
      const poner = raiz => raiz.querySelectorAll('img').forEach(i => {
        const f = foco[(i.getAttribute('src') || '').split('?')[0]];
        if (f && i.style.objectPosition !== f) i.style.objectPosition = f;
      });
      poner(document);
      let t;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => poner(document), 60); })
        .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    },
    aparecer(sel) {
      const io = new IntersectionObserver((es) => {
        es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
      }, { threshold: .08, rootMargin: '0px 0px -40px' });
      document.querySelectorAll(sel || '.aparece').forEach(n => io.observe(n));
    },
  };

  /* ============================================================
     CABECERA
     ============================================================ */
  const ICO = {
    lupa: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    bolsa: '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  BK.montarCabecera = function (activa) {
    const t = BK.cat.tienda || {};
    const cols = (BK.cat.colecciones || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const enl = [
      ['/tienda', 'Tienda', 'tienda'],
      ['/tienda?quien=nina', 'Niña', 'nina'],
      ['/tienda?quien=nino', 'Niño', 'nino'],
      ['/tallas', 'Guía de tallas', 'tallas'],
    ];
    const avisos = [t.envio || 'Envíos a toda España',
      BK.tieneWa() ? 'Compra asistida por WhatsApp' : 'Te asesoramos antes de comprar',
      'Cambio de talla sin coste durante 14 días', 'Precio bajo consulta, sin compromiso'];
    const html = `
<div class="aviso"><div class="aviso__pista" id="aviso">${avisos.map((m, i) =>
      `<span${i ? ' aria-hidden="true"' : ' class="on"'}>${BK.esc(m)}</span>`).join('')}</div></div>
<header class="cab">
  <div class="env cab__fila">
    <nav class="nav nav--esc">
      <button id="bt-mega" aria-expanded="false">Colecciones</button>
      ${enl.map(e => `<a href="${e[0]}"${activa === e[2] ? ' aria-current="page"' : ''}>${e[1]}</a>`).join('')}
    </nav>
    <button class="icono hamb" id="bt-menu" aria-label="Abrir el menú">${ICO.menu}</button>
    <a class="cab__marca" href="/" aria-label="${BK.esc(t.nombre || '')} · Inicio">
      <img src="/img/m/logo-bk.webp" alt="${BK.esc(t.nombre || '')}" width="812" height="161">
    </a>
    <div class="cab__acc">
      <button class="icono" id="bt-buscar" aria-label="Buscar" aria-expanded="false">${ICO.lupa}</button>
      <button class="icono" id="bt-pedido" aria-label="Mi pedido">${ICO.bolsa}<span class="pastilla oculto" id="pastilla">0</span></button>
    </div>
  </div>
  <div class="buscador" id="buscador">
    <div class="env buscador__caja">
      <form class="buscador__campo" role="search" action="/tienda" method="get">
        ${ICO.lupa}
        <input type="search" name="q" id="bus-q" autocomplete="off" placeholder="Busca por prenda, colección o color…" aria-label="Buscar en la tienda">
        <button type="button" class="icono" id="bt-cerrar-bus" aria-label="Cerrar la búsqueda">${ICO.cerrar}</button>
      </form>
      <div class="buscador__res" id="bus-res"></div>
      <div class="buscador__pistas">
        <span>Se busca a menudo</span>
        ${['Vestido', 'Jesusito', 'Bautizo', 'Marfil', 'Conjunto niño'].map(v =>
          `<a href="/tienda?q=${encodeURIComponent(v)}">${v}</a>`).join('')}
      </div>
    </div>
  </div>
  <div class="mega" id="mega">
    <div class="env mega__caja">
      <div class="mega__rejilla">
        ${cols.map(c => `<a class="mega__it" href="/tienda/${c.id}">
          <img src="${c.portada}" alt="Colección ${BK.esc(c.nombre)}" loading="lazy">
          <h4>${BK.esc(c.nombre)}</h4>${BK.lineasDe(c.id).length
            ? `<p class="mega__lineas">${(BK.gruposDe(c.id).length ? BK.gruposDe(c.id) : BK.lineasDe(c.id)).map(l => BK.esc(l.nombre)).join(' · ')}</p>`
            : `<p>${BK.esc(c.desc || '')}</p>`}</a>`).join('')}
      </div>
      <div class="mega__lado">
        <h4>Por ocasión</h4>
        <ul>${(BK.cat.ocasiones || []).map(o =>
          `<li><a href="/tienda?ocasion=${encodeURIComponent(o.n)}">${BK.esc(o.n)}</a></li>`).join('')}</ul>
        <h4 style="margin-top:22px">A quién viste</h4>
        <ul>
          <li><a href="/tienda?quien=nina">Niña</a></li>
          <li><a href="/tienda?quien=nino">Niño</a></li>
          <li><a href="/tienda?quien=bebe">Bebé</a></li>
        </ul>
        <h4 style="margin-top:22px">Te ayudamos</h4>
        <ul>
          <li><a href="/tallas">Guía de tallas</a></li>
          <li><a href="/ayuda">Preguntas frecuentes</a></li>
        </ul>
      </div>
    </div>
  </div>
</header>
<div class="movil" id="menu-movil">
  <div class="movil__top">
    <a class="cab__marca" href="/"><img src="/img/m/logo-bk.webp" alt="${BK.esc(t.nombre || '')}" width="812" height="161"></a>
    <button class="icono" id="bt-cerrar-menu" aria-label="Cerrar el menú">${ICO.cerrar}</button>
  </div>
  <nav>
    <a href="/tienda">Toda la tienda</a>
    ${cols.map(c => `<a href="/tienda/${c.id}">${BK.esc(c.nombre)}<small>${BK.lineasDe(c.id).length ? BK.lineasDe(c.id).length + ' colecciones' : 'Muy pronto'}</small></a>`
      + (BK.gruposDe(c.id).length
        ? BK.gruposDe(c.id).map(g => `<a class="movil__sub" href="/tienda/${c.id}/${g.id}">${BK.esc(g.nombre)}</a>`)
        : BK.lineasDe(c.id).map(l => `<a class="movil__sub" href="/tienda/${c.id}/coleccion-${l.id}">${BK.esc(l.nombre)}</a>`)).join('')).join('')}
    <a href="/tienda?quien=nina">Niña</a>
    <a href="/tienda?quien=nino">Niño</a>
    <a href="/tienda?quien=bebe">Bebé</a>
    ${(BK.cat.ocasiones || []).map(o => `<a href="/tienda?ocasion=${encodeURIComponent(o.n)}">${BK.esc(o.n)}<small>Ocasión</small></a>`).join('')}
    <a href="/tallas">Guía de tallas</a>
    <a href="/ayuda">Preguntas frecuentes</a>
  </nav>
</div>`;
    const host = document.getElementById('cabecera');
    if (host) host.innerHTML = html;

    const mega = document.getElementById('mega');
    const btMega = document.getElementById('bt-mega');
    if (btMega) {
      const cerrar = () => { mega.classList.remove('abierto'); btMega.setAttribute('aria-expanded', 'false'); };
      btMega.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = mega.classList.toggle('abierto');
        btMega.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      document.addEventListener('click', (e) => { if (!mega.contains(e.target)) cerrar(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    }
    montarBuscador();

    const mm = document.getElementById('menu-movil');
    document.getElementById('bt-menu')?.addEventListener('click', () => mm.classList.add('abierto'));
    document.getElementById('bt-cerrar-menu')?.addEventListener('click', () => mm.classList.remove('abierto'));
    document.getElementById('bt-pedido')?.addEventListener('click', BK.abrirCajon);
    BK.pintarPastilla();
  };

  /* ============================================================
     BUSCADOR DE LA CABECERA
     Busca mientras escribes sobre el catálogo que ya está cargado.
     ============================================================ */
  const sinTildes = s => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function montarBuscador() {
    const caja = document.getElementById('buscador');
    const bt = document.getElementById('bt-buscar');
    const campo = document.getElementById('bus-q');
    const res = document.getElementById('bus-res');
    if (!caja || !bt || !campo) return;

    const abrir = () => {
      caja.classList.add('abierto');
      bt.setAttribute('aria-expanded', 'true');
      setTimeout(() => campo.focus(), 60);
    };
    const cerrar = () => {
      caja.classList.remove('abierto');
      bt.setAttribute('aria-expanded', 'false');
    };
    bt.addEventListener('click', e => {
      e.stopPropagation();
      caja.classList.contains('abierto') ? cerrar() : abrir();
    });
    document.getElementById('bt-cerrar-bus')?.addEventListener('click', cerrar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
    document.addEventListener('click', e => {
      if (caja.classList.contains('abierto') && !caja.contains(e.target) && e.target !== bt) cerrar();
    });

    let t = null;
    campo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 130); });

    function buscar() {
      const q = sinTildes(campo.value.trim());
      if (q.length < 2) { res.innerHTML = ''; res.classList.remove('con'); return; }
      const palabras = q.split(/\s+/);
      const hallados = BK.activos().filter(p => {
        const c = BK.coleccion(p.coleccion);
        const heno = sinTildes([p.nombre, p.tipo, p.descripcion, c && c.nombre, BK.nombreCol(p),
          (p.colores || []).join(' '), (p.ocasion || []).join(' ')].join(' '));
        return palabras.every(w => heno.includes(w));
      }).slice(0, 5);

      if (!hallados.length) {
        res.innerHTML = `<p class="buscador__nada">No encontramos nada con «${BK.esc(campo.value.trim())}».
          Escríbenos y te lo buscamos: <a href="${BK.wa('¡Hola! Busco algo que no encuentro en la web.')}" target="_blank" rel="noopener">preguntar por ${BK.canal()}</a>.</p>`;
      } else {
        res.innerHTML = hallados.map(p => {
          const c = BK.coleccion(p.coleccion);
          return `<a class="bus__it" href="/producto/${encodeURIComponent(p.id)}">
            <img src="${BK.foto(p, 0)}" alt="" loading="lazy">
            <span><small>${BK.esc(BK.nombreCol(p) || p.tipo || '')}</small>
              <b>${BK.esc(p.nombre)}</b>
              <em>${BK.esc(BK.rangoTallas(p))}</em></span>
          </a>`;
        }).join('') + `<a class="bus__todo" href="/tienda?q=${encodeURIComponent(campo.value.trim())}">
            Ver todo lo que casa con «${BK.esc(campo.value.trim())}»</a>`;
      }
      res.classList.add('con');
    }
  }

  /* ============================================================
     PIE
     ============================================================ */
  BK.montarPie = function () {
    const t = BK.cat.tienda || {};
    const L = t.legal || {};
    const cols = (BK.cat.colecciones || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const host = document.getElementById('pie');
    if (!host) return;
    host.innerHTML = `
<footer class="pie">
  <div class="env">
    <div class="pie__rejilla">
      <div>
        <span class="pie__nube"><img class="pie__marca" src="/img/m/logo-bk.webp" alt="${BK.esc(t.nombre || '')}" width="812" height="161"></span>
        <p style="font-size:14px;max-width:34ch">
          Fabricantes de ropa y complementos infantiles: bautizos, ceremonias, temporada de invierno y de verano, y flamenca. ${BK.esc(t.ciudad || '')}.
        </p>
        <div class="pie__redes">${BK.redes().map(r =>
          `<a href="${r.url}" target="_blank" rel="noopener" aria-label="Síguenos en ${r.n}">${r.ico}</a>`).join('')}</div>
      </div>
      <div class="pie__contacto"><h4>Contacto</h4><ul>
        ${L.direccion ? `<li><span>Tienda</span><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(L.direccion)}" target="_blank" rel="noopener">${BK.esc(L.direccion)}</a></li>` : ''}
        ${L.telefono ? `<li><span>Teléfono</span><a href="tel:+34${L.telefono.replace(/\D/g, '')}">${BK.esc(L.telefono)}</a></li>` : ''}
        ${BK.tieneWa() ? `<li><span>WhatsApp</span><a href="${BK.wa('¡Hola! Os escribo desde la web.')}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></li>` : ''}
        ${L.email ? `<li><span>Correo</span><a href="mailto:${BK.esc(L.email)}">${BK.esc(L.email)}</a></li>` : ''}
      </ul></div>
      <div><h4>Colecciones</h4><ul>
        ${cols.map(c => `<li><a href="/tienda/${c.id}">${BK.esc(c.nombre)}</a></li>`).join('')}
      </ul></div>
      <div><h4>La tienda</h4><ul>
        <li><a href="/tienda">Todas las prendas</a></li>
        <li><a href="/tienda?quien=nina">Niña</a></li>
        <li><a href="/tienda?quien=nino">Niño</a></li>
        <li><a href="/tienda?quien=bebe">Bebé</a></li>
        <li><a href="/tallas">Guía de tallas</a></li>
      </ul></div>
      <div><h4>Ayuda</h4><ul>
        <li><a href="/ayuda">Preguntas frecuentes</a></li>
        <li><a href="/tallas">Guía de tallas</a></li>
        <li><a href="${BK.wa('¡Hola! Tengo una duda.')}" target="_blank" rel="noopener">Dudas por ${BK.canal()}</a></li>
        ${BK.redes().map(r => `<li><a href="${r.url}" target="_blank" rel="noopener">${r.n}</a></li>`).join('')}
      </ul></div>
    </div>
    <div class="pie__legal">
      <span>© ${new Date().getFullYear()} ${BK.esc(t.nombre || '')}. Todos los derechos reservados.</span>
      <span class="pie__legales">
        <a href="/legal">Aviso legal</a><a href="/legal#privacidad">Privacidad</a><a href="/legal">Condiciones de venta</a>
      </span>
      <span>Precio bajo consulta, sin compromiso.</span>
    </div>
  </div>
</footer>
<a class="wa-flota" href="${BK.wa('¡Hola! Os escribo desde la web.')}" target="_blank" rel="noopener" aria-label="Escribir por ${BK.canal()}">
  ${BK.tieneWa() ? `<svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11a15 15 0 0 1-1.65-.61c-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43a1.07 1.07 0 0 1 .78-.36h.56c.18 0 .42-.07.65.5.24.58.82 2.01.89 2.16.07.14.12.31.02.5-.09.19-.14.31-.28.48l-.42.49c-.14.14-.28.29-.12.57.15.28.68 1.13 1.47 1.83 1.01.9 1.86 1.18 2.14 1.32.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.28.37-.24.63-.14.26.09 1.68.79 1.96.94.29.14.48.21.55.33.07.12.07.68-.17 1.35z"/></svg>` : `<svg viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.72a6.12 6.12 0 1 0 0 12.24 6.12 6.12 0 0 0 0-12.24zm0 10.1a3.98 3.98 0 1 1 0-7.96 3.98 3.98 0 0 1 0 7.96zm7.79-10.34a1.43 1.43 0 1 1-2.86 0 1.43 1.43 0 0 1 2.86 0z"/></svg>`}
</a>`;
  };

  /* ============================================================
     CAJÓN DEL PEDIDO
     ============================================================ */
  BK.montarCajon = function () {
    if (document.getElementById('cajon')) return;
    const d = document.createElement('div');
    d.innerHTML = `
<div class="velo" id="velo"></div>
<aside class="cajon" id="cajon" aria-label="Mi pedido">
  <div class="cajon__cab">
    <h3>Mi pedido</h3>
    <button class="icono" id="bt-cerrar-cajon" aria-label="Cerrar">${ICO.cerrar}</button>
  </div>
  <div class="cajon__lista" id="cajon-lista"></div>
  <div class="cajon__pie" id="cajon-pie"></div>
</aside>`;
    document.body.appendChild(d);
    document.getElementById('velo').addEventListener('click', BK.cerrarCajon);
    document.getElementById('bt-cerrar-cajon').addEventListener('click', BK.cerrarCajon);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') BK.cerrarCajon(); });
    BK.pintarCajon();
  };
  BK.abrirCajon = function () {
    document.getElementById('cajon')?.classList.add('on');
    document.getElementById('velo')?.classList.add('on');
    document.body.style.overflow = 'hidden';
  };
  BK.cerrarCajon = function () {
    document.getElementById('cajon')?.classList.remove('on');
    document.getElementById('velo')?.classList.remove('on');
    document.body.style.overflow = '';
  };
  BK.pintarPastilla = function () {
    const p = document.getElementById('pastilla'); if (!p) return;
    const n = BK.unidades();
    p.textContent = n; p.classList.toggle('oculto', n === 0);
  };
  BK.pintarCajon = function () {
    const lista = document.getElementById('cajon-lista');
    const pie = document.getElementById('cajon-pie');
    if (!lista || !pie) return;
    if (!BK.pedido.length) {
      lista.innerHTML = `<div class="cajon__vacio">
        <img class="cajon__pajaro" src="/img/m/pajaro.webp" alt="" width="260" height="311">
        <p class="cajon__vacio-t">Tu pedido está vacío</p>
        <p>Ve añadiendo las prendas que te gusten y nos las mandas de una vez por ${BK.canal()}.</p>
        <a class="btn btn--linea" href="/tienda">Ver la tienda</a></div>`;
      pie.innerHTML = '';
      return;
    }
    lista.innerHTML = BK.pedido.map((l, i) => {
      const p = BK.porId(l.id); if (!p) return '';
      return `<div class="linea-ped">
        <img src="${BK.foto(p, 0)}" alt="${BK.esc(p.nombre)}" loading="lazy">
        <div>
          <h4>${BK.esc(p.nombre)}</h4>
          <small>Talla ${BK.esc(l.talla || 'por confirmar')}${l.color ? ' · ' + BK.esc(l.color) : ''}</small>
          <div class="cant">
            <button data-i="${i}" data-d="-1" aria-label="Quitar una">−</button>
            <span>${l.n}</span>
            <button data-i="${i}" data-d="1" aria-label="Añadir una">+</button>
          </div>
        </div>
        <button data-quitar="${i}">Quitar</button>
      </div>`;
    }).join('');
    lista.querySelectorAll('[data-d]').forEach(b => b.onclick = () => BK.cambiar(+b.dataset.i, +b.dataset.d));
    lista.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => BK.quitar(+b.dataset.quitar));
    pie.innerHTML = `
      <p><strong>Precio bajo consulta.</strong> Te enviamos el precio y la disponibilidad por ${BK.canal()}, al momento y sin compromiso.</p>
      <a class="btn btn--wa btn--bloque" id="bt-enviar" href="${BK.wa(BK.mensajePedido())}" target="_blank" rel="noopener">
        Enviar pedido por ${BK.canal()} (${BK.unidades()})
      </a>`;
  };

  /* ============================================================
     TARJETA DE PRODUCTO (se usa en portada y tienda)
     ============================================================ */
  BK.tarjeta = function (p, opc) {
    const col = BK.coleccion(p.coleccion);
    const f1 = (opc && opc.foto) || BK.foto(p, 0);
    const f2 = (p.fotos || []).find(f => f !== f1);
    const cols = (p.colores || []).slice(0, 4);
    return `<article class="ficha aparece">
      <a class="ficha__foto" href="/producto/${encodeURIComponent(p.id)}" aria-label="${BK.esc(p.nombre)}">
        ${p.destacado ? '<span class="ficha__eti">Destacado</span>' : ''}
        <img class="a" src="${f1}" alt="${BK.esc(p.nombre)}" loading="lazy">
        ${f2 ? `<img class="b" src="${f2}" alt="" loading="lazy" aria-hidden="true">` : ''}
        <span class="ficha__ver">Ver la prenda</span>
      </a>
      <button class="ficha__rapida" data-rapida="${BK.esc(p.id)}" aria-label="Vista rápida de ${BK.esc(p.nombre)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Vista rápida</span>
      </button>
      <div class="ficha__cuerpo">
        <span class="ficha__col">${BK.esc(BK.nombreCol(p) || p.tipo || '')}</span>
        <a class="ficha__nom" href="/producto/${encodeURIComponent(p.id)}">${BK.esc(p.nombre)}</a>
        <div class="ficha__meta">
          <span class="puntos">${cols.map(c => `<i class="punto" style="background:${BK.colorHex(c)}" title="${BK.esc(c)}"></i>`).join('')}
          ${(p.colores || []).length > 4 ? `<i class="punto punto--mas">+${p.colores.length - 4}</i>` : ''}</span>
          <span>${BK.esc(BK.rangoTallas(p))}</span>
        </div>
      </div>
    </article>`;
  };

  /* ============================================================
     VISTA RÁPIDA (se abre sin salir de la página)
     ============================================================ */
  BK.montarVistaRapida = function () {
    if (document.getElementById('rapida')) return;
    const d = document.createElement('div');
    d.innerHTML = `
<div class="velo velo--rapida" id="velo-rapida"></div>
<div class="rapida" id="rapida" role="dialog" aria-modal="true" aria-label="Vista rápida">
  <button class="rapida__x" id="rapida-x" aria-label="Cerrar">${ICO.cerrar}</button>
  <div class="rapida__cuerpo" id="rapida-cuerpo"></div>
</div>`;
    document.body.appendChild(d);
    document.getElementById('velo-rapida').addEventListener('click', BK.cerrarVista);
    document.getElementById('rapida-x').addEventListener('click', BK.cerrarVista);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') BK.cerrarVista(); });
    // delegación: cualquier tarjeta de la página abre su vista rápida
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-rapida]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      BK.abrirVista(b.dataset.rapida);
    });
  };

  BK.cerrarVista = function () {
    document.getElementById('rapida')?.classList.remove('on');
    document.getElementById('velo-rapida')?.classList.remove('on');
    if (!document.getElementById('cajon')?.classList.contains('on')) document.body.style.overflow = '';
  };

  BK.abrirVista = function (id) {
    const p = BK.porId(id); if (!p) return;
    const col = BK.coleccion(p.coleccion);
    const tallas = BK.tallasDe(p);
    const tallaje = (BK.cat.tallajes || {})[p.tallaje] || {};
    const fotos = (p.fotos && p.fotos.length) ? p.fotos : ['/img/l/marco.svg'];
    const sel = { talla: null, color: (p.colores || [])[0] || null, i: 0 };

    document.getElementById('rapida-cuerpo').innerHTML = `
  <div class="rapida__foto">
    <img id="rv-img" src="${fotos[0]}" alt="${BK.esc(p.nombre)}">
    ${fotos.length > 1 ? `<div class="rapida__puntos" id="rv-puntos">
      ${fotos.map((f, i) => `<button data-i="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"></button>`).join('')}
    </div>` : ''}
  </div>
  <div class="rapida__info">
    <span class="prod__col">${BK.esc(BK.nombreCol(p) ? 'Colección ' + BK.nombreCol(p) : p.tipo || '')}</span>
    <h3>${BK.esc(p.nombre)}</h3>
    <p class="prod__precio">Precio bajo consulta</p>
    <p class="rapida__desc">${BK.esc(p.descripcion || '')}</p>
    ${(p.colores || []).length ? `<div class="campo">
      <div class="campo__tit">Color <span id="rv-color">${BK.esc(sel.color || '')}</span></div>
      <div class="muestras" id="rv-colores">${(p.colores || []).map(c =>
        `<button data-c="${BK.esc(c)}" style="background:${BK.colorHex(c)}" aria-pressed="${c === sel.color}" title="${BK.esc(c)}"></button>`).join('')}</div>
    </div>` : ''}
    <div class="campo">
      <div class="campo__tit">Talla <span>${BK.esc(tallaje.nombre || '')}</span></div>
      <div class="tallas" id="rv-tallas">${tallas.map(t => `<button data-t="${BK.esc(t)}">${BK.esc(t)}</button>`).join('')}</div>
      <div class="aviso-talla" id="rv-aviso">Elige una talla para añadirla al pedido.</div>
    </div>
    <div class="acciones">
      <button class="btn btn--bloque" id="rv-anadir">Añadir a mi pedido</button>
      <a class="btn btn--linea btn--bloque" href="/producto/${encodeURIComponent(p.id)}">Ver la ficha completa</a>
    </div>
  </div>`;

    const $r = s => document.getElementById(s);
    $r('rv-puntos')?.querySelectorAll('button').forEach(b => b.onclick = () => {
      sel.i = +b.dataset.i; $r('rv-img').src = fotos[sel.i];
      $r('rv-puntos').querySelectorAll('button').forEach(x => x.setAttribute('aria-current', x === b));
    });
    $r('rv-colores')?.querySelectorAll('button').forEach(b => b.onclick = () => {
      sel.color = b.dataset.c; $r('rv-color').textContent = sel.color;
      $r('rv-colores').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    });
    $r('rv-tallas').querySelectorAll('button').forEach(b => b.onclick = () => {
      sel.talla = b.dataset.t; $r('rv-aviso').classList.remove('on');
      $r('rv-tallas').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    });
    $r('rv-anadir').onclick = () => {
      if (!sel.talla) { $r('rv-aviso').classList.add('on'); return; }
      BK.anadir(p.id, sel.talla, sel.color);
      BK.cerrarVista();
    };

    document.getElementById('rapida').classList.add('on');
    document.getElementById('velo-rapida').classList.add('on');
    document.body.style.overflow = 'hidden';
    BK.verReciente(p.id);
  };

  /* ---------- vistos recientemente ---------- */
  BK.verReciente = function (id) {
    try {
      let l = JSON.parse(localStorage.getItem('bk_vistos') || '[]');
      l = [id].concat(l.filter(x => x !== id)).slice(0, 8);
      localStorage.setItem('bk_vistos', JSON.stringify(l));
    } catch (e) {}
  };
  BK.recientes = function (excluir) {
    try {
      return JSON.parse(localStorage.getItem('bk_vistos') || '[]')
        .filter(x => x !== excluir).map(BK.porId).filter(p => p && p.activo !== false);
    } catch (e) { return []; }
  };

  /* ============================================================
     CARRUSEL (scroll-snap + flechas)
     ============================================================ */
  BK.carrusel = function (caja, nav) {
    if (!caja) return;
    const pista = caja.querySelector('[data-pista]');
    const donde = nav || caja;
    const izq = donde.querySelector('[data-izq]');
    const der = donde.querySelector('[data-der]');
    if (!pista) return;
    const paso = () => {
      const it = pista.firstElementChild;
      if (!it) return 300;
      const g = parseFloat(getComputedStyle(pista).columnGap || getComputedStyle(pista).gap || 0) || 0;
      return it.getBoundingClientRect().width + g;
    };
    let barra = caja.querySelector('.carrusel__barra');
    if (!barra) {
      barra = document.createElement('div');
      barra.className = 'carrusel__barra';
      barra.innerHTML = '<i></i>';
      caja.appendChild(barra);
    }
    const trazo = barra.firstElementChild;
    const refrescar = () => {
      const max = pista.scrollWidth - pista.clientWidth - 2;
      const visto = Math.min(1, pista.clientWidth / pista.scrollWidth);
      trazo.style.width = (visto * 100) + '%';
      trazo.style.transform = 'translateX(' + (max > 0 ? (pista.scrollLeft / max) * ((1 - visto) / visto) * 100 : 0) + '%)';
      izq && (izq.disabled = pista.scrollLeft <= 2);
      der && (der.disabled = pista.scrollLeft >= max);
      const vacio = max <= 2;
      caja.classList.toggle('sin-flechas', vacio);
      if (nav) nav.style.display = vacio ? 'none' : '';
    };
    izq && (izq.onclick = () => pista.scrollBy({ left: -paso() * 1, behavior: 'smooth' }));
    der && (der.onclick = () => pista.scrollBy({ left: paso() * 1, behavior: 'smooth' }));
    pista.addEventListener('scroll', refrescar, { passive: true });
    window.addEventListener('resize', refrescar);
    setTimeout(refrescar, 60);
  };

  /* ---------- arranque común ---------- */
  /* ---------- quiénes somos, para Google ---------- */
  function montarMarca() {
    if (document.getElementById('ld-marca')) return;
    const t = BK.cat.tienda || {};
    const raiz = location.origin;
    const redes = [];
    BK.redes().forEach(r => redes.push(r.url));
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = 'ld-marca';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: t.nombre || 'BonitaKid\u2019s',
      description: 'Moda infantil de ceremonia, bautizo y diario, de recién nacido a 8 años.',
      url: raiz,
      logo: raiz + '/img/m/logo-bk.webp',
      image: raiz + '/img/og.jpg',
      areaServed: 'ES',
      address: t.ciudad ? { '@type': 'PostalAddress', addressLocality: t.ciudad, addressCountry: 'ES' } : undefined,
      telephone: t.whatsapp ? '+' + String(t.whatsapp).replace(/\D/g, '') : undefined,
      sameAs: redes.length ? redes : undefined,
    });
    document.head.appendChild(ld);
  }

  BK.iniciar = async function (activa) {
    await BK.cargar();
    BK.leerPedido();
    BK.montarCabecera(activa);
    BK.montarPie();
    BK.montarCajon();
    BK.montarVistaRapida();
    montarMarca();
    BK.encuadrar();
  };
})();
