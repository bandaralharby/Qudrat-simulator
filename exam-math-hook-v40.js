// Hooks the stable exam renderer without observers or recursive DOM watching.
(function(){
 function decorate(){
  if(!window.QudratMath||!Array.isArray(window.questions))return;
  const q=window.questions[window.current]; if(!q)return;
  const qt=document.getElementById('questionText');
  if(qt) qt.innerHTML=QudratMath.render(q.question_text);
  const spans=document.querySelectorAll('#answers button span');
  spans.forEach((el,i)=>{if(q.choices&&i<q.choices.length)el.innerHTML=QudratMath.render(q.choices[i]);});
 }
 window.addEventListener('load',()=>{
  if(typeof window.render==='function'){
   const stableRender=window.render;
   window.render=function(){stableRender();decorate();};
   decorate();
  }
 });
 window.QudratMathDecorate=decorate;
})();