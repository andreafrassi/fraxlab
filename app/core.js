"use strict";
/* ================= FOUNDATION (shared by every page) ================= */
const DATA=window.FANTA_DATA, PLAYERS=DATA.players, STRAT=DATA.strategia;
const byId={}; PLAYERS.forEach(p=>byId[p.id]=p);
const SEASONS=['23/24','24/25','25/26'], ROLES=['P','D','C','A'];
const ROLE_NAME={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};
const ROLE_ONE={P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante'};
const ROSA=STRAT.rosa;
const SLOT_TAGS=[['top','TOP'],['semitop','SEMI-TOP'],['terza','TERZA FASCIA'],['quarta','QUARTA FASCIA'],['scommesse','SCOMMESSE']];
const TAG_COLOR={top:'violet',semitop:'blue',terza:'amber',quarta:'cyan',scommesse:'pink'};
const LEGACY_TAG_MAP={'':'top',prima:'top',sicurezza:'semitop',pianob:'terza',scommessa:'scommesse'};

/* ---- persisted DB ---- */
const LS='fantaasta_v1';
function migrateAuction(a){const b=a.budget||500;
  (a.slots||[]).forEach(sl=>{if(sl.esito&&sl.esito.prezzo!=null&&sl.esito.pct==null){sl.esito.pct=sl.esito.prezzo/b;delete sl.esito.prezzo;}
    if(sl.tag==null||LEGACY_TAG_MAP[sl.tag]!=null)sl.tag=LEGACY_TAG_MAP[sl.tag||'']||'top';
    if(sl.cand&&sl.cand.length>1){const keep=sl.esito&&sl.cand.find(c=>c.pid===sl.esito.pid);sl.cand=[keep||sl.cand[0]];}});
  a.budget=b;delete a.participants;return a;}
function loadDB(){let r;try{r=JSON.parse(localStorage.getItem(LS));}catch(e){}
  if(r&&r.v===2&&r.auctions)return{v:2,auctions:r.auctions.map(migrateAuction),leghe:r.leghe||[]};
  if(r&&r.v===1&&r.auction){const a=Object.assign({id:'a'+Date.now(),name:'La mia asta',slots:r.slots||[],notes:r.notes||{},createdAt:Date.now()},r.auction);return{v:2,auctions:[migrateAuction(a)],leghe:[]};}
  return{v:2,auctions:[],leghe:[]};}
let DB=loadDB();
function save(){localStorage.setItem(LS,JSON.stringify(DB));scheduleCloudPush();}

/* ---- sync cloud (Supabase), best-effort: il sito resta usabile senza ----
   getSyncedAt/setSyncedAt tengono traccia di QUANDO locale e cloud erano
   allineati l'ultima volta, per decidere se al login conviene scaricare i
   dati del cloud (li ho modificati da un altro dispositivo) o caricare i
   miei (il cloud non ha nulla di più recente). */
const SYNC_KEY='fantaasta_v1_syncedAt';
const getSyncedAt=()=>Number(localStorage.getItem(SYNC_KEY)||0);
const setSyncedAt=t=>localStorage.setItem(SYNC_KEY,String(t));
let _cloudSynced=false,_pushTimer=null;
function resetCloudSync(){_cloudSynced=false;}
function scheduleCloudPush(){
  if(!(window.AUTH&&AUTH.configured&&AUTH.user))return;
  clearTimeout(_pushTimer);
  _pushTimer=setTimeout(async()=>{const ok=await cloudPush(DB);if(ok)setSyncedAt(Date.now());},900);
}
const isEmptyDB=d=>!(d&&(((d.auctions||[]).length)||((d.leghe||[]).length)));
function mergeDBs(local,cloud){
  /* Solo per il primissimo sync di un dispositivo: se sia locale che cloud
     hanno già dati reali e non si erano mai parlati prima, uniamo per id
     invece di sceglierne uno a caso e perdere l'altro. A parità di id vince
     la versione locale (quella che l'utente sta guardando in questo momento). */
  const byId=arr=>{const m={};(arr||[]).forEach(x=>{if(x&&x.id)m[x.id]=x;});return m;};
  const auctions=Object.assign({},byId(cloud.auctions),byId(local.auctions));
  const leghe=Object.assign({},byId(cloud.leghe),byId(local.leghe));
  return{v:2,auctions:Object.values(auctions),leghe:Object.values(leghe)};
}
async function syncOnLogin(){
  if(_cloudSynced)return;if(!(window.AUTH&&AUTH.configured&&AUTH.user))return;
  _cloudSynced=true;
  const firstSync=getSyncedAt()===0;
  const row=await cloudPull();
  if(firstSync){
    if(!row||!row.data||isEmptyDB(row.data)){
      if(!isEmptyDB(DB)){const ok=await cloudPush(DB);if(ok)setSyncedAt(Date.now());}
      else if(row)setSyncedAt(new Date(row.updated_at).getTime());
      return;
    }
    if(isEmptyDB(DB)){
      DB=row.data;localStorage.setItem(LS,JSON.stringify(DB));setSyncedAt(new Date(row.updated_at).getTime());
      if(typeof render==='function')render();
      return;
    }
    DB=mergeDBs(DB,row.data);
    localStorage.setItem(LS,JSON.stringify(DB));
    const ok=await cloudPush(DB);
    setSyncedAt(ok?Date.now():new Date(row.updated_at).getTime());
    if(typeof render==='function')render();
    return;
  }
  if(row&&row.data){
    const cloudTs=new Date(row.updated_at).getTime();
    if(cloudTs>getSyncedAt()){
      DB=row.data;localStorage.setItem(LS,JSON.stringify(DB));setSyncedAt(cloudTs);
      if(typeof render==='function')render();
      return;
    }
  }
  const ok=await cloudPush(DB);if(ok)setSyncedAt(Date.now());
}

let _uid=Date.now();const uid=p=>p+(++_uid);

/* ---- runtime state (page scripts may add fields, e.g. R.gf, R.tab) ---- */
let R={search:'',detailId:null,compareId:null};

/* ---- helpers ---- */
const $=s=>document.querySelector(s);
const esc=s=>(s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const A=()=>{const id=new URLSearchParams(location.search).get('id');return(id&&DB.auctions.find(a=>a.id===id))||null;};
const suggPct=p=>(p.qtA||1)/500;
const fmtPct=x=>(x*100).toFixed(1)+'%';
const fmtCredits=x=>Math.round(x*10)/10+'';
const pctFmt=p=>fmtPct(suggPct(p));
/* Le strategie salvano internamente una frazione del budget (es. 0.07 = 7%),
   non un numero di crediti fisso: così cambiare il totale di una strategia da
   500 a 1000 (o viceversa) ricalcola da solo tutti i prezzi già inseriti,
   mantenendo invariata la quota di budget assegnata a ciascun giocatore. */
const contextBudget=()=>{const lg=LG();if(lg)return lg.budget;const a=A();if(a&&a.budget)return a.budget;return STRAT.budget_base||500;};
/* Le quotazioni del listone (qtA) sono calibrate su base 500: per mostrarle
   coerenti anche in una strategia/lega da 1000 crediti si riscalano qui. */
const QT_BASE=STRAT.budget_base||500;
const STRAT_BUDGET=QT_BASE;
const officialCredits=(p,budget)=>{const b=budget!=null?budget:contextBudget();return Math.round((p.qtA||1)*(b/QT_BASE));};
const contextPct=(p,budget)=>{const b=budget!=null?budget:contextBudget();return officialCredits(p,b)/b;};
const pctToCredits=(pct,budget)=>Math.round(pct*(budget!=null?budget:contextBudget()));
const creditsToPct=(cr,budget)=>cr/(budget!=null?budget:contextBudget());
const fmtCr=(pct,budget)=>pctToCredits(pct,budget)+' cr';
const fm=(p,s)=>p.stats&&p.stats[s]?p.stats[s].fm:null;
const st25=(p,k)=>p.stats&&p.stats['25/26']?p.stats['25/26'][k]:null;
function media3(p){const v=SEASONS.map(s=>fm(p,s)).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}
const template=a=>STRAT.template_budget.find(t=>t.id===((a||A()).module))||STRAT.template_budget[1];
function trendMeta(t){switch(t){
  case'crescente':return{a:'↗',c:'up',l:'In crescita'};case'calante':return{a:'↘',c:'dn',l:'In calo'};
  case'stabile':return{a:'→',c:'fl',l:'Stabile'};case'altalenante':return{a:'↕',c:'wv',l:'Altalenante'};
  case'exploit singolo':return{a:'⚡',c:'wv',l:'Exploit singolo'};default:return{a:'·',c:'fl',l:'—'};}}
const FLAG={rigorista:{l:'Rigorista',c:'gold'},crescita:{l:'In crescita',c:'green'},calo:{l:'In calo',c:'red'},
  exploit:{l:'Exploit',c:'gold'},cc_offensivo:{l:'C offensivo',c:'blue'},poco_storico:{l:'Poco storico',c:''}};
const flagsHtml=p=>(p.flags||[]).map(f=>{const m=FLAG[f];return m?`<span class="tag ${m.c}">${m.l}</span>`:'';}).join('');
const MANTRA_LABEL={Por:'Portiere',Dc:'Centrale',Dd:'Terzino dx',Ds:'Terzino sx',B:'Braccetto',E:'Quinto',
  M:'Mediano',C:'Mezzala',T:'Trequartista',W:'Ala',A:'Att. esterno',Pc:'Punta centrale'};
const mantraTags=p=>(p.rm||'').split(';').map(c=>{const l=MANTRA_LABEL[c];
  return l?`<span class="tag blue" style="padding:1px 7px;font-size:10px">${esc(l)}</span>`:'';}).join('');
const MANTRA_ORDER=['Por','Dc','Dd','Ds','B','E','M','C','T','W','A','Pc'];
function mantraCodesFor(arr){
  const set=new Set();
  arr.forEach(p=>(p.rm||'').split(';').forEach(c=>{if(c&&MANTRA_LABEL[c])set.add(c);}));
  return MANTRA_ORDER.filter(c=>set.has(c));
}
const matchMantra=(p,code)=>!code||(p.rm||'').split(';').includes(code);
const tierBadge=t=>t?`<span class="tier tier${t}">${t}</span>`:'';
const CMP_COLORS=['#3b82f6','#f59e0b','#f43f5e','#a78bfa'];
function seasonChart(players){
  players=Array.isArray(players)?players:[players];
  const multi=players.length>1;
  const all=[];
  players.forEach(p=>SEASONS.forEach(s=>{const f=fm(p,s);if(f!=null)all.push(f);
    if(!multi){const d=p.stats[s];if(d&&d.mv!=null)all.push(d.mv);}}));
  if(!all.length) return '';
  let mn=Math.floor(Math.min(...all)-0.3),mx=Math.ceil(Math.max(...all)+0.3);const rg=(mx-mn)||1;
  const W=320,H=150,padL=10,padR=10,padT=16,padB=22,iw=W-padL-padR,ih=H-padT-padB,n=SEASONS.length;
  const xp=i=>padL+(n>1?i/(n-1)*iw:iw/2),yp=v=>padT+ih-((v-mn)/rg)*ih;
  const grid=[0,.25,.5,.75,1].map(t=>{const y=(padT+t*ih).toFixed(1);return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#282e37" stroke-width="1"/>`;}).join('');
  function lineFm(p,col,fillId){
    const pts=[];SEASONS.forEach((s,i)=>{const v=fm(p,s);if(v==null)return;pts.push([xp(i),yp(v),v]);});
    if(!pts.length)return '';
    const d=pts.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
    const dots=pts.map(pt=>`<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="3.2" fill="${col}"/><text x="${pt[0].toFixed(1)}" y="${(pt[1]-7).toFixed(1)}" fill="${col}" font-size="10" font-weight="700" text-anchor="middle">${pt[2].toFixed(2)}</text>`).join('');
    const area=fillId?`<path d="${d} L ${pts[pts.length-1][0].toFixed(1)} ${(padT+ih).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(padT+ih).toFixed(1)} Z" fill="url(#${fillId})" opacity=".22"/>`:'';
    return area+`<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  }
  function lineMv(p,col){
    const pts=[];SEASONS.forEach((s,i)=>{const d=p.stats[s],v=d?d.mv:null;if(v==null)return;pts.push([xp(i),yp(v)]);});
    if(!pts.length)return '';
    const d=pts.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
    const dots=pts.map(pt=>`<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="3.2" fill="${col}"/>`).join('');
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  }
  const xl=SEASONS.map((s,i)=>`<text x="${xp(i).toFixed(1)}" y="${H-6}" fill="#8b93a0" font-size="10" text-anchor="middle">${s}</text>`).join('');
  const body=multi?players.map((p,i)=>lineFm(p,CMP_COLORS[i%CMP_COLORS.length])).join(''):(lineMv(players[0],'#34d399')+lineFm(players[0],'#3b82f6','fmg'));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
    <defs><linearGradient id="fmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
    ${grid}${body}${xl}</svg>`;
}

/* ---- slots ---- */
function slotOf(pid){const a=A();return a&&a.slots.find(sl=>sl.cand.some(c=>c.pid===pid));}
function addSlot(pid,opts){const a=A(),p=byId[pid];if(!a||!p||slotOf(pid))return;
  const pct=opts&&opts.pct!=null&&!isNaN(opts.pct)?opts.pct:suggPct(p);
  a.slots.push({id:uid('s'),r:p.r,tag:(opts&&opts.tag)||'top',cand:[{pid,pct,note:''}],esito:null});save();}
function removeCand(sid,pid){const a=A(),sl=a&&a.slots.find(x=>x.id===sid);if(!sl)return;sl.cand=sl.cand.filter(c=>c.pid!==pid);if(!sl.cand.length)a.slots=a.slots.filter(x=>x.id!==sid);save();}
function budgetStats(a){a=a||A();let speso=0,impegnato=0;const per={P:{pl:0,got:0},D:{pl:0,got:0},C:{pl:0,got:0},A:{pl:0,got:0}};
  a.slots.forEach(sl=>{const RR=per[sl.r];if(!RR)return;if(sl.esito){speso+=sl.esito.pct;RR.pl+=sl.esito.pct;RR.got++;}else{const v=sl.cand[0].pct;impegnato+=v;RR.pl+=v;}});
  return{speso,impegnato,residuo:1-speso,dopo:1-speso-impegnato,per,got:per.P.got+per.D.got+per.C.got+per.A.got};}

/* ---- leghe (asta live multi-squadra) ---- */
const LG=()=>{const id=new URLSearchParams(location.search).get('id');return(id&&DB.leghe.find(l=>l.id===id))||null;};
function newTeams(n,startAt){startAt=startAt||0;const out=[];for(let i=0;i<n;i++)out.push({id:uid('t'),name:'Squadra '+(startAt+i+1)});return out;}
function teamStats(lg,teamId){let speso=0,count=0;Object.values(lg.assign).forEach(a=>{if(a.teamId===teamId){speso+=a.price;count++;}});
  return{speso,residuo:lg.budget-speso,count};}
function teamRoleCount(lg,teamId,role,excludePid){let n=0;Object.entries(lg.assign).forEach(([pid,a])=>{
  if(a.teamId===teamId&&+pid!==excludePid){const p=byId[+pid];if(p&&p.r===role)n++;}});return n;}
function assignedTeamOf(lg,pid){const a=lg.assign[pid];return a&&lg.teams.find(t=>t.id===a.teamId);}
function assignPlayer(lg,pid,teamId,price){lg.assign[pid]={teamId,price:isNaN(price)?0:price};save();}
function unassignPlayer(lg,pid){delete lg.assign[pid];save();}
function legaAssignedCount(lg){return Object.keys(lg.assign).length;}

/* ---- icons ---- */
const IC={
  flask:'<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
  dash:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  list:'<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></svg>',
  team:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gavel:'<svg viewBox="0 0 24 24"><path d="M14 5l5 5M2 22l7-7M8.5 12.5l3-3 5 5-3 3zM15.5 3.5l5 5-2 2-5-5z"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h13"/></svg>',
  wand:'<svg viewBox="0 0 24 24"><path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18 3l-1.5 1.5M18 9l-1.5-1.5M4 20l10-10"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  fwd:'<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>',
  empty:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21.5h4M12 2.5a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.4 1.3 2.4h5c0-1 .5-1.7 1.3-2.4A6 6 0 0 0 12 2.5z"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7c1.7 0 3.2.4 4.5 1M22 12s-3.6 7-10 7c-1.7 0-3.2-.4-4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/></svg>',
  pitch:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3.2"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.1-8 11-4.6-1.9-8-6-8-11V5z"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="1"/></svg>'
};
const SIC={
  eta:'<svg viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="2.5"/><path d="M3.5 13.5a4.5 4.5 0 0 1 9 0"/></svg>',
  mv:'<svg viewBox="0 0 16 16"><path d="M8 2l1.6 3.6 3.9.4-3 2.6.9 3.8L8 10.8 4.6 12.4l.9-3.8-3-2.6 3.9-.4z"/></svg>',
  fm:'<svg viewBox="0 0 16 16"><path d="M9 2L4 9h3.5L7 14l5-7H8.5z"/></svg>',
  gf:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 5l2.4 1.7-.9 2.8H6.5l-.9-2.8z"/></svg>',
  gs:'<svg viewBox="0 0 16 16"><rect x="2.5" y="4.5" width="11" height="7.5" rx="1"/><path d="M2.5 7.5h11M6 4.5v7.5M10 4.5v7.5"/></svg>',
  ass:'<svg viewBox="0 0 16 16"><path d="M3 8h8M8 5l3 3-3 3"/></svg>',
  rp:'<svg viewBox="0 0 16 16"><path d="M5 8.5V5.5a1 1 0 0 1 2 0V8M7 8V4.5a1 1 0 0 1 2 0V8M9 8V6a1 1 0 0 1 2 0v3.5a3.5 3.5 0 0 1-6.5 1.8L3.4 10a1 1 0 0 1 1.4-1.4z"/></svg>',
  pr:'<svg viewBox="0 0 16 16"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M6 2v3M10 2v3"/></svg>',
  fvm:'<svg viewBox="0 0 16 16"><path d="M2.5 13.5v-4M6.5 13.5v-7M10.5 13.5v-9M14.5 13.5V6"/></svg>',
  trophy:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v7M6 6.3c0-.9.9-1.4 2-1.4s2 .5 2 1.3c0 1.7-4 .8-4 2.5 0 .8.9 1.3 2 1.3s2-.5 2-1.4"/></svg>',
  qt:'<svg viewBox="0 0 16 16"><path d="M2 8.3V3a1 1 0 0 1 1-1h5.3a1 1 0 0 1 .7.3L13.7 7a1 1 0 0 1 0 1.4L8.9 13.2a1 1 0 0 1-1.4 0L2.3 8.9A1 1 0 0 1 2 8.3z"/><circle cx="5.2" cy="5.2" r="1"/></svg>'
};
const GIORNATE=38,TBAR_SEGS=5;
function titIdx(p){return p.titProb==null?null:p.titProb;}
function titBar(p){
  const t=titIdx(p);if(t==null)return'';
  const filled=Math.max(0,Math.min(TBAR_SEGS,Math.round(t/100*TBAR_SEGS)));
  const tier=t>=65?'green':t>=30?'amber':'red';
  const bars=Array.from({length:TBAR_SEGS},(_,i)=>`<i class="seg${i<filled?' on':''}"></i>`).join('');
  const fonte=p.titFonte?esc(p.titFonte):'';
  return `<span class="tbar ${tier}" title="Titolarità 2026/27: ${t}%${fonte?' — '+fonte:''}"><span class="bars">${bars}</span><b>${t}%</b></span>`;
}
/* "Performance": quanto bene un giocatore può rendere nella stagione 2026/27
   (gol/assist/bonus attesi, non solo se gioca) — stimato per ruolo da fonti
   reali (Sky Sport, Fantacalcio.it, DAZN, ecc.), non calcolato dall'FVM. */
function perfIdx(p){return p.perfProb==null?null:p.perfProb;}
function auctionBadge(p){
  const prev=EALLORACHECCAZZO_PREV&&EALLORACHECCAZZO_PREV[p.id];
  if(!prev)return'';
  const[team,costo]=prev;
  /* Quella lega aveva 1000 crediti: il prezzo va riportato sulla base 500
     usata ovunque nell'app, altrimenti non è confrontabile con le quotazioni. */
  const pct=costo/1000,cr=pctToCredits(pct);
  return `<span class="tag gold" title="Pagato da ${esc(team)} nell'asta Ealloracheccazzo 25/26: ${costo} crediti su 1000, cioè il ${esc(fmtPct(pct))} del budget (${cr} cr su base ${contextBudget()})">${SIC.trophy}Prezzo Ealloracheccazzo 25/26<b>${fmtPct(pct)} · ${cr} cr</b></span>`;
}
function portiereBadge(p){
  const g=window.GRIGLIA_PORTIERI&&GRIGLIA_PORTIERI[p.sq];
  if(!g)return'';
  const cls=g.tier==='best'?'green':'blue';
  const label=g.tier==='best'?'Abbinamento ideale':'Buon abbinamento';
  return `<span class="tag ${cls}" title="Griglia portieri 2026/27: con ${esc(g.team)} si sovrappongono solo ${g.overlap} partite in casa su 38 giornate">${esc(label)}: ${esc(g.team)}</span>`;
}

/* ================= ACCESS CONTROL =================
   Se Supabase non è configurato (AUTH.configured false) tutto resta visibile
   come prima: il sito non si blocca da solo per una svista di setup. */
const isAdmin=()=>!!(window.AUTH&&AUTH.profile&&AUTH.profile.is_admin);
/* Chiunque può usare l'app e vedere nome/squadra/ruolo dei giocatori.
   Statistiche, quotazioni e scheda dettaglio sono riservate agli approvati. */
function canViewStats(){
  if(!window.AUTH||!AUTH.configured)return true;
  if(!AUTH.ready)return false;
  return !!(AUTH.profile&&(AUTH.profile.can_view_players||AUTH.profile.is_admin));
}
/* Stato leggibile per decidere il messaggio da mostrare. */
function accessState(){
  if(!window.AUTH||!AUTH.configured)return'ok';
  if(!AUTH.ready)return'loading';
  if(!AUTH.user)return'anon';
  if(AUTH.profile&&(AUTH.profile.can_view_players||AUTH.profile.is_admin))return'ok';
  return'pending';
}
/* Banner discreto in cima alle pagine con giocatori. */
function statsNotice(){
  if(canViewStats())return'';
  const s=accessState();
  if(s==='loading')return'';
  if(s==='anon')return`<div class="stats-notice">${IC.lock}
    <div><b>Statistiche e quotazioni nascoste.</b> Accedi e fatti approvare per vederle.</div>
    <button class="btn sm primary" data-act="account">Accedi</button></div>`;
  return`<div class="stats-notice">${IC.clock}
    <div><b>Statistiche e quotazioni nascoste.</b> Il tuo accesso è in attesa di approvazione.</div></div>`;
}
/* Modale mostrata quando un non approvato prova ad aprire la scheda giocatore. */
function statsBlockedHtml(){
  const s=accessState();
  const head=`<div class="between" style="margin-bottom:14px"><h3 style="margin:0">Scheda riservata</h3>
    <button class="iconbtn" data-act="close" aria-label="Chiudi">${IC.close}</button></div>`;
  if(s==='anon')return`${head}
    <div style="margin-bottom:12px">Le schede con statistiche, quotazioni e andamento sono riservate.</div>
    <div class="faint small">Registrati e chiedi l'accesso: verrà approvato manualmente.</div>
    <button class="btn primary" data-act="account" style="margin-top:16px">Accedi o registrati</button>`;
  return`${head}
    <div style="margin-bottom:12px">Le schede con statistiche e quotazioni sono riservate.</div>
    <div class="faint small">Il tuo account è registrato: appena viene approvato potrai aprirle.</div>`;
}
function authModalHtml(msg){
  const head=`<div class="between" style="margin-bottom:14px"><h3 style="margin:0">Il tuo account</h3>
    <button class="iconbtn" data-act="close" aria-label="Chiudi">${IC.close}</button></div>`;
  if(!window.AUTH||!AUTH.configured)return`${head}<div class="faint small">Il login non è ancora configurato su questo sito.</div>`;
  if(AUTH.user){
    const st=accessState();
    const badge=st==='ok'
      ?`<span class="tag green">accesso completo</span>`
      :`<span class="tag amber">in attesa di approvazione</span>`;
    return`${head}
      <div class="field"><label>Sei collegato come</label><div><b>${esc(AUTH.user.email||'')}</b></div></div>
      <div class="field"><label>Stato</label><div>${badge}${isAdmin()?' <span class="tag violet">admin</span>':''}</div></div>
      ${st==='ok'?'':`<div class="faint small" style="margin-bottom:14px">L'amministratore deve approvare il tuo account prima che tu possa vedere i dati dei giocatori.</div>`}
      ${isAdmin()?`<a class="btn" href="admin.html" style="margin-bottom:8px">${IC.shield} Pannello admin</a>`:''}
      <button class="btn" data-act="signout">Esci</button>`;
  }
  return`${head}
    ${msg?`<div class="tag red" style="display:block;margin-bottom:12px;padding:8px 10px">${esc(msg)}</div>`:''}
    <div class="field"><label for="au-email">Email</label>
      <input class="input" id="au-email" type="email" autocomplete="email" placeholder="tua@email.it"></div>
    <div class="field"><label for="au-pass">Password</label>
      <input class="input" id="au-pass" type="password" autocomplete="current-password" placeholder="almeno 6 caratteri"></div>
    <div class="row" style="gap:8px">
      <button class="btn primary" data-act="signin">Accedi</button>
      <button class="btn" data-act="signup">Registrati</button>
    </div>
    <div class="faint small" style="margin-top:12px">Dopo la registrazione l'accesso ai dati dei giocatori va approvato manualmente.</div>`;
}
function openAuthModal(msg){openModal(authModalHtml(msg));}
function confirmSentHtml(email){
  return `<div class="between" style="margin-bottom:14px"><h3 style="margin:0">Controlla la posta</h3>
    <button class="iconbtn" data-act="close" aria-label="Chiudi">${IC.close}</button></div>
    <div style="margin-bottom:12px">Ti abbiamo scritto a <b>${esc(email||'')}</b>.</div>
    <div class="faint small">Apri il link nell'email per confermare l'indirizzo, poi torna qui e accedi.
    Dopo l'accesso l'amministratore dovrà approvarti per vedere i dati dei giocatori.</div>
    <button class="btn" data-act="account" style="margin-top:16px">Ho confermato, accedi</button>`;
}

/* ================= SHARED CHROME ================= */
const NAVPAGES=[
  {key:'aste',href:'aste.html',label:'Le tue strategie'},
  {key:'listone',href:'listone.html',label:'Il listone'}
];
function initials(email){
  const n=(email||'').split('@')[0].replace(/[._-]+/g,' ').trim().split(/\s+/);
  return((n[0]||'?')[0]+(n[1]?n[1][0]:'')).toUpperCase();
}
function avatarLabel(){
  if(!window.AUTH||!AUTH.configured)return'AF';
  if(!AUTH.ready)return'·';
  return AUTH.user?esc(initials(AUTH.user.email)):IC.lock;
}
function avatarTitle(){
  const s=accessState();
  if(s==='anon')return'Accedi o registrati';
  if(s==='pending')return'Accesso in attesa di approvazione';
  return window.AUTH&&AUTH.user?(AUTH.user.email||'Account'):'Account';
}
function renderTop(activeKey){
  const a=A();
  const logo=`<a class="logo" href="index.html"><span class="mark">${IC.flask}</span> Frax<b>Lab</b></a>`;
  const nav=`<nav class="topnav"><a class="topnav-item cta${activeKey==='leghe'?' on':''}" href="leghe.html">${IC.gavel} Asta</a>`
    +NAVPAGES.map(n=>`<a class="topnav-item${n.key===activeKey?' on':''}" href="${n.href}">${esc(n.label)}</a>`).join('')
    +(isAdmin()?`<a class="topnav-item${activeKey==='admin'?' on':''}" href="admin.html">Admin</a>`:'')+`</nav>`;
  const search=`<div class="search"><span class="ic">${IC.search}</span>
      <input id="gsearch" placeholder="Cerca giocatore…" value="${esc(R.search)}" autocomplete="off" aria-label="Cerca giocatore">
      <div id="sres"></div></div>`;
  const right=`<div class="tb-right">`
    +(a?`<div class="budgetpill tag blue">Residuo ${fmtCr(budgetStats(a).residuo)}</div>`
        +`<a class="backbtn" href="aste.html">${IC.back} Strategie</a>`:'')
    +`<button class="avatar" data-act="account" title="${esc(avatarTitle())}" aria-label="Account">${avatarLabel()}</button></div>`;
  $('#topbar').innerHTML=logo+nav+search+right;
  const gi=$('#gsearch');if(gi){gi.addEventListener('input',e=>{R.search=e.target.value;renderSearch();});
    gi.addEventListener('focus',renderSearch);}
}
function renderSearch(){
  const box=$('#sres'); if(!box)return;
  const q=R.search.trim().toLowerCase();
  if(q.length<2){box.innerHTML='';return;}
  const arr=PLAYERS.filter(p=>p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q)).slice(0,8);
  if(!arr.length){box.innerHTML='';return;}
  box.className='sresults';
  box.innerHTML=arr.map(p=>`<div class="pcard" data-open="${p.id}"><span class="chip ${p.r}">${p.r}</span>
    <div><div class="nm">${esc(p.nome)}</div><div class="mt">${esc(p.sq)}</div></div><div class="push"></div>
    ${canViewStats()?`<div class="qt num">${pctFmt(p)}</div><div class="faint small">valore</div>`:''}</div>`).join('');
}

/* ---- listone helpers (shared: listone page + in-workspace player picker) ---- */
/* media pesata sulle presenze: pochi voti "fortunati" non scavalcano chi ha giocato tante partite */
const PRIOR_GAMES=10;
function leagueAvg(key){const vals=[];PLAYERS.forEach(p=>{const v=st25(p,key);if(v!=null)vals.push(v);});
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:6;}
const LEAGUE_AVG={mv:leagueAvg('mv'),fm:leagueAvg('fm')};
function weightedStat(p,key){const v=st25(p,key),games=st25(p,'pv');
  if(v==null)return-Infinity;
  return((games||0)*v+PRIOR_GAMES*LEAGUE_AVG[key])/((games||0)+PRIOR_GAMES);}
function sortArr(arr,s){arr.sort((a,b)=>{
  if(s==='qt')return(b.qtA||0)-(a.qtA||0); if(s==='fvm')return(b.fvm||0)-(a.fvm||0);
  if(s==='fm')return weightedStat(b,'fm')-weightedStat(a,'fm'); if(s==='mv')return weightedStat(b,'mv')-weightedStat(a,'mv');
  if(s==='gf')return(st25(b,'gf')||0)-(st25(a,'gf')||0); if(s==='media3')return media3(b)-media3(a);
  if(s==='pv')return(st25(b,'pv')||0)-(st25(a,'pv')||0); if(s==='tit')return(titIdx(b)||0)-(titIdx(a)||0);
  if(s==='nome')return a.nome.localeCompare(b.nome);return 0;});return arr;}
const SORTS=[['qt','Quotazione'],['tit','Titolarità'],['media3','Media 3 stagioni'],['fm','Fantamedia 25/26'],['mv','Media voto 25/26'],['gf','Gol 25/26'],['pv','Presenze 25/26'],['fvm','FVM'],['nome','Nome']];
const PHOTOS=new Set(window.PLAYER_PHOTOS||[]);
const playerAvatar=p=>PHOTOS.has(p.id)
  ?`<span class="pavatar"><img src="img/players/${p.id}.webp" alt="" loading="lazy"></span>`
  :`<span class="chip ${p.r}">${p.r}</span>`;
function previewCard(p,extra,showMantra,targetPct,hideQt,cardCls,fasciaLabel){
  const mv=st25(p,'mv'),f=fm(p,'25/26'),pv=st25(p,'pv'),isP=p.r==='P';
  const inA=!!A(),inSlot=inA&&slotOf(p.id);
  const sp=(ic,l,v)=>(v==null||v==='')?'':`<span class="sp" title="${l}">${SIC[ic]||''}${l}<b>${v}</b></span>`;
  const c1=isP?sp('gs','Gol subiti',st25(p,'gs')):sp('gf','Gol',st25(p,'gf'));
  const c2=isP?sp('rp','Rig. parati',st25(p,'rp')):sp('ass','Assist',st25(p,'ass'));
  const sband=auctionBadge(p);
  const pband=isP?portiereBadge(p):'';
  const budget=contextBudget();
  /* "Il tuo prezzo" (quanto avevi previsto di spendere nella tua strategia) non
     sta più tra le altre statistiche: è un riquadro accanto al nome, per farlo
     risaltare rispetto al resto. Quando non c'è una strategia (targetPct null)
     resta la normale quotazione tra le statistiche, come prima. */
  const qtBadge=(hideQt||targetPct!=null)?'':sp('qt','Quotazione',`${fmtPct(contextPct(p,budget))} · ${officialCredits(p,budget)} cr`);
  const myPriceBox=(!hideQt&&targetPct!=null)?`<span class="tc-price-box num" title="Quanto avevi deciso di spendere nella tua strategia">${pctToCredits(targetPct)}</span>`:'';
  /* Ai non approvati resta solo l'identità: niente numeri, niente fascia.
     Il prezzo deciso da loro nella propria strategia però resta visibile. */
  const full=canViewStats();
  const stats=full
    ?[qtBadge,sp('eta','Età',p.age),sp('mv','Voto',mv!=null?mv.toFixed(2):null),sp('fm','Fantamedia',f!=null?f.toFixed(2):null),
      c1,c2,sp('pr','Presenze',pv),titBar(p),sp('fvm','FVM',p.fvm!=null?fmtPct(p.fvm/1000):null),sband,pband].join('')
    :'';
  const tier=full&&p.tiers['25/26']?tierBadge(p.tiers['25/26']):'';
  const fasciaHtml=fasciaLabel?`<div class="fascia-stripe" aria-hidden="true"><span>${esc(fasciaLabel)}</span></div>`:'';
  return `<div class="pcard${cardCls?' '+cardCls:''}" data-open="${p.id}">${fasciaHtml}${showMantra?playerAvatar(p):`<span class="chip ${p.r}">${p.r}</span>`}
    <div class="pmid"><div class="pname">${esc(p.nome)}${myPriceBox}
      ${p.flags.includes('rigorista')?'<span class="tag gold" style="padding:1px 6px">rig</span>':''}</div>
      <div class="pmeta">${esc(p.sq)}${!showMantra&&tier?' · '+tier:''}</div>
      ${showMantra?`<div class="pmantra row" style="gap:4px;flex-wrap:wrap;margin-top:3px">${mantraTags(p)}</div>`:''}
      <div class="statline">${stats}</div></div>
    ${inA?`<button class="iconbtn" data-add="${p.id}" ${inSlot?'style="color:var(--accent);border-color:var(--accent)"':''} title="${inSlot?'Rimuovi dalla strategia':'Salva'}">${inSlot?IC.minus:IC.plus}</button>`:''}${extra||''}</div>`;
}

/* ================= TEAM FORMATIONS (shared, works on every page) ================= */
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
function matchFormPlayer(sq,name){
  const want=norm(name),cands=PLAYERS.filter(p=>p.sq===sq);
  return cands.find(p=>norm(p.nome)===want)||cands.find(p=>norm(p.nome).startsWith(want)||want.startsWith(norm(p.nome)))
    ||PLAYERS.find(p=>norm(p.nome)===want)||null;
}
const SPEC_ICON={
  rigoristi:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/></svg>',
  punizioni:'<svg viewBox="0 0 24 24"><path d="M4 20c4-1 5-9 9-11M4 20c1-4 9-5 11-9"/><circle cx="18.5" cy="5.5" r="2.3"/></svg>',
  angoli:'<svg viewBox="0 0 24 24"><path d="M4 3v18M4 3h9l-3 3.2L13 9.4H4"/></svg>',
  ballottaggi:'<svg viewBox="0 0 24 24"><path d="M6 3v11a3 3 0 0 0 6 0V3M18 3v11a3 3 0 0 1-6 0"/><path d="M3 3h6M15 3h6"/></svg>'
};
function pitchChip(sq,name,fallbackRole){
  const p=matchFormPlayer(sq,name);
  if(!p)return `<div class="pchip nodata" title="Non trovato nel listone"><div class="pchip-av ${fallbackRole}">${fallbackRole}</div><div class="pchip-nm">${esc(name)}</div></div>`;
  return `<div class="pchip" data-open="${p.id}" title="${esc(p.nome)} · ${esc(p.sq)}"><div class="pchip-av ${p.r}">${p.r}</div><div class="pchip-nm">${esc(p.nome)}</div></div>`;
}
function midRows(fm){
  const parts=fm.formation.split('-').map(Number);
  if(parts.length===4)return[fm.mid.slice(0,parts[2]),fm.mid.slice(parts[2])];
  return[fm.mid];
}
function specList(sq,names){
  if(!names||!names.length)return '<div class="faint small">—</div>';
  const ord=['1ª scelta','2ª scelta','3ª scelta'];
  return `<div class="spec-list">${names.map((n,i)=>{
    const p=matchFormPlayer(sq,n);
    return `<div class="spec-row" ${p?`data-open="${p.id}"`:''}>
      <span class="spec-rank">${i+1}</span>
      ${p?`<span class="pchip-r ${p.r}">${p.r}</span>`:''}
      <span class="spec-name">${esc(n)}</span>
      <span class="faint" style="font-size:10px;margin-left:auto">${ord[i]||''}</span>
    </div>`;
  }).join('')}</div>`;
}
function duelList(sq,pairs){
  if(!pairs||!pairs.length)return '<div class="faint small">Nessun ballottaggio aperto</div>';
  return `<div class="duel-list">${pairs.map(([nameA,pctA,nameB,pctB])=>{
    const pA=matchFormPlayer(sq,nameA),pB=matchFormPlayer(sq,nameB);
    return `<div class="duel-row">
      <div class="duel-name l" ${pA?`data-open="${pA.id}"`:''}><b>${pctA}%</b> ${esc(nameA)}</div>
      <div class="duel-track"><i style="width:${pctA}%"></i></div>
      <div class="duel-name r" ${pB?`data-open="${pB.id}"`:''}>${esc(nameB)} <b>${pctB}%</b></div>
    </div>`;
  }).join('')}</div>`;
}
const FORM_EXTRA_TEAMS=[];
function viewFormazioni(){
  const serieA=[...new Set(PLAYERS.map(p=>p.sq))].sort();
  const withData=serieA.filter(t=>TEAM_FORMATIONS[t]);
  const noData=serieA.filter(t=>!TEAM_FORMATIONS[t]);
  const allTeams=withData.concat(FORM_EXTRA_TEAMS).sort();
  if(!R.formTeam||!allTeams.includes(R.formTeam))R.formTeam=withData[0];
  const sel=R.formTeam,fm=TEAM_FORMATIONS[sel],isExtra=FORM_EXTRA_TEAMS.includes(sel);
  return `<div class="sec-title">Formazioni squadre</div>
  <div class="form-team-select">${allTeams.map(t=>`<button class="form-team-btn ${t===sel?'active':''} ${FORM_EXTRA_TEAMS.includes(t)?'extra':''}" data-formteam="${esc(t)}" ${FORM_EXTRA_TEAMS.includes(t)?'title="Non è una squadra di Serie A 2025/26"':''}>${esc(t)}</button>`).join('')}</div>
  ${isExtra?`<div class="faint small" style="margin:-8px 0 14px">${esc(sel)} non gioca in Serie A 2025/26: i dati sono a scopo di riferimento e i giocatori non sono collegati al listone (non troverai le loro schede).</div>`:''}
  ${fm?`<div class="pitch-panel">
    <div class="pitch-field">
      <div class="pitch-formation">${esc(fm.formation)}</div>
      <div class="pitch-markings">
        <div class="pm-circle"></div><div class="pm-halfway"></div>
        <div class="pm-box"></div><div class="pm-arc pm-arc-l"></div><div class="pm-arc pm-arc-r"></div>
      </div>
      <div class="pitch-row">${fm.att.map(n=>pitchChip(sel,n,'A')).join('')}</div>
      ${midRows(fm).map(row=>`<div class="pitch-row">${row.map(n=>pitchChip(sel,n,'C')).join('')}</div>`).join('')}
      <div class="pitch-row">${fm.def.map(n=>pitchChip(sel,n,'D')).join('')}</div>
      <div class="pitch-row gk-row">${fm.gk.map(n=>pitchChip(sel,n,'P')).join('')}</div>
    </div>
    <div class="pitch-side">
      <div class="pitch-coach"><span class="faint small">Allenatore</span><b>${esc(fm.coach)}</b></div>
      <div class="pitch-spec"><div class="pitch-spec-label">${SPEC_ICON.rigoristi}Rigoristi</div>${specList(sel,fm.rigoristi)}</div>
      <div class="pitch-spec"><div class="pitch-spec-label">${SPEC_ICON.punizioni}Punizioni</div>${specList(sel,fm.punizioni)}</div>
      <div class="pitch-spec"><div class="pitch-spec-label">${SPEC_ICON.angoli}Calci d'angolo</div>${specList(sel,fm.angoli)}</div>
    </div>
  </div>
  <div class="pitch-spec" style="margin-top:14px">
    <div class="pitch-spec-label">${SPEC_ICON.ballottaggi}Ballottaggi</div>
    ${duelList(sel,fm.ballottaggi)}
  </div>`:`<div class="faint small" style="padding:20px 0">Dati non ancora disponibili per ${esc(sel)}: FantaLab non ha ancora pubblicato la guida per questa squadra (probabilmente neopromossa).</div>`}`;
}

/* ================= PLAYER DETAIL MODAL (shared, works on every page) ================= */
function openModal(html){$('#modalRoot').innerHTML=`<div class="overlay"><div class="sheet"><div class="grip"></div>${html}</div></div>`;}
function closeModal(){$('#modalRoot').innerHTML='';}
function detailHtml(pid){
  const p=byId[pid];if(!p)return'';const tm=trendMeta(p.trend);const isP=p.r==='P';
  const heads=isP?['G.sub','R.par','Amm']:['Gol','Ass','Rig'];
  const cells=d=>isP?`<td class="num">${d.gs??0}</td><td class="num">${d.rp??0}</td><td class="num">${d.amm??0}</td>`
    :`<td class="num">${d.gf??0}</td><td class="num">${d.ass??0}</td><td class="num">${d.rt?d.rs+'/'+d.rt:'—'}</td>`;
  const strows=SEASONS.map(s=>{const d=p.stats[s];if(!d)return `<tr><td>${s}</td><td colspan="6" class="faint">—</td></tr>`;
    return `<tr><td>${s}</td><td class="num">${d.pv??'—'}</td><td class="num">${d.mv!=null?d.mv.toFixed(2):'—'}</td>
      <td class="num">${d.fm!=null?d.fm.toFixed(2):'—'} ${tierBadge(p.tiers[s])}</td>${cells(d)}</tr>`;}).join('');
  const canAdd=!!A(),inSlot=canAdd&&slotOf(p.id),candForP=inSlot?inSlot.cand.find(c=>c.pid===p.id):null;
  const cmp=R.compareId?byId[R.compareId]:null;
  const chartPlayers=cmp?[p,cmp]:[p];
  const chartSvg=seasonChart(chartPlayers);
  const legend=cmp
    ?chartPlayers.map((pp,i)=>`<span style="color:${CMP_COLORS[i%CMP_COLORS.length]}">●&nbsp;${esc(pp.nome)}</span>`).join('')
    :`<span style="color:#3b82f6">●&nbsp;Fantamedia</span><span style="color:#34d399">●&nbsp;Media voto</span>`;
  const cmpOpts=PLAYERS.filter(pp=>pp.r===p.r&&pp.id!==p.id).slice().sort((a,b)=>a.nome.localeCompare(b.nome));
  return `<div class="between" style="margin-bottom:4px"><div class="row"><span class="chip ${p.r}" style="width:28px;height:28px;font-size:13px">${p.r}</span>
      <div><h2 style="font-size:19px">${esc(p.nome)}</h2><div class="muted small">${esc(p.sq)} · Mantra: ${esc(p.rm)}</div>
      ${auctionBadge(p)?`<div style="margin-top:6px">${auctionBadge(p)}</div>`:''}</div></div>
    <button class="iconbtn" data-act="close">${IC.close}</button></div>
  <div style="margin:10px 0">${flagsHtml(p)||'<span class="faint small">—</span>'}</div>
  <div class="grid4" style="margin:14px 0">
    <div class="kpi"><div class="v num">${pctFmt(p)}</div><div class="l">Quotazione</div></div>
    <div class="kpi"><div class="v num">${p.fvm!=null?fmtPct(p.fvm/1000):'—'}</div><div class="l">FVM</div></div>
    <div class="kpi"><div class="v num arrow ${tm.c}">${tm.a}</div><div class="l">${tm.l}</div></div>
    ${candForP?`<div class="kpi"><div class="v num" style="color:var(--accent)">${fmtCr(candForP.pct)}</div><div class="l">La tua offerta</div></div>`
      :canAdd?`<div class="kpi"><div class="v num" style="color:var(--accent)">${officialCredits(p)} cr</div><div class="l">Prezzo consigliato</div></div>`
      :`<div class="kpi"><div class="v num">${media3(p)?media3(p).toFixed(2):'—'}</div><div class="l">Media 3 stagioni</div></div>`}</div>
  ${chartSvg?`<div class="card" style="padding:14px 12px 8px;margin-bottom:14px">
    <div class="between" style="margin-bottom:4px;flex-wrap:wrap;gap:6px"><div class="sec-title" style="margin:0">Andamento per stagione</div>
      <div class="small" style="display:flex;gap:10px">${legend}</div></div>
    <select class="input" data-compare="${p.id}" style="margin-bottom:8px">
      <option value="">Confronta con un altro giocatore…</option>
      ${cmpOpts.map(pp=>`<option value="${pp.id}" ${R.compareId===pp.id?'selected':''}>${esc(pp.nome)} (${esc(pp.sq)})</option>`).join('')}
    </select>
    ${chartSvg}</div>`:''}
  <div class="card" style="padding:8px 12px 4px"><table class="stats"><thead><tr><th>Stag.</th><th>PV</th><th>MV</th><th>FM</th><th>${heads[0]}</th><th>${heads[1]}</th><th>${heads[2]}</th></tr></thead><tbody>${strows}</tbody></table>
    ${p.nSeasons<2?'<div class="faint small" style="padding:8px 2px">Nessuno storico precedente rilevante in Serie A.</div>':''}</div>
  ${canAdd?`<div class="field" style="margin-top:14px"><label for="dnote">Note personali</label>
    <textarea class="input" id="dnote" data-note="${p.id}" placeholder="Appunti, infortuni, ballottaggi…">${esc(A().notes[p.id]||'')}</textarea></div>
  ${inSlot?`<div class="tag blue" style="margin-bottom:10px">Già nei tuoi obiettivi</div>`:
    `<button class="btn primary" data-act="add-obj" data-pid="${p.id}" style="width:100%;margin-bottom:8px">${IC.plus} Salva negli obiettivi</button>`}`
  :`<div class="faint small" style="margin-top:12px">Apri o crea una PreAsta per salvare questo giocatore tra i tuoi obiettivi.</div>`}`;
}
function openDetail(pid){R.detailId=pid;R.compareId=null;openModal(detailHtml(pid));}

/* ================= CREATE / EDIT STRATEGY MODAL (shared) ================= */
function openAuctionModal(mode){
  const editing=mode==='edit';const a=editing?A():{name:'Strategia '+(DB.auctions.length+1),description:'',module:'modificatore_difesa',budget:500};
  const bud=a.budget||500;
  openModal(`<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">${editing?'Impostazioni':'Crea PreAsta'}</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="field"><label for="na-n">Nome</label><input class="input" id="na-n" value="${esc(a.name)}" placeholder="Es. Lega amici…"></div>
    <div class="field"><label for="na-d">Descrizione</label><textarea class="input" id="na-d" placeholder="Scrivi qui la tua strategia…">${esc(a.description||'')}</textarea></div>
    <div class="field"><label for="na-m">Strategia / modulo</label><select class="input" id="na-m">${STRAT.template_budget.map(t=>`<option value="${t.id}" ${a.module===t.id?'selected':''}>${esc(t.nome)}</option>`).join('')}</select></div>
    <div class="field"><label for="na-b">Crediti totali</label><select class="input" id="na-b">
        <option value="500" ${bud===500?'selected':''}>500 (classico)</option>
        <option value="1000" ${bud===1000?'selected':''}>1000</option></select>
      ${editing?`<div class="faint small" style="margin-top:4px">Cambiando il totale, tutti i prezzi che hai già inserito si aggiornano da soli mantenendo la stessa quota di budget.</div>`:''}</div>
    <button class="btn primary" data-act="${editing?'save-edit':'save-new'}" style="width:100%">${editing?'Salva':"Crea e apri l'assistente"}</button>`);}
function readForm(){const n=$('#na-n').value.trim()||'Asta',d=$('#na-d').value.trim(),m=$('#na-m').value,b=parseInt($('#na-b').value,10)===1000?1000:500;
  return{name:n,description:d,module:m,budget:b};}

/* ================= ADD-TO-OBJECTIVES MODAL (shared: listino "+" and player detail) ================= */
function objectiveModalHtml(pid){
  const p=byId[pid];
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Aggiungi obiettivo</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="row" style="gap:10px;margin-bottom:16px"><span class="chip ${p.r}">${p.r}</span>
      <div><div class="nm" style="font-weight:700">${esc(p.nome)}</div><div class="muted small">${esc(p.sq)}</div></div></div>
    <div class="field"><label for="oa-tag">In che fascia lo metti?</label>
      <select class="input" id="oa-tag">${SLOT_TAGS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
    <div class="field"><label for="oa-cr">Quanto vuoi spendere (circa)</label>
      <div class="row"><input class="input num" type="number" min="0" step="1" id="oa-cr" value="${officialCredits(p)}"><span class="faint small">crediti su ${contextBudget()}</span></div></div>
    <button class="btn primary" data-act="save-objective" data-pid="${p.id}" style="width:100%">${IC.plus} Aggiungi agli obiettivi</button>`;
}
function openObjectiveModal(pid){openModal(objectiveModalHtml(pid));}

/* ================= SHARED EVENTS (present on every page) ================= */
document.addEventListener('click',e=>{
  if(e.target.classList&&e.target.classList.contains('overlay')){closeModal();R.detailId=null;R.compareId=null;R.openSlot=null;return;}
  const t=e.target.closest('[data-act],[data-open],[data-add],[data-open-auction],[data-ren],[data-dup],[data-del],[data-assign],[data-editassign],[data-unassign],[data-renteam],[data-open-lega],[data-ren-lega],[data-dup-lega],[data-del-lega],[data-formteam]');
  if(!t)return;const d=t.dataset;
  if(d.formteam){R.formTeam=d.formteam;if(typeof render==='function')render();return;}
  if(d.ren){const a=DB.auctions.find(x=>x.id===d.ren);const n=prompt('Nome:',a.name);if(n&&n.trim()){a.name=n.trim();save();if(typeof render==='function')render();}return;}
  if(d.dup){const a=DB.auctions.find(x=>x.id===d.dup);const c=JSON.parse(JSON.stringify(a));c.id=uid('a');c.name=a.name+' (copia)';c.createdAt=Date.now();DB.auctions.push(c);save();if(typeof render==='function')render();return;}
  if(d.del){const a=DB.auctions.find(x=>x.id===d.del);if(confirm('Eliminare "'+a.name+'"?')){DB.auctions=DB.auctions.filter(x=>x.id!==d.del);save();if(typeof render==='function')render();}return;}
  if(d.openAuction){location.href='asta.html?id='+encodeURIComponent(d.openAuction);return;}
  const act=d.act;
  if(act==='close'){closeModal();R.detailId=null;R.compareId=null;R.openSlot=null;return;}
  if(act==='new-auction'){openAuctionModal('new');return;}
  if(act==='edit-auction'){openAuctionModal('edit');return;}
  if(act==='save-new'){const f=readForm();if(!f)return;const a=Object.assign({id:uid('a'),slots:[],notes:{},createdAt:Date.now()},f);DB.auctions.push(a);save();location.href='asta.html?id='+encodeURIComponent(a.id);return;}
  if(act==='save-edit'){const f=readForm();if(!f)return;Object.assign(A(),f);save();closeModal();if(typeof render==='function')render();return;}
  if(act==='add-obj'){openObjectiveModal(+d.pid);return;}
  if(act==='save-objective'){const tag=$('#oa-tag').value,crv=parseFloat($('#oa-cr').value);
    addSlot(+d.pid,{tag,pct:isNaN(crv)?undefined:creditsToPct(crv)});closeModal();if(typeof render==='function')render();return;}
  if(act==='account'){openAuthModal();return;}
  if(act==='signin'||act==='signup'){
    const email=($('#au-email')||{}).value,pass=($('#au-pass')||{}).value;
    if(!email||!pass){openAuthModal('Inserisci email e password.');return;}
    t.disabled=true;
    (act==='signin'?authSignIn(email,pass):authSignUp(email,pass)).then(r=>{
      if(r&&r.error)openAuthModal(r.error);
      else if(r&&r.needsConfirm)openModal(confirmSentHtml(email));
      else closeModal();
    });
    return;}
  if(act==='signout'){closeModal();authSignOut();return;}
  if(d.open){
    if(!canViewStats()){openModal(statsBlockedHtml());return;}
    openDetail(+d.open);return;}
  if(d.add!=null&&d.add!==''){const pid=+d.add;const sl=slotOf(pid);
    if(sl){removeCand(sl.id,pid);if(typeof render==='function')render();}else{openObjectiveModal(pid);}return;}
});
document.addEventListener('input',e=>{const el=e.target;
  if(el.dataset.note!=null){A().notes[el.dataset.note]=el.value;save();return;}});
document.addEventListener('change',e=>{const el=e.target;
  if(el.dataset.compare!=null){R.compareId=el.value?+el.value:null;openModal(detailHtml(R.detailId));return;}});
