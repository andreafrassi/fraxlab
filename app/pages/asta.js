"use strict";
if(!A()){location.href='aste.html';}
R.tab='assistente';R.phase='P';R.af={q:'',sq:'',rm:'',sort:'media3'};R.openSlot=null;

/* ---- ASSISTENTE (4 fasi) ---- */
function viewAssistente(){
  const a=A(),ph=R.phase;
  const stepper=ROLES.map(Rr=>
    `<div class="step ${ph===Rr?'on':''}" data-phase="${Rr}"><div class="sc"><span class="chip ${Rr}">${Rr}</span></div><div class="sn">${ROLE_NAME[Rr]}</div></div>`).join('');
  const slots=a.slots.filter(s=>s.r===ph);
  const f=R.af,q=f.q.trim().toLowerCase();
  const teams=[...new Set(PLAYERS.filter(p=>p.r===ph).map(p=>p.sq))].sort();
  const mantraCodes=mantraCodesFor(PLAYERS.filter(p=>p.r===ph));
  let arr=PLAYERS.filter(p=>p.r===ph&&(!f.sq||p.sq===f.sq)&&(!f.rm||matchMantra(p,f.rm))&&(!q||p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q)));
  sortArr(arr,f.sort);
  const idx=ROLES.indexOf(ph);
  return `<div class="between" style="margin-bottom:6px"><h1 style="font-size:19px">Assistente · ${esc(a.name)}</h1></div>
  <div class="stepper" style="margin-bottom:18px">${stepper}</div>

  <div class="asst-grid">
    <div class="asst-add">
      <div class="sec-title">Aggiungi ${ROLE_NAME[ph].toLowerCase()}</div>
      <div class="filters">
        <input class="input" id="aq" placeholder="Cerca…" value="${esc(f.q)}">
        <select class="input" id="arm"><option value="">Ruolo specifico</option>${mantraCodes.map(c=>`<option value="${c}" ${f.rm===c?'selected':''}>${esc(MANTRA_LABEL[c])}</option>`).join('')}</select>
        <select class="input" id="asq"><option value="">Squadra</option>${teams.map(tm=>`<option ${f.sq===tm?'selected':''}>${tm}</option>`).join('')}</select>
        <select class="input" id="asort">${sortsFor().filter(s=>s[0]!=='nome'||!canViewStats()).map(([k,l])=>`<option value="${k}" ${f.sort===k?'selected':''}>${l}</option>`).join('')}</select>
      </div>
      <div class="plist">${arr.slice(0,120).map(p=>previewCard(p,null,true,null,true)).join('')}</div>
    </div>
    <div class="asst-obj">
      <div class="sec-title">La tua strategia</div>
      ${objTiles(slots,ph)}
    </div>
  </div>

  <div class="row" style="gap:10px;margin-top:20px">
    ${idx>0?`<button class="btn" data-phase="${ROLES[idx-1]}">${IC.back} ${ROLE_NAME[ROLES[idx-1]]}</button>`:''}
    ${idx<3?`<button class="btn primary" data-phase="${ROLES[idx+1]}" style="flex:1">Avanti · ${ROLE_NAME[ROLES[idx+1]]} ${IC.fwd}</button>`:''}
  </div>`;
}
/* ---- objective tiles board: one colored "outer" box per fascia (TOP/SEMI-TOP/…),
   each containing every objective assigned to that fascia. Drag a card onto another
   fascia box to move it there (also works on an empty box). ---- */
function objTile(p,cls,label,mine){
  return `<div class="obj-tile filled ${cls}"
    title="${esc(p.nome)}${canViewStats()?` · consigliato ${officialCredits(p)} cr`:''} · tuo ${fmtCr(mine)} · trascina per spostare tra le fasce">
    <div class="ot-left"><div class="ot-head"><span class="chip ${p.r}">${p.r}</span><div class="ot-name">${esc(p.nome)}</div></div>
      ${label?`<span class="ot-tag ${cls}">${label}</span>`:''}</div>
    <div class="ot-prices">
      ${canViewStats()?`<div class="ot-price"><span>Prezzo consigliato</span><b>${officialCredits(p)}</b></div>`:''}
      <div class="ot-price mine"><span>Il tuo prezzo</span><b>${pctToCredits(mine)}</b></div>
    </div>
    </div>`;
}
function objTiles(slots,ph){
  const rows=SLOT_TAGS.map(([tagVal,tagLabel])=>{
    const fasciaSlots=slots.filter(s=>s.tag===tagVal),cls=TAG_COLOR[tagVal];
    const clusters=fasciaSlots.map(sl=>{
      const p=byId[sl.cand[0].pid];if(!p)return'';
      const bought=!!sl.esito;
      const tileCls=bought?'bought':cls;
      const tile=objTile(p,tileCls,bought?'Preso':'',bought?sl.esito.pct:sl.cand[0].pct);
      return `<div class="obj-cluster" data-slot="${sl.id}" draggable="true">${tile}</div>`;
    }).join('');
    const addSlotTile=`<div class="obj-tile empty" data-addslot="${ph}|${tagVal}" style="cursor:pointer" title="Aggiungi obiettivo · ${tagLabel}"><span class="ot-plus">+</span></div>`;
    return `<div class="obj-outer ${cls}${fasciaSlots.length?'':' empty'}" data-fascia="${tagVal}">
      <div class="obj-outer-label">${tagLabel}${fasciaSlots.length?' · '+fasciaSlots.length:''}</div>
      <div class="obj-fascia-list">${clusters}${addSlotTile}</div>
    </div>`;
  }).join('');
  return `<div class="obj-board">${rows}</div>`;
}
function slotModalHtml(sl){
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Obiettivo</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    ${slotCard(sl)}`;
}
function renderSlotModal(){
  const a=A(),sl=a&&a.slots.find(x=>x.id===R.openSlot);
  if(!sl){closeModal();R.openSlot=null;return;}
  openModal(slotModalHtml(sl));
}
function openSlotModal(sid){R.openSlot=sid;renderSlotModal();}
function bindAssist(){
  const q=$('#aq');if(q)q.addEventListener('input',e=>{R.af.q=e.target.value;render();setTimeout(()=>{const el=$('#aq');if(el){el.focus();el.selectionStart=el.value.length;}});});
  [['#arm','rm'],['#asq','sq'],['#asort','sort']].forEach(([sel,key])=>{const el=$(sel);if(el)el.addEventListener('change',e=>{R.af[key]=e.target.value;render();});});
}

/* ---- slot card (shared within workspace) ---- */
function slotCard(sl){
  const resolved=!!sl.esito,c=sl.cand[0],p=byId[c.pid];
  const crTxt=pctToCredits(c.pct);
  const topPrice=resolved
    ?`<div class="num" style="font-weight:750;font-size:19px;color:var(--pos)">${fmtCr(sl.esito.pct)}</div><div class="faint small">pagato</div>`
    :(canViewStats()?`<div class="num" style="font-weight:750;font-size:19px;color:var(--accent)">${officialCredits(p)} cr</div><div class="faint small">consigliato</div>`:'');
  const row=`<div style="padding:10px 0">
      <div class="between" style="align-items:flex-start;gap:10px;margin-bottom:9px">
        <div class="nm" style="font-weight:700;font-size:17px;min-width:0">${esc(p.nome)} ${resolved?'<span class="tag green">PRESO</span>':''}</div>
        <div style="text-align:right;flex:none">${topPrice}</div>
      </div>
      <div class="between" style="align-items:flex-end;flex-wrap:wrap;gap:8px">
        <div class="row" style="min-width:0"><span class="chip ${p.r}">${p.r}</span>
          <div class="mt muted small">${esc(p.sq)}${canViewStats()?` · FM ${fm(p,'25/26')!=null?fm(p,'25/26').toFixed(2):'—'}`:''}</div>
          <button class="iconbtn" data-open="${p.id}" title="Vedi scheda giocatore">${IC.list}</button></div>
        ${resolved?'':
          `<div class="pricebox">
            <div class="maxbox"><label>Il tuo massimo</label><div class="row"><input class="input num" type="number" min="0" step="1" value="${crTxt}" data-price="${sl.id}|${c.pid}"><span class="faint small">cr</span></div></div>
            <button class="iconbtn" data-buy="${sl.id}|${c.pid}" title="Segna preso"><svg viewBox="0 0 24 24" style="width:15px;height:15px"><path d="M20 6L9 17l-5-5"/></svg></button>
            <button class="iconbtn" data-rmcand="${sl.id}|${c.pid}" title="Rimuovi">${IC.close}</button></div>`}
      </div>
    </div>`;
  const tagOpts=SLOT_TAGS.map(([v,l])=>`<option value="${v}" ${(sl.tag||'')===v?'selected':''}>${l}</option>`).join('');
  return `<div class="card" style="padding:12px 14px;margin-bottom:10px">
    <div class="slothead"><select class="tagsel" data-tag="${sl.id}">${tagOpts}</select></div>
    ${row}
    ${resolved?`<button class="btn ghost sm" data-undo="${sl.id}" style="margin-top:8px">Annulla acquisto</button>`:''}</div>`;
}

/* ---- 2ª/3ª scelta picker ---- */
function pickerHtml(role){
  return `<div class="between" style="margin-bottom:12px"><h2 style="font-size:17px">Aggiungi obiettivo · ${esc(ROLE_NAME[role])}</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <input class="input" id="pkq" placeholder="Cerca…" data-picker="${role}" style="margin-bottom:12px">
    <div class="plist" id="pkrows">${pickerRows(role,'')}</div>`;}
function pickerRows(role,q){q=(q||'').toLowerCase();const chosen=new Set();A().slots.forEach(s=>s.cand.forEach(c=>chosen.add(c.pid)));
  const arr=PLAYERS.filter(p=>p.r===role&&!chosen.has(p.id)&&(!q||p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q))).sort((a,b)=>(b.qtA||0)-(a.qtA||0)).slice(0,60);
  if(!arr.length)return `<div class="empty" style="padding:20px">Nessuno</div>`;
  return arr.map(p=>`<div class="pcard" data-pick="${p.id}"><span class="chip ${p.r}">${p.r}</span>
    <div><div class="nm">${esc(p.nome)}</div><div class="mt">${esc(p.sq)}</div></div><div class="push"></div>${canViewStats()?`<div class="qt num">${pctFmt(p)}</div><div class="faint small">consigl.</div>`:''}</div>`).join('');}

/* ---- workspace nav + render ---- */
function renderNav(){
  const items=[['assistente',esc(A().name),IC.wand],['formazioni','Formazioni squadre',IC.pitch]];
  $('#nav').innerHTML=items.map(([k,l,ic])=>`<button data-tab="${k}" class="${R.tab===k?'on':''}">${ic}<span>${l}</span></button>`).join('');
}
function render(){
  if(!A()){location.href='aste.html';return;}
  renderTop('aste'); renderNav();
  const v=$('#view');
  if(R.tab==='formazioni') v.innerHTML=viewFormazioni();
  else { v.innerHTML=viewAssistente(); bindAssist(); }
  if(R.openSlot) renderSlotModal();
}

/* ---- workspace-only events ---- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-phase],[data-buy],[data-rmcand],[data-addslot],[data-undo],[data-pick],[data-slot]');
  if(!t)return;const d=t.dataset;
  if(d.slot){openSlotModal(d.slot);return;}
  if(d.tab){R.tab=d.tab;render();return;}
  if(d.phase){R.phase=d.phase;R.af.rm='';R.tab='assistente';render();window.scrollTo(0,0);return;}
  if(d.rmcand){const[sid,pid]=d.rmcand.split('|');removeCand(sid,+pid);render();return;}
  if(d.addslot){const[role,tagVal]=d.addslot.split('|');R.pickerTag=tagVal;openModal(pickerHtml(role));return;}
  if(d.undo){const sl=A().slots.find(x=>x.id===d.undo);if(sl){sl.esito=null;save();render();}return;}
  if(d.buy){const[sid,pid]=d.buy.split('|');const sl=A().slots.find(x=>x.id===sid);const c=sl&&sl.cand.find(x=>x.pid==pid);
    const val=prompt('A quanti crediti hai preso '+byId[+pid].nome+'?',c?pctToCredits(c.pct):0);
    if(val!==null){const n=parseFloat(val);if(!isNaN(n)){sl.esito={pid:+pid,pct:creditsToPct(n)};save();render();}}return;}
  if(d.pick!=null){addSlot(+d.pick,{tag:R.pickerTag});R.pickerTag=null;closeModal();render();return;}
});
document.addEventListener('input',e=>{const el=e.target;
  if(el.dataset.picker!=null){$('#pkrows').innerHTML=pickerRows(el.dataset.picker,el.value);return;}});
document.addEventListener('change',e=>{const el=e.target;
  if(el.dataset.price!=null){const[sid,pid]=el.dataset.price.split('|');const sl=A().slots.find(x=>x.id===sid);const c=sl&&sl.cand.find(x=>x.pid==pid);const n=parseFloat(el.value);
    if(c&&!isNaN(n)){c.pct=creditsToPct(n);save();render();}return;}
  if(el.dataset.tag!=null){const sl=A().slots.find(x=>x.id===el.dataset.tag);if(sl){sl.tag=el.value;save();render();}return;}});

/* ---- drag & drop: grab an objective card and drop it on another fascia box (empty or not)
   to move it there; dropping on a card within the same box reorders it. ---- */
function reorderSlot(draggedId,targetId,after,tag){
  const a=A();if(!a)return;
  const di=a.slots.findIndex(s=>s.id===draggedId);if(di<0)return;
  const[dragged]=a.slots.splice(di,1);
  if(tag)dragged.tag=tag;
  const ti=targetId?a.slots.findIndex(s=>s.id===targetId):-1;
  if(ti<0){a.slots.push(dragged);}else{a.slots.splice(after?ti+1:ti,0,dragged);}
  save();
}
document.addEventListener('dragstart',e=>{
  const cl=e.target.closest&&e.target.closest('.obj-cluster[data-slot]');
  if(cl){e.dataTransfer.setData('application/x-fanta-slot',cl.dataset.slot);e.dataTransfer.effectAllowed='move';cl.classList.add('dragging');}
});
document.addEventListener('dragend',e=>{
  const cl=e.target.closest&&e.target.closest('.obj-cluster[data-slot]');if(cl)cl.classList.remove('dragging');
});
document.addEventListener('dragover',e=>{
  if(!e.target.closest||!e.target.closest('.obj-outer[data-fascia]'))return;
  e.preventDefault();e.dataTransfer.dropEffect='move';
});
document.addEventListener('drop',e=>{
  if(!e.dataTransfer.types.includes('application/x-fanta-slot'))return;
  const outer=e.target.closest&&e.target.closest('.obj-outer[data-fascia]');if(!outer)return;
  e.preventDefault();
  const draggedId=e.dataTransfer.getData('application/x-fanta-slot');if(!draggedId)return;
  const targetTag=outer.dataset.fascia;
  const cl=e.target.closest&&e.target.closest('.obj-cluster[data-slot]');
  let targetId=null,after=true;
  if(cl&&cl.dataset.slot!==draggedId){targetId=cl.dataset.slot;
    const rect=cl.getBoundingClientRect();after=(e.clientY-rect.top)>rect.height/2;}
  reorderSlot(draggedId,targetId,after,targetTag);render();
});

render();
