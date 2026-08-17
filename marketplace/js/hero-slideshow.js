/* ============================================================
 *  hero-slideshow.js — crossfade automatico per lo sfondo di una
 *  .page-hero. Si applica a ogni .hero-slideshow trovato in pagina;
 *  l'intervallo (ms) si imposta con l'attributo data-interval.
 * ============================================================ */
(function () {
  function initSlideshow(container) {
    const slides = Array.from(container.querySelectorAll('img'));
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const intervalMs = Number(container.dataset.interval) || 6000;
    let index = Math.max(0, slides.findIndex((img) => img.classList.contains('is-active')));

    setInterval(() => {
      slides[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
    }, intervalMs);
  }

  document.querySelectorAll('.hero-slideshow').forEach(initSlideshow);
})();
