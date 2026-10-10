addEventListener('message',async e=>{
  const d=e.data;if(e.source!==window||!d||d.target!=='qms-in')return;
  let r;try{r=await chrome.runtime.sendMessage({type:'rpc',method:d.method,params:d.params})}catch(x){r={error:{code:-32603,message:'QMS Wallet is unavailable'}}}
  postMessage({target:'qms-out',id:d.id,...(r||{})},'*');
});
