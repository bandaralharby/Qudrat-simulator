// v45: keep raw question markup so the safe renderer can draw shapes/math.
(function(){
  window.examText=function(raw){ return String(raw??''); };
  if(typeof window.render==='function'){
    try{ window.render(); }catch(e){ console.error(e); }
  }
})();