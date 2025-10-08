/**
 * Minimal, robust carousel for Onna-Stick Wonderworks.
 * - Targets: #wonderworks-wrapper .wonderworks-scroller
 * - Enforces explicit slide order (by src/iframe)
 * - Wheel -> horizontal on the scroller only (no header interference)
 * - Dots + media play/pause via IntersectionObserver
 */
export function initCarousel(){
  const wrapper  = document.getElementById("wonderworks-wrapper");
  const scroller = wrapper ? wrapper.querySelector(".wonderworks-scroller") : null;
  const dotNav   = wrapper ? wrapper.querySelector(".dot-nav") : null;

  if(!wrapper || !scroller || !dotNav){
    console.warn("[carousel] required elements not found (wrapper/scroller/dotNav)");
    return;
  }

  // --- Desired order (match by filename/iframe)
  const desiredOrder = [
    "be-seen-on-every-screen",         // assets/be-seen-on-every-screen-ad.mp4
    "build-your-legacy",               // assets/build-your-legacy-ad.mp4
    "onna-stick-construction-logo-branding", // assets/onna-stick-construction-logo-branding.jpg
    "onna-stick-barbers-logo",         // assets/onna-stick-barbers-logo.jpg
    "bad-mother-earth-vinyl",          // assets/bad-mother-earth-vinyl-spread.jpg
    "__YOUTUBE_IFRAME__",              // YouTube iframe slide
    "onna-stick-fresh-web-design",     // assets/onna-stick-fresh-web-design.jpg
    "bar-fruit-supplies-website-hero", // assets/bar-fruit-supplies-website-hero.jpg
    "onna-stick-super-sweet-campaign-visual" // assets/onna-stick-super-sweet-campaign-visual.jpg
  ];

  const slides = Array.from(scroller.children);

  const keyFor = (slide)=>{
    const iframe = slide.querySelector("iframe");
    if (iframe) return "__YOUTUBE_IFRAME__";
    const src = slide.querySelector("video source")?.getAttribute("src")
             || slide.querySelector("img")?.getAttribute("src")
             || "";
    return src.toLowerCase();
  };

  const byKey = new Map(slides.map(n => [keyFor(n), n]));
  const used  = new Set();
  const ordered = [];

  desiredOrder.forEach(token=>{
    if (token === "__YOUTUBE_IFRAME__") {
      const node = byKey.get("__YOUTUBE_IFRAME__");
      if (node && !used.has("__YOUTUBE_IFRAME__")) {
        ordered.push(node); used.add("__YOUTUBE_IFRAME__");
      }
    } else {
      // find first slide whose src includes token
      for (const [k, node] of byKey) {
        if (used.has(k)) continue;
        if (k.includes(token)) { ordered.push(node); used.add(k); break; }
      }
    }
  });

  // append any leftover slides in original order
  slides.forEach(n => { const k = keyFor(n); if (!used.has(k)) ordered.push(n); });

  // commit DOM order if changed
  const differs = slides.length === ordered.length && slides.some((n,i)=>n!==ordered[i]);
  if (differs){
    const frag = document.createDocumentFragment();
    ordered.forEach(n => frag.appendChild(n));
    scroller.appendChild(frag);
    console.info("[carousel] order enforced");
  }

  // --- Build dots
  const finalSlides = Array.from(scroller.children);
  dotNav.innerHTML = "";
  finalSlides.forEach((slide, i)=>{
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Go to slide ${i+1}`);
    if (i===0) b.classList.add("active");
    b.addEventListener("click", ()=>{
      slide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    });
    dotNav.appendChild(b);
  });
  const dots = Array.from(dotNav.children);

  // --- Intersection: dots + play/pause
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const idx = finalSlides.indexOf(entry.target);
      const video  = entry.target.querySelector("video");
      const iframe = entry.target.querySelector("iframe");

      if (entry.isIntersecting) {
        dots.forEach(d=>d.classList.remove("active"));
        dots[idx]?.classList.add("active");
        if (video) video.play().catch(()=>{});
        if (iframe && !iframe.dataset._loaded) {
          // load once, do NOT keep adding autoplay query
          iframe.src = iframe.src.includes("autoplay=1") ? iframe.src : iframe.src + (iframe.src.includes("?")?"&":"?") + "autoplay=1";
          iframe.dataset._loaded = "1";
        }
      } else {
        if (video) video.pause();
      }
    });
  }, { root: scroller, threshold: 0.6 });

  finalSlides.forEach(s => io.observe(s));

  // --- Wheel -> horizontal on the scroller only
  const PX_PER_LINE = 40;
  const SPEED = 1.15;

  scroller.addEventListener("wheel", (e)=>{
    if (scroller.scrollWidth <= scroller.clientWidth) return; // nothing to scroll
    // prevent page scroll while cursor is over the scroller
    e.preventDefault();

    const dominant = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const scale = e.deltaMode === 1 ? PX_PER_LINE : (e.deltaMode === 2 ? scroller.clientWidth * 0.9 : 1);
    const dx = dominant * scale * SPEED;

    scroller.scrollLeft += dx;
  }, { passive: false });

  console.log("[carousel] minimal ready (bound to .wonderworks-scroller)");
}