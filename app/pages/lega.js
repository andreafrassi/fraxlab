"use strict";
if(!LG()){location.href='leghe.html';}
R.lf={q:'',r:'',sq:'',rm:'',sort:'qt',stato:'',fascia:''};
R.legaTab='giocatori';
const TEAM_PALETTE=['#8b5cf6','#4f8ef7','#f5b544','#38bdf8','#f472b6','#22e39a','#fb7185','#facc15','#a78bfa','#2dd4bf'];
/* etichetta breve per la banda verticale: "FASCIA" è già implicito nel contesto */
const FASCIA_SHORT={top:'TOP',semitop:'SEMI-TOP',terza:'TERZA',quarta:'QUARTA',scommesse:'SCOMMESSE'};
const teamColor=(lg,teamId)=>{const i=lg.teams.findIndex(t=>t.id===teamId);return i<0?'#8b93a0':TEAM_PALETTE[i%TEAM_PALETTE.length];};
const linkedStrategy=lg=>lg.linkedStrategyId&&DB.auctions.find(a=>a.id===lg.linkedStrategyId)||null;
const slotOfPlayer=(strat,pid)=>strat?strat.slots.find(s=>s.cand.some(c=>c.pid===pid))||null:null;
const fasciaOfPlayer=(strat,pid)=>{const sl=slotOfPlayer(strat,pid);return sl?sl.tag:null;};
const targetOfPlayer=(strat,pid)=>{const sl=slotOfPlayer(strat,pid);if(!sl)return null;const c=sl.cand.find(c=>c.pid===pid);return c?c.pct:null;};

/* Avviso se una squadra ha preso 3 o più giocatori della stessa squadra reale
   (rischio concentrazione: un turno storto di quella squadra pesa su più ruoli
   in un colpo solo). Solo qui nell'asta live, dove i giocatori sono davvero
   assegnati a una rosa — non ha senso nel listone o nell'assistente PreAsta. */
function clubOverlapWarningHtml(roster){
  const counts={};
  roster.forEach(({p})=>{counts[p.sq]=(counts[p.sq]||0)+1;});
  const over=Object.entries(counts).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]);
  if(!over.length)return'';
  const txt=over.map(([sq,n])=>`${esc(sq)} (${n})`).join(', ');
  return `<div class="tc-warn" title="Un turno storto di quella squadra pesa su più giocatori in una volta">${IC.warn}${over.length>1?'Tanti giocatori dalle stesse squadre: ':'Tanti giocatori dalla stessa squadra: '}${txt}</div>`;
}
function teamCard(lg,t){
  const st=teamStats(lg,t.id),pct=lg.budget?Math.min(100,Math.round(st.speso/lg.budget*100)):0,over=st.residuo<0,col=teamColor(lg,t.id);
  const roster=Object.entries(lg.assign).filter(([pid,a])=>a.teamId===t.id).map(([pid,a])=>({p:byId[+pid],price:a.price})).filter(x=>x.p);
  const groups=ROLES.map(r=>{
    const players=roster.filter(x=>x.p.r===r).sort((a,b)=>b.price-a.price);
    if(!players.length)return'';
    const rows=players.map(({p,price})=>`<div class="tc-row">
      <span class="chip ${p.r}" style="width:20px;height:20px;font-size:9px;border-radius:5px">${p.r}</span>
      <div class="tc-info">
        <div class="tc-name">${esc(p.nome)}</div>
        <div class="tc-team">${esc(p.sq)}</div>
      </div>
      <div class="tc-price num">${fmtCredits(price)}</div>
      <button class="tc-rm" data-unassign="${p.id}" title="Rimuovi">${IC.close}</button>
    </div>`).join('');
    return `<div class="tc-group"><div class="tc-group-label">${ROLE_NAME[r]} · ${players.length}/${ROSA[r]}</div>${rows}</div>`;
  }).join('');
  return `<div class="team-col">
    <div class="between" style="margin-bottom:10px;gap:6px">
      <div class="row" style="gap:7px;min-width:0"><span class="tcdot" style="background:${col}"></span><b class="nm" style="font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</b></div>
      <button class="iconbtn" data-renteam="${t.id}" title="Rinomina squadra" style="width:28px;height:28px;flex:none">${IC.edit}</button>
    </div>
    <div class="num" style="font-size:22px;font-weight:800;${over?'color:var(--neg)':''}">${fmtCredits(st.residuo)}</div>
    <div class="faint small" style="margin-bottom:8px">crediti rimasti su ${fmtCredits(lg.budget)}</div>
    <div class="bar ${over?'over':''}" style="margin-bottom:10px"><i style="width:${pct}%"></i></div>
    <div class="muted small" style="margin-bottom:6px">${st.count} giocator${st.count===1?'e':'i'}</div>
    ${clubOverlapWarningHtml(roster)}
    <div class="tc-roster">${groups||'<div class="faint small" style="padding:6px 0">Nessun giocatore</div>'}</div>
  </div>`;
}
function legaAssignExtra(lg,p){
  const as=lg.assign[p.id],team=as&&lg.teams.find(t=>t.id===as.teamId);
  if(team){const col=teamColor(lg,team.id);
    return `<span class="tag" style="border-color:${col}66;color:${col};background:${col}1a;cursor:pointer" data-editassign="${p.id}" title="Modifica assegnazione">${esc(team.name)}<b>${fmtCredits(as.price)} cr</b></span>
       <button class="iconbtn" data-unassign="${p.id}" title="Rimuovi assegnazione">${IC.close}</button>`;}
  return `<button class="iconbtn" data-assign="${p.id}" title="Assegna a una squadra">${IC.plus}</button>`;
}
function viewGiocatori(lg){
  const f=R.lf,q=f.q.trim().toLowerCase(),strat=linkedStrategy(lg);
  const teams=[...new Set(PLAYERS.map(p=>p.sq))].sort();
  const byRole=PLAYERS.filter(p=>!f.r||p.r===f.r);
  const mantraCodes=mantraCodesFor(byRole);
  let arr=PLAYERS.filter(p=>{
    if(f.r&&p.r!==f.r)return false; if(f.sq&&p.sq!==f.sq)return false;
    if(f.rm&&!matchMantra(p,f.rm))return false;
    if(q&&!(p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q)))return false;
    const assigned=!!lg.assign[p.id];
    if(f.stato==='liberi'&&assigned)return false; if(f.stato==='assegnati'&&!assigned)return false;
    if(f.fascia&&fasciaOfPlayer(strat,p.id)!==f.fascia)return false;
    return true;});
  sortArr(arr,f.sort);
  if(strat){
    /* Stesso ordine della strategia: prima per fascia, poi nella posizione in cui
       li hai disposti tu (l'array slots è quello che il drag&drop riordina).
       Chi non è in strategia resta nell'ordinamento scelto sopra (sort stabile). */
    const rank=pid=>{
      const sl=slotOfPlayer(strat,pid);
      if(!sl)return[SLOT_TAGS.length,0];
      const f=SLOT_TAGS.findIndex(([v])=>v===sl.tag);
      return[f<0?SLOT_TAGS.length:f,strat.slots.indexOf(sl)];
    };
    arr.sort((a,b)=>{const ra=rank(a.id),rb=rank(b.id);return ra[0]-rb[0]||ra[1]-rb[1];});
  }
  return `<div class="sec-title">Giocatori</div>
  <div class="filters">
    <input class="input" id="lgq" placeholder="Cerca…" value="${esc(f.q)}">
    <select class="input" id="lgr"><option value="">Ruolo</option>${ROLES.map(r=>`<option value="${r}" ${f.r===r?'selected':''}>${r}</option>`).join('')}</select>
    <select class="input" id="lgrm"><option value="">Ruolo specifico</option>${mantraCodes.map(c=>`<option value="${c}" ${f.rm===c?'selected':''}>${esc(MANTRA_LABEL[c])}</option>`).join('')}</select>
    <select class="input" id="lgsq"><option value="">Squadra</option>${teams.map(t=>`<option ${f.sq===t?'selected':''}>${t}</option>`).join('')}</select>
    <select class="input" id="lgsort">${SORTS.filter(s=>s[0]!=='nome').map(([k,l])=>`<option value="${k}" ${f.sort===k?'selected':''}>${l}</option>`).join('')}</select>
    <select class="input" id="lgstate"><option value="" ${!f.stato?'selected':''}>Tutti</option><option value="liberi" ${f.stato==='liberi'?'selected':''}>Liberi</option><option value="assegnati" ${f.stato==='assegnati'?'selected':''}>Assegnati</option></select>
    ${strat?`<select class="input" id="lgfascia"><option value="">Fascia</option>${SLOT_TAGS.map(([v,l])=>`<option value="${v}" ${f.fascia===v?'selected':''}>${l}</option>`).join('')}</select>`:''}
    <button class="iconbtn" data-act="toggle-hide-data" title="${lg.hideData?'Mostra dati giocatori':'Nascondi dati giocatori'}">${lg.hideData?IC.eyeOff:IC.eye}</button>
  </div>
  <div class="muted small" style="margin:-4px 0 8px">${arr.length} giocatori</div>
  <div class="plist${lg.hideData?' hide-data':''}">${arr.map(p=>{
    const tag=fasciaOfPlayer(strat,p.id);
    /* "FASCIA" è ridondante dentro la banda colorata: dentro ci sta solo il nome breve. */
    return previewCard(p,legaAssignExtra(lg,p),true,targetOfPlayer(strat,p.id),false,tag?'fascia '+TAG_COLOR[tag]:'',tag?FASCIA_SHORT[tag]:null);
  }).join('')}</div>`;
}
function viewLega(lg){
  const strat=linkedStrategy(lg);
  return `<div class="between" style="margin-bottom:14px;flex-wrap:wrap;gap:10px"><div><h1 style="font-size:20px">${esc(lg.name)}</h1>
      <div class="muted small">${lg.teams.length} squadre · ${fmtCredits(lg.budget)} cr a testa · ${legaAssignedCount(lg)}/${PLAYERS.length} assegnati</div>
      ${strat?`<div class="small" style="margin-top:4px">Strategia collegata: <b>${esc(strat.name)}</b></div>`:''}</div>
    <div class="row" style="gap:8px"><a class="backbtn" href="leghe.html">${IC.back} Aste</a>
      <button class="btn sm" data-act="edit-lega">${IC.edit} Impostazioni</button></div></div>
  <div class="teams-cols">${lg.teams.map(t=>teamCard(lg,t)).join('')}</div>
  <div class="tabbar" style="margin:18px 0 14px">
    <button class="tabbtn ${R.legaTab==='giocatori'?'active':''}" data-legatab="giocatori">Giocatori</button>
    <button class="tabbtn ${R.legaTab==='formazioni'?'active':''}" data-legatab="formazioni">Formazioni squadre</button>
  </div>
  ${R.legaTab==='formazioni'?viewFormazioni():viewGiocatori(lg)}`;
}
function legaSettingsHtml(lg){
  const stratOpts=DB.auctions.map(a=>`<option value="${a.id}" ${lg.linkedStrategyId===a.id?'selected':''}>${esc(a.name)}</option>`).join('');
  /* Se è già collegata a una strategia, i crediti partono allineati a quella
     strategia (anche se nel frattempo il suo budget è cambiato altrove). */
  const linked=lg.linkedStrategyId&&DB.auctions.find(a=>a.id===lg.linkedStrategyId);
  const bval=linked?(linked.budget||500):lg.budget;
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Impostazioni asta</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="field"><label for="lgs-n">Nome</label><input class="input" id="lgs-n" value="${esc(lg.name)}"></div>
    <div class="field"><label for="lgs-t">Numero di squadre</label><input class="input num" id="lgs-t" type="number" min="2" max="20" value="${lg.teams.length}"></div>
    <div class="field"><label for="lgs-strat">Strategia collegata</label>
      <select class="input" id="lgs-strat"><option value="">Nessuna</option>${stratOpts}</select>
      <div class="faint small" style="margin-top:4px">I giocatori che avevi messo in TOP/SEMI-TOP/ecc. in quella strategia mostreranno la fascia nella lista giocatori, e i crediti per squadra si allineano al budget della strategia.</div></div>
    <div class="field"><label for="lgs-b">Crediti per squadra</label>
      <input class="input num" id="lgs-b" type="number" min="1" value="${bval}" ${linked?'readonly':''}>
      ${linked?`<div class="faint small" style="margin-top:4px">Segue automaticamente i crediti della strategia collegata. Scollega la strategia per impostarli a mano.</div>`:''}</div>
    <button class="btn primary" data-act="save-lega-settings" style="width:100%">Salva</button>`;
}
function assignModalHtml(pid){
  const lg=LG(),p=byId[pid],cur=lg.assign[pid],cap=ROSA[p.r];
  const teamOpts=lg.teams.map(t=>{
    const n=teamRoleCount(lg,t.id,p.r,pid),full=n>=cap,sel=cur&&cur.teamId===t.id;
    return `<option value="${t.id}" ${sel?'selected':''} ${full&&!sel?'disabled':''}>${esc(t.name)} — ${p.r} ${n}/${cap}${full&&!sel?' (al completo)':''}</option>`;
  }).join('');
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Assegna giocatore</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="row" style="gap:10px;margin-bottom:16px"><span class="chip ${p.r}">${p.r}</span>
      <div><div class="nm" style="font-weight:700">${esc(p.nome)}</div><div class="muted small">${esc(p.sq)}</div></div></div>
    <div class="field"><label for="as-team">Squadra</label><select class="input" id="as-team">${teamOpts}</select>
      <div class="faint small" style="margin-top:4px">Massimo per squadra: ${ROSA.P} portieri, ${ROSA.D} difensori, ${ROSA.C} centrocampisti, ${ROSA.A} attaccanti.</div></div>
    <div class="field"><label for="as-price">Prezzo pagato (crediti)</label><input class="input num" type="number" min="0" step="1" id="as-price" value="${cur?cur.price:''}"></div>
    <button class="btn primary" data-act="save-assign" data-pid="${pid}" style="width:100%">${IC.plus} ${cur?'Aggiorna':'Assegna'}</button>`;
}
function bindLegaFilters(){
  const q=$('#lgq');if(q)q.addEventListener('input',e=>{R.lf.q=e.target.value;render();setTimeout(()=>{const el=$('#lgq');if(el){el.focus();el.selectionStart=el.value.length;}});});
  [['#lgr','r'],['#lgrm','rm'],['#lgsq','sq'],['#lgsort','sort'],['#lgstate','stato'],['#lgfascia','fascia']].forEach(([sel,key])=>{const el=$(sel);if(el)el.addEventListener('change',e=>{R.lf[key]=e.target.value;if(key==='r')R.lf.rm='';render();});});
}
function render(){
  const lg=LG();if(!lg){location.href='leghe.html';return;}
  renderTop(null);
  $('#view').innerHTML=viewLega(lg);
  bindLegaFilters();
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act],[data-assign],[data-editassign],[data-unassign],[data-renteam],[data-legatab]');
  if(!t)return;const d=t.dataset,lg=LG();
  if(d.legatab){R.legaTab=d.legatab;render();return;}
  if(d.renteam){const tm=lg.teams.find(x=>x.id===d.renteam);const n=prompt('Nome squadra:',tm.name);if(n&&n.trim()){tm.name=n.trim();save();render();}return;}
  if(d.act==='toggle-hide-data'){lg.hideData=!lg.hideData;save();render();return;}
  if(d.assign){openModal(assignModalHtml(+d.assign));return;}
  if(d.editassign){openModal(assignModalHtml(+d.editassign));return;}
  if(d.unassign){unassignPlayer(lg,+d.unassign);render();return;}
  if(d.act==='edit-lega'){openModal(legaSettingsHtml(lg));return;}
  if(d.act==='save-lega-settings'){
    const name=$('#lgs-n').value.trim()||lg.name,budget=Math.max(1,parseInt($('#lgs-b').value,10)||lg.budget);
    const n=Math.max(2,Math.min(20,parseInt($('#lgs-t').value,10)||lg.teams.length));
    if(n<lg.teams.length){
      const removed=lg.teams.slice(n),blocked=removed.some(tm=>teamStats(lg,tm.id).count>0);
      if(blocked){alert('Non posso ridurre le squadre: una di quelle rimosse ha già giocatori assegnati. Rimuovili prima o riducila di meno.');}
      else lg.teams=lg.teams.slice(0,n);
    }else if(n>lg.teams.length){lg.teams=lg.teams.concat(newTeams(n-lg.teams.length,lg.teams.length));}
    lg.name=name;lg.budget=budget;lg.linkedStrategyId=$('#lgs-strat').value||null;save();closeModal();render();return;}
  if(d.act==='save-assign'){
    const pid=+d.pid,p=byId[pid],teamId=$('#as-team').value,price=parseFloat($('#as-price').value);
    if(teamRoleCount(lg,teamId,p.r,pid)>=ROSA[p.r]){alert('Questa squadra ha già il massimo di '+ROSA[p.r]+' '+ROLE_NAME[p.r].toLowerCase()+'.');return;}
    assignPlayer(lg,pid,teamId,price);closeModal();render();return;}
});
/* Cambiando la strategia collegata nel modale impostazioni, i crediti per
   squadra seguono subito quella strategia (o tornano modificabili a mano
   se si sceglie "Nessuna"), senza dover chiudere e riaprire il modale. */
document.addEventListener('change',e=>{
  if(e.target.id!=='lgs-strat')return;
  const bInput=$('#lgs-b');if(!bInput)return;
  const a=e.target.value&&DB.auctions.find(x=>x.id===e.target.value);
  if(a){bInput.value=a.budget||500;bInput.readOnly=true;}
  else{bInput.readOnly=false;}
});
render();
