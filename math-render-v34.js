// Qudrat v34 — lightweight math/diagram renderer (no external dependency)
// Supported inline syntax in question text / choices:
// [frac:a/b]  [sqrt:x]  [pow:x^n]  [ratio:a:b]
// Visual blocks in question text:
// [shape:triangle] [shape:rectangle] [shape:circle] [shape:shaded-square]
// [bar:label1=10,label2=20,label3=15]
(function(){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inline(src){
    let s=esc(src??'');
    s=s.replace(/\[frac:([^\]\/]+)\/([^\]]+)\]/g,'<span class="qfrac"><span>$1</span><span>$2</span></span>');
    s=s.replace(/\[sqrt:([^\]]+)\]/g,'<span class="qsqrt">√<span>$1</span></span>');
    s=s.replace(/\[pow:([^\]^]+)\^([^\]]+)\]/g,'<span class="qpow">$1<sup>$2</sup></span>');
    s=s.replace(/\[ratio:([^:\]]+):([^\]]+)\]/g,'<span class="qratio">$1 : $2</span>');
    return s;
  }
  function shape(type){
    if(type==='triangle')return '<div class="qvisual"><svg viewBox="0 0 240 150" aria-label="مثلث"><polygon points="120,18 28,132 212,132" class="qstroke"/></svg></div>';
    if(type==='rectangle')return '<div class="qvisual"><svg viewBox="0 0 240 150" aria-label="مستطيل"><rect x="35" y="30" width="170" height="90" class="qstroke"/></svg></div>';
    if(type==='circle')return '<div class="qvisual"><svg viewBox="0 0 240 150" aria-label="دائرة"><circle cx="120" cy="75" r="55" class="qstroke"/><line x1="120" y1="75" x2="175" y2="75" class="qstroke"/></svg></div>';
    if(type==='shaded-square')return '<div class="qvisual"><svg viewBox="0 0 240 150" aria-label="مربع مظلل"><rect x="55" y="15" width="130" height="120" class="qstroke"/><path d="M55 15 L185 15 L55 135 Z" class="qshade"/><line x1="55" y1="135" x2="185" y2="15" class="qstroke"/></svg></div>';
    return '';
  }
  function bars(spec){
    const items=spec.split(',').map(x=>{const p=x.split('=');return [p[0],Number(p[1])]}).filter(x=>x[0]&&Number.isFinite(x[1]));
    if(!items.length)return '';
    const max=Math.max(...items.map(x=>x[1]),1);
    return '<div class="qchart" aria-label="رسم بياني">'+items.map(([l,v])=>'<div class="qbarRow"><span>'+esc(l)+'</span><i style="--w:'+(v/max*100)+'%"></i><b>'+v+'</b></div>').join('')+'</div>';
  }
  function renderQuestion(el){
    if(!el)return;
    const raw=el.textContent||'';
    let html=inline(raw);
    html=html.replace(/\[shape:(triangle|rectangle|circle|shaded-square)\]/g,(_,t)=>shape(t));
    html=html.replace(/\[bar:([^\]]+)\]/g,(_,s)=>bars(s));
    if(html!==esc(raw))el.innerHTML=html;
  }
  function renderChoices(root){
    if(!root)return;
    root.querySelectorAll('button span').forEach(el=>{const raw=el.textContent||'';const html=inline(raw);if(html!==esc(raw))el.innerHTML=html;});
  }
  function apply(){renderQuestion(document.getElementById('questionText'));renderChoices(document.getElementById('answers'));}
  const obs=new MutationObserver(()=>{queueMicrotask(apply)});
  window.addEventListener('DOMContentLoaded',()=>{
    const q=document.getElementById('questionText'),a=document.getElementById('answers');
    if(q)obs.observe(q,{childList:true,subtree:true,characterData:true});
    if(a)obs.observe(a,{childList:true,subtree:true});
    apply();
  });
  window.QudratMath={apply,inline};
})();