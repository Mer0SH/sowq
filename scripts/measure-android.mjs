const port = process.argv[2] || '9224';
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find((entry) => entry.type === 'page');
if (!page) throw new Error('No Android WebView page found');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
const expression = `(() => {
  const rect = selector => { const element = document.querySelector(selector); if (!element) return null; const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return {top:r.top,bottom:r.bottom,height:r.height,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,fontSize:s.fontSize}; };
  const probe = document.createElement('div'); probe.style.paddingBottom='env(safe-area-inset-bottom)'; document.body.append(probe); const safeBottom=getComputedStyle(probe).paddingBottom; probe.remove();
  return {innerWidth,innerHeight,devicePixelRatio,visualViewportHeight:visualViewport?.height,bodyScrollHeight:document.body.scrollHeight,safeBottom,header:rect('header'),bottomNav:rect('nav[aria-label="التنقل السفلي"]'),bottomButton:rect('nav[aria-label="التنقل السفلي"] button'),root:rect('#root')};
})()`;
const result = await new Promise((resolve, reject) => {
  socket.onmessage = ({data}) => { const message=JSON.parse(data); if (message.id===1) resolve(message.result.result.value); };
  socket.onerror = reject;
  socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
});
console.log(JSON.stringify(result,null,2));
socket.close();
