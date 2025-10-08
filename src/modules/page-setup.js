export function initPageSetup() {
    // --- PAGE SETUP & NAVIGATION LOGIC ---
    const year = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => el.textContent = year);
    
    const homeContainer = document.getElementById('home-container');
    const siteContainer = document.getElementById('site-container');
    const enterSiteBtn = document.getElementById('enter-site-btn');
    const backToHomeBtn = document.getElementById('back-to-home');
    
    const showSite = (targetId) => {
        homeContainer.classList.add('hidden');
        siteContainer.classList.add('active');
        setTimeout(() => { 
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'instant' });
            }
        }, 50);
    };

    enterSiteBtn.addEventListener('click', () => showSite('welcome'));

    document.querySelectorAll('[data-goto]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-goto');
            showSite(target);
        });
    });

    backToHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        siteContainer.classList.remove('active');
        homeContainer.classList.remove('hidden');
        setTimeout(() => { 
            const homeDoor = document.getElementById('home-door');
            if (homeDoor) {
                homeDoor.scrollIntoView({ behavior: 'instant' });
            }
        }, 50);
    });
}