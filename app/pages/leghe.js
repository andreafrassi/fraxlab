"use strict";
function legaModalHtml(){
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Nuova asta</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="field"><label for="lg-n">Nome</label><input class="input" id="lg-n" value="Asta ${DB.leghe.length+1}" placeholder="Es. Lega amici…"></div>
    <div class="field"><label for="lg-t">Numero di squadre</label><input class="input num" id="lg-t" type="number" min="2" max="20" value="8"></div>
    <div class="field"><label for="lg-b">Crediti per squadra</label><input class="input num" id="lg-b" type="number" min="1" value="500"></div>
    <button class="btn primary" data-act="save-new-lega" style="width:100%">${IC.plus} Crea asta</button>`;
}
function openLegaModal(){openModal(legaModalHtml());}
function renderLegheView(){
  const list=DB.leghe.slice().sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  const cards=list.map(lg=>{
    const done=legaAssignedCount(lg);
    return `<div class="card" style="cursor:pointer;padding:15px" data-open-lega="${lg.id}">
      <div class="between"><div style="min-width:0"><h2 style="font-size:17px">${esc(lg.name)}</h2>
        <div class="muted small">${lg.teams.length} squadre · ${fmtCredits(lg.budget)} cr a testa</div></div>
        <div class="row" style="gap:6px">
          <button class="iconbtn" data-ren-lega="${lg.id}">${IC.edit}</button>
          <button class="iconbtn" data-dup-lega="${lg.id}">${IC.copy}</button>
          <button class="iconbtn" data-del-lega="${lg.id}">${IC.trash}</button></div></div>
      <div class="row" style="gap:16px;margin-top:12px">
        <div><div class="num" style="font-weight:750;font-size:18px">${done}<span class="faint" style="font-size:13px">/${PLAYERS.length}</span></div><div class="faint small">assegnati</div></div>
        <div class="push" style="flex:1"></div><span class="tag blue">${lg.teams.length} squadre</span></div>
      <div class="bar" style="margin-top:12px"><i style="width:${Math.round(done/PLAYERS.length*100)}%"></i></div></div>`;}).join('');
  $('#view').innerHTML=`<div class="home-wrap"><div class="between" style="margin-bottom:18px">
    <div><h1 style="font-size:22px">Asta</h1><div class="muted small">Squadre, crediti e assegnazione giocatori in tempo reale.</div></div>
    <div class="row" style="gap:8px"><a class="backbtn" href="index.html">${IC.back} Home</a><button class="btn primary" data-act="new-lega">${IC.plus} Nuova</button></div></div>
    ${list.length?`<div class="leghe-grid">${cards}</div>`:`<div class="empty">${IC.gavel}<div>Nessuna asta ancora</div>
      <button class="btn primary" data-act="new-lega" style="margin:14px auto 0">${IC.plus} Crea la prima</button></div>`}</div>`;
}
function render(){renderTop('leghe');renderLegheView();}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act],[data-open-lega],[data-ren-lega],[data-dup-lega],[data-del-lega]');
  if(!t)return;const d=t.dataset;
  if(d.renLega){const lg=DB.leghe.find(x=>x.id===d.renLega);const n=prompt('Nome:',lg.name);if(n&&n.trim()){lg.name=n.trim();save();render();}return;}
  if(d.dupLega){const lg=DB.leghe.find(x=>x.id===d.dupLega);const c=JSON.parse(JSON.stringify(lg));c.id=uid('l');c.name=lg.name+' (copia)';c.createdAt=Date.now();DB.leghe.push(c);save();render();return;}
  if(d.delLega){const lg=DB.leghe.find(x=>x.id===d.delLega);if(confirm('Eliminare "'+lg.name+'"?')){DB.leghe=DB.leghe.filter(x=>x.id!==d.delLega);save();render();}return;}
  if(d.openLega){location.href='lega.html?id='+encodeURIComponent(d.openLega);return;}
  if(d.act==='new-lega'){openLegaModal();return;}
  if(d.act==='save-new-lega'){
    const name=$('#lg-n').value.trim()||'Asta',n=Math.max(2,Math.min(20,parseInt($('#lg-t').value,10)||8)),budget=Math.max(1,parseInt($('#lg-b').value,10)||500);
    const lg={id:uid('l'),name,budget,teams:newTeams(n),assign:{},createdAt:Date.now()};
    DB.leghe.push(lg);save();location.href='lega.html?id='+encodeURIComponent(lg.id);return;}
});
render();
