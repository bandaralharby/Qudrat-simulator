// Qudrat v53 — geometry/chart tokens protected from digit conversion.
(function(){
 const DIG='٠١٢٣٤٥٦٧٨٩';
 const ar=s=>String(s??'').replace(/[0-9]/g,d=>DIG[d]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tx=(x,y,t)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" class="qlabel">'+esc(ar(t))+'</text>';
 function shape(type,args=[]){
  if(type==='triangle'){const[a='',b='',c='']=args;return'<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><polygon points="150,25 45,155 255,155" class="qstroke"/>'+tx(150,183,b)+tx(72,88,a)+tx(226,88,c)+'</svg></div>'}
  if(type==='rect'){const[w='',h='']=args;return'<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><rect x="48" y="35" width="204" height="115" class="qstroke"/>'+tx(150,180,w)+tx(25,98,h)+'</svg></div>'}
  if(type==='circle'){const[r='']=args;return'<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><circle cx="150" cy="95" r="68" class="qstroke"/><circle cx="150" cy="95" r="3" class="qfill"/><line x1="150" y1="95" x2="218" y2="95" class="qstroke"/>'+tx(184,82,r?r+' سم':'')+'</svg></div>'}
  if(type==='square'){const[d='']=args;return'<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><rect x="65" y="20" width="170" height="150" class="qstroke"/>'+tx(150,190,d)+'</svg></div>'}return'';
 }
 function bars(spec){const items=String(spec).split(',').map(x=>x.split('=')).map(([l,v])=>[l,Number(v)]).filter(x=>x[0]&&Number.isFinite(x[1]));if(!items.length)return'';const max=Math.max(1,...items.map(x=>x[1]));return'<div class="qchart" dir="rtl">'+items.map(([l,v])=>'<div class="qbarRow"><span>'+esc(l)+'</span><i style="--w:'+(v/max*100)+'%"></i><b>'+ar(v)+'</b></div>').join('')+'</div>'}
 function render(raw){
  const visuals=[];
  let p=String(raw??'').replace(/\{\{shape:(triangle|rect|rectangle|circle|square)(?::([^}]+))?\}\}/gi,(_,t,a)=>{const key='QQVIS'+String.fromCharCode(65+visuals.length)+'ZZ';visuals.push(shape(t.toLowerCase()==='rectangle'?'rect':t.toLowerCase(),a?a.split(':'):[]));return key}).replace(/\{\{chart:bar:([^}]+)\}\}/gi,(_,x)=>{const key='QQVIS'+String.fromCharCode(65+visuals.length)+'ZZ';visuals.push(bars(x));return key});
  let s=esc(p);
  s=s.replace(/\{\{frac:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qfrac" dir="ltr"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>')
   .replace(/\{\{sqrt:([^}]+)\}\}/g,(_,x)=>'<span class="qsqrt" dir="ltr">√<span>'+ar(x)+'</span></span>')
   .replace(/\{\{pow:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qpow" dir="ltr">'+ar(a)+'<sup>'+ar(b)+'</sup></span>')
   .replace(/\[frac:([^\]\/]+)\/([^\]]+)\]/g,(_,a,b)=>'<span class="qfrac" dir="ltr"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>')
   .replace(/\[sqrt:([^\]]+)\]/g,(_,x)=>'<span class="qsqrt" dir="ltr">√<span>'+ar(x)+'</span></span>');
  s=ar(s);
  visuals.forEach((html,i)=>{s=s.replace('QQVIS'+String.fromCharCode(65+i)+'ZZ',html)});
  return s;
 }
 window.QudratMath={render,ar};
})();