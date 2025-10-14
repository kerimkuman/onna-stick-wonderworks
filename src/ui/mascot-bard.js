/* mascot-bard.js — Lottie mascot with speech bubble + POI nudges (reduced-motion + a11y) */

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEEN_KEY = 'guide.v1.seen';
const IDLE_KEY = 'guide.v1.idleShown';

function getSeen(){ try{return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY)||'[]'))}catch{return new Set()}}
function setSeen(id){ const s=getSeen(); s.add(id); sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s])); }
function oncePerSession(key){ if(sessionStorage.getItem(key)) return false; sessionStorage.setItem(key,'1'); return true; }

function collectPOIs(){
  return [...document.querySelectorAll('[data-poi]')].map(el=>({
    el,
    id: el.getAttribute('data-poi-id') || el.id || Math.random().toString(36).slice(2),
    tip: el.getAttribute('data-poi-tip') || 'This might be more interesting than it looks.',
    prio: parseInt(el.getAttribute('data-poi-priority')||'999',10)
  })).sort((a,b)=>a.prio-b.prio);
}

function makeBubble(){
  const b = document.createElement('div');
  b.className = 'mascot-bubble';
  b.innerHTML = `<div class="mb-wrap"> <div class="mb-text" aria-live="polite"></div> <div class="mb-cta"></div> </div> <div class="mb-arrow"></div>`;
  Object.assign(b.style, {
    position:'fixed', zIndex:'40', maxWidth:'340px',
    background:'rgba(16,16,22,.96)', color:'#eee',
    padding:'12px 14px', borderRadius:'12px',
    border:'1px solid rgba(255,255,255,.1)',
    boxShadow:'0 8px 20px rgba(0,0,0,.35)',
    transform:'translate(-8px,-16px)', opacity:'0',
    transition:'opacity .18s ease', pointerEvents:'none'
  });
  const arrow = b.querySelector('.mb-arrow');
  Object.assign(arrow.style, {
    position:'absolute', right:'16px', bottom:'-8px',
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
  const x = Math.min(Math.max(rect.right, 16), window.innerWidth - 16);
  const y = Math.max(rect.top - 12, 12);
  b.style.left = `${x}px`; b.style.top = `${y}px`;
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
  poiPingSfx = null,
  onCTA = null
}={}){
  const host = document.getElementById(containerId);
  if(!host) return ()=>{};

  // Ensure Lottie is available (global or module). Expect lottie-web loaded on page.
  const lottieLib = window.lottie || window.bodymovin;
  if (!lottieLib) { console.warn('[mascot] lottie-web not found'); return ()=>{}; }

  const anim = lottieLib.loadAnimation({
    container:host, renderer:'svg', loop:!RM, autoplay:!RM, path:lottiePath, name:'mascot-bard'
  });

  // Pause when offscreen to save GPU (if IntersectionObserver available)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e])=>{
      if (e && e.isIntersecting) { if (!RM) anim.play(); }
      else { anim.pause(); }
    }, {threshold:0.1});
    io.observe(host);
  }

  const bubble = makeBubble();
  const textEl = bubble.querySelector('.mb-text');
  const ctaEl = bubble.querySelector('.mb-cta');

  const pois = collectPOIs();
  const seen = getSeen();

  let idleTimer=null, cooling=false, destroyed=false, idleIndex=0;

  function showBubbleAt(rect, text, cta){
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

  function hide(){ bubble.style.opacity='0'; bubble.style.pointerEvents='none'; }

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
      if(poiPingSfx){ try{ new Audio(poiPingSfx).play(); }catch{} }
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

  return ()=>{
    destroyed = true;
    anim?.destroy();
    bubble.remove();
    if(idleTimer) clearTimeout(idleTimer);
  };
}
