(function(){
  function bindClose(){
    const btn=document.getElementById('closeNavigatorBtn');
    const nav=document.getElementById('navigator');
    if(!btn||!nav)return;
    btn.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      nav.classList.remove('open');
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindClose);
  else bindClose();
})();