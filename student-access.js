(function(){
  const {createClient}=supabase;
  const authOptions={persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:'sb-lqvfvpvyzoupdyqahwjy-auth-token'};
  const client=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:authOptions});

  function isQuickTrial(){
    return new URLSearchParams(location.search).get('mode')==='devquick';
  }

  async function currentAccess(){
    const {data:{session}}=await client.auth.getSession();
    if(!session || session.user?.is_anonymous) return {loggedIn:false,active:false,session:null,subscription:null};
    const {data,error}=await client.from('subscriptions')
      .select('status,plan,starts_at,ends_at')
      .eq('user_id',session.user.id)
      .maybeSingle();
    if(error) throw error;
    const active=!!data && data.status==='active' && (!data.ends_at || new Date(data.ends_at)>new Date());
    return {loggedIn:true,active,session,subscription:data||null};
  }

  async function requirePaid(){
    if(isQuickTrial()) return true;
    const access=await currentAccess();
    if(!access.loggedIn){
      const next=encodeURIComponent(location.pathname.split('/').pop()+location.search);
      location.replace('login.html?reason=login&next='+next);
      return false;
    }
    if(!access.active){
      location.replace('account.html?needSubscription=1');
      return false;
    }
    return true;
  }

  window.QudratAccess={client,currentAccess,requirePaid,isQuickTrial};
})();