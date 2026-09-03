// v43: render exam math at write-time; safe, no MutationObserver.
(function(){
  const desc=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
  if(!desc||!desc.set||!desc.get)return;
  const isMathTarget=el=>el&&el.nodeType===1&&(el.id==='questionText'||(el.matches&&el.matches('#answers button span')));
  const isArabicTarget=el=>{
    if(!el||el.nodeType!==1)return false;
    if(['questionText','timer','sectionTimer','topCounter','counter','sectionLabel','panelSection','quantCount','verbalCount','status'].includes(el.id))return true;
    return !!(el.matches&&el.matches('#answers button span,#answers button,#dots button'));
  };
  Object.defineProperty(Node.prototype,'textContent',{
    configurable:true,enumerable:desc.enumerable,get:desc.get,
    set:function(value){
      try{
        if(isMathTarget(this)&&window.QudratMath){this.innerHTML=window.QudratMath.render(String(value??''));return;}
        if(isArabicTarget(this)&&window.QudratMath)value=window.QudratMath.ar(String(value??''));
      }catch(e){}
      return desc.set.call(this,value);
    }
  });
  // Also normalize direct text nodes used by browser/UI after every stable exam render event.
  window.QudratArabicDigits=function(root=document){
    if(!window.QudratMath)return;
    root.querySelectorAll('#answers button span,#questionText,#timer,#sectionTimer,#topCounter,#counter,#dots button').forEach(el=>{
      if(!el.children.length) desc.set.call(el,window.QudratMath.ar(desc.get.call(el)));
    });
  };
})();