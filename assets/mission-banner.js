const banner = document.querySelector('.mission-ticker');
const toggle = banner.querySelector('.mission-ticker-toggle');
toggle.hidden = false;
banner.classList.add('is-animated');
toggle.addEventListener('click', () => {
  const paused = banner.classList.toggle('is-paused');
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Resume scrolling banner' : 'Pause scrolling banner');
  toggle.innerHTML = paused
    ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="m8 5 11 7-11 7z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
});
