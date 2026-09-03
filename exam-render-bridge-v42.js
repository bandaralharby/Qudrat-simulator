// v42: intercept only exam display text writes; no observers, no access to lexical exam state.
(function(){
  const desc=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
  if(!desc||!desc.set||!desc.get)return;
  const shouldRenderMath=el=>el && el.nodeType===1 && (el.id==='questionText' || (el.matches && el.matches('#answers button span')));
  const shouldArabicDigits=el=>{
    if(!el||el.nodeType!==1)return false;
    if(el.id==='questionText'||el.id==='timer'||el.id==='sectionTimer'||el.id==='topCounter'||el.id==='counter'||el.id==='sectionLabel'||el.id==='panelSection'||el.id==='quantCount'||el.id==='verbalCount'||el.id==='status')return true;
    if(el.matches&&el.matches('#answers button span,#dots button'))return true;
    return false;
  };
  Object.defineProperty(Node.prototype,'textContent',{
    configurable:true,
    enumerable:desc.enumerable,
    get:desc.get,
    set:function(value){
      try{
        if(shouldRenderMath(this)&&window.QudratMath){
          this.innerHTML=window.QudratMath.render(value);
          return;
        }
        if(shouldArabicDigits(this)&&window.QudratMath){
          value=window.QudratMath.ar(value);
        }
      }catch(e){}
      return desc.set.call(this,value);
    }
  });
})();