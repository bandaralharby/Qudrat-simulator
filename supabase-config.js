window.SUPABASE_URL='https://lqvfvpvyzoupdyqahwjy.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY='sb_publishable_k7EwSBL9UTaVL_Zz_oB0Mg_oRXKcQvH';

// عميل Supabase واحد مشترك في كل صفحة مع جلسة دائمة.
(function(){
  if(!window.supabase || !window.supabase.createClient) return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  const storageKey='sb-lqvfvpvyzoupdyqahwjy-auth-token';
  let sharedClient=null;

  function getSharedClient(){
    if(!sharedClient){
      sharedClient=originalCreateClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true,
          storage:window.localStorage,
          storageKey:storageKey
        }
      });
    }
    return sharedClient;
  }

  window.getQudratSupabase=getSharedClient;
  window.supabase.createClient=function(url,key,options){
    if(url===window.SUPABASE_URL && key===window.SUPABASE_PUBLISHABLE_KEY){
      return getSharedClient();
    }
    return originalCreateClient(url,key,options);
  };
})();
