/* Páginas «Moda infantil en <pueblo>»: el contenido llega ya escrito del servidor
   (api/_pueblos.js); aquí solo se montan cabecera, pie y el botón de WhatsApp. */
(async function () {
  await BK.iniciar('tienda');
  const b = document.getElementById('pueblo-wa');
  const h1 = document.querySelector('.pueblo h1 em');
  if (b && BK.wa) b.href = BK.wa(`¡Hola! Os escribo desde ${h1 ? h1.textContent : 'la web'}. Me gustaría que me ayudarais a elegir una prenda.`);
})();
