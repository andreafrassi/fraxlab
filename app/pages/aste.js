"use strict";
function renderAsteView(){
  const list=DB.auctions.slice().sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  const cards=list.map(a=>{const bs=budgetStats(a),t=template(a);
    return `<div class="card" style="cursor:pointer;padding:15px" data-open-auction="${a.id}">
      <div class="between"><div style="min-width:0"><h2 style="font-size:17px">${esc(a.name)}</h2>
        <div class="muted small">${esc(t.nome.split(' (')[0])}${a.description?' · '+esc(a.description):''}</div></div>
        <div class="row" style="gap:6px">
          <button class="iconbtn" data-ren="${a.id}">${IC.edit}</button>
          <button class="iconbtn" data-dup="${a.id}">${IC.copy}</button>
          <button class="iconbtn" data-del="${a.id}">${IC.trash}</button></div></div>
      <div class="row" style="gap:16px;margin-top:12px">
        <div><div class="num" style="font-weight:750;font-size:18px">${bs.got}<span class="faint" style="font-size:13px">/25</span></div><div class="faint small">rosa</div></div>
        <div><div class="num" style="font-weight:750;font-size:18px">${fmtCr(bs.speso)}</div><div class="faint small">speso</div></div>
        <div><div class="num" style="font-weight:750;font-size:18px;color:${bs.residuo<0?'var(--neg)':'var(--text)'}">${fmtCr(bs.residuo)}</div><div class="faint small">residuo</div></div>
        <div class="push" style="flex:1"></div><span class="tag blue">${a.slots.length} obiettivi</span></div>
      <div class="bar" style="margin-top:12px"><i style="width:${Math.round(bs.got/25*100)}%"></i></div></div>`;}).join('');
  $('#view').innerHTML=`<div style="max-width:760px;margin:0 auto"><div class="between" style="margin-bottom:18px">
    <div><h1 style="font-size:22px">Le tue strategie</h1><div class="muted small">Una bozza per ogni lega o scenario.</div></div>
    <div class="row" style="gap:8px"><a class="backbtn" href="index.html">${IC.back} Home</a><button class="btn primary" data-act="new-auction">${IC.plus} Nuova</button></div></div>
    ${list.length?cards:`<div class="empty">${IC.target}<div>Nessuna strategia ancora</div>
      <button class="btn primary" data-act="new-auction" style="margin:14px auto 0">${IC.plus} Crea la prima</button></div>`}</div>`;
}
function render(){renderTop('aste');renderAsteView();}
render();
