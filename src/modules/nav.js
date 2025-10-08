export function initNav() {
  const year = new Date().getFullYear();
  document.querySelectorAll('.current-year').forEach(el => el.textContent = year);

  const homeContainer = document.getElementById('home-container');
  const siteContainer = document.getElementById('site-container');
  const enterSiteBtn = document.getElementById('enter-site-btn');
  const backToHomeBtn = document.getElementById('back-to-home');

  if (enterSiteBtn) {
    enterSiteBtn.addEventListener('click', () => {
      homeContainer.classList.add('hidden');
      siteContainer.classList.add('active');
      setTimeout(() => { document.getElementById('welcome')?.scrollIntoView({ behavior: 'instant' }); }, 50);
    });
  }

  document.querySelectorAll('[data-goto]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-goto');
      homeContainer.classList.add('hidden');
      siteContainer.classList.add('active');
      setTimeout(() => { document.getElementById(target)?.scrollIntoView({ behavior: 'instant' }); }, 50);
    });
  });

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      siteContainer.classList.remove('active');
      homeContainer.classList.remove('hidden');
      setTimeout(() => { document.getElementById('home-door')?.scrollIntoView({ behavior: 'instant' }); }, 50);
    });
  }
}
