"use strict";
R.gf={q:'',r:'',sq:'',rm:'',sort:'qt'};
function renderListoneView(){
  const f=R.gf,q=f.q.trim().toLowerCase();
  const teams=[...new Set(PLAYERS.map(p=>p.sq))].sort();
  const byRole=PLAYERS.filter(p=>!f.r||p.r===f.r);
  const mantraCodes=mantraCodesFor(byRole);
  let arr=PLAYERS.filter(p=>{if(f.r&&p.r!==f.r)return false;if(f.sq&&p.sq!==f.sq)return false;
    if(f.rm&&!matchMantra(p,f.rm))return false;
    if(q&&!(p.nome.toLowerCase().includes(q)||p.sq.toLowerCase().includes(q)))return false;return true;});
  sortArr(arr,f.sort);
  $('#view').innerHTML=`<div class="between" style="margin-bottom:14px"><h1 style="font-size:20px">Listone</h1><a class="backbtn" href="index.html">${IC.back} Home</a></div>
  <div class="filters">
    <input class="input" id="lq" placeholder="Cerca…" value="${esc(f.q)}">
    <select class="input" id="lr"><option value="">Ruolo</option>${ROLES.map(r=>`<option value="${r}" ${f.r===r?'selected':''}>${r}</option>`).join('')}</select>
    <select class="input" id="lrm"><option value="">Ruolo specifico</option>${mantraCodes.map(c=>`<option value="${c}" ${f.rm===c?'selected':''}>${esc(MANTRA_LABEL[c])}</option>`).join('')}</select>
    <select class="input" id="lsq"><option value="">Squadra</option>${teams.map(t=>`<option ${f.sq===t?'selected':''}>${t}</option>`).join('')}</select>
    <select class="input" id="lsort">${SORTS.map(([k,l])=>`<option value="${k}" ${f.sort===k?'selected':''}>${l}</option>`).join('')}</select>
  </div>
  <div class="muted small" style="margin:-4px 0 8px">${arr.length} giocatori</div>
  <div class="plist">${arr.map(p=>previewCard(p)).join('')}</div>`;
  bindListone();
}
function bindListone(){
  const q=$('#lq');if(q)q.addEventListener('input',e=>{R.gf.q=e.target.value;render();setTimeout(()=>{const el=$('#lq');if(el){el.focus();el.selectionStart=el.value.length;}});});
  [['#lr','r'],['#lrm','rm'],['#lsq','sq'],['#lsort','sort']].forEach(([sel,key])=>{const el=$(sel);if(el)el.addEventListener('change',e=>{R.gf[key]=e.target.value;if(key==='r')R.gf.rm='';render();});});
}
function render(){renderTop('listone');renderListoneView();}
render();
