/* EYE SECURE V4 cloud adapter: preserve the V4 UI and map its existing /api calls to Supabase. */
(() => {
  if (!window.supabase || !window.EYE_SECURE_SUPABASE_URL || !window.EYE_SECURE_SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing. Check supabase-config.js'); return;
  }
  const db = window.supabase.createClient(window.EYE_SECURE_SUPABASE_URL, window.EYE_SECURE_SUPABASE_ANON_KEY);
  window.eyeSecureSupabase = db;
  const originalFetch = window.fetch.bind(window);
  const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  const kindFor = segment => segment === 'quotations' ? 'quotation' : segment === 'customers' ? 'customer' : segment === 'products' ? 'product' : null;
  async function records(kind) {
    const {data,error}=await db.from('shared_records').select('record_id,payload,updated_at,created_at').eq('record_type',kind).order('updated_at',{ascending:false});
    if(error) throw error;
    return (data||[]).map(r=>({...r.payload,id:String(r.record_id),createdAt:r.payload?.createdAt||r.created_at,updatedAt:r.payload?.updatedAt||r.updated_at}));
  }
  async function handle(url, init={}) {
    const match=url.pathname.match(/^\/api\/(quotations|customers|products)(?:\/([^/]+))?\/?$/);
    if(!match) return null;
    const collection=match[1], kind=kindFor(collection), id=match[2]?decodeURIComponent(match[2]):null;
    const method=(init.method||'GET').toUpperCase();
    const {data:{session}}=await db.auth.getSession();
    if(!session) return json({error:'Please sign in to access shared records.'},401);
    try {
      if(method==='GET') {
        if(id) { const all=await records(kind); const found=all.find(x=>x.id===id); return found?json(found):json({error:'Record not found'},404); }
        return json(await records(kind));
      }
      if(method==='POST') {
        const input=JSON.parse(init.body||'{}');
        const all=await records(kind);
        const key=(kind==='customer'||kind==='product')?'name':null;
        const existing=all.find(x=>(input.id&&x.id===input.id)||(key&&input[key]&&String(x[key]||'').trim().toLowerCase()===String(input[key]).trim().toLowerCase()));
        const recordId=String(input.id||existing?.id||crypto.randomUUID()), now=new Date().toISOString();
        const payload={...existing,...input,id:recordId,createdAt:existing?.createdAt||now,updatedAt:now};
        const {error}=await db.from('shared_records').upsert({record_type:kind,record_id:recordId,payload,updated_at:now},{onConflict:'record_type,record_id'});
        if(error) throw error;
        return json(payload);
      }
      if(method==='DELETE'&&id) {
        const {error}=await db.from('shared_records').delete().eq('record_type',kind).eq('record_id',id);
        if(error) throw error;
        return json({ok:true});
      }
      return json({error:'Method not allowed'},405);
    } catch(e) { console.error('Supabase operation failed:',e); return json({error:e?.message||'Cloud operation failed'},500); }
  }
  window.fetch=async function(input,init={}) {
    const raw=typeof input==='string'?input:(input instanceof URL?input.href:input.url);
    let url; try { url=new URL(raw,location.origin); } catch { return originalFetch(input,init); }
    if(url.origin===location.origin && url.pathname.startsWith('/api/')) { const result=await handle(url,init); if(result) return result; }
    return originalFetch(input,init);
  };
  const css=`#eyeAuthGate{position:fixed;inset:0;z-index:99999;background:rgba(9,14,24,.94);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit;color:#182033}#eyeAuthGate[hidden]{display:none!important}.eye-auth-card{width:min(440px,100%);background:#fff;border-radius:20px;padding:30px;box-shadow:0 25px 80px #0005}.eye-auth-card h2{margin:0 0 8px;font-size:25px}.eye-auth-card p{color:#657087;line-height:1.5}.eye-auth-card label{display:block;margin:14px 0 6px;font-size:13px;font-weight:700}.eye-auth-card input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #d9deea;border-radius:9px;font:inherit}.eye-auth-card button{cursor:pointer;border:0;border-radius:9px;padding:12px 14px;font:inherit;font-weight:700}.eye-auth-primary{width:100%;margin-top:18px;background:#172033;color:white}.eye-auth-toggle{background:transparent;color:#334f94;margin-top:12px;width:100%}.eye-auth-error{color:#b42318!important;font-size:13px;white-space:pre-wrap}.eye-auth-brand{font-size:12px;letter-spacing:.13em;color:#657087;font-weight:800;margin-bottom:14px}.eye-auth-note{font-size:12px!important}`;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const gate=document.createElement('div');gate.id='eyeAuthGate';gate.hidden=true;gate.innerHTML=`<section class="eye-auth-card"><div class="eye-auth-brand">AKSHAY SOFTWARES</div><h2 id="eyeAuthTitle">Sign in</h2><p>Sign in to use EYE SECURE V4. Signed-in users share quotations, bills, customers and products.</p><form id="eyeAuthForm"><label for="eyeAuthEmail">Email</label><input id="eyeAuthEmail" type="email" autocomplete="email" required placeholder="you@example.com"><label for="eyeAuthPassword">Password</label><input id="eyeAuthPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"><p id="eyeAuthError" class="eye-auth-error" hidden></p><button class="eye-auth-primary" id="eyeAuthSubmit" type="submit">Sign in</button></form><button class="eye-auth-toggle" id="eyeAuthToggle" type="button">New here? Create account</button><p class="eye-auth-note">Records are stored in Supabase and are shared with other authenticated users of this app.</p></section>`;
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.appendChild(gate);
    let mode='in';
    const title=document.getElementById('eyeAuthTitle'), submit=document.getElementById('eyeAuthSubmit'), toggle=document.getElementById('eyeAuthToggle'), err=document.getElementById('eyeAuthError'), form=document.getElementById('eyeAuthForm');
    function showError(message){err.textContent=message;err.hidden=!message;}
    function setMode(next){mode=next;title.textContent=mode==='in'?'Sign in':'Create account';submit.textContent=mode==='in'?'Sign in':'Create account';toggle.textContent=mode==='in'?'New here? Create account':'Already registered? Sign in';document.getElementById('eyeAuthPassword').autocomplete=mode==='in'?'current-password':'new-password';showError('');}
    toggle.addEventListener('click',()=>setMode(mode==='in'?'up':'in'));
    form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;showError('');const email=document.getElementById('eyeAuthEmail').value.trim(),password=document.getElementById('eyeAuthPassword').value;try{const result=mode==='in'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password});if(result.error)throw result.error;if(mode==='up'&&!result.data.session){showError('Check your email to confirm your account, then sign in.');return;}if(result.data.session){gate.hidden=true;setTimeout(()=>window.refreshWorkspace?.(),0);}}catch(error){showError(error.message||'Authentication failed.');}finally{submit.disabled=false;}});
    db.auth.getSession().then(({data,error})=>{if(error)showError(error.message);if(data?.session){gate.hidden=true;setTimeout(()=>window.refreshWorkspace?.(),0);}else gate.hidden=false;});
    db.auth.onAuthStateChange((event,session)=>{if(session){gate.hidden=true;setTimeout(()=>window.refreshWorkspace?.(),0);}else if(event==='SIGNED_OUT')gate.hidden=false;});
    const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';logout.id='eyeAuthSignOut';logout.style.cssText='position:fixed;right:12px;bottom:12px;z-index:1000;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#182033;padding:8px 12px;font-weight:700;cursor:pointer;';logout.addEventListener('click',async()=>{await db.auth.signOut();});document.body.appendChild(logout);
  });
})();
