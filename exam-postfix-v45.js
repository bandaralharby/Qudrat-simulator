// v46: final post-render pass for shapes/math + Arabic digits, without observers.
(function(){
 const DIG='٠١٢٣٤٥٦٧٨٩';
 const ar=s=>String(s??'').replace(/[0-9]/g,d=>DIG[d]);
 const supMap={'⁰':'٠','¹':'١','²':'٢','³':'٣','⁴':'٤','⁵':'٥','⁶':'٦','⁷':'٧','⁸':'٨','⁹':'٩'};
 function fixSuperscripts(root){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const nodes=[]; while(walker.nextNode())nodes.push(walker.currentNode);
   nodes.forEach(n=>{
     let v=ar(n.nodeValue);
     v=v.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,x=>supMap[x]||x);
     n.nodeValue=v;
   });
 }
 function post(){
   const q=document.getElementById('questionText');
   if(q&&window.QudratMath){
     const raw=q.textContent||'';
     if(raw.includes('{{')||raw.includes('[frac:')||raw.includes('[sqrt:')) q.innerHTML=window.QudratMath.render(raw);
     fixSuperscripts(q);
   }
   document.querySelectorAll('#answers button span').forEach(el=>{
     if(window.QudratMath){const raw=el.textContent||''; if(raw.includes('{{')||raw.includes('[frac:')||raw.includes('[sqrt:'))el.innerHTML=window.QudratMath.render(raw);}
     fixSuperscripts(el);
   });
   ['timer','sectionTimer','topCounter','counter','quantCount','verbalCount'].forEach(id=>{const el=document.getElementById(id);if(el)fixSuperscripts(el)});
 }
 const oldRender=window.render;
 if(typeof oldRender==='function'){
   window.render=function(){const r=oldRender.apply(this,arguments);post();return r;};
   try{window.render();}catch(e){console.error(e)}
 }
 window.QudratPostRender=post;
})();