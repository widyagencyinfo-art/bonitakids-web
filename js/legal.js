/* ============================================================
   Bonita Kids · aviso legal, privacidad y condiciones
   Los datos fiscales salen del catálogo (panel → Datos de la tienda),
   para que la dueña los pueda cambiar sin tocar código.
   ============================================================ */
(async function () {
  await BK.iniciar('legal');
  const T = BK.cat.tienda || {};
  const L = T.legal || {};
  const nombre = T.nombre || 'Bonita Kids';
  const dominio = location.host;

  /* Un dato que falte se marca en rojo suave, para que se vea y se rellene. */
  const falta = [];
  const d = (clave, texto) => {
    const v = (L[clave] || '').trim();
    if (v) return BK.esc(v);
    falta.push(texto);
    return `<span class="pendiente">[${BK.esc(texto)}]</span>`;
  };

  const cuerpo = `
<h2>1 · Aviso legal</h2>
<p>Esta web es la tienda en línea de <strong>${BK.esc(nombre)}</strong>. Conforme a la Ley 34/2002 de servicios
de la sociedad de la información y de comercio electrónico, estos son los datos de la titular:</p>
<div class="dato">
  <strong>Titular:</strong> ${d('razon', 'razón social o nombre y apellidos')}<br>
  <strong>NIF/CIF:</strong> ${d('nif', 'NIF')}<br>
  <strong>Domicilio:</strong> ${d('direccion', 'dirección completa')}<br>
  <strong>Correo:</strong> ${d('email', 'correo de contacto')}<br>
  <strong>Teléfono:</strong> ${BK.esc(L.telefono || T.whatsapp || '') || d('telefono', 'teléfono')}
</div>
<p>El uso de esta web supone aceptar este aviso legal. Los textos, las fotografías y el diseño son propiedad de
la titular y no pueden reproducirse sin permiso.</p>

<h2>2 · Política de privacidad</h2>
<h3>Quién trata tus datos</h3>
<p>La responsable del tratamiento es la titular indicada arriba.</p>
<h3>Qué datos recogemos y para qué</h3>
<p>Esta web <strong>no tiene formularios de registro ni de compra</strong>: no te pedimos datos para navegar por ella.
Los pedidos se cierran por WhatsApp o por mensaje privado, y ahí nos das solo lo imprescindible:</p>
<ul>
  <li><strong>Nombre y teléfono</strong>, para atenderte y avisarte del pedido.</li>
  <li><strong>Dirección de envío</strong>, si el pedido va por mensajería.</li>
  <li><strong>Datos de facturación</strong>, cuando pides factura.</li>
</ul>
<p>La base legal es la ejecución del pedido que nos encargas y, en su caso, el cumplimiento de nuestras
obligaciones fiscales. Conservamos los datos mientras dure la relación y después el tiempo que exija la ley.</p>
<h3>Con quién los compartimos</h3>
<p>Solo con quien hace falta para que el pedido llegue: la empresa de transporte y, si procede, nuestra gestoría.
No vendemos ni cedemos datos a nadie más.</p>
<h3>Tus derechos</h3>
<p>Puedes pedirnos acceder a tus datos, rectificarlos, suprimirlos, limitar u oponerte a su tratamiento y
solicitar su portabilidad, escribiendo a ${d('email', 'correo de contacto')}. Si crees que no te atendemos bien,
puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>

<h2>3 · Cookies</h2>
<p>Esta web <strong>no usa cookies de publicidad ni de análisis</strong>, ni te sigue por otras páginas.
Guardamos en tu propio navegador (almacenamiento local, que no sale de tu dispositivo) dos cosas para que la
tienda te resulte cómoda: la lista de «Mi pedido» y cómo prefieres ver la rejilla de prendas. Puedes borrarlas
cuando quieras vaciando los datos del sitio en tu navegador.</p>

<h2>4 · Condiciones de venta</h2>
<h3>Precios</h3>
<p>Las prendas de esta web se enseñan <strong>sin precio publicado</strong>: te lo pasamos por WhatsApp junto con la
disponibilidad, antes de que pagues nada. El precio que te confirmamos es el precio final, impuestos incluidos,
e indica aparte los gastos de envío si los hubiera.</p>
<h3>Pedido y pago</h3>
<p>El pedido se considera cerrado cuando confirmas el importe y realizas el pago por el medio acordado
(Bizum, transferencia o tarjeta en tienda). Hasta ese momento no hay ningún compromiso por tu parte.</p>
<h3>Envíos</h3>
<p>${BK.esc(T.envio || 'Enviamos a toda España.')} Los plazos son estimados y dependen de la empresa de transporte.
Te damos el número de seguimiento en cuanto sale el paquete.</p>
<h3>Cambios y devoluciones</h3>
<p>Tienes <strong>14 días naturales</strong> desde que recibes el pedido para desistir de la compra, sin necesidad de
justificarlo (Real Decreto Legislativo 1/2007). La prenda debe volver sin usar, con su etiqueta puesta y en
condiciones de venta. Los gastos de devolución corren por tu cuenta salvo que la prenda venga defectuosa o
no sea la que pediste, en cuyo caso los asumimos nosotras. Los cambios de talla los hacemos sin coste añadido
en el mismo plazo.</p>
<h3>Garantía</h3>
<p>Las prendas tienen la garantía legal de conformidad de tres años. Si algo viene mal, escríbenos con una foto
y lo resolvemos.</p>
<h3>Reclamaciones</h3>
<p>Puedes escribirnos a ${d('email', 'correo de contacto')}. También tienes a tu disposición la plataforma europea
de resolución de litigios en línea:
<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>

<h2>5 · Ley aplicable</h2>
<p>Estas condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a
los juzgados del domicilio de la persona consumidora.</p>

<p class="texto__fecha">Última actualización: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · ${BK.esc(dominio)}</p>`;

  const host = document.getElementById('texto-legal');
  host.innerHTML = (falta.length
    ? `<div class="aviso-pendiente">
         <strong>Faltan los datos de la titular.</strong> Rellénalos en el panel → <em>Datos de la tienda</em>
         y aparecerán aquí solos. Pendiente: ${[...new Set(falta)].map(BK.esc).join(', ')}.
       </div>` : '') + cuerpo;

  BK.aparecer();
})();
