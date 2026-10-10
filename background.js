try{chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})}catch(e){}
const RPC='https://rpc.testnet.qms.finance',CHAIN='0x4c18',pending=new Map();
const READ=new Set(['eth_blockNumber','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_getTransactionCount','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getBlockByNumber','eth_getBlockByHash','eth_getCode','eth_getLogs','eth_feeHistory','eth_maxPriorityFeePerGas','eth_getStorageAt','eth_sendRawTransaction','web3_clientVersion']);
const err=(code,message)=>Object.assign(new Error(message),{code});
const ext=s=>!!s.url&&s.url.startsWith(chrome.runtime.getURL(''));
async function rpc(method,params){const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const j=await r.json();if(j.error)throw err(j.error.code,j.error.message);return j.result}
function approval(origin,method,params){for(const p of pending.values())if(p.origin===origin)return Promise.reject(err(-32002,'A request from this site is already pending.'));if(pending.size>=3)return Promise.reject(err(-32002,'Too many pending requests.'));return new Promise(async(resolve,reject)=>{const id=crypto.randomUUID();pending.set(id,{origin,method,params,resolve,reject});
  try{const w=await chrome.windows.create({url:chrome.runtime.getURL('popup.html?approve='+id),type:'popup',width:400,height:700});pending.get(id).win=w.id}catch(e){pending.delete(id);reject(err(-32603,'Could not open approval window'))}})}
async function handle(origin,method,params=[]){
  if(!/^https:\/\//.test(origin||'')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||''))throw err(4100,'QPouch connects to HTTPS sites only.');
  const {addr,sites=[]}=await chrome.storage.local.get(['addr','sites']),connected=!!addr&&sites.includes(origin);
  switch(method){
    case 'eth_chainId':return CHAIN;
    case 'net_version':return '19480';
    case 'eth_accounts':return connected?[addr]:[];
    case 'eth_requestAccounts':if(connected)return [addr];if(!addr)throw err(4100,'No wallet set up. Open the QMS Wallet extension first.');return approval(origin,'eth_requestAccounts',params);
    case 'wallet_switchEthereumChain':case 'wallet_addEthereumChain':if(String(params[0]&&params[0].chainId).toLowerCase()===CHAIN)return null;throw err(4902,'QMS Wallet supports only QMS Testnet (chain 19480).');
    case 'personal_sign':case 'eth_signTypedData_v4':case 'eth_sendTransaction':if(!connected)throw err(4100,'Not connected. Call eth_requestAccounts first.');if(method==='eth_sendTransaction'){const c=params[0]&&params[0].chainId;if(c&&Number(c)!==19480)throw err(4901,'Wrong chain for this transaction.')}return approval(origin,method,params);
    default:if(READ.has(method))return rpc(method,params);throw err(4200,'Unsupported method: '+method)}}
chrome.runtime.onMessage.addListener((m,s,send)=>{
  if(m.type==='rpc'){const origin=s.origin||(s.tab&&new URL(s.tab.url).origin);
    handle(origin,String(m.method),Array.isArray(m.params)?m.params:[]).then(result=>send({result}),e=>send({error:{code:e.code||-32603,message:e.message}}));return true}
  if(!ext(s))return;
  if(m.type==='get'){const p=pending.get(m.id);send(p?{origin:p.origin,method:p.method,params:p.params}:null);return}
  if(m.type==='resolve'){const p=pending.get(m.id);if(p){pending.delete(m.id);
    if(m.error)p.reject(err(m.error.code,m.error.message));
    else{if(p.method==='eth_requestAccounts')chrome.storage.local.get('sites').then(({sites=[]})=>chrome.storage.local.set({sites:[...new Set([...sites,p.origin])]}));p.resolve(m.result)}}send(1)}
});
chrome.windows.onRemoved.addListener(id=>{for(const [k,p] of pending)if(p.win===id){pending.delete(k);p.reject(err(4001,'User rejected the request'))}});
chrome.alarms.create('idle',{periodInMinutes:1});
chrome.alarms.onAlarm.addListener(async()=>{const {sess}=await chrome.storage.session.get('sess');if(sess&&Date.now()-sess.t>3600000)chrome.storage.session.remove('sess')});
