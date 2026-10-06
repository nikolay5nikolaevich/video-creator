// Общий рендер scene.html в скрытом Chrome. Запускается из папки ролика; имя mp4 берётся из timing.json ("out").
//   node ../render.cjs stills [t1 t2 ...]  — отдельные кадры (секунды) в сборка/stills/ и лист sheet.jpg
//   node ../render.cjs clip a b            — кадры [a, b) секунд в черновики/проба.mp4 (со звуком, если есть сборка/sound.wav)
//   node ../render.cjs final               — все кадры в сборка/frames/ и готовое/<out>.mp4 (нужен сборка/sound.wav);
//                                            если есть сборка/sound-с-музыкой.wav — ещё и черновики/<out>-с-музыкой.mp4
const fs=require('fs'),path=require('path'),http=require('http'),{execFileSync}=require('child_process');
const root=process.cwd(),mods=path.join(__dirname,'web-render');
const {chromium}=require(path.join(mods,'node_modules','playwright-core'));
const T=JSON.parse(fs.readFileSync(path.join(root,'timing.json'),'utf8'));
const mode=process.argv[2]||'stills';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=name==='/'?path.join(root,'scene.html'):name==='/timing.json'?path.join(root,'timing.json'):path.resolve(mods,'.'+name);
  if(!(file.startsWith(root+path.sep)||file.startsWith(mods+path.sep))||!fs.existsSync(file)){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
const ffmpeg=a=>execFileSync('ffmpeg',['-v','error','-y',...a],{stdio:'inherit'});
const video=['-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709'];
const audio=['-c:a','aac','-b:a','256k','-ar','48000'];
(async()=>{
  await new Promise(r=>server.listen(8794,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--ignore-gpu-blocklist','--enable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
    page.on('pageerror',e=>console.error('PAGE ERROR',e));page.on('console',m=>m.type()==='error'&&console.error('CONSOLE',m.text()));
    await page.goto('http://127.0.0.1:8794/',{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>window.ready,{},{timeout:120000});
    const total=await page.evaluate(()=>window.frames),begin=Date.now();
    const shot=async(f,n,dest)=>fs.writeFileSync(dest,Buffer.from(await page.evaluate(([f,n])=>window.capture(f,n),[f,n]),'base64'));
    const fresh=name=>{const dir=path.join(root,'сборка',name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});return dir};
    const sound=path.join(root,'сборка','sound.wav'),music=path.join(root,'сборка','sound-с-музыкой.wav');
    if(mode==='stills'){
      const dir=fresh('stills');
      // по умолчанию: начало, середина и конец каждого плана
      const times=process.argv.length>3?process.argv.slice(3).map(Number):T.shots.flatMap((s,i)=>{const e=T.shots[i+1]??T.dur;return [s+.05,(s+e)/2,e-.06]});
      for(const[i,t]of times.entries())await shot(Math.round(t*T.fps),6,path.join(dir,String(i).padStart(2,'0')+'.jpg'));
      ffmpeg(['-framerate','1','-i',path.join(dir,'%02d.jpg'),'-vf',`scale=360:-2,tile=${Math.min(times.length,6)}x${Math.ceil(times.length/6)}`,'-frames:v','1','-q:v','3',path.join(dir,'sheet.jpg')]);
      console.log('stills',times.map(t=>t.toFixed(2)).join(' '),'|',((Date.now()-begin)/1000).toFixed(1),'s');
    }else if(mode==='clip'){
      const a=Number(process.argv[3]),b=Number(process.argv[4]),f0=Math.round(a*T.fps),f1=Math.round(b*T.fps),dir=fresh('clip');
      for(let f=f0;f<f1;f++)await shot(f,8,path.join(dir,String(f-f0).padStart(4,'0')+'.jpg'));
      const mp4=path.join(root,'черновики','проба.mp4');fs.mkdirSync(path.dirname(mp4),{recursive:true});
      const snd=[music,sound].find(f=>fs.existsSync(f));
      ffmpeg(['-framerate',String(T.fps),'-i',path.join(dir,'%04d.jpg'),...(snd?['-ss',String(a),'-t',String(b-a),'-i',snd]:[]),...video,...(snd?audio:[]),mp4]);
      console.log('готово:',mp4,((Date.now()-begin)/1000).toFixed(0),'s');
    }else{
      const dir=fresh('frames');
      for(let f=0;f<total;f++){await shot(f,16,path.join(dir,String(f).padStart(4,'0')+'.jpg'));if(f%24===0)console.log('frame',f,'/',total,((Date.now()-begin)/1000).toFixed(0),'s')}
      const build=(wav,mp4)=>{fs.mkdirSync(path.dirname(mp4),{recursive:true});
        ffmpeg(['-framerate',String(T.fps),'-i',path.join(dir,'%04d.jpg'),'-i',wav,'-t',String(T.dur),...video,...audio,'-movflags','+faststart',mp4]);console.log('готово:',mp4)};
      build(sound,path.join(root,'готовое',T.out+'.mp4'));
      if(fs.existsSync(music))build(music,path.join(root,'черновики',T.out+'-с-музыкой.mp4'));
    }
  }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
