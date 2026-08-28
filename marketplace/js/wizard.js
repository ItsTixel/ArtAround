/* ============================================================
 *  wizard.js — Controller riutilizzabile per i form "a carosello"
 *  (stepper numerato + slide che scorrono in orizzontale) usati
 *  dalle pagine di creazione contenuti.
 * ============================================================ */

/**
 * @param {Object} opts
 * @param {HTMLFormElement} opts.form
 * @param {HTMLElement} opts.track           Contenitore delle .carousel-slide
 * @param {NodeListOf<HTMLElement>} opts.stepButtons  Pulsanti .wizard-step (stepper)
 * @param {NodeListOf<HTMLElement>} opts.lineEls       Linee di collegamento .wizard-step-line
 * @param {HTMLElement} [opts.prevBtn]
 * @param {HTMLElement} opts.nextBtn
 * @param {() => number[]} [opts.getPath]     Sequenza di step attivi (indici crescenti).
 *                                             Default: tutti gli step in ordine.
 * @param {() => (void | Promise<void>)} opts.onSubmit  Chiamata dall'ultimo step del percorso.
 * @param {string} [opts.submitLabel]
 * @param {string} [opts.nextLabel]
 */
export function createWizard({
  form,
  track,
  stepButtons,
  lineEls,
  prevBtn,
  nextBtn,
  getPath,
  onSubmit,
  submitLabel = 'Crea',
  nextLabel = 'Sezione successiva',
}) {
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const viewport = track.parentElement; // .carousel-viewport
  const defaultPath = () => slides.map((_, i) => i);
  let currentStep = 0;

  // La track tiene tutte le slide affiancate per lo scorrimento orizzontale,
  // quindi da sola sarebbe sempre alta quanto la sezione più lunga. Qui
  // fissiamo l'altezza del viewport sulla sola slide attiva, così la pagina
  // si adatta alla sezione corrente. Un ResizeObserver la tiene aggiornata
  // quando il contenuto della slide attiva cambia (es. lista tappe / domande).
  function syncHeight() {
    const active = slides[currentStep];
    if (active) viewport.style.height = `${active.scrollHeight}px`;
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(syncHeight);
    slides.forEach(s => ro.observe(s));
  }
  window.addEventListener('resize', syncHeight);

  function path() {
    const p = getPath ? getPath() : defaultPath();
    return p && p.length ? p : defaultPath();
  }

  function findFirstInvalid(beforeStep) {
    for (const i of path()) {
      if (i >= beforeStep) break;
      const invalid = slides[i].querySelector('[required]:invalid');
      if (invalid) return { step: i, input: invalid };
    }
    return null;
  }

  function render() {
    track.style.transform = `translateX(-${currentStep * 100}%)`;
    syncHeight();
    const activePath = path();
    const posInPath = activePath.indexOf(currentStep);

    slides.forEach((slide, i) => {
      const isActive = i === currentStep;
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.querySelectorAll('input, textarea, select, button').forEach(el => {
        el.tabIndex = isActive ? 0 : -1;
      });
      if (isActive) {
        slide.classList.remove('entering');
        void slide.offsetWidth; // riavvia l'animazione anche su una sezione già vista
        slide.classList.add('entering');
      }
    });

    stepButtons.forEach((btn, i) => {
      const stepPos = activePath.indexOf(i);
      const inPath = stepPos !== -1;
      btn.classList.toggle('active', i === currentStep);
      btn.classList.toggle('done', inPath && stepPos < posInPath);
      btn.classList.toggle('skipped', !inPath);
      btn.disabled = !inPath;
    });
    lineEls.forEach((line, i) => {
      const stepPos = activePath.indexOf(i);
      line.classList.toggle('filled', stepPos !== -1 && stepPos < posInPath);
    });

    if (prevBtn) {
      const isFirst = posInPath <= 0;
      prevBtn.classList.toggle('hidden', isFirst);
      prevBtn.disabled = isFirst;
    }

    const isLast = posInPath === activePath.length - 1;
    const nextText = isLast ? submitLabel : nextLabel;
    nextBtn.classList.toggle('is-submit', isLast);
    nextBtn.setAttribute('aria-label', nextText);
    nextBtn.title = nextText;
  }

  // Il focus dato da reportValidity() fa scrollare .carousel-viewport
  // (overflow: hidden, ma resta un "contenitore di scroll" valido per il
  // browser) per portare il campo invalido in vista. Questo scroll nativo
  // si somma al translateX con cui il carosello posiziona già la slide,
  // disallineandole quando si salta più di uno step in avanti tramite lo
  // stepper numerato. Il carosello gestisce da solo la propria posizione,
  // quindi lo scroll automatico va annullato.
  function reportInvalid(invalid) {
    invalid.input.reportValidity();
    track.parentElement.scrollLeft = 0;
  }

  function goToStep(index) {
    if (!path().includes(index)) return;
    const invalid = findFirstInvalid(index);
    if (invalid) {
      currentStep = invalid.step;
      render();
      reportInvalid(invalid);
      return;
    }
    currentStep = index;
    render();
  }

  function stepAt(offset) {
    const activePath = path();
    const pos = activePath.indexOf(currentStep);
    return activePath[pos + offset];
  }

  // Un bottone disabled non genera eventi click nel browser: disabilitandolo
  // subito, in modo sincrono, si blocca anche una raffica di click sparata
  // prima ancora che la prima risposta del server torni. Resta disabilitato
  // finché onSubmit() non lo riabilita esplicitamente (in caso di errore, per
  // permettere di correggere e reinviare); in caso di successo la pagina
  // reindirizza comunque a breve, quindi non serve riabilitarlo.
  function setSubmitEnabled(enabled) {
    nextBtn.disabled = !enabled;
  }

  function next() {
    const nextIndex = stepAt(1);
    if (nextIndex === undefined) {
      if (nextBtn.disabled) return;
      const invalid = findFirstInvalid(slides.length);
      if (invalid) {
        currentStep = invalid.step;
        render();
        reportInvalid(invalid);
        return;
      }
      setSubmitEnabled(false);
      onSubmit();
      return;
    }
    goToStep(nextIndex);
  }

  function prev() {
    const prevIndex = stepAt(-1);
    if (prevIndex !== undefined) goToStep(prevIndex);
  }

  stepButtons.forEach((btn, i) => btn.addEventListener('click', () => goToStep(i)));
  if (prevBtn) prevBtn.addEventListener('click', prev);
  form.addEventListener('submit', (e) => { e.preventDefault(); next(); });

  render();

  return { render, goToStep, getCurrentStep: () => currentStep, setSubmitEnabled };
}
