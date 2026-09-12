window.SUPABASE_URL='https://lqvfvpvyzoupdyqahwjy.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY='sb_publishable_k7EwSBL9UTaVL_Zz_oB0Mg_oRXKcQvH';

// توحيد حفظ جلسة الطالب في جميع صفحات الموقع.
// Supabase يستخدم localStorage افتراضياً؛ نثبّت الإعدادات هنا حتى لا تنشئ
// أي صفحة عميل Auth بإعدادات مختلفة.
(function(){
  if(!window.supabase || !window.supabase.createClient) return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  const defaultStorageKey='sb-lqvfvpvyzoupdyqahwjy-auth-token';
  window.supabase.createClient=function(url,key,options){
    const supplied=options||{};
    const suppliedAuth=supplied.auth||{};
    return originalCreateClient(url,key,Object.assign({},supplied,{
      auth:Object.assign({
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true,
        storage:window.localStorage,
        storageKey:defaultStorageKey
      },suppliedAuth)
    }));
  };
})();
