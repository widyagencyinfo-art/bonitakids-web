/* ============================================================
   Bonita Kids · panel de la dueña
   Subir prendas, quitar las descatalogadas y publicar.
   ============================================================ */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let PIN = sessionStorage.getItem('bk_pin') || '';
  let cat = null, sucio = false, pestana = 'prendas', editando = null;

  /* ---------- avisos ---------- */
  function decir(txt, tipo) {
    $('#chivato').innerHTML = `<div class="chivato chivato--${tipo || 'info'}">${esc(txt)}</div>`;
    if (tipo === 'ok') setTimeout(() => { $('#chivato').innerHTML = ''; }, 4500);
  }
  function marcar(v) {
    sucio = v;
    $('#barra-guardar').classList.toggle('on', v);
  }

  /* ---------- entrar ---------- */
  async function entrar(pin) {
    const r = await fetch('/api/guardar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pin': pin },
      body: JSON.stringify({ comprobar: true }),
    });
    if (r.status === 401) return false;
    return true; // 400 = clave buena pero catálogo vacío en la comprobación
  }

  $('#bt-entrar').onclick = async () => {
    const p = $('#pin').value.trim();
    if (!p) return;
    $('#bt-entrar').textContent = 'Comprobando…';
    const ok = await entrar(p).catch(() => false);
    $('#bt-entrar').textContent = 'Entrar';
    if (!ok) { $('#aviso-pin').innerHTML = '<div class="chivato chivato--mal">Esa clave no es. Vuelve a intentarlo.</div>'; return; }
    PIN = p; sessionStorage.setItem('bk_pin', p);
    arrancar();
  };
  $('#pin').addEventListener('keydown', e => { if (e.key === 'Enter') $('#bt-entrar').click(); });
  $('#bt-salir').onclick = () => { sessionStorage.removeItem('bk_pin'); location.reload(); };

  /* ---------- cargar catálogo ---------- */
  async function cargar() {
    let d = null;
    try { const r = await fetch('/api/catalogo?fresco=' + Date.now(), { cache: 'no-store' }); if (r.status === 200) d = await r.json(); } catch (e) { }
    if (!d) d = await (await fetch('/data/catalogo.json?v=' + Date.now())).json();
    cat = d;
  }

  async function arrancar() {
    $('#puerta').classList.add('oculto');
    $('#panel').classList.remove('oculto');
    await cargar();
    pintar();
  }

  /* ---------- pestañas ---------- */
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    pestana = b.dataset.t; editando = null;
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    pintar();
  });

  function pintar() {
    if (pestana === 'prendas') return editando ? vistaEditor() : vistaPrendas();
    if (pestana === 'colecciones') return vistaColecciones();
    if (pestana === 'tallas') return vistaTallas();
    if (pestana === 'tienda') return vistaTienda();
  }

  /* ============================================================
     PRENDAS
     ============================================================ */
  function vistaPrendas() {
    const ps = cat.productos || [];
    const cols = cat.colecciones || [];
    const nomCol = id => (cols.find(c => c.id === id) || {}).nombre || '—';
    $('#vista').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">
        <div>
          <strong style="font-family:var(--display);font-size:24px">Tus prendas</strong>
          <div class="migas" style="margin:2px 0 0">${ps.filter(p => p.activo !== false).length} a la venta · ${ps.filter(p => p.activo === false).length} retiradas</div>
        </div>
        <button class="btn" id="bt-nueva">+ Añadir prenda</button>
      </div>
      <div class="chivato chivato--info">
        Para <strong>quitar una prenda descatalogada</strong>, pulsa «Retirar»: desaparece de la web pero no se
        borra, y puedes volver a ponerla cuando la repongas. «Borrar» la elimina para siempre.
      </div>
      ${cols.map(c => {
        const dc = ps.filter(p => p.coleccion === c.id);
        if (!dc.length) return '';
        return `<h3 style="font-family:var(--display);font-size:20px;margin:26px 0 10px">${esc(c.nombre)}</h3>` + dc.map(filaProd).join('');
      }).join('')}
      ${(() => { const sueltas = ps.filter(p => !cols.some(c => c.id === p.coleccion));
        return sueltas.length ? `<h3 style="font-family:var(--display);font-size:20px;margin:26px 0 10px">Sin colección</h3>` + sueltas.map(filaProd).join('') : ''; })()}
      ${!ps.length ? '<div class="tarj" style="text-align:center;padding:50px">Todavía no hay prendas. Pulsa «Añadir prenda».</div>' : ''}`;

    $('#bt-nueva').onclick = () => { editando = nuevaPrenda(); pintar(); };
    $('#vista').querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { editando = cat.productos.find(p => p.id === b.dataset.ed); pintar(); });
    $('#vista').querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
      const p = cat.productos.find(x => x.id === b.dataset.tog);
      p.activo = p.activo === false; marcar(true); pintar();
    });
    $('#vista').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const p = cat.productos.find(x => x.id === b.dataset.del);
      if (!confirm('¿Borrar "' + p.nombre + '" para siempre?\n\nSi solo se ha agotado, mejor usa «Retirar».')) return;
      cat.productos = cat.productos.filter(x => x.id !== p.id); marcar(true); pintar();
    });
    $('#vista').querySelectorAll('[data-dup]').forEach(b => b.onclick = () => {
      const p = cat.productos.find(x => x.id === b.dataset.dup);
      const c = JSON.parse(JSON.stringify(p));
      c.id = idLibre(p.nombre + ' copia'); c.nombre = p.nombre + ' (copia)';
      cat.productos.push(c); marcar(true); editando = c; pintar();
    });

    function filaProd(p) {
      const baja = p.activo === false;
      return `<div class="tarj fila-prod ${baja ? 'baja' : ''}">
        <img src="${esc((p.fotos || [])[0] || '/img/marco.svg')}" alt="">
        <div>
          <h3>${esc(p.nombre)} ${baja ? '<span class="eti-baja">Retirada</span>' : ''}</h3>
          <small>${esc(p.tipo || '')} · ${esc(nomCol(p.coleccion))} · ${(p.fotos || []).length} foto(s)</small>
          <small>Tallas: ${esc((p.tallas || []).join(', ') || '—')}</small>
        </div>
        <div class="fila-acc">
          <button class="mini" data-ed="${esc(p.id)}">Editar</button>
          <button class="mini" data-dup="${esc(p.id)}">Duplicar</button>
          <button class="mini" data-tog="${esc(p.id)}">${baja ? 'Volver a poner' : 'Retirar'}</button>
          <button class="mini mini--mal" data-del="${esc(p.id)}">Borrar</button>
        </div>
      </div>`;
    }
  }

  function idLibre(nombre) {
    let base = String(nombre || 'prenda').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'prenda';
    let id = base, i = 2;
    while ((cat.productos || []).some(p => p.id === id)) id = base + '-' + (i++);
    return id;
  }
  function nuevaPrenda() {
    const p = {
      id: idLibre('prenda-nueva'), nombre: '', coleccion: (cat.colecciones[0] || {}).id || '',
      tipo: (cat.tipos || ['Vestido'])[0], tallaje: Object.keys(cat.tallajes)[0],
      tallas: (cat.tallajes[Object.keys(cat.tallajes)[0]] || {}).tallas.slice(),
      colores: [], ocasion: [], fotos: [], descripcion: '', destacado: false, activo: true,
      orden: (cat.productos || []).length + 1, _nueva: true,
    };
    return p;
  }

  /* ---------- editor de prenda ---------- */
  function vistaEditor() {
    const p = editando;
    const tallajes = cat.tallajes || {};
    const tallasTallaje = (tallajes[p.tallaje] || {}).tallas || [];
    $('#vista').innerHTML = `
      <div class="migas"><a href="#" id="volver">← Volver a las prendas</a></div>
      <div class="tarj">
        <div class="dos">
          <div>
            <label class="cmp"><span>Nombre de la prenda</span><input type="text" id="e-nombre" value="${esc(p.nombre)}" placeholder="Vestido Abril lazo celeste"></label>
            <div class="dos">
              <label class="cmp"><span>Categoría</span><select id="e-col">
                ${(cat.colecciones || []).map(c => `<option value="${esc(c.id)}"${c.id === p.coleccion ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
              </select></label>
              <label class="cmp"><span>Tipo de prenda</span><select id="e-tipo">
                ${(cat.tipos || []).map(t => `<option${t === p.tipo ? ' selected' : ''}>${esc(t)}</option>`).join('')}
              </select></label>
            </div>
            <label class="cmp"><span>Colección <small style="text-transform:none;letter-spacing:0">(Mario, Abril, Laura…)</small></span>
              <input type="text" id="e-linea" list="dl-lineas" value="${esc(((cat.lineas || []).find(l => l.id === p.linea) || {}).nombre || '')}" placeholder="Escribe una nueva o elige una">
              <datalist id="dl-lineas">${(cat.lineas || []).map(l => `<option value="${esc(l.nombre)}">`).join('')}</datalist></label>
            ${(cat.grupos || []).length ? `<label class="cmp"><span>Apartado <small style="text-transform:none;letter-spacing:0">(solo en Flamenca y en Ceremonias)</small></span><select id="e-grupo">
              <option value="">— Ninguno —</option>
              ${(cat.grupos || []).map(g => `<option value="${esc(g.id)}"${g.id === ((cat.lineas || []).find(l => l.id === p.linea) || {}).grupo ? ' selected' : ''}>${esc(g.nombre)}</option>`).join('')}
            </select></label>` : ''}
            <label class="cmp"><span>Tallaje</span><select id="e-tallaje">
              ${Object.entries(tallajes).map(([k, t]) => `<option value="${esc(k)}"${k === p.tallaje ? ' selected' : ''}>${esc(t.nombre)}</option>`).join('')}
            </select></label>
            <p class="pista">Elige el tallaje que le toca a esta prenda. Abajo puedes desmarcar las tallas que no tengas de esta prenda en concreto.</p>
            <label class="cmp"><span>Tallas disponibles de esta prenda</span>
              <div class="marcas" id="e-tallas">
                ${tallasTallaje.map(t => `<label class="${(p.tallas || []).includes(t) ? 'on' : ''}"><input type="checkbox" value="${esc(t)}"${(p.tallas || []).includes(t) ? ' checked' : ''}>${esc(t)}</label>`).join('')}
              </div>
            </label>
            <label class="cmp"><span>¿Para qué ocasión vale?</span>
              <div class="marcas" id="e-ocasion">
                ${(cat.ocasiones || []).map(o => `<label class="${(p.ocasion || []).includes(o.n) ? 'on' : ''}"><input type="checkbox" value="${esc(o.n)}"${(p.ocasion || []).includes(o.n) ? ' checked' : ''}>${esc(o.n)}</label>`).join('')}
              </div>
            </label>
            <label class="cmp"><span>Colores</span>
              <div class="marcas" id="e-colores">
                ${(cat.colores || []).map(c => `<label class="${(p.colores || []).includes(c.n) ? 'on' : ''}"><input type="checkbox" value="${esc(c.n)}"${(p.colores || []).includes(c.n) ? ' checked' : ''}><i class="bolita" style="background:${esc(c.hex2 ? `linear-gradient(135deg,${c.hex} 50%,${c.hex2} 50%)` : c.hex)}"></i>${esc(c.n)}</label>`).join('')}
              </div>
            </label>
            <label class="cmp"><span>Descripción</span><textarea id="e-desc" placeholder="Tejido, detalles, con qué combina…">${esc(p.descripcion || '')}</textarea></label>
            <div class="marcas" style="margin-bottom:18px">
              <label class="${p.destacado ? 'on' : ''}"><input type="checkbox" id="e-dest"${p.destacado ? ' checked' : ''}>Destacada en la portada</label>
              <label class="${p.activo !== false ? 'on' : ''}"><input type="checkbox" id="e-act"${p.activo !== false ? ' checked' : ''}>A la venta</label>
            </div>
          </div>
          <div>
            <label class="cmp"><span>Fotos de la prenda</span></label>
            <div class="suelta" id="suelta">
              Arrastra aquí las fotos o <u>pulsa para elegirlas</u><br>
              <small style="color:var(--tinta-tenue)">La primera foto es la que se ve en la tienda</small>
              <input type="file" id="file" accept="image/*" multiple hidden>
            </div>
            <div class="fotos" id="e-fotos"></div>
            <div id="subiendo"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <button class="btn" id="e-guardar">Guardar la prenda</button>
          <button class="mini" id="e-cancelar">Cancelar</button>
        </div>
      </div>`;

    $('#volver').onclick = e => { e.preventDefault(); editando = null; pintar(); };
    $('#e-cancelar').onclick = () => { editando = null; pintar(); };

    // marcar/desmarcar visualmente
    $('#vista').querySelectorAll('.marcas input').forEach(i =>
      i.onchange = () => i.parentElement.classList.toggle('on', i.checked));

    // cambio de tallaje -> repinta las tallas
    $('#e-tallaje').onchange = () => {
      recoger(p);
      p.tallaje = $('#e-tallaje').value;
      p.tallas = ((cat.tallajes[p.tallaje] || {}).tallas || []).slice();
      vistaEditor();
    };

    pintarFotos(p);
    montarSubida(p);

    $('#e-guardar').onclick = () => {
      recoger(p);
      if (!p.nombre.trim()) { decir('Ponle un nombre a la prenda.', 'mal'); return; }
      if (p._nueva) { delete p._nueva; p.id = idLibre(p.nombre); cat.productos.push(p); }
      marcar(true); editando = null; pintar();
      decir('Prenda guardada. Acuérdate de pulsar «Publicar cambios» para que se vea en la web.', 'ok');
    };
  }

  function recoger(p) {
    p.nombre = $('#e-nombre').value.trim();
    p.coleccion = $('#e-col').value;
    // colección dentro de la categoría: si no existe, se crea
    const nomLin = $('#e-linea').value.trim();
    if (!nomLin) delete p.linea;
    else {
      const llano = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      cat.lineas = cat.lineas || [];
      let l = cat.lineas.find(x => llano(x.nombre) === llano(nomLin));
      if (!l) {
        let id = llano(nomLin).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'coleccion', k = 2;
        while (cat.lineas.some(x => x.id === id)) id = id.replace(/-\d+$/, '') + '-' + (k++);
        l = { id, nombre: nomLin, categoria: p.coleccion, fotos: [], desc: '', orden: cat.lineas.length + 1 };
        cat.lineas.push(l);
      }
      p.linea = l.id;
      // apartado de la colección (Flamenca bebé, niñas…): solo vale si es de la misma categoría
      const selG = $('#e-grupo');
      if (selG) {
        const g = (cat.grupos || []).find(x => x.id === selG.value);
        if (g && g.categoria === p.coleccion) l.grupo = g.id; else if (!selG.value) delete l.grupo;
      }
    }
    p.tipo = $('#e-tipo').value;
    p.descripcion = $('#e-desc').value.trim();
    p.destacado = $('#e-dest').checked;
    p.activo = $('#e-act').checked;
    p.tallas = [...$('#e-tallas').querySelectorAll('input:checked')].map(i => i.value);
    p.colores = [...$('#e-colores').querySelectorAll('input:checked')].map(i => i.value);
    p.ocasion = [...$('#e-ocasion').querySelectorAll('input:checked')].map(i => i.value);
    p.quien = p.tallaje === 'bebe' ? 'bebe' : (p.tipo === 'Conjunto niño' ? 'nino' : 'nina');
  }

  function pintarFotos(p) {
    const c = $('#e-fotos');
    c.innerHTML = (p.fotos || []).map((f, i) => `
      <div class="foto-it">
        ${i === 0 ? '<span class="princ">Principal</span>' : ''}
        <img src="${esc(f)}" alt="">
        <button class="quita" data-q="${i}" title="Quitar">×</button>
        <div class="mueve">
          <button data-m="${i}" data-d="-1" title="Antes">←</button>
          <button data-m="${i}" data-d="1" title="Después">→</button>
        </div>
      </div>`).join('');
    c.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { p.fotos.splice(+b.dataset.q, 1); pintarFotos(p); });
    c.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const i = +b.dataset.m, j = i + (+b.dataset.d);
      if (j < 0 || j >= p.fotos.length) return;
      [p.fotos[i], p.fotos[j]] = [p.fotos[j], p.fotos[i]];
      pintarFotos(p);
    });
  }

  /* ---------- subida de fotos ---------- */
  function montarSubida(p) {
    const zona = $('#suelta'), input = $('#file');
    zona.onclick = () => input.click();
    zona.ondragover = e => { e.preventDefault(); zona.classList.add('sobre'); };
    zona.ondragleave = () => zona.classList.remove('sobre');
    zona.ondrop = e => { e.preventDefault(); zona.classList.remove('sobre'); subirVarias([...e.dataTransfer.files], p); };
    input.onchange = () => { subirVarias([...input.files], p); input.value = ''; };
  }

  async function subirVarias(files, p) {
    const imgs = files.filter(f => /^image\//.test(f.type));
    if (!imgs.length) return;
    const caja = $('#subiendo');
    for (let i = 0; i < imgs.length; i++) {
      caja.innerHTML = `<div class="chivato chivato--info">Subiendo foto ${i + 1} de ${imgs.length}…</div>`;
      try {
        const url = await subirUna(imgs[i], p.nombre || 'prenda');
        p.fotos = p.fotos || []; p.fotos.push(url);
        pintarFotos(p); marcar(true);
      } catch (e) {
        caja.innerHTML = `<div class="chivato chivato--mal">No se pudo subir «${esc(imgs[i].name)}»: ${esc(e.message)}</div>`;
        return;
      }
    }
    caja.innerHTML = `<div class="chivato chivato--ok">${imgs.length} foto(s) subida(s).</div>`;
    setTimeout(() => { caja.innerHTML = ''; }, 3500);
  }

  /** Reduce la foto en el navegador antes de mandarla (así va rápido desde el móvil). */
  function reducir(file, max = 1600) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const e = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * e); cv.height = Math.round(img.height * e);
        const cx = cv.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL('image/jpeg', 0.86));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => mal(new Error('no se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function subirUna(file, nombre) {
    const datos = await reducir(file);
    const r = await fetch('/api/subir', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pin': PIN },
      body: JSON.stringify({ datos, tipo: 'image/jpeg', nombre }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error || ('error ' + r.status));
    return j.url;
  }

  /* ============================================================
     COLECCIONES
     ============================================================ */
  function vistaColecciones() {
    $('#vista').innerHTML = `
      <div class="chivato chivato--info">Las categorías (Bautizos, Ceremonias, Temporada…) son los grupos que salen en la portada y en el menú de la web. La colección de cada prenda (Mario, Abril, Laura…) se pone en la propia prenda.</div>
      ${(cat.colecciones || []).map((c, i) => `
        <div class="tarj">
          <div class="dos">
            <label class="cmp"><span>Nombre</span><input type="text" data-c="${i}" data-k="nombre" value="${esc(c.nombre)}"></label>
            <label class="cmp"><span>Foto de portada (URL)</span><input type="text" data-c="${i}" data-k="portada" value="${esc(c.portada || '')}"></label>
          </div>
          <label class="cmp"><span>Descripción</span><textarea data-c="${i}" data-k="desc" style="min-height:64px">${esc(c.desc || '')}</textarea></label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="mini" data-sube="${i}">Subir foto de portada</button>
            <button class="mini mini--mal" data-borra-col="${i}">Borrar colección</button>
            <span style="font-size:12px;color:var(--tinta-tenue);align-self:center">${(cat.productos || []).filter(p => p.coleccion === c.id).length} prendas dentro</span>
          </div>
          <input type="file" accept="image/*" hidden data-file="${i}">
        </div>`).join('')}
      <button class="btn" id="bt-nueva-col">+ Añadir colección</button>`;

    $('#vista').querySelectorAll('[data-c]').forEach(el => el.oninput = () => {
      cat.colecciones[+el.dataset.c][el.dataset.k] = el.value; marcar(true);
    });
    $('#vista').querySelectorAll('[data-sube]').forEach(b => b.onclick = () =>
      $('#vista').querySelector(`[data-file="${b.dataset.sube}"]`).click());
    $('#vista').querySelectorAll('[data-file]').forEach(inp => inp.onchange = async () => {
      if (!inp.files[0]) return;
      try {
        const url = await subirUna(inp.files[0], 'coleccion');
        cat.colecciones[+inp.dataset.file].portada = url; marcar(true); pintar();
        decir('Portada actualizada.', 'ok');
      } catch (e) { decir('No se pudo subir: ' + e.message, 'mal'); }
    });
    $('#vista').querySelectorAll('[data-borra-col]').forEach(b => b.onclick = () => {
      const c = cat.colecciones[+b.dataset.borraCol];
      const n = (cat.productos || []).filter(p => p.coleccion === c.id).length;
      if (n) { alert('Primero mueve o borra las ' + n + ' prendas de esta colección.'); return; }
      if (!confirm('¿Borrar la colección "' + c.nombre + '"?')) return;
      cat.colecciones.splice(+b.dataset.borraCol, 1); marcar(true); pintar();
    });
    $('#bt-nueva-col').onclick = () => {
      const n = prompt('Nombre de la colección nueva:'); if (!n) return;
      const id = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      cat.colecciones.push({ id, nombre: n, desc: '', portada: '', orden: cat.colecciones.length + 1 });
      marcar(true); pintar();
    };
  }

  /* ============================================================
     TALLAS Y COLORES
     ============================================================ */
  function vistaTallas() {
    $('#vista').innerHTML = `
      <div class="chivato chivato--info">
        Aquí defines los <strong>tallajes</strong>: cada tipo de prenda usa el suyo. Separa las tallas con comas.
      </div>
      ${Object.entries(cat.tallajes || {}).map(([k, t]) => `
        <div class="tarj">
          <label class="cmp"><span>Nombre del tallaje</span><input type="text" data-tj="${esc(k)}" data-k="nombre" value="${esc(t.nombre)}"></label>
          <label class="cmp"><span>Tallas (separadas por comas)</span><input type="text" data-tj="${esc(k)}" data-k="tallas" value="${esc((t.tallas || []).join(', '))}"></label>
          <label class="cmp"><span>Nota que se ve en la web</span><input type="text" data-tj="${esc(k)}" data-k="nota" value="${esc(t.nota || '')}"></label>
          <span style="font-size:12px;color:var(--tinta-tenue)">${(cat.productos || []).filter(p => p.tallaje === k).length} prendas usan este tallaje</span>
        </div>`).join('')}
      <button class="btn" id="bt-nuevo-tj" style="margin-bottom:34px">+ Añadir tallaje</button>

      <h3 style="font-family:var(--display);font-size:24px;margin:0 0 12px">Colores</h3>
      <div class="tarj">
        ${(cat.colores || []).map((c, i) => `
          <div style="display:grid;grid-template-columns:34px 1fr 130px 90px;gap:10px;align-items:center;margin-bottom:10px">
            <i style="width:30px;height:30px;border-radius:50%;background:${esc(c.hex)};border:1px solid rgba(0,0,0,.15);display:block"></i>
            <input type="text" data-co="${i}" data-k="n" value="${esc(c.n)}" style="padding:9px 11px;border:1px solid var(--linea-fuerte)">
            <input type="color" data-co="${i}" data-k="hex" value="${esc(c.hex)}" style="width:100%;height:38px;border:1px solid var(--linea-fuerte);background:#fff">
            <button class="mini mini--mal" data-borra-co="${i}">Quitar</button>
          </div>`).join('')}
        <button class="mini" id="bt-nuevo-color">+ Añadir color</button>
      </div>

      <h3 style="font-family:var(--display);font-size:24px;margin:26px 0 12px">Ocasiones</h3>
      <div class="tarj">
        ${(cat.ocasiones || []).map((o, i) => `
          <div style="display:grid;grid-template-columns:200px 1fr 90px;gap:10px;align-items:center;margin-bottom:10px">
            <input type="text" data-oc="${i}" data-k="n" value="${esc(o.n)}" style="padding:9px 11px;border:1px solid var(--linea-fuerte)">
            <input type="text" data-oc="${i}" data-k="d" value="${esc(o.d || '')}" placeholder="Frase que sale en la tienda" style="padding:9px 11px;border:1px solid var(--linea-fuerte)">
            <button class="mini mini--mal" data-borra-oc="${i}">Quitar</button>
          </div>`).join('')}
        <button class="mini" id="bt-nueva-oc">+ Añadir ocasión</button>
      </div>

      <h3 style="font-family:var(--display);font-size:24px;margin:26px 0 12px">Tipos de prenda</h3>
      <div class="tarj">
        <label class="cmp"><span>Tipos (separados por comas)</span><input type="text" id="e-tipos" value="${esc((cat.tipos || []).join(', '))}"></label>
      </div>`;

    $('#vista').querySelectorAll('[data-tj]').forEach(el => el.oninput = () => {
      const t = cat.tallajes[el.dataset.tj];
      if (el.dataset.k === 'tallas') t.tallas = el.value.split(',').map(s => s.trim()).filter(Boolean);
      else t[el.dataset.k] = el.value;
      marcar(true);
    });
    $('#bt-nuevo-tj').onclick = () => {
      const n = prompt('Nombre del tallaje nuevo (ej. "Niña de 8 a 14 años"):'); if (!n) return;
      const k = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      cat.tallajes[k] = { nombre: n, nota: '', tallas: [] }; marcar(true); pintar();
    };
    $('#vista').querySelectorAll('[data-co]').forEach(el => el.oninput = () => {
      cat.colores[+el.dataset.co][el.dataset.k] = el.value; marcar(true);
      if (el.dataset.k === 'hex') el.parentElement.querySelector('i').style.background = el.value;
    });
    $('#vista').querySelectorAll('[data-borra-co]').forEach(b => b.onclick = () => {
      cat.colores.splice(+b.dataset.borraCo, 1); marcar(true); pintar();
    });
    $('#bt-nuevo-color').onclick = () => { cat.colores.push({ n: 'Color nuevo', hex: '#DDD3C9' }); marcar(true); pintar(); };
    $('#e-tipos').oninput = e => { cat.tipos = e.target.value.split(',').map(s => s.trim()).filter(Boolean); marcar(true); };
    $('#vista').querySelectorAll('[data-oc]').forEach(el => el.oninput = () => {
      cat.ocasiones[+el.dataset.oc][el.dataset.k] = el.value; marcar(true);
    });
    $('#vista').querySelectorAll('[data-borra-oc]').forEach(b => b.onclick = () => {
      cat.ocasiones.splice(+b.dataset.borraOc, 1); marcar(true); pintar();
    });
    $('#bt-nueva-oc').onclick = () => {
      const n = prompt('Nombre de la ocasión (ej. "Comunión"):'); if (!n) return;
      (cat.ocasiones = cat.ocasiones || []).push({ n, d: '' }); marcar(true); pintar();
    };
  }

  /* ============================================================
     DATOS DE LA TIENDA
     ============================================================ */
  function vistaTienda() {
    const t = cat.tienda || (cat.tienda = {});
    const L = t.legal || (t.legal = {});
    const campo = (k, et, ph, pista) => `
      <label class="cmp"><span>${esc(et)}</span><input type="text" data-t="${k}" value="${esc(t[k] || '')}" placeholder="${esc(ph || '')}"></label>
      ${pista ? `<p class="pista">${pista}</p>` : ''}`;
    const campoL = (k, et, ph) => `
      <label class="cmp"><span>${esc(et)}</span><input type="text" data-l="${k}" value="${esc(L[k] || '')}" placeholder="${esc(ph || '')}"></label>`;
    $('#vista').innerHTML = `
      <div class="tarj">
        <div class="dos">
          ${campo('nombre', 'Nombre de la tienda', 'Bonita Kids')}
          ${campo('claim', 'Frase corta bajo el nombre', 'Moda infantil')}
        </div>
        ${campo('whatsapp', 'WhatsApp para los pedidos', '34600112233',
          '<strong>Importante:</strong> con el prefijo del país y sin el «+» ni espacios. Por ejemplo, para España: 34600112233. Mientras esté vacío, los botones llevan al buzón de Instagram.')}
        <div class="dos">
          ${campo('facebook', 'Usuario de Facebook', 'el nombre que sale en la dirección de vuestra página')}
          ${campo('instagram', 'Usuario de Instagram', 'bonitakits')}
        </div>
        ${campo('tiktok', 'Usuario de TikTok', 'sin la @')}
        <div class="dos">
          ${campo('ciudad', 'Ciudad', 'Utrera, Sevilla')}
          ${campo('envio', 'Frase de envíos', 'Envíos a toda España en 24/48 h')}
        </div>
      </div>
      <div class="tarj">
        <strong style="font-family:var(--display);font-size:22px;display:block;margin-bottom:4px">Contacto y datos legales</strong>
        <p class="pista" style="margin:0 0 16px">Los pide la ley para una tienda en España. Salen en <em>Aviso legal, privacidad y condiciones</em>, la página enlazada abajo del todo de la web. Mientras falte alguno, ahí sale un aviso en rojo. La dirección, el correo y el teléfono salen también en el pie de todas las páginas.</p>
        <div class="dos">
          ${campoL('razon', 'Nombre y apellidos o razón social', 'María García Pérez')}
          ${campoL('nif', 'NIF o CIF', '12345678A')}
        </div>
        ${campoL('direccion', 'Dirección completa', 'C/ Ejemplo 1, 41500 Alcalá de Guadaíra, Sevilla')}
        <div class="dos">
          ${campoL('email', 'Correo de contacto', 'hola@tutienda.es')}
          ${campoL('telefono', 'Teléfono', '600 11 22 33')}
        </div>
      </div>
      <div class="tarj">
        <strong style="font-family:var(--display);font-size:22px;display:block;margin-bottom:4px">Fotos de la portada</strong>
        <p class="pista" style="margin:0 0 16px">Son las tres fotos grandes de arriba del todo. En el móvil solo se ve la del centro, así que pon ahí la mejor.</p>
        <div class="tri" id="tri">
          ${[0, 1, 2].map(i => `<figure>
            <img src="${esc((t.heroFotos || [])[i] || '/img/marco.svg')}" alt="">
            <figcaption>${['Izquierda', 'Centro (la del móvil)', 'Derecha'][i]}</figcaption>
            <button class="mini" style="width:100%" data-hero="${i}">Cambiar</button>
            <input type="file" accept="image/*" hidden data-hf="${i}">
          </figure>`).join('')}
        </div>
      </div>
      <div class="tarj">
        <strong style="font-family:var(--display);font-size:22px;display:block;margin-bottom:12px">Foto del bloque «Lo que buscarías tú»</strong>
        <div style="display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:start">
          <img src="${esc(t.editorial || '/img/marco.svg')}" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;border:1px solid var(--linea)">
          <div>
            <button class="mini" id="bt-edi">Cambiar la foto</button>
            <input type="file" id="file-edi" accept="image/*" hidden>
          </div>
        </div>
      </div>`;
    $('#vista').querySelectorAll('[data-t]').forEach(el => el.oninput = () => { t[el.dataset.t] = el.value; marcar(true); });
    $('#vista').querySelectorAll('[data-l]').forEach(el => el.oninput = () => { L[el.dataset.l] = el.value; marcar(true); });
    $('#vista').querySelectorAll('[data-hero]').forEach(b => b.onclick = () =>
      $('#vista').querySelector(`[data-hf="${b.dataset.hero}"]`).click());
    $('#vista').querySelectorAll('[data-hf]').forEach(inp => inp.onchange = async () => {
      if (!inp.files[0]) return;
      try {
        const url = await subirUna(inp.files[0], 'portada');
        t.heroFotos = t.heroFotos || ['', '', ''];
        t.heroFotos[+inp.dataset.hf] = url;
        marcar(true); pintar(); decir('Foto de portada cambiada.', 'ok');
      } catch (err) { decir('No se pudo subir: ' + err.message, 'mal'); }
    });
    $('#bt-edi').onclick = () => $('#file-edi').click();
    $('#file-edi').onchange = async e => {
      if (!e.target.files[0]) return;
      try { t.editorial = await subirUna(e.target.files[0], 'editorial'); marcar(true); pintar(); decir('Foto cambiada.', 'ok'); }
      catch (err) { decir('No se pudo subir: ' + err.message, 'mal'); }
    };
  }

  /* ============================================================
     PUBLICAR
     ============================================================ */
  $('#bt-publicar').onclick = async () => {
    const b = $('#bt-publicar');
    b.disabled = true; b.textContent = 'Publicando…';
    try {
      const r = await fetch('/api/guardar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pin': PIN },
        body: JSON.stringify({ catalogo: cat }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || ('error ' + r.status));
      marcar(false);
      try { localStorage.removeItem('bk_cat_v1'); } catch (e) {}   // que la web no enseñe la copia vieja
      decir('¡Publicado! Ya se ve en la web (' + j.productos + ' prendas).', 'ok');
    } catch (e) {
      decir('No se pudo publicar: ' + e.message, 'mal');
    }
    b.disabled = false; b.textContent = 'Publicar cambios';
  };
  $('#bt-descartar').onclick = async () => {
    if (!confirm('¿Descartar los cambios que no has publicado?')) return;
    await cargar(); marcar(false); editando = null; pintar();
  };
  window.addEventListener('beforeunload', e => { if (sucio) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- arranque ---------- */
  if (PIN) arrancar(); else $('#pin').focus();
})();
