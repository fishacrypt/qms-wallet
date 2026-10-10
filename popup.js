// ---- Network (matches the CSP connect-src above; change both together) ----
// Source: community repos + ChainList. Verify against docs.qms.finance before real use.
const NET={name:'QMS Testnet',chainId:19480,rpc:'https://rpc.testnet.qms.finance',symbol:'QMS',explorer:'https://testnet.qmsscan.io',faucet:'https://faucet.testnet.qms.finance'};
const STORE='qmsw.v1',ACTKEY='qmsw.activity',IDLE_MS=60*60*1000,ITER=600000;
const $=s=>document.querySelector(s),enc=new TextEncoder(),dec=new TextDecoder();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const short=a=>a.slice(0,6)+'…'+a.slice(-4);
const load=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

// ---- Encryption: PBKDF2-SHA256 (600k) -> AES-GCM-256. Keys never leave this page. ----
async function dk(pw,salt,it){const m=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(pw,obj){const s=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await dk(pw,s,ITER);return{v:1,i:ITER,s:b64(s),iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,enc.encode(JSON.stringify(obj))))}}
async function unseal(pw,b){const k=await dk(pw,unb64(b.s),b.i);return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(b.iv)},k,unb64(b.ct))))}
const walletFrom=s=>s.k==='m'?ethers.Wallet.fromMnemonic(s.v):new ethers.Wallet(s.v);
const pwOk=pw=>pw.length>=12&&[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(r=>r.test(pw)).length>=3;

// ---- State ----
const P=typeof ethers!=='undefined'?new ethers.providers.StaticJsonRpcProvider(NET.rpc,{chainId:NET.chainId,name:'qms-testnet'}):null;
const S={view:'welcome',addr:null,bal:null,net:'checking',tmp:null};
let idleT;
async function failCheck(){const {fails=0,until=0}=await chrome.storage.local.get(['fails','until']);if(Date.now()<until)throw new Error('Too many attempts. Try again in '+Math.ceil((until-Date.now())/1000)+'s.')}
async function failBump(){let {fails=0}=await chrome.storage.local.get('fails');fails++;await chrome.storage.local.set({fails,until:fails>=5?Date.now()+30000*2**Math.min(fails-5,8):0})}
const failReset=()=>chrome.storage.local.remove(['fails','until']);
const tryOpen=async(pw,box)=>{await failCheck();try{const s=await unseal(pw,box);await failReset();return s}catch(x){await failBump();throw new Error('Wrong password.')}};
let lastT=0;
async function getSess(){const {sess}=await chrome.storage.session.get('sess');if(!sess||Date.now()-sess.t>IDLE_MS){await chrome.storage.session.remove('sess');return null}return sess}
async function touchSess(){const s=await getSess();if(s)await chrome.storage.session.set({sess:{...s,t:Date.now()}})}
function touch(){clearTimeout(idleT);if(S.addr)idleT=setTimeout(lock,IDLE_MS);if(Date.now()-lastT>10000){lastT=Date.now();touchSess()}}
['pointerdown','keydown'].forEach(e=>addEventListener(e,touch));
function lock(){chrome.storage.session.remove('sess');S.tmp=null;closeModal();S.view=load(STORE)?'unlock':'welcome';render()}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
function modal(h){const m=$('#modal');m.className='modal';m.innerHTML='<div>'+h+'</div>';m.hidden=false}
const busy=(b,on,t)=>{b.disabled=on;if(t)b.textContent=t};
const val=id=>$('#'+id).value.trim();
const setErr=m=>{const e=$('.err');if(e)e.textContent=m||''};

// ---- Views ----
function render(){
  const v=$('#view');
  if(S.view==='approve')return approveView(v);
  if(S.view==='welcome')v.innerHTML=`<div class="card"><h2>Your keys, your device</h2><p>A self-custody wallet for ${NET.name}. Keys are generated and encrypted in this page and are never sent anywhere.</p>
  <button class="btn" data-act="toCreate">Create a new wallet</button><button class="btn ghost" data-act="toImport">Import existing wallet</button></div>`;
  if(S.view==='create')v.innerHTML=`<div class="card"><h2>Set a password</h2><p>It encrypts your wallet on this device. It cannot be recovered, so keep it safe.</p>
  <label for="pw">Password (12+ characters, mixed types)</label><input id="pw" type="password" autocomplete="new-password">
  <label for="pw2">Confirm password</label><input id="pw2" type="password" autocomplete="new-password"><div class="err"></div>
  <button class="btn" data-act="makePhrase">Continue</button><button class="btn ghost" data-act="toWelcome">Back</button></div>`;
  if(S.view==='phrase')v.innerHTML=`<div class="card"><h2>Your recovery phrase</h2><p>These 12 words are the only way to restore your wallet. Write them on paper. Anyone with them controls your funds.</p>
  <div class="words blur" id="words">${S.tmp.phrase.split(' ').map((w,i)=>`<div><i>${i+1}</i>${esc(w)}</div>`).join('')}</div>
  <button class="btn ghost" data-act="reveal">Show words</button><div class="note warn">Never type this phrase into a website, chat, or form. QMS staff will never ask for it.</div>
  <button class="btn" data-act="toConfirm">I've written it down</button></div>`;
  if(S.view==='confirm'){const q=S.tmp.q;v.innerHTML=`<div class="card"><h2>Confirm your backup</h2><p>Enter the requested words from your phrase.</p>
  ${q.map((n,i)=>`<label for="w${i}">Word #${n+1}</label><input id="w${i}" autocomplete="off" autocapitalize="none" spellcheck="false">`).join('')}<div class="err"></div>
  <button class="btn" data-act="finishCreate">Create wallet</button></div>`}
  if(S.view==='import')v.innerHTML=`<div class="card"><h2>Import wallet</h2><p>Paste a 12/24-word recovery phrase or a private key. Use a testnet-only key.</p>
  <label for="sec">Recovery phrase or private key</label><textarea id="sec" autocomplete="off" autocapitalize="none" spellcheck="false"></textarea>
  <label for="pw">New password</label><input id="pw" type="password" autocomplete="new-password"><div class="err"></div>
  <button class="btn" data-act="doImport">Import</button><button class="btn ghost" data-act="toWelcome">Back</button></div>`;
  if(S.view==='unlock'){const d=load(STORE);v.innerHTML=`<div class="card"><h2>Welcome back</h2><p class="mono">${esc(short(d.address))}</p>
  <label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password"><div class="err"></div>
  <button class="btn" data-act="unlock">Unlock</button></div>`}
  if(S.view==='home')home(v);
}
const netPill=()=>`<span class="pill"><span class="dot ${S.net==='ok'?'ok':S.net==='checking'?'':'bad'}"></span>${NET.name} · ${S.net==='ok'?'chain verified':S.net==='wrong'?'WRONG CHAIN':S.net==='checking'?'checking…':'offline'}</span>`;
function home(v){
  const acts=(load(ACTKEY)||[]).slice(0,8);
  v.innerHTML=`<div class="card"><div class="row" style="align-items:center;justify-content:space-between;flex-wrap:wrap">${netPill()}</div>
  <p style="margin:14px 0 2px">Balance</p><div class="bal">${S.bal===null?'…':esc(S.bal)}<span>${NET.symbol}</span></div>
  <p class="mono" style="margin:8px 0 0">${esc(S.addr)}</p>
  ${S.net==='wrong'?'<div class="note bad">The RPC reported a different chain ID. Sending is disabled to protect you.</div>':''}
  <div class="row" style="margin-top:6px"><button class="btn" data-act="send" ${S.net==='ok'?'':'disabled'}>Send</button><button class="btn ghost" data-act="receive">Receive</button></div>
  <a class="btn ghost" href="${NET.faucet}" target="_blank" rel="noopener noreferrer">Get test ${NET.symbol} from faucet</a></div>
  <div class="card"><h2>Activity</h2>${acts.length?acts.map(a=>`<div class="act"><div><b>${a.status==='ok'?'Sent':a.status==='fail'?'Failed':'Pending'}</b> · ${esc(short(a.to))}<br><a class="mono" style="color:var(--pd)" href="${NET.explorer}/tx/${esc(a.hash)}" target="_blank" rel="noopener noreferrer">${esc(short(a.hash))}</a></div><div>−${esc(a.amt)} ${NET.symbol}</div></div>`).join(''):'<p>No transactions from this wallet yet.</p>'}</div>
  <div class="card"><h2>Security</h2>
  <details><summary>How this wallet protects you</summary><dl>
  <dt>Encrypted at rest</dt><dd>AES-256-GCM, key derived with PBKDF2 (600,000 rounds).</dd>
  <dt>Session lock</dt><dd>Unlock once with your password. The decrypted key is held in temporary browser memory (cleared when the browser closes) and wiped after 1 hour of inactivity. Revealing the recovery phrase always asks for your password.</dd>
  <dt>Auto-lock</dt><dd>Locks after 1 hour of inactivity.</dd>
  <dt>Locked network access</dt><dd>A content-security policy lets this page talk only to the QMS testnet RPC.</dd>
  <dt>Chain check</dt><dd>The RPC's chain ID is verified (${NET.chainId}) before any send.</dd>
  <dt>Send safeguards</dt><dd>Address checksum validation, full-address review, fee preview, first-time recipient warning.</dd></dl></details>
  <details><summary>Connected sites (${(S.sites||[]).length})</summary>${(S.sites||[]).map(o=>`<div class="act"><span class="mono">${esc(o)}</span><button class="pill" data-act="disc" data-o="${esc(o)}">Disconnect</button></div>`).join('')||'<dl><dd>No sites connected.</dd></dl>'}</details>
  <details><summary>Quantum readiness</summary><dl><dd>QMS's execution layer uses standard Ethereum (ECDSA) signatures for EVM compatibility, so this wallet signs the same way. Post-quantum protection on QMS is optional and arrives through PQ-signature smart accounts, which this wallet does not yet support.</dd></dl></details>
  <details><summary>Network</summary><dl><dt>Chain ID</dt><dd>${NET.chainId}</dd><dt>RPC</dt><dd class="mono">${NET.rpc}</dd><dt>Explorer</dt><dd class="mono">${NET.explorer}</dd></dl></details>
  <button class="btn ghost" data-act="backup">Reveal recovery phrase</button><button class="btn ghost" data-act="lock">Lock now</button><button class="btn danger" data-act="reset">Remove wallet from this device</button></div>`;
}

// ---- Data refresh ----
async function refresh(){
  S.net='checking';S.sites=(await chrome.storage.local.get('sites')).sites||[];if(S.view==='home')render();
  try{
    const id=parseInt(await P.send('eth_chainId',[]),16);
    if(id!==NET.chainId){S.net='wrong';S.bal=null}
    else{S.net='ok';S.bal=Number(ethers.utils.formatEther(await P.getBalance(S.addr))).toLocaleString(undefined,{maximumFractionDigits:6});
      const acts=load(ACTKEY)||[];let ch=false;
      for(const a of acts)if(a.status==='pending'){const r=await P.getTransactionReceipt(a.hash);if(r){a.status=r.status?'ok':'fail';ch=true}}
      if(ch)save(ACTKEY,acts)}
  }catch(e){S.net='offline'}
  if(S.view==='home')render();
}
function enter(addr){chrome.storage.local.set({addr});S.addr=addr;S.view='home';S.bal=null;touch();render();refresh()}

// ---- Actions ----
const A={
  toWelcome(){S.view='welcome';render()},toCreate(){S.view='create';render()},toImport(){S.view='import';render()},
  async makePhrase(b){const pw=val('pw');if(!pwOk(pw))return setErr('Use 12+ characters with at least 3 of: lowercase, uppercase, digits, symbols.');
    if(pw!==val('pw2'))return setErr('Passwords do not match.');
    S.tmp={pw,phrase:ethers.Wallet.createRandom().mnemonic.phrase};S.view='phrase';render()},
  reveal(b){$('#words').classList.remove('blur');b.hidden=true},
  toConfirm(){const idx=[...Array(12).keys()].sort(()=>crypto.getRandomValues(new Uint8Array(1))[0]-128).slice(0,3).sort((a,b)=>a-b);S.tmp.q=idx;S.view='confirm';render()},
  async finishCreate(b){const w=S.tmp.phrase.split(' ');
    if(!S.tmp.q.every((n,i)=>val('w'+i).toLowerCase()===w[n]))return setErr('One or more words are wrong. Check your written backup.');
    busy(b,true,'Encrypting…');const wal=ethers.Wallet.fromMnemonic(S.tmp.phrase);
    save(STORE,{address:wal.address,box:await seal(S.tmp.pw,{k:'m',v:S.tmp.phrase})});await chrome.storage.session.set({sess:{s:{k:'m',v:S.tmp.phrase},t:Date.now()}});S.tmp=null;enter(wal.address)},
  async doImport(b){const sec=val('sec'),pw=val('pw');let s;
    try{if(/^(0x)?[0-9a-fA-F]{64}$/.test(sec))s={k:'p',v:sec.startsWith('0x')?sec:'0x'+sec};
      else if(ethers.utils.isValidMnemonic(sec.toLowerCase().replace(/\s+/g,' ')))s={k:'m',v:sec.toLowerCase().replace(/\s+/g,' ')};
      else return setErr('That is not a valid recovery phrase or private key.')}catch(e){return setErr('Invalid secret.')}
    if(!pwOk(pw))return setErr('Use 12+ characters with at least 3 of: lowercase, uppercase, digits, symbols.');
    busy(b,true,'Encrypting…');const wal=walletFrom(s);save(STORE,{address:wal.address,box:await seal(pw,s)});await chrome.storage.session.set({sess:{s,t:Date.now()}});enter(wal.address)},
  async unlock(b){const d=load(STORE);busy(b,true,'Unlocking…');
    try{const s=await tryOpen(val('pw'),d.box);await chrome.storage.session.set({sess:{s,t:Date.now()}});enter(d.address)}catch(e){busy(b,false,'Unlock');setErr(e.message)}},
  lock,
  receive(){modal(`<h2 class="tc">Receive</h2><p class="mono tc">${esc(S.addr)}</p>
  <button class="btn" data-act="copy">Copy address</button><div class="note warn">Only send ${NET.name} assets to this address.</div><button class="btn ghost" data-act="close">Close</button>`);
    try{const q=qrcode(0,'M');q.addData(S.addr);q.make();const n=q.getModuleCount();let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c} ${r}h1v1h-1z`;
      $('#qr').innerHTML=`<svg viewBox="0 0 ${n} ${n}" width="100%" height="100%" shape-rendering="crispEdges"><path d="${d}" fill="#1c1540"/></svg>`}catch(e){}},
  async copy(b){try{await navigator.clipboard.writeText(S.addr);b.textContent='Copied'}catch(e){b.textContent='Copy failed'}},
  close:closeModal,
  send(){modal(`<h2>Send ${NET.symbol}</h2><label for="to">Recipient address</label><input id="to" autocomplete="off" spellcheck="false" placeholder="0x…">
  <label for="amt">Amount</label><input id="amt" inputmode="decimal" placeholder="0.0"><div class="err"></div>
  <button class="btn" data-act="review">Review</button><button class="btn ghost" data-act="close">Cancel</button>`)},
  async review(b){let to,wei;
    try{to=ethers.utils.getAddress(val('to'))}catch(e){return setErr('Invalid address or bad checksum. Check every character.')}
    try{wei=ethers.utils.parseEther(val('amt'));if(wei.lte(0))throw 0}catch(e){return setErr('Enter an amount greater than zero.')}
    if(to===S.addr)return setErr('You cannot send to your own address.');
    busy(b,true,'Estimating fee…');
    try{const [fd,gas,bal]=await Promise.all([P.getFeeData(),P.estimateGas({from:S.addr,to,value:wei}),P.getBalance(S.addr)]);
      const maxFee=fd.maxFeePerGas||fd.gasPrice,fee=maxFee.mul(gas),total=wei.add(fee);
      if(total.gt(bal)){busy(b,false,'Review');return setErr('Insufficient balance for amount plus network fee.')}
      S.tmp={to,wei,gas,maxFee,tip:fd.maxPriorityFeePerGas||maxFee};
      const first=!(load(ACTKEY)||[]).some(a=>a.to===to),f=x=>ethers.utils.formatEther(x);
      modal(`<h2>Confirm transaction</h2><dl><dt>To (verify every character)</dt><dd class="mono">${to}</dd><dt>Amount</dt><dd><b>${f(wei)} ${NET.symbol}</b></dd><dt>Max network fee</dt><dd>${f(fee)} ${NET.symbol}</dd><dt>Max total</dt><dd>${f(total)} ${NET.symbol}</dd><dt>Network</dt><dd>${NET.name} (chain ID ${NET.chainId})</dd></dl>
      ${first?'<div class="note warn">First time sending to this address. Confirm it from a trusted source. Scam addresses often mimic the start and end of real ones.</div>':''}
      <div class="err"></div>
      <button class="btn" data-act="sign">Sign &amp; send</button><button class="btn ghost" data-act="close">Cancel</button>`)
    }catch(e){busy(b,false,'Review');setErr('Could not estimate the fee. The recipient or network may be rejecting this transaction.')}},
  async sign(b){const t=S.tmp;busy(b,true,'Signing…');let w;
    try{const ss=await getSess();if(!ss){closeModal();return lock()}w=walletFrom(ss.s)}catch(e){busy(b,false,'Sign & send');return setErr('Could not unlock the key.')}
    try{if(w.address!==S.addr)throw new Error('mismatch');
      const tx=await w.connect(P).sendTransaction({to:t.to,value:t.wei,type:2,chainId:NET.chainId,gasLimit:t.gas,maxFeePerGas:t.maxFee,maxPriorityFeePerGas:t.tip});
      const acts=load(ACTKEY)||[];acts.unshift({hash:tx.hash,to:t.to,amt:ethers.utils.formatEther(t.wei),status:'pending',ts:Date.now()});save(ACTKEY,acts);
      w=null;S.tmp=null;closeModal();render();tx.wait(1).then(refresh,refresh)}
    catch(e){w=null;busy(b,false,'Sign & send');setErr('Transaction was not sent: '+esc((e.reason||e.message||'unknown error').slice(0,120)))}},
  backup(){modal(`<h2>Reveal recovery phrase</h2><div class="note warn">Make sure nobody can see your screen.</div><label for="pwx">Password</label><input id="pwx" type="password"><div class="err"></div>
    <button class="btn" data-act="doBackup">Reveal</button><button class="btn ghost" data-act="close">Cancel</button>`)},
  async doBackup(b){try{const s=await tryOpen(val('pwx'),load(STORE).box);
      if(s.k!=='m'){modal('<h2>Imported private key</h2><p>This wallet was imported from a private key, so there is no recovery phrase to show.</p><button class="btn ghost" data-act="close">Close</button>');return}
      modal(`<h2>Recovery phrase</h2><div class="words">${s.v.split(' ').map((w,i)=>`<div><i>${i+1}</i>${esc(w)}</div>`).join('')}</div><p>Hides automatically in 30 seconds.</p><button class="btn ghost" data-act="close">Hide now</button>`);
      setTimeout(closeModal,30000)}catch(e){setErr(e.message)}},
  reset(){modal(`<h2>Remove wallet?</h2><div class="note bad">This deletes the encrypted wallet from this device. Without your recovery phrase, funds cannot be recovered.</div>
    <label for="rst">Type REMOVE to confirm</label><input id="rst" autocomplete="off"><div class="err"></div>
    <button class="btn danger" data-act="doReset">Remove wallet</button><button class="btn ghost" data-act="close">Cancel</button>`)},
  doReset(){if(val('rst')!=='REMOVE')return setErr('Type REMOVE exactly.');localStorage.removeItem(STORE);localStorage.removeItem(ACTKEY);chrome.storage.local.clear();S.addr=null;closeModal();S.view='welcome';render()}
};

// ---- dApp approval window (opened by the background worker) ----
const reqId=new URLSearchParams(location.search).get('approve');
function done(result,error){chrome.runtime.sendMessage({type:'resolve',id:reqId,result,error}).finally(()=>window.close())}
const fmt=x=>ethers.utils.formatEther(x);
function approveView(v){
  const r=S.req,d=load(STORE);
  if(!d){v.innerHTML='<div class="card"><h2>No wallet yet</h2><p>Open the QPouch extension, create or import a wallet, then retry from the site.</p><button class="btn ghost" data-act="rej">Close</button></div>';return}
  const o=`<div class="note"><b>${esc(r.origin)}</b></div>`;let t='',pw=!!S.locked;
  if(r.method==='eth_requestAccounts'){pw=false;t=`<h2>Connect to site</h2>${o}<p>This site will see your address and can ask you to approve signatures and transactions. It cannot move funds on its own.</p><p class="mono">${esc(d.address)}</p>`}
  else if(r.method==='personal_sign'){let [a,b]=r.params;const m=(ethers.utils.isAddress(a)&&!ethers.utils.isAddress(b))?b:a;let txt;
    try{txt=ethers.utils.isHexString(m)?ethers.utils.toUtf8String(m):String(m)}catch(e){txt='(binary data) '+m}
    S.msg=m;t=`<h2>Sign message</h2>${o}<p>Signing proves you own this address. Only sign text you understand.</p><div class="note mono">${esc(txt.slice(0,600))}</div>`}
  else if(r.method==='eth_signTypedData_v4'){let td;try{td=typeof r.params[1]==='string'?JSON.parse(r.params[1]):r.params[1]}catch(e){td={}}
    S.td=td;const bad=td.domain&&td.domain.chainId&&Number(td.domain.chainId)!==NET.chainId;S.badChain=!!bad;const risky=/permit|approv|delegat|order|transfer/i.test(td.primaryType||'');
    t=`<h2>Sign typed data</h2>${o}${bad?'<div class="note bad">This request is for a different chain than QMS Testnet. Signing is blocked.</div>':''}${risky?'<div class="note warn">This kind of signature (<b>'+esc(td.primaryType)+'</b>) can authorise spending or trades without a transaction. Continue only if you started this action.</div>':''}<p>Structured signatures can authorise token spending or orders. Review carefully.</p><div class="note mono" style="max-height:200px;overflow:auto">${esc(JSON.stringify(td.message||td,null,1).slice(0,1500))}</div>`}
  else if(r.method==='eth_sendTransaction'){const x=r.params[0]||{},data=x.data||x.input||'0x';let val='0',warn='';try{val=fmt(ethers.BigNumber.from(x.value||0))}catch(e){}
    const sel=data.slice(0,10).toLowerCase();
    try{if(sel==='0x095ea7b3'&&data.length>=138){const amt=ethers.BigNumber.from('0x'+data.slice(74,138));warn=`<div class="note bad"><b>Token approval.</b> You are letting <span class="mono">0x${esc(data.slice(34,74))}</span> spend ${amt.eq(ethers.constants.MaxUint256)?'<b>UNLIMITED</b> amounts of':'up to '+esc(amt.toString())+' units of'} the token at ${esc(x.to)}. Approve only sites you trust.</div>`}
    else if(sel==='0xa22cb465')warn='<div class="note bad"><b>Full collection access.</b> This lets the named operator move all your NFTs in this collection.</div>'}catch(e){}
    t=`<h2>Confirm transaction</h2>${o}<dl><dt>To</dt><dd class="mono">${esc(x.to||'(contract creation)')}</dd><dt>Amount</dt><dd><b>${esc(val)} ${NET.symbol}</b></dd><dt>Max network fee</dt><dd id="fee">estimating…</dd></dl>
    ${warn}${data!=='0x'&&!warn?`<div class="note warn">Contract interaction (method ${esc(data.slice(0,10))}, ${(data.length-2)/2} bytes of data). Only continue if you trust this site.</div>`:''}`}
  else t=`<h2>Unsupported request</h2><p>${esc(r.method)}</p>`;
  v.innerHTML=`<div class="card">${t}${pw?'<p>Your wallet is locked. Enter your password to unlock it.</p><label for="pwx">Password</label><input id="pwx" type="password" autocomplete="current-password">':''}<div class="err"></div>
  <button class="btn" data-act="apprYes">${r.method==='eth_requestAccounts'?'Connect':'Sign'}</button><button class="btn ghost" data-act="rej">Reject</button></div>`;
  if(r.method==='eth_sendTransaction')approveFee();
}
async function approveFee(){try{const x=S.req.params[0],[fd,g]=await Promise.all([P.getFeeData(),x.gas?ethers.BigNumber.from(x.gas):P.estimateGas({from:S.addr||load(STORE).address,to:x.to,data:x.data||x.input,value:x.value})]);
  $('#fee').textContent=fmt((fd.maxFeePerGas||fd.gasPrice).mul(g))+' '+NET.symbol}catch(e){const f=$('#fee');if(f)f.textContent='unavailable (the transaction may fail)'}}
A.rej=()=>done(undefined,{code:4001,message:'User rejected the request'});
A.disc=async b=>{const s=((await chrome.storage.local.get('sites')).sites||[]).filter(o=>o!==b.dataset.o);await chrome.storage.local.set({sites:s});S.sites=s;render()};
A.apprYes=async b=>{const r=S.req,d=load(STORE);
  if(r.method==='eth_signTypedData_v4'&&S.badChain)return setErr('Signing is blocked: this request is for a different chain.');
  if(r.method==='eth_requestAccounts')return done([d.address]);
  busy(b,true,'Signing…');let w;
  try{let ss=await getSess();if(!ss){const s=await tryOpen(val('pwx'),d.box);ss={s,t:Date.now()};await chrome.storage.session.set({sess:ss})}w=walletFrom(ss.s)}catch(e){busy(b,false,'Sign');return setErr(/attempts|password/i.test(e.message||'')?e.message:'Could not unlock the key. Reopen this request.')}
  try{let res;
    if(r.method==='personal_sign'){const m=S.msg;res=await w.signMessage(ethers.utils.isHexString(m)?ethers.utils.arrayify(m):m)}
    else if(r.method==='eth_signTypedData_v4'){const td=S.td,types={...td.types};delete types.EIP712Domain;res=await w._signTypedData(td.domain||{},types,td.message)}
    else{const x=r.params[0];if(x.from&&x.from.toLowerCase()!==w.address.toLowerCase())throw new Error('from-address mismatch');
      const fd=await P.getFeeData(),mf=x.maxFeePerGas?ethers.BigNumber.from(x.maxFeePerGas):(fd.maxFeePerGas||fd.gasPrice);
      const t={to:x.to,data:x.data||x.input||'0x',value:x.value||'0x0',type:2,chainId:NET.chainId,nonce:await P.getTransactionCount(w.address,'pending'),maxFeePerGas:mf,maxPriorityFeePerGas:x.maxPriorityFeePerGas?ethers.BigNumber.from(x.maxPriorityFeePerGas):(fd.maxPriorityFeePerGas||mf)};
      if(!t.to)delete t.to;
      t.gasLimit=x.gas?ethers.BigNumber.from(x.gas):(await P.estimateGas({from:w.address,to:t.to,data:t.data,value:t.value})).mul(120).div(100);
      const tx=await w.connect(P).sendTransaction(t);res=tx.hash;
      const acts=load(ACTKEY)||[];acts.unshift({hash:tx.hash,to:t.to||'contract',amt:fmt(ethers.BigNumber.from(t.value)),status:'pending',ts:Date.now()});save(ACTKEY,acts)}
    w=null;await touchSess();done(res)}
  catch(e){w=null;busy(b,false,'Sign');setErr('Failed: '+esc((e.reason||e.message||'unknown').slice(0,120)))}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&A[b.dataset.act])A[b.dataset.act](b)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){const b=e.target.closest('#modal>div,#view')?.querySelector('.btn:not(.ghost):not(.danger)');if(b)b.click()}});
if(typeof ethers==='undefined'||ethers.version!=='ethers/5.7.2'){$('#view').innerHTML='<div class="card"><h2>Crypto library missing or wrong version</h2><p>Place ethers.umd.min.js (version 5.7.2) in the extension folder, then reload the extension. See README.</p></div>'}
else{const d=load(STORE);if(d)chrome.storage.local.set({addr:d.address});
  if(reqId)chrome.runtime.sendMessage({type:'get',id:reqId}).then(async r=>{if(!r){$('#view').innerHTML='<div class="card"><h2>Request expired</h2><p>Close this window and retry from the site.</p></div>';return}S.locked=!(await getSess());S.req=r;S.view='approve';render()});
  else getSess().then(ss=>{if(d&&ss)enter(d.address);else{S.view=d?'unlock':'welcome';render()}})}
