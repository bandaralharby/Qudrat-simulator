// Qudrat unified math renderer v80 — fractions, roots and powers.
(function(){
 const AR='٠١٢٣٤٥٦٧٨٩', FA='۰۱۲۳۴۵۶۷۸۹';
 const ar=s=>String(s??'').replace(/[0-9۰-۹]/g,d=>/[0-9]/.test(d)?AR[d]:AR[FA.indexOf(d)]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle" class="qlabel">${esc(ar(t))}</text>`;
 function svg(type,a=[]){if(type==='triangle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><polygon points="150,20 45,155 255,155" class="qstroke"/>${label(70,95,a[0]||'')}${label(150,180,a[1]||'')}${label(230,95,a[2]||'')}</svg></div>`;if(type==='rect'||type==='rectangle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><rect x="45" y="30" width="210" height="120" class="qstroke"/>${label(150,180,a[0]||'')}${label(24,95,a[1]||'')}</svg></div>`;if(type==='square')return `<div class="qvisual"><svg viewBox="0 0 300 190"><rect x="70" y="15" width="160" height="160" class="qstroke"/>${label(150,188,a[0]||'')}</svg></div>`;if(type==='circle')return `<div class="qvisual"><svg viewBox="0 0 300 190"><circle cx="150" cy="92" r="70" class="qstroke"/><circle cx="150" cy="92" r="3" class="qfill"/><line x1="150" y1="92" x2="220" y2="92" class="qstroke"/>${label(185,80,a[0]||'')}</svg></div>`;return''}
 function chart(spec){const z=String(spec).split(',').map(x=>x.split('=')),vals=z.map(x=>Number(String(x[1]||'').replace(/[٠-٩]/g,d=>AR.indexOf(d)))||0),m=Math.max(1,...vals);return `<div class="qchart">${z.map(([k,v],i)=>`<div class="qbarRow"><span>${esc(k||'')}</span><i style="--w:${vals[i]/m*100}%"></i><b>${ar(v||'')}</b></div>`).join('')}</div>`}
 function frac(a,b){return `<span class="qfrac" dir="ltr"><span>${esc(ar(a))}</span><span>${esc(ar(b))}</span></span>`}
 function sqrt(x){return `<span class="qsqrt" dir="ltr"><span>${esc(ar(x))}</span></span>`}
 function expr(items){return `<span class="qexpr" dir="ltr" style="display:inline-flex;align-items:baseline;gap:.14em;unicode-bidi:isolate;white-space:nowrap">${items.join('')}</span>`}
 function pow(a,b){return `<span class="qpow" dir="ltr"><span class="qbase">${esc(ar(a))}</span><span class="qexp">${esc(ar(b))}</span></span>`}
 function render(raw){
  let s=String(raw??''),holds=[],n=0;
  // Never expose internal legacy placeholders to students. They were accidentally persisted in some bank rows.
  // If a legacy token is present, remove it cleanly; valid raw math around it remains renderable.
  s=s.replace(/QQMATHHOLD[^Z\n<]{0,24}ZZ/gi,'');
  const hold=h=>{const key=`\uE000${String.fromCharCode(0xE100+(n++))}\uE001`;holds.push([key,h]);return key};
  // 1) Explicit canonical tokens first.
  s=s.replace(/\{\{\s*chart\s*:\s*bar\s*:\s*([^}]+)\}\}/gi,(_,x)=>hold(chart(x)))
   .replace(/\{\{shape:(triangle|rect|rectangle|circle|square)(?::([^}]+))?\}\}/gi,(_,t,a)=>hold(svg(t.toLowerCase(),a?a.split(':'):[])))
   .replace(/QVISUALTOKEN\s*[·.،,:-]*\s*(triangle|rect|rectangle|circle|square)?/gi,(_,t)=>hold(svg((t||'rect').toLowerCase(),[])))
   .replace(/\{\{frac:([^}:]+):([^}]+)\}\}/gi,(_,a,b)=>hold(frac(a,b)))
   .replace(/\{\{sqrt:([^}]+)\}\}/gi,(_,x)=>hold(sqrt(x)))
   .replace(/\{\{pow:([^}:]+):([^}]+)\}\}/gi,(_,a,b)=>hold(pow(a,b)));
  // 2) Normalize legacy square-root forms. The radicand is isolated from RTL text.
  s=s.replace(/√\s*[（(]\s*([^()（）]{1,50}?)\s*[)）]/g,(_,x)=>hold(sqrt(x)))
   .replace(/√\s*([0-9٠-٩۰-۹]+(?:[.,٫][0-9٠-٩۰-۹]+)?)/g,(_,x)=>hold(sqrt(x)))
   .replace(/√\s*([A-Za-z\u0600-\u06FF](?:\s*[+\-−×÷]\s*[A-Za-z0-9٠-٩۰-۹\u0600-\u06FF]+)?)/g,(_,x)=>hold(sqrt(x)));
  // Protect complete powered expressions before individual powers, e.g. ٥^٢ − ٣^٢.
  // This prevents RTL from reversing the order of the two powered terms around the operator.
  s=s.replace(/([0-9٠-٩۰-۹]+)\s*\^\s*([0-9٠-٩۰-۹]+)\s*([+\-−×÷])\s*([0-9٠-٩۰-۹]+)\s*\^\s*([0-9٠-٩۰-۹]+)/g,
    (_,a,b,op,d,e)=>hold(expr([pow(a,b),`<span class="qop">${esc(op)}</span>`,pow(d,e)])))
   .replace(/([0-9٠-٩۰-۹]+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*([+\-−×÷])\s*([0-9٠-٩۰-۹]+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,
    (_,a,b,op,d,e)=>{const m={'⁰':'٠','¹':'١','²':'٢','³':'٣','⁴':'٤','⁵':'٥','⁶':'٦','⁷':'٧','⁸':'٨','⁹':'٩'};const cv=x=>[...x].map(z=>m[z]||z).join('');return hold(expr([pow(a,cv(b)),`<span class="qop">${esc(op)}</span>`,pow(d,cv(e))]))});
  // Canonical database form: ٦٤^(س-١), ٩^(س−١), etc. Protect the whole power before RTL can reorder it.
  s=s.replace(/([A-Za-z\u0600-\u06FF0-9٠-٩۰-۹]+)\s*\^\s*[（(]\s*([^()（）]{1,40})\s*[)）]/g,(_,a,b)=>hold(pow(a,b)));
  // 3) Normalize powers. Catch legacy Arabic forms, including a bare exponent after a numeric base (٦٣ meaning ٦^٣ when the exponent is visually separated in source markup).
  // First protect explicit base/exponent pairs separated by whitespace: "٦ ٣ × ٦ ٤".
  s=s.replace(/([0-9٠-٩۰-۹]+)\s+([٢٣٤٥٦٧٨٩2-9])(?=\s*(?:[×*÷+=]))/g,(_,a,b)=>hold(pow(a,b)))
   .replace(/([（(][^()（）]{1,40}[)）])\s*([٢٣23])(?=\s*(?:[=،,.؟?]|$))/g,(_,a,b)=>hold(pow(a,b)))
   .replace(/(سم|كم|مم|م)\s*[\^]\s*([0-9٠-٩۰-۹]+)/g,(_,a,b)=>hold(pow(a,b)))
   .replace(/(سم|كم|مم|م)([²³])/g,(_,a,b)=>hold(pow(a,b==='²'?'٢':'٣')))
   .replace(/([A-Za-z\u0600-\u06FF0-9٠-٩۰-۹]+|[（(][^()（）]{1,30}[)）])\s*[\^]\s*[（(]?\s*([+\-−]?[0-9٠-٩۰-۹]+)\s*[)）]?/g,(_,a,b)=>hold(pow(a,b)))
   .replace(/([A-Za-z\u0600-\u06FF0-9٠-٩۰-۹]+|[（(][^()（）]{1,30}[)）])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,(_,a,b)=>{const m={'⁰':'٠','¹':'١','²':'٢','³':'٣','⁴':'٤','⁵':'٥','⁶':'٦','⁷':'٧','⁸':'٨','⁹':'٩'};return hold(pow(a,[...b].map(x=>m[x]||x).join('')))});
  // 4) Normalize every standalone numeric slash fraction, including Arabic-Indic digits.
  s=s.replace(/([0-9٠-٩۰-۹]+)\s*[\/⁄]\s*([0-9٠-٩۰-۹]+)/g,(_,a,b)=>hold(frac(a,b)));
  // Escape ordinary text, convert digits, then restore protected math HTML.
  s=ar(esc(s));holds.forEach(([k,h])=>{s=s.split(k).join(h)});return s
 }
 window.QudratMath={render,ar};
})();