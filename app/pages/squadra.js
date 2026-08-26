"use strict";
if(!DB.squadra)DB.squadra=defaultSquadra();
R.sqTab=R.sqTab||'rosa';
R.sqf=R.sqf||{q:'',r:'',sq:''};

/* Moduli classici: portiere sempre 1, qui solo D/C/A perché il resto è fisso. */
const MODULI={
  '3-4-3':{D:3,C:4,A:3},'3-5-2':{D:3,C:5,A:2},
  '4-3-3':{D:4,C:3,A:3},'4-4-2':{D:4,C:4,A:2},'4-5-1':{D:4,C:5,A:1},
  '5-3-2':{D:5,C:3,A:2},'5-4-1':{D:5,C:4,A:1}
};
const squadraRoster=()=>DB.squadra.players.map(id=>byId[id]).filter(Boolean);
/* Punteggio "chi mettere": titolarità pesa un po' di più della qualità attesa,
   perché un titolare mediocre porta comunque un voto quando un panchinaro forte
   rischia di restare fuori. Chi non ha ancora dati (nuovi arrivi) parte da un
   valore neutro invece di essere escluso a priori. */
const consiglioScore=p=>{const t=titIdx(p),f=perfIdx(p);return(t==null?40:t)*0.55+(f==null?40:f)*0.45;};
function formazioneConsigliata(){
  const mod=MODULI[DB.squadra.formation]||MODULI['3-4-3'];
  const byRole={P:[],D:[],C:[],A:[]};
  squadraRoster().forEach(p=>byRole[p.r].push(p));
  ROLES.forEach(r=>byRole[r].sort((a,b)=>consiglioScore(b)-consiglioScore(a)));
  const need={P:1,D:mod.D,C:mod.C,A:mod.A};
  const titolari={},panchina={};
  ROLES.forEach(r=>{titolari[r]=byRole[r].slice(0,need[r]);panchina[r]=byRole[r].slice(need[r]);});
  return{titolari,panchina,need};
}

function viewRosa(){
  const f=R.sqf,q=f.q.trim().toLowerCase();
  const roster=squadraRoster(),inSquad=id=>DB.squadra.players.includes(id);
  const counts={P:0,D:0,C:0,A:0};roster.forEach(p=>counts[p.r]++);
  const teams=[...new Set(PLAYERS.map(p=>p.sq))].sort();
  let arr=PLAYERS.filter(p=>{
    if(f.r&&p.r!==f.r)return false;if(f.sq&&p.sq!==f.sq)return false;
    if(q&&!(p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q)))return false;
    return true;});
  sortArr(arr,'qt');
  const roseHtml=roster.length?ROLES.map(r=>{
    const list=roster.filter(p=>p.r===r);if(!list.length)return'';
    const rows=list.map(p=>`<div class="tc-row">
      <span class="chip ${p.r}" style="width:20px;height:20px;font-size:9px;border-radius:5px">${p.r}</span>
      <div class="tc-info"><div class="tc-name">${esc(p.nome)}</div><div class="tc-team">${esc(p.sq)}</div></div>
      <button class="tc-rm" data-sqrm="${p.id}" title="Rimuovi">${IC.close}</button>
    </div>`).join('');
    return`<div class="tc-group"><div class="tc-group-label">${ROLE_NAME[r]} · ${list.length}/${ROSA[r]}</div>${rows}</div>`;
  }).join(''):`<div class="faint small" style="padding:6px 0">Nessun giocatore ancora</div>`;
  return`<div class="row" style="gap:18px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:0 0 260px;min-width:220px">
      <div class="sec-title" style="margin-bottom:10px">La mia rosa · ${roster.length}/25</div>
      <div class="tc-roster" style="max-height:none">${roseHtml}</div>
    </div>
    <div style="flex:1;min-width:280px">
      <div class="filters">
        <input class="input" id="sqq" placeholder="Cerca…" value="${esc(f.q)}">
        <select class="input" id="sqr"><option value="">Ruolo</option>${ROLES.map(r=>`<option value="${r}" ${f.r===r?'selected':''}>${r}</option>`).join('')}</select>
        <select class="input" id="sqsq"><option value="">Squadra</option>${teams.map(t=>`<option ${f.sq===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="muted small" style="margin:-4px 0 8px">${arr.length} giocatori</div>
      <div class="plist">${arr.slice(0,150).map(p=>{
        const already=inSquad(p.id),full=!already&&counts[p.r]>=ROSA[p.r];
        const extra=already
          ?`<button class="iconbtn" style="color:var(--accent);border-color:var(--accent)" data-sqrm="${p.id}" title="Rimuovi dalla rosa">${IC.minus}</button>`
          :`<button class="iconbtn" data-sqadd="${p.id}" ${full?'disabled title="Reparto al completo"':'title="Aggiungi alla rosa"'}>${IC.plus}</button>`;
        return previewCard(p,extra,true,null,false);
      }).join('')}</div>
    </div>
  </div>`;
}

function viewFormazione(){
  const roster=squadraRoster();
  if(!roster.length)return`<div class="empty">${IC.target}<div>Aggiungi prima la tua rosa nella scheda "Rosa"</div></div>`;
  const{titolari,panchina,need}=formazioneConsigliata();
  const modOpts=Object.keys(MODULI).map(m=>`<option value="${m}" ${DB.squadra.formation===m?'selected':''}>${m}</option>`).join('');
  const row=p=>`<div class="tc-row">
    <span class="chip ${p.r}" style="width:20px;height:20px;font-size:9px;border-radius:5px">${p.r}</span>
    <div class="tc-info"><div class="tc-name">${esc(p.nome)}</div><div class="tc-team">${esc(p.sq)}</div></div>
    ${titBar(p)}
    <div class="tc-price-box num" title="Punteggio consigliato (titolarità + performance)">${Math.round(consiglioScore(p))}</div>
  </div>`;
  const block=(r,label)=>{
    const tit=titolari[r],panch=panchina[r];
    if(!tit.length&&!panch.length)return'';
    return`<div class="tc-group"><div class="tc-group-label">${label} · ${tit.length===1?'titolare consigliato':'titolari consigliati'}</div>${tit.map(row).join('')}
      ${panch.length?`<div class="tc-group-label" style="margin-top:8px">Riserve</div>${panch.map(row).join('')}`:''}</div>`;
  };
  const missing=[];
  if(titolari.P.length<need.P)missing.push('un portiere');
  if(titolari.D.length<need.D)missing.push('difensori');
  if(titolari.C.length<need.C)missing.push('centrocampisti');
  if(titolari.A.length<need.A)missing.push('attaccanti');
  return`<div class="between" style="margin-bottom:14px;gap:10px;flex-wrap:wrap">
      <div class="muted small">Consiglio basato su titolarità e performance attese per la 2026/27 — ricontrolla comunque a ridosso della giornata per infortuni dell'ultima ora.</div>
      <select class="input" id="sqmod" style="max-width:130px">${modOpts}</select></div>
    ${missing.length?`<div class="tc-warn">${IC.warn}Ti mancano ${missing.join(', ')} per completare il modulo ${esc(DB.squadra.formation)}</div>`:''}
    <div class="tc-roster" style="max-height:none;gap:16px">
      ${block('P','Portiere')}${block('D','Difesa')}${block('C','Centrocampo')}${block('A','Attacco')}
    </div>`;
}

function render(){
  renderTop(null);
  $('#view').innerHTML=`<div style="max-width:920px;margin:0 auto">
    <div class="between" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div><h1 style="font-size:20px">La mia squadra</h1>
        <div class="muted small">La tua rosa definitiva: da qui ogni settimana ti consiglio chi schierare.</div></div>
      <a class="backbtn" href="index.html">${IC.back} Home</a></div>
    <div class="tabbar" style="margin-bottom:16px">
      <button class="tabbtn ${R.sqTab==='rosa'?'active':''}" data-sqtab="rosa">Rosa</button>
      <button class="tabbtn ${R.sqTab==='formazione'?'active':''}" data-sqtab="formazione">Formazione consigliata</button>
    </div>
    ${R.sqTab==='formazione'?viewFormazione():viewRosa()}
  </div>`;
  bindSquadraFilters();
}
function bindSquadraFilters(){
  const q=$('#sqq');if(q)q.addEventListener('input',e=>{R.sqf.q=e.target.value;render();setTimeout(()=>{const el=$('#sqq');if(el){el.focus();el.selectionStart=el.value.length;}});});
  [['#sqr','r'],['#sqsq','sq']].forEach(([sel,key])=>{const el=$(sel);if(el)el.addEventListener('change',e=>{R.sqf[key]=e.target.value;render();});});
  const mod=$('#sqmod');if(mod)mod.addEventListener('change',e=>{DB.squadra.formation=e.target.value;save();render();});
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-sqtab],[data-sqadd],[data-sqrm]');if(!t)return;const d=t.dataset;
  if(d.sqtab){R.sqTab=d.sqtab;render();return;}
  if(d.sqadd){
    const p=byId[+d.sqadd];
    if(DB.squadra.players.length>=25){alert('La rosa è già completa (25/25).');return;}
    if(DB.squadra.players.filter(id=>{const x=byId[id];return x&&x.r===p.r;}).length>=ROSA[p.r]){
      alert('Hai già il massimo di '+ROSA[p.r]+' '+ROLE_NAME[p.r].toLowerCase()+'.');return;}
    DB.squadra.players.push(+d.sqadd);save();render();return;}
  if(d.sqrm){DB.squadra.players=DB.squadra.players.filter(id=>id!==+d.sqrm);save();render();return;}
});
render();
