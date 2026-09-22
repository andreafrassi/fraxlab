"use strict";
function squadraModalHtml(){
  return `<div class="between" style="margin-bottom:14px"><h2 style="font-size:18px">Nuova squadra</h2><button class="iconbtn" data-act="close">${IC.close}</button></div>
    <div class="field"><label for="sqn-n">Nome</label><input class="input" id="sqn-n" value="Squadra ${DB.squadre.length+1}" placeholder="Es. Nome lega…"></div>
    <button class="btn primary" data-act="save-new-squadra" style="width:100%">${IC.plus} Crea squadra</button>`;
}
function openSquadraModal(){openModal(squadraModalHtml());}
function renderSquadreView(){
  const list=DB.squadre.slice().sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  const cards=list.map(sq=>{
    const counts={P:0,D:0,C:0,A:0};sq.players.forEach(id=>{const p=byId[id];if(p)counts[p.r]++;});
    return `<div class="card" style="cursor:pointer;padding:15px" data-open-squadra="${sq.id}">
      <div class="between"><div style="min-width:0"><h2 style="font-size:17px">${esc(sq.name)}</h2>
        <div class="muted small">${sq.players.length}/25 · modulo ${esc(sq.formation)}</div></div>
        <div class="row" style="gap:6px">
          <button class="iconbtn" data-ren-squadra="${sq.id}">${IC.edit}</button>
          <button class="iconbtn" data-dup-squadra="${sq.id}">${IC.copy}</button>
          <button class="iconbtn" data-del-squadra="${sq.id}">${IC.trash}</button></div></div>
      <div class="row" style="gap:16px;margin-top:12px">
        <div><div class="num" style="font-weight:750;font-size:18px">${counts.P}</div><div class="faint small">P</div></div>
        <div><div class="num" style="font-weight:750;font-size:18px">${counts.D}</div><div class="faint small">D</div></div>
        <div><div class="num" style="font-weight:750;font-size:18px">${counts.C}</div><div class="faint small">C</div></div>
        <div><div class="num" style="font-weight:750;font-size:18px">${counts.A}</div><div class="faint small">A</div></div>
        <div class="push" style="flex:1"></div></div>
      <div class="bar" style="margin-top:12px"><i style="width:${Math.round(sq.players.length/25*100)}%"></i></div></div>`;}).join('');
  $('#view').innerHTML=`<div class="home-wrap"><div class="between" style="margin-bottom:18px">
    <div><h1 style="font-size:22px">Le tue squadre</h1><div class="muted small">La rosa definitiva per ogni lega: da qui il consiglio su chi schierare ogni settimana.</div></div>
    <div class="row" style="gap:8px"><a class="backbtn" href="index.html">${IC.back} Home</a><button class="btn primary" data-act="new-squadra">${IC.plus} Nuova</button></div></div>
    ${list.length?`<div class="leghe-grid">${cards}</div>`:`<div class="empty">${IC.team}<div>Nessuna squadra ancora</div>
      <button class="btn primary" data-act="new-squadra" style="margin:14px auto 0">${IC.plus} Crea la prima</button></div>`}</div>`;
}
function render(){renderTop(null);renderSquadreView();}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act],[data-open-squadra],[data-ren-squadra],[data-dup-squadra],[data-del-squadra]');
  if(!t)return;const d=t.dataset;
  if(d.renSquadra){const sq=DB.squadre.find(x=>x.id===d.renSquadra);const n=prompt('Nome:',sq.name);if(n&&n.trim()){sq.name=n.trim();save();render();}return;}
  if(d.dupSquadra){const sq=DB.squadre.find(x=>x.id===d.dupSquadra);const c=JSON.parse(JSON.stringify(sq));c.id=uid('q');c.name=sq.name+' (copia)';c.createdAt=Date.now();DB.squadre.push(c);save();render();return;}
  if(d.delSquadra){const sq=DB.squadre.find(x=>x.id===d.delSquadra);if(confirm('Eliminare "'+sq.name+'"?')){DB.squadre=DB.squadre.filter(x=>x.id!==d.delSquadra);save();render();}return;}
  if(d.openSquadra){location.href='squadra.html?id='+encodeURIComponent(d.openSquadra);return;}
  if(d.act==='new-squadra'){openSquadraModal();return;}
  if(d.act==='save-new-squadra'){
    const name=$('#sqn-n').value.trim()||'Squadra';
    const sq={id:uid('q'),name,players:[],formation:'3-4-3',createdAt:Date.now()};
    DB.squadre.push(sq);save();location.href='squadra.html?id='+encodeURIComponent(sq.id);return;}
});
render();
