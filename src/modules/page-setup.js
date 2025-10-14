/**
 * PAGE SETUP MODULE
 * Handles home/site view transitions and footer updates
 */

export function initPageSetup() {
  const homeContainer = document.getElementById('home-container');
  const siteContainer = document.getElementById('site-container');
  const logoDoorway = document.getElementById('logoDoorway');
  const backToHomeBtn = document.getElementById('back-to-home');

  // Set current year in footers
  const yearSpans = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  yearSpans.forEach(span => {
    span.textContent = currentYear;
  });

  // Handle logo doorway button
  if (logoDoorway) {
    logoDoorway.addEventListener('click', () => {
      enterSite();
    });
  }

  // Handle footer navigation links in home-footer
  const homeFooterLinks = document.querySelectorAll('#home-footer [data-goto]');
  homeFooterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-goto');
      enterSite(targetId);
    });
  });

  // Handle back to home
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      returnHome();
    });
  }

  // Handle smooth scroll for in-page links
  const inPageLinks = document.querySelectorAll('a[href^="#"]');
  inPageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href === '#back-to-home') return;
      
      e.preventDefault();
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function enterSite(targetSectionId = null) {
    if (homeContainer && siteContainer) {
      homeContainer.classList.add('hidden');
      siteContainer.classList.add('visible');

      // If a specific section was requested, scroll to it after transition
      if (targetSectionId) {
        setTimeout(() => {
          const targetSection = document.getElementById(targetSectionId);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 600);
      }
    }
  }

  function returnHome() {
    if (homeContainer && siteContainer) {
      homeContainer.classList.remove('hidden');
      siteContainer.classList.remove('visible');
      
      // Scroll main content back to top
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    }
  }
}
