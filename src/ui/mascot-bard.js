/* mascot-bard.js — Lottie mascot with speech bubble + POI nudges (reduced-motion + a11y) */

import { POI_TIPS } from './mascot-copy.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEEN_KEY = 'guide.v1.seen';
const IDLE_KEY = 'guide.v1.idleShown';

function getSeen(){ try{return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY)||'[]'))}catch{return new Set()}}
function setSeen(id){ const s=getSeen(); s.add(id); sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s])); }
function oncePerSession(key){ if(sessionStorage.getItem(key)) return false; sessionStorage.setItem(key,'1'); return true; }

function collectPOIs(){
  return [...document.querySelectorAll('[data-poi]')].map(el=>{
    const id = el.getAttribute('data-poi-id') || el.id || Math.random().toString(36).slice(2);
    return {
      el,
      id,
      tip: POI_TIPS[id] || 'This might be more interesting than it looks.',
      prio: parseInt(el.getAttribute('data-poi-priority')||'999',10)
    };
  }).sort((a,b)=>a.prio-b.prio);
}

function makeBubble(){
  const b = document.createElement('div');
  b.className = 'mascot-bubble';
  b.innerHTML = `<div class="mb-wrap"> <div class="mb-text" aria-live="polite"></div> <div class="mb-cta"></div> </div> <div class="mb-arrow"></div>`;
  Object.assign(b.style, {
    position:'fixed', zIndex:'950', maxWidth:'320px',
    background:'rgba(16,16,22,.96)', color:'#eee',
    padding:'12px 16px', borderRadius:'12px',
    border:'1px solid rgba(255,255,255,.12)',
    boxShadow:'0 8px 24px rgba(0,0,0,.4)',
    transform:'translate(-8px,-16px)', opacity:'0',
    transition:'opacity .22s ease', pointerEvents:'none'
  });
  const arrow = b.querySelector('.mb-arrow');
  Object.assign(arrow.style, {
    position:'absolute', right:'18px', bottom:'-8px',
    width:'0', height:'0', borderLeft:'8px solid transparent',
    borderRight:'8px solid transparent',
    borderTop:'8px solid rgba(16,16,22,.96)'
  });
  document.body.appendChild(b);
  return b;
}

function pulse(el){
  if (RM) return; // respect reduced motion
  el.classList.add('poi-pulse');
  setTimeout(()=>el.classList.remove('poi-pulse'), 1400);
}

function posBubbleNear(b, rect){
  // Anchor bubble to the mascot position (comic-style, pointing down to mascot)
  let x = rect.left + (rect.width / 2);
  let y = rect.top - 16;

  // Check navbar collision (safe zone = navbar rect + 16px margin)
  const navbar = document.querySelector('#site-header');
  if (navbar) {
    const navRect = navbar.getBoundingClientRect();
    const safeZone = {
      top: navRect.top - 16,
      bottom: navRect.bottom + 16,
      left: navRect.left - 16,
      right: navRect.right + 16
    };

    // If bubble would overlap navbar, nudge it down below navbar
    if (y < safeZone.bottom && x > safeZone.left && x < safeZone.right) {
      y = safeZone.bottom + 20;
    }
  }

  // Keep away from viewport edges
  const bubbleHeight = 180; // estimate (reduced from 200)
  const bubbleWidth = 320; // max-width from bubble styles (reduced from 340)
  y = Math.max(bubbleHeight + 20, y); // Don't go off top
  x = Math.min(Math.max(bubbleWidth/2 + 20, x), window.innerWidth - bubbleWidth/2 - 20);

  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
  b.style.transform = 'translate(-50%, -100%)'; // Center bubble above mascot
}

function inView(el){
  const r = el.getBoundingClientRect();
  return r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
}

export function injectMascotCSS(){
  const css = `.poi-pulse{position:relative} .poi-pulse::after{ content:"";position:absolute;inset:-6px;border-radius:12px;pointer-events:none; border:2px solid rgba(255,255,255,.28);box-shadow:0 0 0 0 rgba(255,255,255,.2); animation:poiPulse 1.1s ease-out forwards } @keyframes poiPulse{to{box-shadow:0 0 0 12px rgba(255,255,255,0);opacity:0}} #mascotGuide{cursor:pointer} .mb-cta button{ margin-top:8px;background:#2a2a38;color:#fff;border:1px solid rgba(255,255,255,.18); padding:6px 10px;border-radius:8px;font:12px/1.2 system-ui;cursor:pointer } .mb-cta button:hover{filter:brightness(1.1)}`;
  const t=document.createElement('style'); t.textContent=css; document.head.appendChild(t);
}

export function initMascotBard({
  containerId='mascotGuide',
  lottiePath='/lottie/hi-demo-2.json',
  idleAfterMs=7000,
  betweenIdleMs=14000,
  idleLines = [],
  onCTA = null
}={}){
  const host = document.getElementById(containerId);
  if(!host) return ()=>{};

  // Ensure Lottie is available (global or module). Expect lottie-web loaded on page.
  const lottieLib = window.lottie || window.bodymovin;
  if (!lottieLib) { console.warn('[mascot] lottie-web not found'); return ()=>{}; }

  const anim = lottieLib.loadAnimation({
    container:host, renderer:'svg', loop:false, autoplay:false, path:lottiePath, name:'mascot-bard'
  });

  // Pause when offscreen to save GPU (if IntersectionObserver available)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e])=>{
      if (e && !e.isIntersecting) { anim.pause(); }
      // Don't auto-play when visible - only play when explicitly triggered
    }, {threshold:0.1});
    io.observe(host);
  }

  const bubble = makeBubble();
  const textEl = bubble.querySelector('.mb-text');
  const ctaEl = bubble.querySelector('.mb-cta');

  const pois = collectPOIs();
  const seen = getSeen();

  let idleTimer=null, cooling=false, destroyed=false, idleIndex=0;
  let fadeTimer=null; // For idle fade behavior

  // Idle fade: mascot fades to 0.25 after 2s of no activity
  function armFadeTimer() {
    clearTimeout(fadeTimer);
    host.style.opacity = '1';
    fadeTimer = setTimeout(() => {
      if (!host.classList.contains('is-speaking')) {
        host.style.opacity = '0.25';
      }
    }, 2000);
  }

  function showMascot() {
    clearTimeout(fadeTimer);
    host.style.opacity = '1';
  }

  // Track pointer near audio bar (within 64px)
  const audioBar = document.getElementById('audio-controls');
  document.addEventListener('pointermove', (e) => {
    if (!audioBar) return;
    const barRect = audioBar.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();

    const nearBar = (
      e.clientY > barRect.top - 64 &&
      e.clientY < barRect.bottom + 64 &&
      e.clientX > barRect.left - 64 &&
      e.clientX < barRect.right + 64
    );

    const nearMascot = (
      e.clientY > hostRect.top - 64 &&
      e.clientY < hostRect.bottom + 64 &&
      e.clientX > hostRect.left - 64 &&
      e.clientX < hostRect.right + 64
    );

    if (nearBar || nearMascot) {
      showMascot();
      armFadeTimer();
    }
  }, { passive: true });

  // One-shot wave on click
  host.addEventListener('click', () => {
    if (!RM) {
      anim.goToAndStop(0, true); // Reset to start
      anim.play(); // Play once (loop is false)
    }
    showMascot();
    const rect = host.getBoundingClientRect();
    showBubbleAt(rect, 'Welcome to Wonderworks. Mind the enchantments.', null);
    setTimeout(hide, 2200);
  });

  // Keyboard support (Enter/Space)
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!RM) {
        anim.goToAndStop(0, true);
        anim.play();
      }
      showMascot();
      const rect = host.getBoundingClientRect();
      showBubbleAt(rect, 'Welcome to Wonderworks. Mind the enchantments.', null);
      setTimeout(hide, 2200);
    }
  });

  armFadeTimer();

  function showBubbleAt(rect, text, cta){
    host.classList.add('is-speaking');
    showMascot(); // Keep mascot visible while speaking
    textEl.textContent = text;
    ctaEl.innerHTML = '';
    if(cta){
      const btn = document.createElement('button');
      btn.textContent = cta.label || 'Tell me more';
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        if(onCTA) onCTA(cta.id);
        hide();
      }, {once:true});
      ctaEl.appendChild(btn);
    }
    posBubbleNear(bubble, rect);
    bubble.style.pointerEvents='auto';
    bubble.style.opacity='1';
  }

  function hide(){
    bubble.style.opacity='0';
    bubble.style.pointerEvents='none';
    host.classList.remove('is-speaking');
    armFadeTimer(); // Restart fade timer after bubble closes
  }

  function nextIdleLine(){
    if(!idleLines.length) return null;
    const line = idleLines[idleIndex % idleLines.length];
    idleIndex++;
    return line;
  }

  function tryPOI(){
    for(const p of pois){
      if(seen.has(p.id)) continue;
      if(!p.el.offsetParent || !inView(p.el)) continue;
      pulse(p.el);
      if(!RM){ anim.goToAndPlay(0,true); }
      const rect = p.el.getBoundingClientRect();
      showBubbleAt(rect, p.tip, {id:p.id, label:'Okay'});
      const done = ()=>{ setSeen(p.id); hide(); };
      ['click','focusin','pointerdown','keydown'].forEach(ev=>p.el.addEventListener(ev, done, {once:true}));
      return true;
    }
    return false;
  }

  function tryIdle(){
    const showOnce = oncePerSession(IDLE_KEY);
    if(!showOnce) return false; // one idle hint per session
    const line = nextIdleLine();
    if(!line) return false;
    if(!RM){ anim.goToAndPlay(0,true); }
    const rect = host.getBoundingClientRect();
    showBubbleAt(rect, line.text, line.cta || null);
    return true;
  }

  function tick(){
    if(destroyed || cooling) return;
    if(tryPOI()) { cool(); return; }
    if(tryIdle()) { cool(); return; }
  }

  function cool(){ cooling = true; setTimeout(()=> cooling=false, betweenIdleMs); }

  function scheduleIdle(){
    if(idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(tick, idleAfterMs);
  }

  ['pointerdown','pointermove','keydown','wheel','scroll','resize'].forEach(ev=>{
    window.addEventListener(ev, scheduleIdle, {passive:true});
  });
  scheduleIdle();

  // Home page nudge: show doorway hint after 2s if on home page
  const homeLogo = document.querySelector('.logo-home, #logoDoorway');
  if (homeLogo && oncePerSession('home-logo-nudge')) {
    setTimeout(() => {
      if (destroyed) return;
      const rect = host.getBoundingClientRect();
      showBubbleAt(rect, 'Tap the crest if you fancy a tour. Mind the sparkles.', null);
      setTimeout(hide, 3500);
    }, 2000);
  }

  return ()=>{
    destroyed = true;
    anim?.destroy();
    bubble.remove();
    if(idleTimer) clearTimeout(idleTimer);
    if(fadeTimer) clearTimeout(fadeTimer);
  };
}
