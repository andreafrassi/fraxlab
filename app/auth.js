"use strict";
/* ================= AUTH (Supabase) =================
   Caricato su ogni pagina PRIMA di core.js.
   Finché le due costanti qui sotto restano vuote il sito funziona come prima
   (tutto visibile): così pubblicare questo file non rompe nulla. Appena le
   compili, scatta il controllo accessi. */
const SUPABASE_URL='';
const SUPABASE_ANON_KEY='';

/* Assegnato anche a window: `const` da solo non crea una proprietà di window,
   e core.js si aspetta di poter fare window.AUTH. */
const AUTH=window.AUTH={ready:false,configured:!!(SUPABASE_URL&&SUPABASE_ANON_KEY),user:null,profile:null,error:null};
const sb=AUTH.configured&&window.supabase
  ? window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY)
  : null;
if(AUTH.configured&&!window.supabase)console.warn('[FraxLab] libreria Supabase non caricata: controllo accessi disattivato.');
if(!sb)AUTH.configured=false;

/* Ogni pagina definisce la propria render() globale: la richiamiamo quando lo
   stato di login cambia, stesso pattern già usato dal click-delegate di core.js. */
function authRerender(){if(typeof render==='function')render();}

async function loadProfile(){
  if(!sb||!AUTH.user){AUTH.profile=null;return;}
  const{data,error}=await sb.from('profiles').select('*').eq('id',AUTH.user.id).single();
  AUTH.profile=error?null:data;
}
async function refreshAuth(){
  if(!sb){AUTH.ready=true;return;}
  const{data}=await sb.auth.getSession();
  AUTH.user=data.session?data.session.user:null;
  await loadProfile();
  AUTH.ready=true;
}

async function authSignUp(email,password){
  if(!sb)return{error:'Login non configurato.'};
  const{error}=await sb.auth.signUp({email,password});
  if(error)return{error:error.message};
  await refreshAuth();authRerender();return{};
}
async function authSignIn(email,password){
  if(!sb)return{error:'Login non configurato.'};
  const{error}=await sb.auth.signInWithPassword({email,password});
  if(error)return{error:error.message};
  await refreshAuth();authRerender();return{};
}
async function authSignOut(){
  if(!sb)return;
  await sb.auth.signOut();
  AUTH.user=null;AUTH.profile=null;
  authRerender();
}

/* Primo controllo al caricamento + reazione a login/logout fatti altrove
   (es. in un'altra scheda del browser). */
if(sb){
  refreshAuth().then(authRerender);
  sb.auth.onAuthStateChange((evt,session)=>{
    const newId=session?session.user.id:null;
    const oldId=AUTH.user?AUTH.user.id:null;
    if(newId===oldId)return;
    AUTH.user=session?session.user:null;
    loadProfile().then(authRerender);
  });
}else{
  AUTH.ready=true;
}
