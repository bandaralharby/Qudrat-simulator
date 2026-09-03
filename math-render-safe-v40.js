// Qudrat v56 — stable visual renderer for exam + results.
(function(){
 const D='٠١٢٣٤٥٦٧٨٩', ar=s=>String(s??'').replace(/[0-9]/g,d=>D[d]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle" class="qlabel">${esc(ar(t))}</text>`;
 function svg(type,a=[]){
  if(type==='triangle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><polygon points="150,20 45,155 255,155" class="qstroke"/>${label(70,95,a[0]||'')}${label(150,180,a[1]||'')}${label(230,95,a[2]||'')}</svg></div>`;
  if(type==='rect'||type==='rectangle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><rect x="45" y="30" width="210" height="120" class="qstroke"/>${label(150,180,a[0]||'')}${label(24,95,a[1]||'')}</svg></div>`;
  if(type==='square')return `<div class="qvisual"><svg viewBox="0 0 300 190"><rect x="70" y="15" width="160" height="160" class="qstroke"/>${label(150,188,a[0]||'')}</svg></div>`;
  if(type==='circle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><circle cx="150" cy="92" r="70" class="qstroke"/><circle cx="150" cy="92" r="3" class="qfill"/><line x1="150" y1="92" x2="220" y2="92" class="qstroke"/>${label(185,80,a[0]||'')}</svg></div>`;
  return'';
 }
 function chart(spec){const z=String(spec).split(',').map(x=>x.split('=')),vals=z.map(x=>Number(x[1])||0),m=Math.max(1,...vals);return `<div class="qchart">${z.map(([k,v],i)=>`<div class="qbarRow"><span>${esc(k||'')}</span><i style="--w:${vals[i]/m*100}%"></i><b>${ar(v||'')}</b></div>`).join('')}</div>`}
 function render(raw){
  let s=String(raw??''), visuals=[];
  const hold=h=>{const i=visuals.push(h)-1;return `QVHOLDER${String.fromCharCode(65+i)}ZZ`};
  s=s.replace(/\{\{shape:(triangle|rect|rectangle|circle|square)(?::([^}]+))?\}\}/gi,(_,t,a)=>hold(svg(t.toLowerCase(),a?a.split(':'):[])))
     .replace(/\{\{chart:bar:([^}]+)\}\}/gi,(_,x)=>hold(chart(x)))
     .replace(/QVISUALTOKEN\s*[·.،,:-]*\s*(triangle|rect|rectangle|circle|square)?/gi,(_,t)=>hold(svg((t||'rect').toLowerCase(),[])));
  s=esc(s)
   .replace(/\{\{frac:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>`<span class="qfrac"><span>${ar(a)}</span><span>${ar(b)}</span></span>`)
   .replace(/\{\{sqrt:([^}]+)\}\}/g,(_,x)=>`<span class="qsqrt">√<span>${ar(x)}</span></span>`)
   .replace(/\{\{pow:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>`<span class="qpow">${ar(a)}<sup>${ar(b)}</sup></span>`);
  s=ar(s); visuals.forEach((h,i)=>{s=s.split(`QVHOLDER${String.fromCharCode(65+i)}ZZ`).join(h)});return s;
 }
 window.QudratMath={render,ar};
})();