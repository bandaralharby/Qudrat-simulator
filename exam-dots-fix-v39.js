// Hotfix v39: restore renderDots removed from exam-v29.js cleanup.
function renderDots(showAll=false){
  const root=document.getElementById('dots');
  if(!root)return;
  root.innerHTML='';
  const list=showAll
    ? questions.map((q,i)=>({q,i}))
    : questions.map((q,i)=>({q,i})).filter(x=>x.q.section===activeSection);
  list.forEach(({q,i})=>{
    const b=document.createElement('button');
    b.type='button';
    b.textContent=String(i+1);
    b.className='questionDot';
    if(i===current)b.classList.add('active');
    if(answers[q.id]!=null)b.classList.add('answered');
    if(flags[q.id])b.classList.add('flagged');
    b.onclick=()=>{current=i;activeSection=q.section;render();closeNavigatorMobile();};
    root.appendChild(b);
  });
}