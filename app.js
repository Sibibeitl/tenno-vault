
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

function sharedTokenCount(line,item){
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
  const lines=text.split(String.fromCharCode(10)).map(function(x){return x.trim()}).filter(function(x){return x.length>3});
  const found=[],used={};
  lines.forEach(function(line){
    const ranked=marketItems.map(function(item){return {item:item,score:scoreLine(line,item)}});
    ranked.sort(function(a,b){return b.score-a.score});
    const top=ranked[0];
    const sharedHere=sharedTokenCount(line,top.item);
    const minScore=(sharedHere>=2)?60:75;
    if(top&&top.score>=minScore&&!used[top.item.slug]){
      used[top.item.slug]=1;
      found.push({name:top.item.name,slug:top.item.slug,line:line,score:top.score});
    }
  });
  return found;
}

function setSuggestions(items=marketItems){const dl=$('#itemSuggestions');dl.innerHTML='';items.forEach(x=>{const o=document.createElement('option');o.value=x.name;dl.appendChild(o)})}
function slugify(x){return normalize(x).replaceAll(' ','_')}
function matchItem(name){
  const n=normalize(name);
  if(!n)return null;
  let hit=marketItems.find(function(x){return normalize(x.name)===n||normalize(x.nameDe||'')===n});
  if(!hit)hit=marketItems.find(function(x){
    const a=normalize(x.name),b=normalize(x.nameDe||'');
    return (a.indexOf(n)>=0||n.indexOf(a)>=0||b.indexOf(n)>=0||n.indexOf(b)>=0)&&n.length>4;
  });
  if(!hit)hit=matchByScore(name);
  if(!hit)return null;
  return hit;
}

// Letzter Versuch: ueber die Wortbewertung, aber nur bei klarem Treffer
function matchByScore(name){
  let best=null;
  marketItems.forEach(function(item){
    const sc=scoreLine(name,item);
    if(!best||sc>best.score)best={item:item,score:sc};
  });
  if(best&&best.score>=70)return best.item;
  return null;
}

async function loadMarketItems(){
  // 1. Versuch: beide Sprachen direkt von Warframe.market
  const got=await tryRemoteItems();
  if(got){setSuggestions();logItems('remote');return}
  // 2. Versuch: mitgelieferte Liste (funktioniert ohne Netz)
  const local=await tryLocalItems();
  if(local){setSuggestions();logItems('local');return}
  // 3. Notfall: kleine eingebaute Liste
  marketItems=[...builtInItems];
  setSuggestions();
  logItems('fallback');
}

async function tryRemoteItems(){
  try{
    const r=await fetch('https://api.warframe.market/v2/items',{headers:{Language:'de',Platform:settings.platform||'pc'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.json();
    const list=Array.isArray(body.data)?body.data:(body.data&&body.data.items);
    if(!Array.isArray(list)||!list.length)throw new Error('Liste leer');
    marketItems=list.map(function(x){
      const i=x.i18n||{};
      const en=(i.en&&i.en.name)||x.name||String(x.slug||'').replaceAll('_',' ');
      const de=(i.de&&i.de.name)||en;
      return {name:en,nameDe:de,slug:x.slug,base:String(x.slug||'').replaceAll('_','-'),price:10};
    }).filter(function(x){return x.name&&x.slug});
    mergeBuiltIns();
    return true;
  }catch(e){
    console.warn('Marktliste nicht erreichbar',e);
    return false;
  }
}

async function tryLocalItems(){
  try{
    const r=await fetch('items.json');
    if(!r.ok)throw new Error('HTTP '+r.status);
    const list=await r.json();
    if(!Array.isArray(list)||!list.length)throw new Error('Liste leer');
    marketItems=list.map(function(x){return {name:x.en,nameDe:x.de||x.en,slug:x.slug,base:x.slug.replaceAll('_','-'),price:10}});
    mergeBuiltIns();
    return true;
  }catch(e){
    console.warn('Lokale Itemliste nicht lesbar',e);
    return false;
  }
}

function logItems(quelle){
  const box=document.getElementById('itemCountInfo');
  if(box)box.textContent=marketItems.length+' Items ('+quelle+')';
  console.log('Itemliste:',marketItems.length,'Quelle:',quelle);
}

function mergeBuiltIns(){
  const seen={};marketItems.forEach(function(x){seen[x.slug]=1});
  builtInItems.forEach(function(b){if(!seen[b.slug])marketItems.push(b)});
}

// Deutsche Bezeichnung des aktuellen Marktsprache-Eintrags, falls vorhanden
function aliasList(item){return [item.name,item.nameDe].filter(Boolean)}
function showResult(name){if(!name.trim()){toast('Bitte einen Gegenstand eingeben');return}current=matchItem(name);$('#resultName').textContent=current.name;$('#resultSlug').textContent=current.slug;$('#resultInitial').textContent=current.name[0].toUpperCase();$('#priceInput').value=current.price||10;$('#resultPrice').textContent=current.price||10;$('#quantityInput').value=1;$('#notesInput').value='';$('#marketLink').href=`https://warframe.market/items/${current.slug}?type=sell`;$('#overframeLink').href=`https://overframe.gg/items/all/?q=${encodeURIComponent(current.base.replaceAll('-',' '))}`;go('result')}

function preprocessImage(file){
  return new Promise(function(resolve,reject){
    const img=new Image();
    img.onload=function(){
      const max=2000,scale=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0,c.width,c.height);
      const d=ctx.getImageData(0,0,c.width,c.height),p=d.data;
      // Warframe-Belohnungsnamen sind helle Schrift auf dunklem Grund.
      // Gruen, tuerkis, gelb und weiss werden alle als Schwarz ausgegeben.
      for(let i=0;i<p.length;i+=4){
        const r=p[i],g=p[i+1],bl=p[i+2];
        const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);
        const luma=0.299*r+0.587*g+0.114*bl;
        const bright=luma>115;
        const saturated=(mx-mn)>55;
        if(bright&&(saturated||luma>165)){p[i]=p[i+1]=p[i+2]=0;continue}
        p[i]=p[i+1]=p[i+2]=255;
      }
      ctx.putImageData(d,0,0);
      c.toBlob(resolve,'image/png');
    };
    img.onerror=reject;
    img.src=URL.createObjectURL(file);
  });
}

async function runOCR(file){const status=$('#ocrStatus'),txt=$('#ocrStatusText'),spin=status.querySelector('.spinner');status.className='ocr-status';spin.hidden=false;txt.textContent='Texterkennung wird vorbereitet...';$('#lookupBtn').disabled=true;try{if(!window.Tesseract)throw new Error('OCR-Bibliothek konnte nicht geladen werden. Prüfe die Internetverbindung.');const processed=await preprocessImage(file);const worker=await Tesseract.createWorker('eng+deu',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger:m=>{if(m.status==='recognizing text')txt.textContent=`Text wird erkannt: ${Math.round((m.progress||0)*100)} %`;else txt.textContent=m.status==='loading tesseract core'?'OCR-Engine wird geladen...':'Sprachdaten werden geladen...'}});const result=await worker.recognize(processed);await worker.terminate();const raw=result.data.text||'';$('#ocrRawText').textContent=raw||'Kein Text erkannt.';const matches=bestMatches(raw);if(matches[0]&&matches[0].score>=35){$('#recognizedName').value=matches[0].item.name;status.classList.add('success');txt.textContent=`Erkannt: ${matches[0].item.name} (${Math.min(99,matches[0].score)} % Übereinstimmung)`;showCandidates(matches)}else{status.classList.add('error');txt.textContent='Kein sicherer Itemname erkannt. Bitte Namen eingeben oder ein klareres Foto verwenden.';showCandidates(matches.filter(x=>x.score>10))}}catch(e){status.classList.add('error');txt.textContent=e.message||'Texterkennung fehlgeschlagen. Bitte Namen manuell eingeben.';console.error(e)}finally{spin.hidden=true;$('#lookupBtn').disabled=false}}
function showCandidates(matches){let box=$('#candidateList');if(!box){box=document.createElement('div');box.id='candidateList';box.className='candidate-list';$('#ocrStatus').after(box)}box.innerHTML=matches.slice(0,3).map((x,i)=>`<button class="candidate-button" data-candidate="${encodeURIComponent(x.item.name)}">${i===0?'<b>Vorschlag:</b> ':''}${x.item.name}</button>`).join('');$$('[data-candidate]').forEach(b=>b.onclick=()=>{$('#recognizedName').value=decodeURIComponent(b.dataset.candidate)})}

$('#manualBtn').onclick=()=>{$('#manualModal').hidden=false;$('#manualName').focus()};$('#closeModal').onclick=()=>$('#manualModal').hidden=true;$('#manualModal').onclick=e=>{if(e.target===$('#manualModal'))$('#manualModal').hidden=true};$('#manualLookup').onclick=()=>{$('#manualModal').hidden=true;showResult($('#manualName').value)};$('#manualName').onkeydown=e=>{if(e.key==='Enter')$('#manualLookup').click()};
function openCamera(){$('#cameraInput').click()}$('#navScan').onclick=openCamera;
$('#cameraInput').onchange=e=>{const f=e.target.files[0];if(!f)return;currentFile=f;$('#previewImage').src=URL.createObjectURL(f);$('#recognizedName').value='';$('#ocrRawText').textContent='Erkennung läuft...';go('scan');runOCR(f)};
$('#lookupBtn').onclick=()=>showResult($('#recognizedName').value);$('#recognizedName').onkeydown=e=>{if(e.key==='Enter')$('#lookupBtn').click()};$('#priceInput').oninput=e=>$('#resultPrice').textContent=e.target.value||0;
$('#saveItemBtn').onclick=()=>{const qty=Math.max(1,Number($('#quantityInput').value)||1),price=Math.max(1,Number($('#priceInput').value)||1);inventory.unshift({id:Date.now(),name:current.name,slug:current.slug,base:current.base,price,qty,notes:$('#notesInput').value,date:new Date().toISOString()});save();toast('Zum Inventar hinzugefügt');go('inventory')};
function render(){const count=inventory.reduce((a,x)=>a+x.qty,0),total=inventory.reduce((a,x)=>a+x.qty*x.price,0);$('#itemCount').textContent=count;$('#totalValue').textContent=total.toLocaleString('de-DE');renderList($('#recentList'),inventory.slice(0,3),true);const q=($('#inventorySearch')?.value||'').toLowerCase();renderList($('#inventoryList'),inventory.filter(x=>x.name.toLowerCase().includes(q)),false)}
function renderList(el,items,compact){if(!el)return;if(!items.length){el.innerHTML='<div class="empty">Noch keine Gegenstände gespeichert.</div>';return}el.innerHTML=items.map(x=>`<article class="item-row"><div class="mini-icon">${x.name[0]}</div><div><h4>${x.name}</h4><p>${x.qty} Stück${x.notes?' · '+x.notes:''}</p></div><div class="row-price">${x.price*x.qty} p${compact?'':`<button class="delete" data-delete="${x.id}" aria-label="Löschen">Löschen</button>`}</div></article>`).join('');$$('[data-delete]').forEach(b=>b.onclick=()=>{inventory=inventory.filter(x=>x.id!==Number(b.dataset.delete));save();toast('Eintrag gelöscht')})}
$('#inventorySearch').oninput=render;$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(inventory,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tenno-vault-inventar.json';a.click();URL.revokeObjectURL(a.href)};
$('#platformSelect').value=settings.platform;$('#platformSelect').onchange=e=>{settings.platform=e.target.value;localStorage.setItem('tennoSettings',JSON.stringify(settings));loadMarketItems();toast('Plattform gespeichert')};
$('#loadDemoBtn').onclick=()=>{inventory=[{id:1,...builtInItems[0],qty:2,notes:'Rang 10',date:new Date().toISOString()},{id:2,...builtInItems[6],qty:1,notes:'',date:new Date().toISOString()},{id:3,...builtInItems[11],qty:3,notes:'',date:new Date().toISOString()}];save();toast('Demo-Inventar geladen');go('home')};$('#clearBtn').onclick=()=>{if(confirm('Alle lokal gespeicherten Gegenstände löschen?')){inventory=[];save();toast('Lokale Daten gelöscht')}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});setSuggestions();loadMarketItems();render();

// ===== V5: Belohnungen aus Foto ermitteln =====
let session=[], priceCache=new Map(), relicPhotos=[];

async function fetchTopPrice(item){
  const key=item.slug;
  if(priceCache.has(key))return priceCache.get(key);
  const res={slug:key,price:null,source:'unbekannt',error:null};
  try{
    const r=await fetch('https://api.warframe.market/v2/orders/item/'+encodeURIComponent(key)+'/top',
      {headers:{Language:'en',Platform:settings.platform||'pc',Crossplay:'true'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.json();
    const sell=(body.data&&body.data.sell)||[];
    const ingame=sell.filter(function(o){return String(o.user&&o.user.status).toLowerCase()==='ingame'});
    const pool=(ingame.length?ingame:sell).filter(function(o){return Number(o.platinum)>0});
    if(pool.length){
      const lows=pool.map(function(o){return Number(o.platinum)}).sort(function(a,b){return a-b});
      // zweitniedrigster Wert, wenn mindestens 3 Angebote vorliegen: faengt Ausreisser nach unten ab
      res.price=(lows.length>=3)?lows[1]:lows[0];
      res.low=lows[0];res.count=lows.length;res.source='live';
    }else{res.error='Keine Verkaufsangebote'}
  }catch(e){
    const local=marketItems.find(function(x){return x.slug===key});
    if(local&&local.price){res.price=local.price;res.source='schaetzung'}
    else{res.error='Preis nicht abrufbar'}
  }
  priceCache.set(key,res);return res;
}

function renderThumbs(){
  const box=$('#relicThumbs');
  if(!box)return;
  if(!relicPhotos.length){box.innerHTML='<span class="thumb-empty">Noch kein Foto aufgenommen.</span>';return}
  box.innerHTML=relicPhotos.map(function(p,i){return '<img src="'+p+'" alt="Belohnungsfoto '+(i+1)+'">'}).join('');
}

function addPhoto(url){
  relicPhotos.push(url);
  shotCount=relicPhotos.length;
  renderThumbs();
}

async function readOnePhoto(blob,label){
  if(!window.Tesseract)throw new Error('OCR-Bibliothek nicht geladen');
  const processed=await preprocessImage(blob);
  const worker=await Tesseract.createWorker('eng+deu',1,{
    workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
    langPath:'https://tessdata.projectnaptha.com/4.0.0',
    logger:function(m){if(m.status==='recognizing text')setRelicStatus(label+' wird gelesen: '+Math.round((m.progress||0)*100)+' %')}
  });
  const result=await worker.recognize(processed);
  await worker.terminate();
  return (result.data.text||'');
}

let lastRawText='';
function showRawText(){
  let box=$('#relicRawBox');
  if(!box){
    box=document.createElement('details');
    box.id='relicRawBox';box.className='ocr-details';
    box.innerHTML='<summary>Gelesenen Text anzeigen</summary><pre id="relicRawPre"></pre>';
    const anchor=$('#relicResult');
    anchor.parentNode.insertBefore(box,anchor);
  }
  $('#relicRawPre').textContent=lastRawText||'Kein Text gelesen.';
}

function setRelicStatus(text,cls){
  const box=$('#relicResult');
  if(box)box.innerHTML='<div class="progress-note">'+text+'</div>';
}

// Aus dem Rohtext alle Zeilen ziehen, die einem Itemnamen sehr ähnlich sind
function extractNames(raw){
  const hits=lineMatches(raw);
  if(hits.length)return {names:hits.map(function(h){return h.name}),certain:true};
  const fallback=buildCandidates(raw).filter(function(l){
    const w=l.split(' ').filter(function(x){return x.length>1});
    return w.length>=2&&w.length<=5&&l.length<=52;
  }).slice(0,6);
  return {names:fallback,certain:false};
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
  let allNames=[];
  for(let i=0;i<list.length;i++){
    const f=list[i];
    addPhoto(URL.createObjectURL(f));
    setRelicStatus('Foto '+(i+1)+' von '+list.length+' wird gelesen \\u2026');
    try{
      const raw=await readOnePhoto(f,'Foto '+(i+1));
      lastRawText=raw;
      const names=extractNames(raw);
      names.forEach(function(n){if(allNames.indexOf(n)<0)allNames.push(n)});
      const box=$('#relicInput');
      box.value=allNames.join(String.fromCharCode(10));
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

// ===== Diagnose und Handeingabe =====
let diagBusy=false;

async function runDiagnosis(file){
  const box=$('#relicResult');
  box.innerHTML='<div class="progress-note">Diagnose läuft. Das kann einen Moment dauern.</div>';
  try{
    const processed=await preprocessImage(file);
    const worker=await Tesseract.createWorker('eng+deu',1,{
      workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
      langPath:'https://tessdata.projectnaptha.com/4.0.0'
    });
    const result=await worker.recognize(processed);
    await worker.terminate();
    const raw=result.data.text||'';
    const words=(result.data.words||[]);
    const lines=raw.split(String.fromCharCode(10)).map(function(x){return x.trim()}).filter(Boolean);
    const fns=marketItems.length;
    let list='';
    lines.forEach(function(l,i){
      const scored=marketItems.map(function(it){return {item:it,score:scoreLine(l,it)}});
      scored.sort(function(a,b){return b.score-a.score});
      const t=scored[0];
      const sh=t?sharedTokenCount(l,t.item):0;
      const thr=(sh>=2)?55:72;
      list+='<span class="diag-line">'+l+' &rarr; <b>'+(t?t.item.name:'-')+'</b> '+Math.round(t?t.score:0)+'% (Wörter: '+sh+', nötig: '+thr+')</span>';
    });
    box.innerHTML='<div class="diag-box"><h4>Diagnose</h4>'
      +'<p style="font-size:11px;color:#82a0af;margin:0 0 8px">Itemliste: '+fns+' Einträge · OCR-Wörter: '+words.length+'</p>'
      +'<p style="font-size:11px;color:#82a0af;margin:0 0 8px">Gefundene Zeilen: '+lines.length+'</p>'
      +(list||'<span class="diag-line">Keine Textzeilen gefunden.</span>')
      +'</div>';
    const box2=document.createElement('details');
    box2.className='ocr-details';
    box2.innerHTML='<summary>Rohtext der Erkennung</summary><pre></pre>';
    box2.querySelector('pre').textContent=raw||'(leer)';
    box.appendChild(box2);
  }catch(e){
    box.innerHTML='<div class="progress-note" style="color:#ff9aa6">Diagnose fehlgeschlagen: '+(e.message||e)+'</div>';
  }
}

async function priceManual(){
  const vals=[].slice.call(document.querySelectorAll('.manual-name')).map(function(i){return i.value.trim()}).filter(Boolean);
  if(!vals.length){toast('Bitte mindestens einen Namen eintragen');return}
  $('#relicInput').value=vals.join(String.fromCharCode(10));
  await judgeRelics();
}

$('#diagBtn').onclick=function(){$('#diagInput').click()};
$('#diagInput').onchange=function(e){const f=e.target.files[0];if(f)runDiagnosis(f)};
$('#manualPriceBtn').onclick=priceManual;
