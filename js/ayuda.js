/* ============================================================
   Bonita Kids · preguntas frecuentes
   Las respuestas se rellenan con los datos reales del catálogo
   (envío, ciudad, WhatsApp), para que no se queden desfasadas.
   ============================================================ */
(async function () {
  await BK.iniciar('ayuda');
  const T = BK.cat.tienda || {};
  const nProductos = BK.activos().length;
  const nColec = (BK.cat.colecciones || []).length;

  const P = [
    {
      g: 'Comprar',
      q: '¿Por qué no veo los precios en la web?',
      r: `Porque trabajamos por encargo y con reposiciones cortas: el precio depende de la talla, del acabado
          y de las ofertas que tengamos en ese momento. Elige lo que te guste, mándanoslo y te pasamos el precio
          exacto en un rato, sin compromiso ninguno.`,
    },
    {
      g: 'Comprar',
      q: '¿Cómo hago el pedido?',
      r: `Añade las prendas a «Mi pedido» con la talla y el color que quieras. Cuando termines, pulsa el botón
          y se abre ${BK.canal()} con tu lista ya escrita: no tienes que copiar nada.
          Nosotras te confirmamos disponibilidad, precio y envío.`,
    },
    {
      g: 'Comprar',
      q: '¿Puedo reservar una prenda para una fecha?',
      r: `Sí. Dinos el día de la ceremonia y te la guardamos. Para bautizos y bodas te recomendamos avisarnos
          con dos semanas de margen, sobre todo si hay que pedir una talla que no tenemos en tienda.`,
    },
    {
      g: 'Envíos',
      q: '¿Cuánto tarda el envío?',
      r: `${BK.esc(T.envio || 'Enviamos a toda España en 24/48 h')}. Salimos desde ${BK.esc(T.ciudad || 'nuestra tienda')}
          y te pasamos el número de seguimiento en cuanto sale el paquete. Si lo necesitas para una fecha concreta,
          dínoslo y lo tenemos en cuenta.`,
    },
    {
      g: 'Envíos',
      q: '¿Puedo recogerlo en tienda?',
      r: `Sí, sin coste. Nos escribes, te lo apartamos y te avisamos cuando lo tengas listo en ${BK.esc(T.ciudad || 'la tienda')}.`,
    },
    {
      g: 'Tallas y cambios',
      q: 'No sé qué talla pedir. ¿Me ayudáis?',
      r: `Para eso estamos. Dinos la edad y, si puedes, la altura del peque y te decimos exactamente cuál pedir.
          Ten en cuenta que cada tipo de prenda usa su propio tallaje: en la <a href="/tallas">guía de tallas</a>
          los tienes los cuatro por separado.`,
    },
    {
      g: 'Tallas y cambios',
      q: '¿Y si no le vale?',
      r: `Te la cambiamos por otra talla sin líos. Solo te pedimos que la prenda vuelva sin usar, con su etiqueta
          puesta, y que nos avises dentro de los 14 días siguientes a recibirla.`,
    },
    {
      g: 'Tallas y cambios',
      q: '¿La misma prenda se hace en más colores?',
      r: `Muchas sí. En la ficha salen los colores que tenemos ahora mismo, pero si buscas uno que no ves,
          pregúntanos: puede que entre en la próxima reposición.`,
    },
    {
      g: 'Pago',
      q: '¿Cómo se paga?',
      r: `Por Bizum o transferencia, y en tienda también con tarjeta. Te mandamos el importe cerrado antes de que
          pagues nada: no hay sorpresas ni gastos escondidos.`,
    },
    {
      g: 'Las prendas',
      q: '¿Cómo lavo la ropa de ceremonia?',
      r: `A mano o en programa delicado a 30°, del revés y sin centrifugar fuerte. Nada de lejía ni de secadora.
          El encaje y el guipur aguantan de sobra si los tratas así; cada prenda lleva su etiqueta con la
          composición y el lavado.`,
    },
    {
      g: 'Las prendas',
      q: '¿Puedo vestir a dos hermanos a juego?',
      r: `Es lo que más nos piden. Dentro de cada una de nuestras ${nColec} colecciones las prendas están pensadas
          para combinar entre ellas: en la portada tienes el apartado «Hermanos a juego» para ir viendo las parejas.`,
    },
    {
      g: 'Las prendas',
      q: '¿Cada cuánto entra ropa nueva?',
      r: `Ahora mismo tenemos ${nProductos} prendas en la web y vamos reponiendo por temporada. No hacemos catálogos
          enormes: preferimos pocas prendas bien elegidas. Los estrenos los contamos primero en nuestras redes.`,
    },
  ];

  /* ---------- pintar, agrupado por bloques ---------- */
  const grupos = [];
  P.forEach(p => {
    let g = grupos.find(x => x.n === p.g);
    if (!g) grupos.push(g = { n: p.g, items: [] });
    g.items.push(p);
  });

  document.getElementById('faq').innerHTML = grupos.map(g => `
    <section class="faq__grupo">
      <h2 class="faq__tit">${BK.esc(g.n)}</h2>
      ${g.items.map(p => `
        <details class="faq__it">
          <summary>${BK.esc(p.q)}<i aria-hidden="true"></i></summary>
          <div class="faq__r"><p>${p.r.replace(/\s+/g, ' ').trim()}</p></div>
        </details>`).join('')}
    </section>`).join('');

  /* ---------- datos estructurados, para que Google enseñe las preguntas ---------- */
  const limpio = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: P.map(p => ({
      '@type': 'Question',
      name: p.q,
      acceptedAnswer: { '@type': 'Answer', text: limpio(p.r) },
    })),
  });
  document.head.appendChild(ld);

  document.getElementById('cta-wa').href = BK.wa('¡Hola! Tengo una duda sobre un pedido.');
  BK.aparecer();
})();
