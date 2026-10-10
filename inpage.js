(()=>{
if(window.__qmsWallet)return;window.__qmsWallet=1;
let n=0;const pend=new Map(),L={};
addEventListener('message',e=>{const d=e.data;if(e.source!==window||!d||d.target!=='qms-out')return;const p=pend.get(d.id);if(!p)return;pend.delete(d.id);
  d.error?p.rej(Object.assign(new Error(d.error.message),{code:d.error.code})):p.res(d.result)});
const provider={isQMSWallet:true,
  request(a){return new Promise((res,rej)=>{const id=++n;pend.set(id,{res,rej});postMessage({target:'qms-in',id,method:a.method,params:a.params},'*')})},
  enable(){return provider.request({method:'eth_requestAccounts'})},
  on(ev,fn){(L[ev]=L[ev]||[]).push(fn);return provider},
  removeListener(ev,fn){L[ev]=(L[ev]||[]).filter(f=>f!==fn);return provider}};
const info={uuid:'6c1f0a52-4f6e-4c3a-9d7e-5a0c1b2e7a11',name:'QMS Wallet (Testnet)',rdns:'local.qms-testnet-wallet',
  icon:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><rect width="34" height="34" rx="6" fill="#7b5cff"/><rect x="9" y="9" width="16" height="16" rx="2" fill="#fff"/></svg>')};
const announce=()=>dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider})}));
addEventListener('eip6963:requestProvider',announce);announce();
if(!window.ethereum)window.ethereum=provider;
})();
