const fs=require('fs'),path=require('path'),http=require('http');
const root=__dirname,base=path.join(root,'сборка','web-render');
const {chromium}=require(path.join(base,'node_modules','playwright-core'));
const mode=process.argv[2]||'stills';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=name==='/'?path.join(root,'web-scene.html'):path.resolve(base,'.'+name);
  if(name!=='/'&&!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).on('error',()=>res.end()).pipe(res)}catch(e){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(8793,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--ignore-gpu-blocklist','--enable-webgl']});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  page.on('pageerror',e=>console.error('PAGE ERROR',e));
  await page.goto('http://127.0.0.1:8793/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.ready,{},{timeout:120000});
  const info=await page.evaluate(()=>window.renderInfo);console.log(info);if(info.nodes!==info.expected)throw new Error('Missing animated nodes');
  const out=path.join(root,'сборка',mode==='stills'?'web-lookdev':'web-frames');fs.mkdirSync(out,{recursive:true});
  let indices=mode==='stills'?[48,102,222,354,432,546,678,804,870,942,1026,1062,1140,1278,1368,1548]:mode==='probe'?Array.from({length:240},(_,i)=>315+i):mode==='polish'?Array.from({length:216},(_,i)=>1404+i):Array.from({length:1620},(_,i)=>i);
  const begin=Date.now();
  for(const f of indices){
    const dest=path.join(out,String(f).padStart(5,'0')+'.jpg');if(!['stills','polish'].includes(mode)&&fs.existsSync(dest))continue;
    const bytes=await page.evaluate(f=>window.capture(f),f);fs.writeFileSync(dest,Buffer.from(bytes,'base64'));
    if(f%30===0||mode==='stills')console.log('FRAME',f,'seconds',((Date.now()-begin)/1000).toFixed(1));
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
