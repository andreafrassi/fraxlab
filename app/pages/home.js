"use strict";
function renderHomeView(){
  const recent=DB.auctions.slice().sort((x,y)=>(y.createdAt||0)-(x.createdAt||0)).slice(0,3);
  const nplayers=PLAYERS.length;
  const tileLink=(href,cls,ic,tt,td)=>`<a class="tile ${cls}" href="${href}">
    <div class="ti ${cls}">${ic}</div><div class="tt">${tt} <span class="go">${IC.fwd}</span></div><div class="td">${td}</div></a>`;
  const tileBtn=(cls,ic,tt,td)=>`<button class="tile ${cls}" data-act="new-auction">
    <div class="ti ${cls}">${ic}</div><div class="tt">${tt} <span class="go">${IC.fwd}</span></div><div class="td">${td}</div></button>`;
  const recentHtml=recent.length?`<div class="sec-title" style="margin:26px 0 12px">Riprendi da dove eri</div>
    <div class="recent-grid">`+recent.map(a=>{const bs=budgetStats(a),pct=Math.round(bs.got/25*100);
      return `<a class="card recent" href="asta.html?id=${encodeURIComponent(a.id)}">
        <div class="between"><div style="min-width:0"><div class="rname">${esc(a.name)}</div>
          <div class="muted small">${bs.got}/25 · ${a.slots.length} obiettivi</div></div><span class="go2">${IC.fwd}</span></div>
        <div class="bar" style="margin-top:12px"><i style="width:${pct}%"></i></div></a>`;}).join('')+`</div>`:'';
  $('#view').innerHTML=`<div class="home-wrap">
    <section class="hero hair">
      <span class="eyebrow"><span class="pulse"></span> Stagione 2025/26 · Lega Sandrini</span>
      <h1>Arriva all'asta<br><span class="grad">con le idee chiare.</span></h1>
      <p>Costruisci la strategia reparto per reparto, fissa i prezzi massimi e tieni il budget sotto controllo in tempo reale. Dati di 3 stagioni, valori dell'asta dello scorso anno e i consigli degli esperti.</p>
      <div class="cta-row">
        <button class="btn primary lg" data-act="new-auction">${IC.wand} Crea la tua strategia</button>
        <a class="btn lg" href="listone.html">${IC.list} Sfoglia il listone</a>
      </div>
    </section>
    <div class="tiles">
      ${tileBtn('violet',IC.wand,'Crea la tua strategia','Assistente a 4 reparti: la tua PreAsta passo dopo passo.')}
      ${tileLink('aste.html','blue',IC.target,'Le tue strategie','Riprendi e confronta le tue bozze salvate.')}
      ${tileLink('listone.html','green',IC.list,'Il listone',nplayers+' giocatori, statistiche e valori consigliati.')}
      ${tileLink('leghe.html','pink',IC.gavel,'Asta','Squadre, crediti e assegnazione giocatori in tempo reale.')}
      ${tileLink('guida.html','amber',IC.book,"Guida all'asta",'Come dividere il budget e comporre i 25.')}
      ${tileLink('consigli.html','cyan',IC.bulb,'Consigli','Dritte per ruolo e i 10 errori da evitare.')}
    </div>
    ${recentHtml}
  </div>`;
}
function render(){renderTop(null);renderHomeView();}
render();
