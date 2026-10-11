document.querySelectorAll('[data-lattice-motion]').forEach(container => {
  const button = container.querySelector('.motion-toggle');
  if (!button) return;
  button.addEventListener('click', () => {
    const paused = container.classList.toggle('paused');
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume cube animation' : 'Pause cube animation');
    button.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
  });
});
