
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const builtInItems=[
 ['Galvanized Hell','galvanized_hell','galvanized-hell',20],['Galvanized Chamber','galvanized_chamber','galvanized-chamber',75],['Galvanized Aptitude','galvanized_aptitude','galvanized-aptitude',65],['Galvanized Acceleration','galvanized_acceleration','galvanized-acceleration',18],['Galvanized Savvy','galvanized_savvy','galvanized-savvy',20],['Galvanized Shot','galvanized_shot','galvanized-shot',55],
 ['Glaive Prime Blueprint','glaive_prime_blueprint','glaive-prime',25],['Revenant Prime Set','revenant_prime_set','revenant-prime',42],['Wisp Prime Systems Blueprint','wisp_prime_systems_blueprint','wisp-prime',18],['Mesa Prime Set','mesa_prime_set','mesa-prime',75],['Volt Prime Set','volt_prime_set','volt-prime',95],['Condition Overload','condition_overload','condition-overload',12],['Primed Flow','primed_flow','primed-flow',40],['Syam','syam','syam',20]
].map(([name,slug,base,price])=>({name,slug,base,price}));
let marketItems=[...builtInItems], current={...builtInItems[0]}, currentFile=null, inventory=JSON.parse(localStorage.getItem('tennoInventory')||'[]'), settings=JSON.parse(localStorage.getItem('tennoSettings')||'{"platform":"pc"}');

function save(){localStorage.setItem('tennoInventory',JSON.stringify(inventory));render()}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function go(name){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+name+'View').classList.add('active');$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.go===name));window.scrollTo({top:0,behavior:'smooth'});render()}
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#settingsBtn').onclick=()=>go('settings');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function similarity(a,b){a=normalize(a);b=normalize(b);if(!a||!b)return 0;if(a===b)return 100;if(a.includes(b)||b.includes(a))return 88;const aw=a.split(' '),bw=b.split(' ');let hits=0;for(const x of aw)for(const y of bw){if(x===y)hits+=2;else if(x.length>3&&y.length>3&&(x.includes(y)||y.includes(x)))hits+=1}return Math.round(100*hits/(aw.length+bw.length))}

function tokenSet(s){
  return normalize(s).split(' ').filter(function(t){return t.length>2});
}

// Bewertet, wie gut eine einzelne Textzeile zu einem Itemnamen passt.
// Ein Treffer braucht uebereinstimmende Woerter, nicht nur aehnliche Buchstabenfolgen.
function scoreLine(line,item){
  let best=0;
  for(const alias of aliasList(item)){
    const a=normalize(alias),l=normalize(line);
    if(!a||!l)continue;
    if(a===l){best=Math.max(best,100);continue}
    const at=tokenSet(alias),lt=tokenSet(line);
    if(!at.length||!lt.length)continue;
    let hits=0;
    at.forEach(function(t){
      if(lt.indexOf(t)>=0)hits+=1;
      else if(t.length>=5&&lt.some(function(x){return x.length>=5&&(x.indexOf(t)>=0||t.indexOf(x)>=0)}))hits+=0.5;
    });
    const ratio=hits/at.length;
    // eine Zeile darf nicht viel laenger sein als der Itemname, sonst ist es Fliesstext
    const lengthPenalty=lt.length>at.length+3?0.5:1;
    const score=Math.round(ratio*100*lengthPenalty);
    if(score>best)best=score;
  }
  return best;
}

const cleanLine=s=>s.replace(/[\u2022\u00b7\u2605\u2606\u25cf\u25a0:;|>_*"']/g,' ').replace(/\s+/g,' ').trim();
function buildCandidates(text){
  const raw=text.split(String.fromCharCode(10)).map(function(x){return cleanLine(x)})
    .filter(function(x){return x.length>2&&/[a-zA-Z\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]/.test(x)});
  const out=raw.slice();
  for(let i=0;i<raw.length-1;i++){
    out.push(raw[i]+' '+raw[i+1]);
    if(i<raw.length-2)out.push(raw[i]+' '+raw[i+1]+' '+raw[i+2]);
  }
  return out;
}
function sharedTokens(line,item){
  const lt=tokenSet(line);let n=0;
  aliasList(item).forEach(function(al){tokenSet(al).forEach(function(x){if(lt.indexOf(x)>=0)n++})});
  return n;
}
function bestMatches(text){
  const lines=text.split(String.fromCharCode(10)).map(function(x){return x.trim()}).filter(function(x){return x.length>3});
  const scored=marketItems.map(function(item){
    let best=0;
    lines.forEach(function(line){const s=scoreLine(line,item);if(s>best)best=s});
    return {item:item,score:best};
  });
  scored.sort(function(a,b){return b.score-a.score});
  return scored.slice(0,4);
}

function lineMatches(text){
  const found=[],used={};
  buildCandidates(text).forEach(function(line){
    let top=null;
    marketItems.forEach(function(item){
      const sc=scoreLine(line,item);
      if(!top||sc>top.score)top={item:item,score:sc};
    });
    if(!top)return;
    const shared=sharedTokens(line,top.item);
    const threshold=(shared>=2)?58:74;
    if(top.score>=threshold&&!used[top.item.slug]){
      used[top.item.slug]=1;
      found.push({name:top.item.name,slug:top.item.slug,line:line,score:top.score});
    }
  });
  found.sort(function(x,y){return y.score-x.score});
  return found.slice(0,6);
}
function plausibleNames(text){
  return buildCandidates(text).filter(function(l){
    const w=l.split(' ').filter(function(x){return x.length>1});
    return w.length>=2&&w.length<=5&&l.length<=52;
  }).slice(0,6);
}
function extractNames(raw){
  const hits=lineMatches(raw);
  if(hits.length)return {names:hits.map(function(h){return h.name}),certain:true};
  return {names:plausibleNames(raw),certain:false};
}

async function judgeRelics(){
  const raw=$('#relicInput').value.split(String.fromCharCode(10)).map(function(x){return x.trim()}).filter(Boolean);
  if(!raw.length){toast('Bitte zuerst fotografieren oder Namen eintragen');return}
  const box=$('#relicResult');
  const rows=[];
  for(let i=0;i<raw.length;i++){
    box.innerHTML='<div class="progress-note">Preise werden geprüft \\u2026 ('+(i+1)+'/'+raw.length+')</div>';
    const item=matchItem(raw[i]);
    const p=await fetchTopPrice(item);
    rows.push({name:raw[i],shown:item.name,slug:item.slug,price:p.price,source:p.source,error:p.error});
    await new Promise(function(r){setTimeout(r,340)});
  }
  const withPrice=rows.filter(function(r){return r.price});
  const sorted=withPrice.slice().sort(function(a,b){return b.price-a.price});
  const best=sorted.length?sorted[0]:null;
  renderVerdict(rows,best);
}

function renderVerdict(rows,best){
  const box=$('#relicResult');
  let html='';
  if(best){
    html+='<div class="verdict"><span>AM WERTVOLLSTEN</span><strong>'+best.name+'</strong><em>ca. '+best.price+' Platin</em></div>';
  }else{
    html+='<div class="verdict" style="background:linear-gradient(135deg,#ff9aa6,#c0455a)"><span>KEIN PREIS ERMITTELT</span><strong>Namen prüfen</strong><em>Bitte Schreibweise kontrollieren</em></div>';
  }
  const sorted=rows.slice().sort(function(a,b){return (b.price||0)-(a.price||0)});
  sorted.forEach(function(r){
    const i=rows.indexOf(r);
    const isBest=best&&r.name===best.name;
    const note=r.source==='live'?'Live-Angebot von Warframe.market':r.source==='schaetzung'?'Lokale Schätzung \\u2013 API nicht erreichbar':(r.error||'Kein Preis');
    html+='<article class="relic-card'+(isBest?' best':'')+'">'
      +'<div class="rank">'+(isBest?'\\u2605':i+1)+'</div>'
      +'<div><h4>'+r.name+'</h4><p>'+note+(r.shown&&r.shown!==r.name?' \\u00b7 erkannt als '+r.shown:'')+'</p></div>'
      +'<div class="relic-price"><strong>'+(r.price==null?'\\u2013':r.price)+'</strong><small>'+(r.price==null?'kein Preis':'Platin')+'</small></div>'
      +'<div class="relic-actions">'
      +'<button class="mini-action" data-addrow="'+i+'">+ Inventar</button>'
      +'<a class="mini-action gold" href="https://warframe.market/items/'+r.slug+'?type=sell" target="_blank" rel="noopener">Verkaufen \\u2197</a>'
      +'</div></article>';
  });
  box.innerHTML=html;
  $$('[data-addrow]').forEach(function(b){
    b.onclick=function(){
      const r=rows[Number(b.dataset.addrow)];
      addToSession(r.name,r.price);
      openResultFor(r.name,r.price);
    };
  });
}

function addToSession(name,price){
  if(!name||!name.trim())return;
  session.push({name:name.trim(),price:price||null});
  toast('Zum Inventar hinzugefügt');
}

function openResultFor(name,price){
  current=matchItem(name);
  current.price=price||current.price||10;
  $('#resultName').textContent=current.name;
  $('#resultSlug').textContent=current.slug;
  $('#resultInitial').textContent=current.name[0].toUpperCase();
  $('#priceInput').value=current.price;
  $('#resultPrice').textContent=current.price;
  $('#quantityInput').value=1;
  $('#notesInput').value='';
  $('#marketLink').href='https://warframe.market/items/'+current.slug+'?type=sell';
  $('#overframeLink').href='https://overframe.gg/items/all/?q='+encodeURIComponent(current.base.replaceAll('-',' '));
  go('result');
}

async function handleRelicPhotos(files){
  const list=[].slice.call(files||[]);
  if(!list.length)return;
  go('relic');
  let allNames=[],unsure=false;
  for(let i=0;i<list.length;i++){
    const f=list[i];
    addPhoto(URL.createObjectURL(f));
    setRelicStatus('Foto '+(i+1)+' von '+list.length+' wird gelesen \\u2026');
    try{
      const raw=await readOnePhoto(f,'Foto '+(i+1));
      lastRawText=raw;
      lastRawText=raw;
      const res=extractNames(raw);
      if(!res.certain)unsure=true;
      res.names.forEach(function(n){if(allNames.indexOf(n)<0)allNames.push(n)});
      $('#relicInput').value=allNames.join(String.fromCharCode(10));
    }catch(e){
      setRelicStatus('Foto '+(i+1)+' konnte nicht gelesen werden: '+(e.message||e));
      console.error(e);
    }
  }
  if(!allNames.length){
    showRawText();
    setRelicStatus('Keine Belohnung sicher erkannt. Prüfe unten den gelesenen Text und tippe die Namen gegebenenfalls selbst ein.');
    return;
  }
  await judgeRelics();
}

$('#relicBtn').onclick=function(){go('relic')};
$('#relicShotBtn').onclick=function(){$('#relicCameraInput').click()};
$('#relicShotAgainBtn').onclick=function(){$('#relicCameraInput').click()};
$('#clearRelicBtn').onclick=function(){relicPhotos=[];renderThumbs();$('#relicInput').value='';$('#relicResult').innerHTML='';setRelicStatus('Bereit. Fotografiere den Belohnungsbildschirm.')};
$('#relicCameraInput').onchange=function(e){handleRelicPhotos(e.target.files)};
$('#relicGalleryInput').onchange=function(e){handleRelicPhotos(e.target.files)};
$('#priceAllBtn').onclick=judgeRelics;
$('#addToSessionBtn').onclick=function(){addToSession($('#recognizedName').value,null)};
$('#anotherPhotoBtn').onclick=function(){$('#cameraInput').click()};
$('#sessionClear').onclick=function(){session=[];toast('Geleert')};
renderThumbs();
