/**
 * Minimal terminal: ASCII-only boot + FAQ with typewriter and keyboard control.
 */
import { toggleMute, playAmbient, stopAmbient } from './audio.js';

const FAQ = [
  { q: "What is Onna-Stick Wonderworks?", a: "A small, sharp studio that turns complicated brand magic into useful tools. Think: practical wizard." },
  { q: "What services do you offer?", a: "Brand identity & logo design; Naming & copy; Web & motion; Content & SEO; Social management." },
  { q: "Do you do video and animated logos?", a: "Yes. I design for movement: stings, loops, launch cuts for phone and desktop." },
  { q: "Can you just design me a logo?", a: "Yes, but context matters (color, type, tone). A logo without a system is possible but messier." },
  { q: "How long does it take?", a: "Depends on ambition. Focused identity is quick; full brand launch takes longer. You get a realistic timeline." },
  { q: "How do you price?", a: "Bespoke and fixed. Clear scope in plain English. If scope changes, I re-scope—no surprise zeros." },
  { q: "What's your role in this?", a: "Yours is vision and decisions. Mine is craft and delivery. No corporate jargon." },
  { q: "Is SEO part of this?", a: "Yes. I bake structure and metadata into the work so you grow steadily. No gimmicks." }
];

const BANNER = [
  "  ONNA-STICK WONDERWORKS",
  "  GRIMOIRE.EXE",
  "",
  "  > INITIALIZING..."
];

let active = 0;
let typingTimer = null;

function typeText(el, text, speed = 14, done) {
  clearInterval(typingTimer);
  el.textContent = "";
  let i = 0;
  typingTimer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i++];
    } else {
      clearInterval(typingTimer);
      if (done) done();
    }
  }, speed);
}

function renderList(listEl) {
  listEl.innerHTML = "";
  FAQ.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "q" + (i === active ? " active" : "");
    div.textContent = "> " + row.q;
    div.tabIndex = i === active ? 0 : -1;
    div.addEventListener("click", () => {
      active = i;
      renderList(listEl);
      showAnswer();
    });
    listEl.appendChild(div);
  });
}

function showAnswer() {
  const answerEl = document.getElementById("answer");
  if (!answerEl) return;
  const txt = FAQ[active].a;
  typeText(answerEl, txt, 12);
}

export function initTerminal(){
  const faqSection = document.getElementById("faq");
  if (!faqSection) {
    console.log("[terminal] no #faq; skipping");
    return;
  }

  const bootWrap = document.getElementById("bootWrap");
  const bootlines = document.getElementById("bootlines");
  const panes = document.getElementById("panes");
  const qList = document.getElementById("qList");
  const answerEl = document.getElementById("answer");
  const crt = document.querySelector(".crt");
  const muteBtn = document.getElementById("muteBtn");

  if (!bootWrap || !bootlines || !panes || !qList || !answerEl || !crt) {
    console.log("[terminal] missing DOM pieces; skipping");
    return;
  }

  // Mute button functionality (sync with global button)
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = toggleMute();
      muteBtn.textContent = muted ? '🔇' : '🔊';

      // Sync with global mute button
      const globalMuteBtn = document.getElementById('globalMuteBtn');
      if (globalMuteBtn) {
        globalMuteBtn.textContent = muted ? '🔇' : '🔊';
      }
    });
  }

  // Boot banner
  bootlines.textContent = "";
  const seq = BANNER.slice();
  function nextLine() {
    if (!seq.length) {
      setTimeout(() => {
        bootWrap.style.display = "none";
        panes.style.display = "grid";
        renderList(qList);
        showAnswer();
      }, 300);
      return;
    }
    const line = seq.shift();
    const span = document.createElement("div");
    bootlines.appendChild(span);
    typeText(span, line, 10, () => setTimeout(nextLine, 120));
  }
  nextLine();

  // Keyboard: Up/Down/Enter to navigate FAQ
  function onKey(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      active = (active - 1 + FAQ.length) % FAQ.length;
      renderList(qList);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      active = (active + 1) % FAQ.length;
      renderList(qList);
    } else if (e.key === "Enter") {
      e.preventDefault();
      showAnswer();
    }
  }
  window.addEventListener("keydown", onKey);

  // When FAQ section enters/leaves viewport, play/stop ambient audio
  const io = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (!visible) {
      clearInterval(typingTimer);
      typingTimer = null;
      stopAmbient();
    } else {
      playAmbient('terminal');
    }
  }, { threshold: 0.3 });
  io.observe(faqSection);

  console.log("[terminal] minimal FAQ ready");
}