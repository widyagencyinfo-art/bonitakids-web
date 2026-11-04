/* Tienda: filtros por colección, tipo, color y talla. */
(async function () {
  await BK.iniciar('tienda');

  const $ = s => document.querySelector(s);
  const par = new URLSearchParams(location.search);
  const estado = {
    ocasion: par.getAll('ocasion'),
    quien: par.getAll('quien'),
    col: par.getAll('col'),
    grupo: par.getAll('grupo'),
    linea: par.getAll('linea'),
    tipo: par.getAll('tipo'),
    color: par.getAll('color'),
    talla: par.getAll('talla'),
    q: par.get('q') || '',
    orden: par.get('orden') || 'rec',
  };
  const QUIEN = { nina: 'Niña', nino: 'Niño', bebe: 'Bebé' };
  let densidad = localStorage.getItem('bk_densidad') || '3';

  const productos = BK.activos();
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* ---------- pintar los filtros ---------- */
  function opcion(grupo, valor, etiqueta, extra) {
    const on = estado[grupo].includes(valor);
    const n = productos.filter(p => casa(p, { ...estado, [grupo]: [valor] })).length;   // cuántas saldrían si la marcas
    return `<li><label class="op ${extra ? 'op--color' : ''}">
      <input type="checkbox" data-g="${grupo}" value="${BK.esc(valor)}"${on ? ' checked' : ''}>
      ${extra || ''}<span>${BK.esc(etiqueta)}</span><span class="op__n">${n}</span>
    </label></li>`;
  }

  function pintarFiltros() {
    const ocs = BK.ocasiones().filter(o => productos.some(p => (p.ocasion || []).includes(o.n)));
    $('#f-ocasion').innerHTML = ocs.map(o => opcion('ocasion', o.n, o.n)).join('');

    const quienes = ['nina', 'nino', 'bebe'].filter(q => productos.some(p => BK.quien(p) === q));
    $('#f-quien').innerHTML = quienes.map(q => opcion('quien', q, QUIEN[q])).join('');

    const cols = (BK.cat.colecciones || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    $('#f-col').innerHTML = cols.filter(c => productos.some(p => p.coleccion === c.id))
      .map(c => opcion('col', c.id, c.nombre)).join('');

    // colecciones (Mario, Abril…): solo las de las categorías marcadas, si hay alguna
    const lins = (BK.cat.lineas || []).filter(l => productos.some(p => p.linea === l.id)
      && (!estado.col.length || estado.col.includes(l.categoria))
      && (!estado.grupo.length || estado.grupo.includes(l.grupo)))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    $('#f-linea').innerHTML = lins.map(l => opcion('linea', l.id, l.nombre)).join('');
    $('#f-linea').closest('.filtro').style.display = lins.length ? '' : 'none';

    const tipos = [...new Set(productos.map(p => p.tipo).filter(Boolean))];
    $('#f-tipo').innerHTML = tipos.map(t => opcion('tipo', t, t)).join('');

    const usados = new Set(); productos.forEach(p => (p.colores || []).forEach(c => usados.add(c)));
    const colores = (BK.cat.colores || []).filter(c => usados.has(c.n));
    $('#f-color').innerHTML = colores.map(c =>
      opcion('color', c.n, c.n, `<span class="muestra" style="background:${BK.fondoColor(c)}"></span>`)).join('');

    const tallas = [];
    Object.values(BK.cat.tallajes || {}).forEach(t => (t.tallas || []).forEach(x => { if (!tallas.includes(x)) tallas.push(x); }));
    const orden = t => (t.includes('mes') ? parseInt(t) : 100 + parseInt(t));
    tallas.sort((a, b) => orden(a) - orden(b));
    $('#f-talla').innerHTML = tallas.map(t => {
      const on = estado.talla.includes(t);
      return `<label class="${on ? 'on' : ''}"><input type="checkbox" data-g="talla" value="${BK.esc(t)}"${on ? ' checked' : ''}><span>${BK.esc(t)}</span></label>`;
    }).join('');

    document.querySelectorAll('input[data-g]').forEach(i => {
      i.onchange = () => {
        const g = i.dataset.g, v = i.value;
        estado[g] = i.checked ? [...estado[g], v] : estado[g].filter(x => x !== v);
        aplicar();
      };
    });
    $('#q').value = estado.q;
    $('#orden').value = estado.orden;
  }

  /* ---------- filtrado ---------- */
  function casa(p, st, ignorar) {
    if (st.ocasion.length && ignorar !== 'ocasion' && !(p.ocasion || []).some(o => st.ocasion.includes(o))) return false;
    if (st.quien.length && ignorar !== 'quien' && !st.quien.includes(BK.quien(p))) return false;
    if (st.col.length && ignorar !== 'col' && !st.col.includes(p.coleccion)) return false;
    if (st.grupo.length && ignorar !== 'grupo' && !st.grupo.includes((BK.linea(p.linea) || {}).grupo)) return false;
    if (st.linea.length && ignorar !== 'linea' && !st.linea.includes(p.linea)) return false;
    if (st.tipo.length && ignorar !== 'tipo' && !st.tipo.includes(p.tipo)) return false;
    if (st.color.length && ignorar !== 'color' && !(p.colores || []).some(c => st.color.includes(c))) return false;
    if (st.talla.length && ignorar !== 'talla' && !BK.tallasDe(p).some(t => st.talla.includes(t))) return false;
    if (st.q) {
      const c = BK.coleccion(p.coleccion);
      const heno = norm([p.nombre, p.tipo, p.descripcion, c && c.nombre, BK.nombreCol(p), (p.colores || []).join(' ')].join(' '));
      if (!norm(st.q).split(/\s+/).every(w => heno.includes(w))) return false;
    }
    return true;
  }

  function pintarChips() {
    const trozos = [];
    const eti = { col: id => (BK.coleccion(id) || {}).nombre || id, grupo: id => (BK.grupo(id) || {}).nombre || id, linea: id => 'Colección ' + ((BK.linea(id) || {}).nombre || id), tipo: v => v, color: v => v, talla: v => 'Talla ' + v, ocasion: v => v, quien: v => QUIEN[v] || v };
    ['ocasion', 'quien', 'col', 'grupo', 'linea', 'tipo', 'color', 'talla'].forEach(g => estado[g].forEach(v =>
      trozos.push(`<span class="chip">${BK.esc(eti[g](v))}<button data-g="${g}" data-v="${BK.esc(v)}" aria-label="Quitar">×</button></span>`)));
    if (estado.q) trozos.push(`<span class="chip">«${BK.esc(estado.q)}»<button data-g="q" aria-label="Quitar">×</button></span>`);
    const c = $('#chips');
    c.innerHTML = trozos.join('');
    c.querySelectorAll('button').forEach(b => b.onclick = () => {
      if (b.dataset.g === 'q') estado.q = ''; else estado[b.dataset.g] = estado[b.dataset.g].filter(x => x !== b.dataset.v);
      pintarFiltros(); aplicar();
    });
  }

  function ordenar(lista) {
    const cOrd = id => ((BK.cat.colecciones || []).find(c => c.id === id) || {}).orden || 99;
    if (estado.orden === 'az') return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (estado.orden === 'za') return lista.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
    if (estado.orden === 'col') return lista.sort((a, b) => cOrd(a.coleccion) - cOrd(b.coleccion) || (a.orden || 0) - (b.orden || 0));
    return lista.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || (a.orden || 0) - (b.orden || 0));
  }

  function titulo(res) {
    if (estado.linea.length === 1 && !estado.tipo.length) {
      const l = BK.linea(estado.linea[0]);
      const c = l && BK.coleccion(l.categoria);
      const g = l && BK.grupo(l.grupo);
      if (l) {
        $('#titulo-tienda').textContent = 'Colección ' + l.nombre;
        $('#miga').innerHTML = c ? `<a href="/tienda?col=${c.id}">${BK.esc(c.nombre)}</a>`
          + (g ? ` &nbsp;/&nbsp; <a href="/tienda?col=${c.id}&grupo=${g.id}">${BK.esc(g.nombre)}</a>` : '') : 'Colecciones';
        $('#sub-tienda').textContent = l.desc || '';
        return;
      }
    }
    if (estado.grupo.length === 1 && !estado.tipo.length) {
      const g = BK.grupo(estado.grupo[0]);
      const c = g && BK.coleccion(g.categoria);
      if (g) {
        $('#titulo-tienda').textContent = g.nombre;
        $('#miga').innerHTML = c ? `<a href="/tienda?col=${c.id}">${BK.esc(c.nombre)}</a>` : 'Categoría';
        $('#sub-tienda').textContent = g.desc || '';
        return;
      }
    }
    if (estado.ocasion.length === 1 && !estado.col.length && !estado.tipo.length) {
      const o = BK.ocasiones().find(x => x.n === estado.ocasion[0]);
      $('#titulo-tienda').textContent = estado.ocasion[0];
      $('#miga').textContent = 'Por ocasión';
      $('#sub-tienda').textContent = o ? o.d : '';
      return;
    }
    if (estado.col.length === 1 && !estado.tipo.length) {
      const c = BK.coleccion(estado.col[0]);
      if (c) { $('#titulo-tienda').textContent = c.nombre; $('#miga').textContent = 'Categoría'; $('#sub-tienda').textContent = c.desc || ''; return; }
    }
    if (estado.tipo.length === 1 && !estado.col.length) {
      $('#titulo-tienda').textContent = estado.tipo[0] === 'Conjunto niño' ? 'Niño' : estado.tipo[0] + 's';
      $('#miga').textContent = 'Tienda'; $('#sub-tienda').textContent = ''; return;
    }
    $('#titulo-tienda').textContent = 'Todas las prendas';
    $('#miga').textContent = 'Tienda';
    $('#sub-tienda').textContent = 'Cada prenda lleva su propio tallaje: los conjuntos de niño y los de bebé no usan las mismas tallas.';
  }

  /* ---------- banda de arriba ----------
     Categoría elegida → las tarjetas de sus colecciones (Mario, Helen…).
     Colección elegida → sus fotos más bonitas, con niños, en una tira. */
  function pintarBanda() {
    const b = $('#banda-col');
    const lin = estado.linea.length === 1 ? BK.linea(estado.linea[0]) : null;
    if (lin && (lin.fotos || []).length) {
      b.className = 'banda-col banda-col--fotos';
      b.innerHTML = `<div class="banda-col__pista">${lin.fotos.map(f => {
        const p = productos.find(x => (x.fotos || []).includes(f));
        return `<a href="${p ? '/producto?id=' + encodeURIComponent(p.id) : '#'}"><img src="${f}" alt="${BK.esc(p ? p.nombre : 'Colección ' + lin.nombre)}" loading="lazy"></a>`;
      }).join('')}</div>`;
      return;
    }
    const cat = estado.col.length === 1 && !estado.linea.length ? estado.col[0] : null;
    const gr = cat && estado.grupo.length === 1 ? BK.grupo(estado.grupo[0]) : null;
    const tarjLinea = l => {
      const n = productos.filter(p => p.linea === l.id).length;
      return `<a class="banda-col__tarj" href="/tienda?col=${cat}&linea=${l.id}">
          <figure><img src="${(l.fotos || [])[0] || '/img/l/marco.svg'}" alt="Colección ${BK.esc(l.nombre)}" loading="lazy"></figure>
          <span><small>Colección</small><b>${BK.esc(l.nombre)}</b><em>${n} ${n === 1 ? 'prenda' : 'prendas'}</em></span></a>`;
    };
    // categoría con apartados (Flamenca): primero se elige el apartado…
    const grupos = cat && !estado.grupo.length ? BK.gruposDe(cat) : [];
    if (grupos.length > 1) {
      b.className = 'banda-col banda-col--tarjetas banda-col--grupos';
      b.innerHTML = grupos.map(g => {
        const ls = BK.lineasDe(cat, g.id);
        return `<a class="banda-col__tarj" href="/tienda?col=${cat}&grupo=${g.id}" data-grupo="${g.id}">
          <figure><img src="${g.portada || (ls[0].fotos || [])[0] || '/img/l/marco.svg'}" alt="${BK.esc(g.nombre)}" loading="lazy"></figure>
          <span><small>${BK.esc((BK.coleccion(cat) || {}).nombre || '')}</small><b>${BK.esc(g.nombre)}</b><em>${ls.length} ${ls.length === 1 ? 'colección' : 'colecciones'}</em></span></a>`;
      }).join('');
      b.querySelectorAll('[data-grupo]').forEach(a => a.onclick = e => {
        e.preventDefault(); estado.grupo = [a.dataset.grupo]; aplicar(); scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }
    // …y dentro del apartado, sus fotos de portada y sus colecciones
    if (gr) {
      const ls = BK.lineasDe(cat, gr.id);
      b.className = 'banda-col banda-col--grupo';
      b.innerHTML = ((gr.fotos || []).length ? `<div class="banda-col__pista">${gr.fotos.map(f => {
        const p = productos.find(x => (x.fotos || []).includes(f));
        return `<a href="${p ? '/producto?id=' + encodeURIComponent(p.id) : '#'}"${p ? '' : ' tabindex="-1" class="sin-enlace"'}><img src="${f}" alt="${BK.esc(p ? p.nombre : gr.nombre)}" loading="lazy"></a>`;
      }).join('')}</div>` : '')
        + `<div class="banda-col--tarjetas">${ls.map(tarjLinea).join('')}</div>`;
      b.querySelectorAll('.sin-enlace').forEach(a => a.onclick = e => e.preventDefault());
      return;
    }
    const lins = cat ? BK.lineasDe(cat) : [];
    if (lins.length > 1) {
      b.className = 'banda-col banda-col--tarjetas';
      b.innerHTML = lins.map(tarjLinea).join('');
      return;
    }
    b.className = 'banda-col oculto'; b.innerHTML = '';
  }

  /* ---------- filtros rápidos (a quién viste + ocasión), a un toque ---------- */
  function pintarRapidos() {
    // dentro de una categoría, los botones rápidos son sus colecciones
    const cat = estado.col.length === 1 ? estado.col[0] : null;
    // categoría con apartados: los botones son los apartados y, dentro de uno, sus colecciones
    const grupos = cat ? BK.gruposDe(cat) : [];
    const lSel = estado.linea.length === 1 ? BK.linea(estado.linea[0]) : null;
    const gSel = estado.grupo.length === 1 ? estado.grupo[0] : (lSel && lSel.grupo) || null;
    if (grupos.length > 1 && !gSel) {
      $('#rapidos').innerHTML = `<button data-g="" aria-pressed="true">Todo</button>`
        + grupos.map(g => `<button data-g="${g.id}" aria-pressed="false">${BK.esc(g.nombre)}</button>`).join('');
      $('#rapidos').querySelectorAll('button').forEach(b => b.onclick = () => {
        estado.grupo = b.dataset.g ? [b.dataset.g] : []; estado.linea = [];
        aplicar();
      });
      return;
    }
    const lins = cat ? BK.lineasDe(cat, grupos.length > 1 ? gSel : null) : [];
    if (grupos.length > 1) {
      const g = BK.grupo(gSel);
      $('#rapidos').innerHTML = `<button data-v="atras" aria-pressed="false">‹ ${BK.esc((BK.coleccion(cat) || {}).nombre || 'Volver')}</button>`
        + `<button data-l="" aria-pressed="${!estado.linea.length}">${BK.esc(g ? g.nombre : 'Todas')}</button>`
        + lins.map(l => `<button data-l="${l.id}" aria-pressed="${estado.linea.length === 1 && estado.linea[0] === l.id}">${BK.esc(l.nombre)}</button>`).join('');
      $('#rapidos').querySelectorAll('button').forEach(b => b.onclick = () => {
        if (b.dataset.v === 'atras') { estado.grupo = []; estado.linea = []; }
        else { estado.grupo = [gSel]; estado.linea = b.dataset.l ? [b.dataset.l] : []; }
        aplicar();
      });
      return;
    }
    if (lins.length > 1) {
      $('#rapidos').innerHTML = `<button data-l="" aria-pressed="${!estado.linea.length}">Todas</button>`
        + lins.map(l => `<button data-l="${l.id}" aria-pressed="${estado.linea.length === 1 && estado.linea[0] === l.id}">${BK.esc(l.nombre)}</button>`).join('');
      $('#rapidos').querySelectorAll('button').forEach(b => b.onclick = () => {
        estado.linea = b.dataset.l ? [b.dataset.l] : [];
        aplicar();
      });
      return;
    }
    const quienes = ['nina', 'nino', 'bebe'].filter(q => productos.some(p => BK.quien(p) === q));
    const ocs = BK.ocasiones().filter(o => productos.some(p => (p.ocasion || []).includes(o.n)));
    const todo = !estado.quien.length && !estado.ocasion.length;
    $('#rapidos').innerHTML =
      `<button data-r="todo" aria-pressed="${todo}">Todo</button>`
      + quienes.map(q => `<button data-r="quien" data-v="${q}" aria-pressed="${estado.quien.length === 1 && estado.quien[0] === q}">${QUIEN[q]}</button>`).join('')
      + '<i aria-hidden="true"></i>'
      + ocs.map(o => `<button data-r="ocasion" data-v="${BK.esc(o.n)}" aria-pressed="${estado.ocasion.length === 1 && estado.ocasion[0] === o.n}">${BK.esc(o.n)}</button>`).join('');
    $('#rapidos').querySelectorAll('button').forEach(b => b.onclick = () => {
      const g = b.dataset.r, v = b.dataset.v;
      if (g === 'todo') { estado.quien = []; estado.ocasion = []; }
      else estado[g] = (estado[g].length === 1 && estado[g][0] === v) ? [] : [v];
      aplicar();
    });
  }

  function aplicar() {
    const res = ordenar(productos.filter(p => casa(p, estado)));
    const rej = $('#rejilla');
    rej.className = 'rejilla rejilla--' + densidad;
    rej.innerHTML = res.map(BK.tarjeta).join('');
    $('#cuenta').textContent = res.length + (res.length === 1 ? ' prenda' : ' prendas');
    $('#ver-res').textContent = res.length ? 'Ver ' + res.length + (res.length === 1 ? ' prenda' : ' prendas') : 'Sin resultados';
    pintarRapidos(); pintarBanda();
    $('#vacio').classList.toggle('oculto', res.length > 0);
    pintarChips(); titulo(res); BK.aparecer();

    const u = new URLSearchParams();
    ['ocasion', 'quien', 'col', 'grupo', 'linea', 'tipo', 'color', 'talla'].forEach(g => estado[g].forEach(v => u.append(g, v)));
    if (estado.q) u.set('q', estado.q);
    if (estado.orden !== 'rec') u.set('orden', estado.orden);
    history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    pintarFiltros();
  }

  /* ---------- eventos ---------- */
  let temp;
  $('#q').oninput = e => { clearTimeout(temp); temp = setTimeout(() => { estado.q = e.target.value.trim(); aplicar(); $('#q').focus(); }, 260); };
  $('#orden').onchange = e => { estado.orden = e.target.value; aplicar(); };
  const limpiar = () => { ['ocasion', 'quien', 'col', 'grupo', 'linea', 'tipo', 'color', 'talla'].forEach(g => estado[g] = []); estado.q = ''; aplicar(); };
  $('#limpiar').onclick = limpiar;
  $('#vacio-limpiar').onclick = limpiar;
  const cajaF = $('#filtros');
  $('#abre-filtros').onclick = () => { cajaF.classList.add('abierto'); $('#cerrar-filtros').style.display = 'block'; document.body.style.overflow = 'hidden'; };
  const cerrarF = () => { cajaF.classList.remove('abierto'); document.body.style.overflow = ''; };
  $('#cerrar-filtros').onclick = cerrarF;
  $('#ver-res').onclick = () => { cerrarF(); scrollTo({ top: $('.tienda').offsetTop - 80, behavior: 'smooth' }); };
  $('#limpiar-m').onclick = limpiar;

  /* ---------- densidad de la rejilla ---------- */
  function pintarDensidad() {
    $('#densidad').querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-pressed', b.dataset.d === densidad));
  }
  $('#densidad').querySelectorAll('button').forEach(b => b.onclick = () => {
    densidad = b.dataset.d; localStorage.setItem('bk_densidad', densidad);
    pintarDensidad(); aplicar();
  });
  pintarDensidad();

  /* ---------- vistos hace poco ---------- */
  function pintarRecientes() {
    const l = BK.recientes().slice(0, 4);
    $('#sec-recientes').classList.toggle('oculto', l.length < 2);
    if (l.length < 2) return;
    $('#recientes').innerHTML = l.map(BK.tarjeta).join('');
    $('#recientes').querySelectorAll('.aparece').forEach(n => n.classList.add('visto'));
  }
  $('#borrar-recientes').onclick = () => { localStorage.removeItem('bk_vistos'); pintarRecientes(); };
  document.addEventListener('click', e => { if (e.target.closest('[data-rapida]')) setTimeout(pintarRecientes, 400); });

  pintarFiltros();
  aplicar();
  pintarRecientes();
})();
