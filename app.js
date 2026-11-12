
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
function bestMatches(text){const lines=text.split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean),queries=[...lines,text];return marketItems.map(item=>({item,score:Math.max(...queries.map(q=>similarity(q,item.name)))})).sort((a,b)=>b.score-a.score).slice(0,4)}
function setSuggestions(items=marketItems){const dl=$('#itemSuggestions');dl.innerHTML='';items.forEach(x=>{const o=document.createElement('option');o.value=x.name;dl.appendChild(o)})}
function slugify(x){return normalize(x).replaceAll(' ','_')}
function matchItem(name){const n=normalize(name);return marketItems.find(x=>normalize(x.name)===n)||marketItems.find(x=>normalize(x.name).includes(n)||n.includes(normalize(x.name)))||{name:name.trim(),slug:slugify(name),base:slugify(name).replace(/_(blueprint|set|systems|chassis|neuroptics|barrel|receiver|stock|blade|handle)$/,'').replaceAll('_','-'),price:10}}
async function loadMarketItems(){try{const r=await fetch('https://api.warframe.market/v2/items',{headers:{Language:'en',Platform:settings.platform||'pc'}});if(!r.ok)throw new Error(r.status);const body=await r.json(),list=Array.isArray(body.data)?body.data:body.data?.items;if(!Array.isArray(list))throw new Error('Format');const converted=list.map(x=>({name:x.i18n?.en?.name||x.name||x.slug?.replaceAll('_',' '),slug:x.slug,base:x.slug?.replaceAll('_','-'),price:10})).filter(x=>x.name&&x.slug);marketItems=[...converted,...builtInItems.filter(b=>!converted.some(x=>x.slug===b.slug))];setSuggestions();console.log('Warframe.market items loaded',marketItems.length)}catch(e){marketItems=[...builtInItems];setSuggestions();console.warn('Market item list unavailable, using local fallback',e)}}
function showResult(name){if(!name.trim()){toast('Bitte einen Gegenstand eingeben');return}current=matchItem(name);$('#resultName').textContent=current.name;$('#resultSlug').textContent=current.slug;$('#resultInitial').textContent=current.name[0].toUpperCase();$('#priceInput').value=current.price||10;$('#resultPrice').textContent=current.price||10;$('#quantityInput').value=1;$('#notesInput').value='';$('#marketLink').href=`https://warframe.market/items/${current.slug}?type=sell`;$('#overframeLink').href=`https://overframe.gg/items/all/?q=${encodeURIComponent(current.base.replaceAll('-',' '))}`;go('result')}

function preprocessImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const max=1800,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const d=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const g=.299*d.data[i]+.587*d.data[i+1]+.114*d.data[i+2];const v=g>155?255:g<55?0:Math.min(255,Math.max(0,(g-128)*1.75+128));d.data[i]=d.data[i+1]=d.data[i+2]=v}ctx.putImageData(d,0,0);c.toBlob(resolve,'image/png')};img.onerror=reject;img.src=URL.createObjectURL(file)})}
async function runOCR(file){const status=$('#ocrStatus'),txt=$('#ocrStatusText'),spin=status.querySelector('.spinner');status.className='ocr-status';spin.hidden=false;txt.textContent='Texterkennung wird vorbereitet...';$('#lookupBtn').disabled=true;try{if(!window.Tesseract)throw new Error('OCR-Bibliothek konnte nicht geladen werden. Prüfe die Internetverbindung.');const processed=await preprocessImage(file);const worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')txt.textContent=`Text wird erkannt: ${Math.round((m.progress||0)*100)} %`;else txt.textContent=m.status==='loading tesseract core'?'OCR-Engine wird geladen...':'Sprachdaten werden geladen...'}});const result=await worker.recognize(processed);await worker.terminate();const raw=result.data.text||'';$('#ocrRawText').textContent=raw||'Kein Text erkannt.';const matches=bestMatches(raw);if(matches[0]&&matches[0].score>=35){$('#recognizedName').value=matches[0].item.name;status.classList.add('success');txt.textContent=`Erkannt: ${matches[0].item.name} (${Math.min(99,matches[0].score)} % Übereinstimmung)`;showCandidates(matches)}else{status.classList.add('error');txt.textContent='Kein sicherer Itemname erkannt. Bitte Namen eingeben oder ein klareres Foto verwenden.';showCandidates(matches.filter(x=>x.score>10))}}catch(e){status.classList.add('error');txt.textContent=e.message||'Texterkennung fehlgeschlagen. Bitte Namen manuell eingeben.';console.error(e)}finally{spin.hidden=true;$('#lookupBtn').disabled=false}}
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

// ===== V4: Mehrfachscan + Relikt-Vergleich mit Live-Preisen =====
let session=[], priceCache=new Map(), timerId=null, timerEnd=0;

async function fetchTopPrice(item){
  const key=item.slug;
  if(priceCache.has(key))return priceCache.get(key);
  const res={slug:key,price:null,source:'unbekannt',error:null};
  try{
    const r=await fetch('https://api.warframe.market/v2/orders/item/'+encodeURIComponent(key)+'/top',{headers:{Language:'en',Platform:settings.platform||'pc',Crossplay:'true'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.json();
    const sell=(body.data&&body.data.sell)||[];
    const online=sell.filter(o=>String(o.user&&o.user.status).toLowerCase()==='ingame');
    const pool=(online.length?online:sell).filter(o=>Number(o.platinum)>0);
    if(pool.length){res.price=Math.min.apply(null,pool.map(o=>Number(o.platinum)));res.source='live'}
    else{res.error='Keine Verkaufsangebote gefunden'}
  }catch(e){
    const local=marketItems.find(x=>x.slug===key||x.name===item.name);
    if(local&&local.price){res.price=local.price;res.source='schaetzung'}
    else{res.error='Preis nicht abrufbar'}
  }
  priceCache.set(key,res);return res;
}

function renderSession(){
  $('#sessionCount').textContent=session.length+' aufgenommen';
  $('#sessionStrip').innerHTML=session.map(function(x,i){
    const label=x.name.length>22?x.name.slice(0,22)+'\u2026':x.name;
    return '<span class="session-chip">'+label+(x.price?' <b>'+x.price+'p</b>':'')+'<button data-chipp="'+i+'" aria-label="Entfernen">\u00d7</button></span>';
  }).join('');
  $$('[data-chipp]').forEach(function(b){b.onclick=function(){session.splice(Number(b.dataset.chipp),1);renderSession()}});
}

function addToSession(name,price){
  if(!name||!name.trim()){toast('Kein Gegenstand erkannt');return}
  session.push({name:name.trim(),price:price||null});renderSession();toast('Zur Sammlung hinzugefuegt');
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

function renderRelicList(rows,winnerIndex){
  const box=$('#relicResult');
  if(!rows.length){box.innerHTML='<div class="empty">Noch keine Preise abgerufen.</div>';return}
  const banner=winnerIndex>=0?'<div class="winner-banner">Wertvollster Gegenstand: '+rows[winnerIndex].name+' \u2013 '+(rows[winnerIndex].price||'?')+' Platin</div>':'';
  const cards=rows.map(function(r,i){
    const note=r.source==='live'?'Live-Angebot von Warframe.market':r.source==='schaetzung'?'Lokale Schaetzung \u2013 API nicht erreichbar':(r.error||'Kein Preis');
    return '<article class="relic-card'+(i===winnerIndex?' best':'')+'">'
      +'<div class="rank">'+(i===winnerIndex?'\u2605':i+1)+'</div>'
      +'<div><h4>'+r.name+'</h4><p>'+note+'</p></div>'
      +'<div class="relic-price"><strong>'+(r.price==null?'\u2013':r.price)+'</strong><small>'+(r.price==null?'kein Preis':'Platin')+'</small></div>'
      +'<div class="relic-actions">'
      +'<button class="mini-action" data-addrow="'+i+'">+ Inventar</button>'
      +'<a class="mini-action gold" href="https://warframe.market/items/'+r.slug+'?type=sell" target="_blank" rel="noopener">Verkaufen \u2197</a>'
      +'</div></article>';
  }).join('');
  box.innerHTML=banner+cards;
  $$('[data-addrow]').forEach(function(b){
    b.onclick=function(){
      const r=rows[Number(b.dataset.addrow)];
      addToSession(r.name,r.price);
      openResultFor(r.name,r.price);
    };
  });
}

async function priceRelicList(){
  const raw=$('#relicInput').value.split('\n').map(function(x){return x.trim()}).filter(Boolean);
  if(!raw.length){toast('Bitte Gegenstaende eintragen');return}
  $('#relicResult').innerHTML='<div class="empty">Preise werden abgerufen \u2026</div>';
  const results=[];
  for(const line of raw.slice(0,40)){
    const item=matchItem(line);
    const p=await fetchTopPrice(item);
    results.push({name:item.name,price:p.price,source:p.source,error:p.error,slug:item.slug});
    await new Promise(function(r){setTimeout(r,360)});
  }
  const withPrice=results.filter(function(r){return r.price}).sort(function(a,b){return b.price-a.price});
  const best=withPrice.length?withPrice[0].name:null;
  renderRelicList(results,results.findIndex(function(r){return r.name===best}));
  if(!withPrice.length)toast('Keine Live-Preise erhalten');
}

function startTimer(){
  clearInterval(timerId);
  timerEnd=Date.now()+5000;
  const card=$('#timerCard');
  card.className='timer-card';
  timerId=setInterval(function(){
    const left=Math.max(0,timerEnd-Date.now());
    $('#timerValue').textContent=(left/1000).toFixed(1).replace('.',',')+' s';
    card.classList.toggle('low',left>0&&left<2500);
    card.classList.toggle('done',left<=0);
    if(left<=0){clearInterval(timerId);toast('Auswahlzeit abgelaufen')}
  },100);
  toast('Timer laeuft');
}

$('#relicBtn').onclick=function(){go('relic')};
$('#addToSessionBtn').onclick=function(){addToSession($('#recognizedName').value,null)};
$('#anotherPhotoBtn').onclick=function(){$('#cameraInput').click()};
$('#sessionClear').onclick=function(){session=[];renderSession();toast('Sammlung geleert')};
$('#priceAllBtn').onclick=priceRelicList;
$('#addRelicPhotoBtn').onclick=function(){$('#relicCameraInput').click()};
$('#relicCameraInput').onchange=function(e){const f=e.target.files[0];if(!f)return;$('#previewImage').src=URL.createObjectURL(f);$('#recognizedName').value='';go('scan');runOCR(f)};
$('#startTimerBtn').onclick=startTimer;
$('#resetTimerBtn').onclick=function(){clearInterval(timerId);$('#timerCard').className='timer-card';$('#timerValue').textContent='5,0 s'};
$('#sessionPriceBtn').onclick=async function(){
  if(!session.length){toast('Noch keine Gegenstaende aufgenommen');return}
  go('relic');
  $('#relicInput').value=session.map(function(x){return x.name}).join('\n');
  await priceRelicList();
};
renderSession();
