// Qudrat v49 — robust Arabic math + inferred geometry diagrams.
(function(){
 const DIG='٠١٢٣٤٥٦٧٨٩';
 const ar=s=>String(s??'').replace(/[0-9]/g,d=>DIG[d]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
 const tx=(x,y,t)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" class="qlabel">'+esc(ar(t))+'</text>';
 function shape(type,args=[]){
  if(type==='triangle'){const[a='',b='',c='']=args;return '<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><polygon points="150,25 45,155 255,155" class="qstroke"/>'+tx(150,183,b)+tx(72,88,a)+tx(226,88,c)+'</svg></div>'}
  if(type==='rect'){const[w='',h='']=args;return '<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><rect x="48" y="35" width="204" height="115" class="qstroke"/>'+tx(150,180,w)+tx(25,98,h)+'</svg></div>'}
  if(type==='circle'){const[r='']=args;return '<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><circle cx="150" cy="95" r="68" class="qstroke"/><circle cx="150" cy="95" r="3" class="qfill"/><line x1="150" y1="95" x2="218" y2="95" class="qstroke"/>'+tx(184,82,r?r+' سم':'')+'</svg></div>'}
  if(type==='square'){const[d='']=args;return '<div class="qvisual" dir="ltr"><svg viewBox="0 0 300 195"><rect x="65" y="20" width="170" height="150" class="qstroke"/>'+tx(150,190,d)+'</svg></div>'}return'';
 }
 function bars(spec){const items=String(spec).split(',').map(x=>x.split('=')).map(([l,v])=>[l,Number(v)]).filter(x=>x[0]&&Number.isFinite(x[1]));if(!items.length)return'';const max=Math.max(1,...items.map(x=>x[1]));return '<div class="qchart" dir="rtl">'+items.map(([l,v])=>'<div class="qbarRow"><span>'+esc(l)+'</span><i style="--w:'+(v/max*100)+'%"></i><b>'+ar(v)+'</b></div>').join('')+'</div>'}
 function inferShape(raw){
  if(/في الشكل/.test(raw)&&/مثلث قائم/.test(raw)){const m=raw.match(/أضلاعه\s*([٠-٩0-9]+)\s*[،,]\s*([٠-٩0-9]+)\s*[،,]\s*([٠-٩0-9]+)/);return shape('triangle',m?[m[1],m[2],m[3]]:[])}
  if(/في الشكل/.test(raw)&&/مثلث/.test(raw))return shape('triangle',[]);
  if(/في الشكل/.test(raw)&&/مستطيل/.test(raw))return shape('rect',[]);
  if(/في الشكل/.test(raw)&&/دائرة/.test(raw))return shape('circle',[]);
  if(/في الشكل/.test(raw)&&/مربع/.test(raw))return shape('square',[]);
  return '';
 }
 function render(raw){const original=String(raw??'');let s=esc(original);
  let hadVisual=false;
  s=s.replace(/\{\{shape:(triangle|rect|rectangle|circle|square)(?::([^}]+))?\}\}/g,(_,t,a)=>{hadVisual=true;return shape(t==='rectangle'?'rect':t,a?a.split(':'):[])});
  s=s.replace(/\{\{chart:bar:([^}]+)\}\}/g,(_,x)=>{hadVisual=true;return bars(x)});
  s=s.replace(/\{\{frac:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qfrac" dir="ltr"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>');
  s=s.replace(/\{\{sqrt:([^}]+)\}\}/g,(_,x)=>'<span class="qsqrt" dir="ltr">√<span>'+ar(x)+'</span></span>');
  s=s.replace(/\{\{pow:([^}:]+):([^}]+)\}\}/g,(_,a,b)=>'<span class="qpow" dir="ltr">'+ar(a)+'<sup>'+ar(b)+'</sup></span>');
  s=s.replace(/\[frac:([^\]\/]+)\/([^\]]+)\]/g,(_,a,b)=>'<span class="qfrac" dir="ltr"><span>'+ar(a)+'</span><span>'+ar(b)+'</span></span>');
  s=s.replace(/\[sqrt:([^\]]+)\]/g,(_,x)=>'<span class="qsqrt" dir="ltr">√<span>'+ar(x)+'</span></span>');
  // Raw square-root forms: √س, √١٠, √(س+٩). Keep the whole expression isolated.
  s=s.replace(/√\s*([\u0600-\u06FF0-9٠-٩]+|\([^)]*\))/g,(_,x)=>'<span class="qsqrt" dir="ltr">√<span>'+ar(x)+'</span></span>');
  s=s.replace(/([\u0600-\u06FF\w\)]+)\^([0-9٠-٩]+)/g,(_,a,b)=>'<span class="qpow" dir="ltr">'+ar(a)+'<sup>'+ar(b)+'</sup></span>');
  s=s.replace(/([\u0600-\u06FF\w\)]+)([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g,(_,a,b)=>{const m={'⁰':'٠','¹':'١','²':'٢','³':'٣','⁴':'٤','⁵':'٥','⁶':'٦','⁷':'٧','⁸':'٨','⁹':'٩'};return '<span class="qpow" dir="ltr">'+ar(a)+'<sup>'+[...b].map(x=>m[x]||x).join('')+'</sup></span>'});
  // Ratios must keep the written order (e.g. ٥ : ٢), independent of page RTL.
  s=s.replace(/([0-9٠-٩]+)\s*:\s*([0-9٠-٩]+)/g,(_,a,b)=>'<bdi dir="ltr" class="qmathline">'+ar(a)+' : '+ar(b)+'</bdi>');
  // Isolate simple equations without swallowing surrounding Arabic prose.
  s=s.replace(/([√\u0600-\u06FF0-9٠-٩()]+\s*[+−\-×÷]\s*[√\u0600-\u06FF0-9٠-٩()]+\s*=\s*[0-9٠-٩]+)/g,m=>'<bdi dir="ltr" class="qmathline">'+ar(m)+'</bdi>');
  const inferred=!hadVisual?inferShape(original):'';
  return (inferred?inferred:s.startsWith('<div class="qvisual"')?'':inferred)+ar(s)
 }
 window.QudratMath={render,ar};
})();