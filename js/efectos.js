/* ============================================================
   Bonita Kids · efectos
   Todo lo que se mueve: títulos que se revelan por palabras,
   cabecera que se esconde al bajar, cursor con etiqueta, arrastre
   de carruseles, parallax, vuelo a la bolsa, aviso rotativo y la
   foto que viaja de la tarjeta a la ficha al cambiar de página.

   Se engancha a BK.aparecer(), que cada página llama cuando ha
   terminado de pintarse. Si el sistema pide menos movimiento,
   casi todo se queda quieto.
   ============================================================ */
(function () {
  'use strict';
  const BK = window.BK;
  if (!BK) return;

  const raiz = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!quieto) raiz.classList.add('fx');

  /* ══════════ AVISOS SUELTOS (toast) ══════════ */
  let cajaAvisos = null;
  BK.avisar = function (texto) {
    if (!cajaAvisos) {
      cajaAvisos = document.createElement('div');
      cajaAvisos.className = 'avisos';
      cajaAvisos.setAttribute('role', 'status');
      cajaAvisos.setAttribute('aria-live', 'polite');
      document.body.appendChild(cajaAvisos);
    }
    const t = document.createElement('div');
    t.className = 'avisos__it';
    t.textContent = texto;
    cajaAvisos.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 3200);
  };

  /* ══════════ TÍTULOS QUE SUBEN PALABRA A PALABRA ══════════ */
  function partir(el) {
    if (el.dataset.partido) return;
    el.dataset.partido = '1';
    let i = 0;
    const trocear = nodo => {
      [...nodo.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const caja = document.createElement('span');
            caja.className = 'pal';
            const dentro = document.createElement('span');
            dentro.textContent = w;
            dentro.style.setProperty('--i', i++);
            caja.appendChild(dentro);
            frag.appendChild(caja);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          trocear(n);
        }
      });
    };
    trocear(el);
  }

  // el titular de la portada se trocea ya, antes del primer pintado (lo anima el CSS)
  const h1Hero = document.querySelector('.hero__txt h1');
  if (h1Hero && !quieto) partir(h1Hero);

  const ioTitulos = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('dentro');
    ioTitulos.unobserve(e.target);
  }), { threshold: .2, rootMargin: '0px 0px -30px' }) : null;

  function titulos() {
    if (quieto || !ioTitulos) return;
    document.querySelectorAll('.titulo-sec:not([data-partido]), .prod__nom:not([data-partido]), .manifiesto__txt:not([data-partido])').forEach(t => {
      if (!t.textContent.trim()) return;           // aún sin rellenar
      partir(t);
      ioTitulos.observe(t);
    });
  }
  BK.partir = partir;

  /* ══════════ ESCALONADO DE REJILLAS ══════════ */
  function escalonar() {
    document.querySelectorAll('.ocasiones, .cols, .rejilla, .pasos, .cifras, .comunidad, .look, .hermanos__duo, .movil nav').forEach(g => {
      [...g.children].forEach((c, i) => c.style.setProperty('--i', i % 8));
    });
    // en los carruseles solo se escalonan las primeras, que son las que se ven de entrada
    document.querySelectorAll('.carrusel__pista').forEach(g => {
      [...g.children].forEach((c, i) => c.style.setProperty('--i', i < 4 ? i : 0));
    });
  }

  /* ══════════ CABECERA QUE BAJA CON LA PÁGINA ══════════ */
  function cabecera() {
    const cab = document.querySelector('.cab');
    if (!cab || cab.dataset.fx) return;
    cab.dataset.fx = '1';
    // en la portada la cabecera va transparente encima de la foto hasta que se sale de ella
    const hero = document.querySelector('.hero--sangre');
    const sobre = () => {
      if (!hero) return;
      const abierto = document.querySelector('.mega.abierto, .buscador.abierto');
      const encima = hero.getBoundingClientRect().bottom > cab.offsetHeight + 24;
      cab.classList.toggle('cab--sobre', !abierto && encima);
      raiz.classList.toggle('en-hero', hero.getBoundingClientRect().bottom > innerHeight * .55);
    };
    let y0 = scrollY, pend = false;
    addEventListener('scroll', () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        const y = scrollY;
        cab.classList.toggle('cab--sombra', y > 40);
        // la cabecera NO se esconde (Darío, 21-sept): baja con la página y solo se compacta un poco
        raiz.classList.toggle('cab-compacta', y > 120);
        y0 = y;
        sobre();
      });
    }, { passive: true });
    if (hero) {
      // al abrir o cerrar el mega menú o el buscador, la cabecera recupera su fondo
      document.addEventListener('click', () => setTimeout(sobre, 10));
      document.addEventListener('keydown', () => setTimeout(sobre, 10));
      addEventListener('resize', sobre);
      sobre();
    }
  }

  /* ══════════ AVISO DE ARRIBA QUE ROTA ══════════ */
  function aviso() {
    const p = document.getElementById('aviso');
    if (!p || p.dataset.fx || quieto) return;
    p.dataset.fx = '1';
    const ls = [...p.children];
    if (ls.length < 2) return;
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      ls[i].classList.remove('on'); ls[i].classList.add('sale'); ls[i].setAttribute('aria-hidden', 'true');
      const viejo = ls[i];
      setTimeout(() => viejo.classList.remove('sale'), 700);
      i = (i + 1) % ls.length;
      ls[i].classList.add('on'); ls[i].removeAttribute('aria-hidden');
    }, 4200);
  }

  /* ══════════ CURSOR CON ETIQUETA ══════════ */
  const ZONAS = [
    ['.galeria__grande', 'Ampliar'],
    ['.ficha__foto, .ocasion figure, .col-tarj figure, .look figure, .mega__it, .hermanos__lado figure > a, .comunidad a, .hero__pila', 'Ver'],
    ['.carrusel__pista', 'Arrastra'],
  ];
  const NO_CURSOR = 'button, .ficha__rapida, .hermanos__flechas, .chincheta, .hero__eti, .look__eti';
  function cursor() {
    if (!fino || quieto || document.querySelector('.burbuja')) return;
    raiz.classList.add('fx-cursor');
    const b = document.createElement('div');
    b.className = 'burbuja';
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = '<span></span>';
    document.body.appendChild(b);
    const txt = b.firstChild;
    let x = -200, y = -200, cx = -200, cy = -200, on = false, raf = 0;

    function mover() {
      cx += (x - cx) * .22; cy += (y - cy) * .22;
      b.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = (Math.abs(x - cx) > .4 || Math.abs(y - cy) > .4) ? requestAnimationFrame(mover) : 0;
    }
    document.addEventListener('mousemove', e => {
      x = e.clientX; y = e.clientY;
      let t = null;
      if (!e.target.closest(NO_CURSOR)) {
        for (const [sel, et] of ZONAS) if (e.target.closest(sel)) { t = et; break; }
      }
      if (t) {
        if (txt.textContent !== t) txt.textContent = t;
        if (!on) { on = true; cx = x; cy = y; b.classList.add('on'); }
      } else if (on) { on = false; b.classList.remove('on'); }
      if (!raf) raf = requestAnimationFrame(mover);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { on = false; b.classList.remove('on'); });
    document.addEventListener('mousedown', () => b.classList.add('pulsa'));
    document.addEventListener('mouseup', () => b.classList.remove('pulsa'));
  }

  /* ══════════ ARRASTRAR LOS CARRUSELES CON EL RATÓN ══════════ */
  function arrastre() {
    if (!fino) return;
    document.querySelectorAll('.carrusel__pista:not([data-arrastre])').forEach(pista => {
      pista.dataset.arrastre = '1';
      let x0 = 0, s0 = 0, mov = false, abajo = false;
      pista.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
        abajo = true; mov = false; x0 = e.clientX; s0 = pista.scrollLeft;
      });
      addEventListener('pointermove', e => {
        if (!abajo) return;
        const dx = e.clientX - x0;
        if (!mov && Math.abs(dx) > 6) { mov = true; pista.classList.add('arrastrando'); }
        if (mov) pista.scrollLeft = s0 - dx;
      });
      addEventListener('pointerup', () => {
        if (!abajo) return;
        abajo = false;
        if (!mov) return;
        pista.classList.remove('arrastrando');
        // el clic que llega al soltar no debe abrir la tarjeta
        const bloquear = ev => { ev.preventDefault(); ev.stopPropagation(); };
        pista.addEventListener('click', bloquear, { capture: true, once: true });
        setTimeout(() => pista.removeEventListener('click', bloquear, true), 60);
      });
      pista.addEventListener('dragstart', e => e.preventDefault());
    });
  }

  /* ══════════ PARALLAX SUAVE ══════════
     data-par="0.08" → se desplaza un 8 % de lo que se aleja del centro de la pantalla.
     Se mide el PADRE, para no medir lo que uno mismo mueve. */
  const conPar = new Set();
  let parListo = false;
  function parallax() {
    if (quieto) return;
    document.querySelectorAll('[data-par]').forEach(el => conPar.add(el));
    if (parListo || !conPar.size) return;
    parListo = true;
    let pend = false;
    const paso = () => {
      pend = false;
      if (innerWidth < 900) { conPar.forEach(el => { el.style.translate = ''; }); return; }
      const vh = innerHeight;
      conPar.forEach(el => {
        if (!el.isConnected) { conPar.delete(el); return; }
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.par);
        el.style.translate = `0 ${d.toFixed(1)}px`;
      });
    };
    const pedir = () => { if (!pend) { pend = true; requestAnimationFrame(paso); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    paso();
  }

  /* ══════════ VOLVER ARRIBA (con anillo de lo que llevas leído) ══════════ */
  function arriba() {
    if (document.querySelector('.arriba')) return;
    const b = document.createElement('button');
    b.className = 'arriba';
    b.setAttribute('aria-label', 'Volver arriba');
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">
      <circle class="arriba__pista" cx="24" cy="24" r="22"/>
      <circle class="arriba__prog" cx="24" cy="24" r="22" pathLength="100"/>
      <path d="M24 31V17M18.5 22.5 24 17l5.5 5.5"/></svg>`;
    document.body.appendChild(b);
    const prog = b.querySelector('.arriba__prog');
    b.onclick = () => scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
    let pend = false;
    addEventListener('scroll', () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        const k = max > 0 ? scrollY / max : 0;
        prog.style.strokeDashoffset = (100 - k * 100).toFixed(1);
        b.classList.toggle('on', scrollY > innerHeight * 1.4);
      });
    }, { passive: true });
  }

  /* ══════════ LA FOTO VUELA HASTA LA BOLSA ══════════ */
  BK.volar = function () {
    const bolsa = document.getElementById('bt-pedido');
    const img = document.querySelector('.rapida.on #rv-img')
      || document.querySelector('.galeria__tira .on img, .galeria__tira img');
    if (quieto || !img || !bolsa || !img.animate) return Promise.resolve();
    raiz.classList.remove('cab-oculta');
    const a = img.getBoundingClientRect();
    const b = bolsa.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) return Promise.resolve();
    const c = document.createElement('img');
    c.src = img.currentSrc || img.src;
    c.alt = '';
    c.className = 'vuela';
    Object.assign(c.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const s = 30 / a.width;
    const an = c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '0%' },
      { transform: `translate(${dx * .3}px,${dy * .3 - 40}px) scale(${Math.max(s * 4, .3)})`, opacity: 1, borderRadius: '30%', offset: .42 },
      { transform: `translate(${dx}px,${dy}px) scale(${s})`, opacity: .35, borderRadius: '50%' },
    ], { duration: 820, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
    return an.finished.then(() => {
      c.remove();
      bolsa.classList.remove('salta'); void bolsa.offsetWidth; bolsa.classList.add('salta');
    }).catch(() => c.remove());
  };

  /* ══════════ LA FOTO DE LA TARJETA VIAJA A LA FICHA ══════════
     Transición entre páginas (View Transitions). La foto pulsada se
     bautiza «foto-prenda» y la ficha tiene su foto grande con ese nombre. */
  function viaje() {
    if (raiz.dataset.viaje) return;
    raiz.dataset.viaje = '1';
    const limpiar = () => document.querySelectorAll('img[style*="view-transition-name"]')
      .forEach(i => { i.style.viewTransitionName = ''; });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href*="/producto?id="]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      limpiar();
      let fotos = [...a.querySelectorAll('img')];
      if (!fotos.length) {
        const f = a.closest('.ficha');
        if (f) fotos = [...f.querySelectorAll('.ficha__foto img')];
      }
      // la que se está viendo (en la tarjeta, al pasar el ratón se ve la segunda)
      const vista = fotos.find(i => parseFloat(getComputedStyle(i).opacity) > .5) || fotos[0];
      if (vista && vista.getBoundingClientRect().width > 40) vista.style.viewTransitionName = 'foto-prenda';
    }, true);
    addEventListener('pageshow', limpiar);
  }

  /* ══════════ ARRANQUE ══════════ */
  function escanear() {
    titulos();
    escalonar();
    arrastre();
    parallax();
  }

  const aparecerBase = BK.aparecer;
  BK.aparecer = function (sel) {
    escanear();
    aparecerBase(sel);
  };

  function montar() {
    cabecera();
    aviso();
    cursor();
    arriba();
    viaje();
  }
  const iniciarBase = BK.iniciar;
  BK.iniciar = async function (activa) {
    await iniciarBase(activa);
    montar();
  };
})();
