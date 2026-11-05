/* Erzeugt die App-Icons (PNG) aus icon.svg – für „Als App installieren“ (Android, PC) und den iPhone-Home-Bildschirm.
   Aufruf: node tools/make_icons.js   → icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png, icons/apple-touch-icon.png */
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{
  const root=path.resolve(__dirname,'..'), svg=fs.readFileSync(path.join(root,'icon.svg'),'utf8'), out=path.join(root,'icons');
  fs.mkdirSync(out,{recursive:true});
  const inner=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<rect[^>]*\/>/,'');   // Wappen ohne abgerundeten Hintergrund
  const b=await chromium.launch(); const p=await b.newPage();
  const shot=async(file,size,html,transparent)=>{ await p.setViewportSize({width:size,height:size});
    await p.setContent(`<html><body style="margin:0;background:${transparent?'transparent':'#120e16'}">${html}</body></html>`);
    await p.screenshot({path:path.join(out,file),omitBackground:!!transparent,clip:{x:0,y:0,width:size,height:size}}); };
  const plain=s=>`<div style="width:${s}px;height:${s}px">${svg.replace('<svg ','<svg width="'+s+'" height="'+s+'" ')}</div>`;
  // „maskable“/Apple: volle Fläche, Wappen in der sicheren Mitte (80 %)
  const full=s=>`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 120 120"><rect width="120" height="120" fill="#120e16"/><g transform="translate(60 60) scale(0.78) translate(-60 -59)">${inner}</g></svg>`;
  await shot('icon-192.png',192,plain(192),true);
  await shot('icon-512.png',512,plain(512),true);
  await shot('maskable-512.png',512,full(512),false);
  await shot('apple-touch-icon.png',180,full(180),false);
  await b.close(); console.log('Icons erzeugt in icons/');
})();
