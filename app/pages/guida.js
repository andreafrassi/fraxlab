"use strict";
function renderGuidaView(){
  const mods=STRAT.template_budget.map(t=>{
    const split=ROLES.map(Rr=>`<div class="gsplit"><span class="chip ${Rr}">${Rr}</span><b class="num">${Math.round(t.ripartizione_pct[Rr]*100)}%</b><span class="muted small">${ROLE_NAME[Rr]}</span></div>`).join('');
    return `<div class="card"><h3 style="font-size:15px">${esc(t.nome)}</h3>
      <div class="muted small" style="margin:6px 0 12px">${esc(t.quando)}</div>
      <div class="gsplit-grid">${split}</div></div>`;}).join('');
  const comp=STRAT.composizione_rosa.map(c=>`<li><b>${c.min}${c.max!==c.min?'-'+c.max:''}</b> ${esc(c.categoria)} <span class="muted">— ${esc(c.nota)}</span></li>`).join('');
  $('#view').innerHTML=`<div class="page-head"><h1>Guida all'asta</h1>
    <p>Prima il modulo, poi il budget. Scegli la ripartizione in base ai modificatori della tua lega, poi componi una rosa equilibrata di 25.</p></div>
    <div class="home-wrap">
      <div class="sec-title">Come dividere il budget</div>${mods}
      <div class="card" style="margin-top:14px"><div class="sec-title">Composizione ideale dei 25</div>
        <ul class="list-clean" style="margin:0;padding-left:20px;line-height:1.8">${comp}</ul>
        <div class="faint small" style="margin-top:10px">Regola bonus: gol attesi degli 11 titolari ≈ 2 × giornate (~76 su 38). Senza bonus non si vince.</div></div>
    </div>`;
}
function render(){renderTop('guida');renderGuidaView();}
render();
