# ===================== CONFIG =====================
$NewProject = "C:\Users\rocks\Desktop\Wonderworks-Prod-Site"
$AssetSource = "C:\Users\rocks\Desktop\Onna-Stick-Wonderworks-Vite-Site\public\assets"
# =================================================

$ErrorActionPreference = "Stop"

# Create tree
$paths = @(
  $NewProject
  (Join-Path $NewProject "src")
  (Join-Path $NewProject "src\modules")
  (Join-Path $NewProject "src\styles")
  (Join-Path $NewProject "src\assets")
  (Join-Path $NewProject "public")
  (Join-Path $NewProject "public\assets")
)
$paths | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

function Write-Utf8($path, $text) {
  [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
}

# ---------------- package.json ----------------
Write-Utf8 (Join-Path $NewProject "package.json") @'
{
  "name": "wonderworks-prod-site",
  "version": "1.0.0",
  "description": "Onna-Stick Wonderworks – Vite site (vanilla JS) ready for Cloudflare Pages",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "devDependencies": { "vite": "^5.4.11" },
  "engines": { "node": ">=20.0.0" },
  "license": "ISC"
}
'@

# ---------------- vite.config.js ----------------
Write-Utf8 (Join-Path $NewProject "vite.config.js") @'
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  plugins: [
    {
      name: "clacks-header",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader("X-Clacks-Overhead", "GNU Terry Pratchett");
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: { output: { manualChunks: undefined } }
  }
});
'@

# ---------------- .gitignore ----------------
Write-Utf8 (Join-Path $NewProject ".gitignore") @'
node_modules/
dist/
dist-ssr/
.vite/
*.log
*.local
package-lock.json
'@

# Prepare public path
$public = Join-Path $NewProject "public"

# ---------------- public/_redirects ----------------
Write-Utf8 (Join-Path $public "_redirects") @'
/*  /index.html  200
'@

# ---------------- public/_headers ----------------
Write-Utf8 (Join-Path $public "_headers") @'
/*
  X-Clacks-Overhead: GNU Terry Pratchett
'@

# ---------------- public/sitemap.xml ----------------
Write-Utf8 (Join-Path $public "sitemap.xml") @'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
</urlset>
'@

# ---------------- index.html ----------------
Write-Utf8 (Join-Path $NewProject "index.html") @'
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Onna-Stick Wonderworks</title>
    <meta name="description" content="Brand, web & motion." />
    <link rel="icon" href="/assets/favicon.png" />
  </head>
  <body>
    <div id="app">
      <h1>Wonderworks – production skeleton</h1>
      <p>Vite is running. Assets are in <code>/assets/</code>. Modules load from <code>src/modules/</code>.</p>
      <nav>
        <a href="#welcome">Welcome</a> ·
        <a href="#wonderworks">Wonderworks</a> ·
        <a href="#contact">Contact</a> ·
        <a href="#faq">FAQ</a>
      </nav>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
'@

# ---------------- src/main.js ----------------
Write-Utf8 (Join-Path $NewProject "src\main.js") @'
import "./styles/site.css";
import "./styles/terminal.css";

import { setupPage } from "./modules/page-setup.js";
import { initCarousel } from "./modules/carousel.js";
import { initTerminal } from "./modules/terminal.js";

setupPage();
initCarousel();
initTerminal();
'@

# ---------------- src/styles/site.css ----------------
Write-Utf8 (Join-Path $NewProject "src\styles\site.css") @'
:root { --bg:#0b0b0f; --fg:#e5e7eb; --muted:#94a3b8; }
*{ box-sizing:border-box }
html,body{ height:100% }
body{ margin:0; font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif; background:#000; color:var(--fg) }
#app{ max-width:1100px; margin:4rem auto; padding:1.5rem }
h1{ font-size:clamp(2rem,4vw,3rem); margin:0 0 .5rem }
nav{ margin-top:1rem }
a{ color:#8da2ff; text-decoration:none }
a:hover{ text-decoration:underline }
@media (prefers-reduced-motion: reduce){
  *{ animation: none !important; transition: none !important }
}
'@

# ---------------- src/styles/terminal.css ----------------
Write-Utf8 (Join-Path $NewProject "src\styles\terminal.css") @'
/* CRT/terminal placeholder */
.crt{ font-family:"VT323",monospace; color:#39ff14 }
'@

# ---------------- src/modules/page-setup.js ----------------
Write-Utf8 (Join-Path $NewProject "src\modules\page-setup.js") @'
export function setupPage(){
  // Simple hash navigation
  document.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click",(e)=>{
      const id = a.getAttribute("href").slice(1);
      if(!id) return;
      const t = document.getElementById(id);
      if(t){
        e.preventDefault();
        t.scrollIntoView({behavior:"smooth"});
      }
    });
  });
  console.log("[setupPage] ready");
}
'@

# ---------------- src/modules/carousel.js ----------------
Write-Utf8 (Join-Path $NewProject "src\modules\carousel.js") @'
export function initCarousel(){
  // Hook up your scroller + dots + header idle here
  console.log("[carousel] ready");
}
'@

# ---------------- src/modules/terminal.js ----------------
Write-Utf8 (Join-Path $NewProject "src\modules\terminal.js") @'
import bannerArt from "../assets/banner.txt?raw";

export function initTerminal(){
  try {
    if (bannerArt?.trim()) console.log("[terminal banner]\\n" + bannerArt);
  } catch {}
  console.log("[terminal] ready");
}
'@

# ---------------- src/assets/banner.txt ----------------
Write-Utf8 (Join-Path $NewProject "src\assets\banner.txt") @'
ONNA-STICK WONDERWORKS
(ASCII banner placeholder; replace if you want)
'@

# ---------------- Copy assets ----------------
if (Test-Path $AssetSource) {
  Copy-Item -Path (Join-Path $AssetSource "*") -Destination (Join-Path $public "assets") -Recurse -Force
  Write-Host "Assets copied from: $AssetSource" -ForegroundColor Green
} else {
  Write-Host "WARNING: Asset source not found: $AssetSource" -ForegroundColor Yellow
}

# ---------------- Install & run ----------------
Set-Location $NewProject
if (Test-Path ".\package-lock.json") { Remove-Item ".\package-lock.json" -Force -ErrorAction SilentlyContinue }
if (Test-Path ".\node_modules") { Remove-Item ".\node_modules" -Recurse -Force -ErrorAction SilentlyContinue }

npm ci
npm run dev
