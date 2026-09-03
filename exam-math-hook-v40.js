// Qudrat v41 — safe DOM post-rendering; no MutationObserver.
(function(){
 const M=()=>window.QudratMath;
 function convertText(el){
  if(!el||!M())return;
  const old=el.textContent||'';
  const neu=M().ar(old);
  if(neu!==old)el.textContent=neu;
 }
 function decorate(){
  if(!M())return;
  const qt=document.getElementById('questionText');
  if(qt){
   const raw=qt.textContent||'';
   if(raw.includes('{{')||raw.includes('[frac:')||raw.includes('[sqrt:')||/[0-9]/.test(raw)) qt.innerHTML=M().render(raw);
  }
  document.querySelectorAll('#answers button span').forEach(el=>{
   const raw=el.textContent||'';
   if(raw.includes('{{')||raw.includes('[frac:')||raw.includes('[sqrt:')||/[0-9]/.test(raw)) el.innerHTML=M().render(raw);
  });
  ['topCounter','counter','quantCount','verbalCount','sectionLabel','panelSection','status','sectionModalTitle','sectionModalText'].forEach(id=>convertText(document.getElementById(id)));
  document.querySelectorAll('#dots button').forEach(convertText);
 }
 function arabicTimers(){
  ['timer','sectionTimer'].forEach(id=>convertText(document.getElementById(id)));
 }
 function install(){
  if(typeof window.render==='function'&&!window.__qMathWrapped){
   const stableRender=window.render;
   window.render=function(){stableRender();decorate();};
   window.__qMathWrapped=true;
  }
  if(typeof window.renderDots==='function'&&!window.__qDotsWrapped){
   const stableDots=window.renderDots;
   window.renderDots=function(){const r=stableDots.apply(this,arguments);requestAnimationFrame(decorate);return r;};
   window.__qDotsWrapped=true;
  }
  decorate(); arabicTimers();
 }
 // start() is async, so install immediately and once more after page load.
 install();
 window.addEventListener('load',install);
 setTimeout(install,300);
 setTimeout(install,1200);
 setInterval(arabicTimers,500);
 window.QudratMathDecorate=decorate;
})();