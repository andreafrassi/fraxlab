"use strict";
function renderConsigliView(){
  const cons=ROLES.map(Rr=>`<div class="card"><h3 style="font-size:15px;margin-bottom:8px"><span class="chip ${Rr}">${Rr}</span> ${ROLE_NAME[Rr]}</h3>
    <ul class="list-clean muted small" style="margin:0;padding-left:18px;line-height:1.7">${STRAT.consigli_per_ruolo[Rr].map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  const err=STRAT.errori_da_evitare.map(e=>`<li>${esc(e)}</li>`).join('');
  $('#view').innerHTML=`<div class="page-head"><h1>Consigli</h1>
    <p>Dritte per reparto e i classici errori che rovinano un'asta. Sintesi dalle fonti esperte.</p></div>
    <div class="home-wrap">
      <div class="sec-title">Consigli per ruolo</div>
      <div class="cons-grid">${cons}</div>
      <div class="card" style="margin-top:14px"><div class="sec-title">10 errori da evitare</div>
        <ol class="list-clean muted small" style="margin:0;padding-left:20px;line-height:1.7">${err}</ol>
        <div class="faint small" style="margin-top:10px">Fonti: Fantacalcio.it, Sky Sport, Fantapazz, Goal, Fantalgoritmo.</div></div>
    </div>`;
}
function render(){renderTop('consigli');renderConsigliView();}
render();
