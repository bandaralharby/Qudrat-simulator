// Qudrat v45 — safe math renderer: Arabic digits, Arabic superscripts, fractions, roots, shapes and charts.
(function(){
 const DIG='٠١٢٣٤٥٦٧٨٩';
 const ar=s=>String(s??'').replace(/[0-9]/g,d=>DIG[d]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tx=(x,y,t)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" class="qlabel">'+esc(ar(t))+'</text>';
 function shape(type,args=[]){
  if(type==='triangle'){const [a='',b='',c='']=args;return '<div class="qvisual"><svg viewBox="0 0 300 195"><polygon points="150,25 45,155 255,155" class="qstroke"/>'+tx(150,183,b)+tx(72,88,a)+tx(226,88,c)+'</svg></div>'}
  if(type==='rect'){const [w='',h='']=args;return '<div class="qvisual"><svg viewBox="0 0 300 195"><rect x="48" y="35" width="204" height="115" class="qstroke"/>'+tx(150,180,w)+tx(25,98,h)+'</svg></div>'}
  if(type==='circle'){const [r='']=args;return '<div class="qvisual"><svg viewBox="0 0 300 195"><circle cx="150" cy="95" r="68" class="qstroke"/><circle cx="150" cy="95" r="3" class="qfill"/><line x1="150" y1="95" x2="218" y2="95" class="qstroke"/>'+tx(184,82,r?r+' سم':'')+'</svg></div>'}
  if(type==='square'){const [d='']=args;return '<div class="qvisual"><svg viewBox="0 0 300 195"><rect x="65" y="20" width="170" height="150" class="qstroke"/>'+tx(150,190,d)+'</svg></div>'}
  return '';
 }
 function bars(spec){const items=String(spec).split(',').map(x=>x.split('=')).map(([l,v])=>[l,Number(v)]).filter(x=>x[0]&&Number.isFinite(x[1]));if(!items.length)return'';const max=Math.max(1,...items.map(x=>x[1]));return '<div class="qchart">'+items.map(([l,v])=>'<div class="qbarRow"><span>'+esc(l)+'</span><i style="--w:'+(v/max*100)+'%"></i><b>'+ar(v)+'</b></div>').join('')+'</div>'}
 function render(raw){
  let s=esc(raw);
  s=s.replace(/\{\{shape:(triangle|rect|circle|square)(?::([^}]+))?\}\}/g,(_,t,a)=>shape(t,a?a.split(':'):[]));
  s=s.replace(/\{\{chart:bar:([^}]+)\}\}/g,(_,x)=>bars(x));
  s=s.replace(/\{\{frac:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qfrac"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>');
  s=s.replace(/\{\{sqrt:([^}]+)\}\}/g,(_,x)=>'<span class="qsqrt">√<span>'+ar(x)+'</span></span>');
  s=s.replace(/\{\{pow:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qpow">'+ar(a)+'<sup>'+ar(b)+'</sup></span>');
  s=s.replace(/\[frac:([^\]\/]+)\/([^\]]+)\]/g,(_,a,b)=>'<span class="qfrac"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>');
  s=s.replace(/\[sqrt:([^\]]+)\]/g,(_,x)=>'<span class="qsqrt">√<span>'+ar(x)+'</span></span>');
  s=s.replace(/([\u0600-\u06FF\w\)]+)\^([0-9]+)/g,(_,a,b)=>'<span class="qpow">'+ar(a)+'<sup>'+ar(b)+'</sup></span>');
  s=s.replace(/([\u0600-\u06FF\w\)]+)([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g,(_,a,b)=>{const m={'⁰':'٠','¹':'١','²':'٢','³':'٣','⁴':'٤','⁵':'٥','⁶':'٦','⁷':'٧','⁸':'٨','⁹':'٩'};return '<span class="qpow">'+ar(a)+'<sup>'+[...b].map(x=>m[x]||x).join('')+'</sup></span>'});
  return ar(s);
 }
 window.QudratMath={render,ar};
})();