"use strict";
/* Pannello riservato: elenco iscritti + interruttore accesso ai dati giocatori. */
let ADM={rows:null,loading:false,error:null};

function loadRows(){
  if(!sb||!isAdmin()||ADM.loading)return;
  ADM.loading=true;
  sb.from('profiles').select('*').order('created_at',{ascending:true}).then(({data,error})=>{
    ADM.loading=false;
    if(error){ADM.error=error.message;ADM.rows=[];}
    else{ADM.error=null;ADM.rows=data||[];}
    render();
  });
}
function toggleAccess(id,next){
  if(!sb)return;
  sb.from('profiles').update({can_view_players:next}).eq('id',id).then(({error})=>{
    if(error){alert('Non riuscito: '+error.message);return;}
    const r=(ADM.rows||[]).find(x=>x.id===id);
    if(r)r.can_view_players=next;
    render();
  });
}

function rowHtml(r){
  const me=AUTH.user&&r.id===AUTH.user.id;
  const on=!!r.can_view_players||!!r.is_admin;
  const when=r.created_at?new Date(r.created_at).toLocaleDateString('it-IT'):'';
  return `<div class="pcard">
    <span class="acc-dot ${on?'on':''}" aria-hidden="true"></span>
    <div class="pmid"><div class="pname">${esc(r.email||'(senza email)')}
      ${r.is_admin?'<span class="tag violet" style="padding:1px 6px">admin</span>':''}
      ${me?'<span class="tag blue" style="padding:1px 6px">tu</span>':''}</div>
      <div class="pmeta">iscritto il ${esc(when)}</div></div>
    ${r.is_admin
      ? `<span class="tag green">accesso completo</span>`
      : `<button class="btn sm ${on?'':'primary'}" data-toggle="${esc(r.id)}" data-next="${on?'0':'1'}">
           ${on?'Revoca accesso':'Concedi accesso'}</button>`}
  </div>`;
}

function renderAdminView(){
  if(!AUTH.ready){$('#view').innerHTML=`<div class="empty">${IC.clock}<div>Un attimo…</div></div>`;return;}
  if(!isAdmin()){
    $('#view').innerHTML=`<div class="empty">${IC.lock}<div>Area riservata</div>
      <a class="btn" href="index.html" style="margin:16px auto 0">Torna alla home</a></div>`;
    return;}
  if(ADM.rows===null){loadRows();$('#view').innerHTML=`<div class="empty">${IC.clock}<div>Carico gli iscritti…</div></div>`;return;}
  const rows=ADM.rows;
  const attesa=rows.filter(r=>!r.can_view_players&&!r.is_admin).length;
  $('#view').innerHTML=`<div class="page-head"><h1>Gestione accessi</h1>
    <p>Decidi chi può vedere le informazioni sui giocatori. Chi non è approvato usa il sito ma non vede listone, formazioni e schede.</p></div>
    <div class="home-wrap">
      ${ADM.error?`<div class="tag red" style="display:block;padding:10px;margin-bottom:12px">${esc(ADM.error)}</div>`:''}
      <div class="between" style="margin-bottom:10px">
        <div class="sec-title" style="margin:0">${rows.length} iscritt${rows.length===1?'o':'i'}</div>
        ${attesa?`<span class="tag amber">${attesa} in attesa</span>`:''}
      </div>
      <div class="plist">${rows.map(rowHtml).join('')}</div>
    </div>`;
}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-toggle]');
  if(!t)return;
  toggleAccess(t.dataset.toggle,t.dataset.next==='1');
});

function render(){renderTop('admin');renderAdminView();}
render();
