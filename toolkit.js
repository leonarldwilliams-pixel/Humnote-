/* HumNote Toolkit: music tools hub */
(function(){
const D=window.DSP,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const OCX=new OfflineAudioContext(1,1,44100),mkBuf=(c,l,sr)=>OCX.createBuffer(c,l,sr);
const SH=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"],FL=["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
const FLM=new Set([5,10,3,8,1]),FLm=new Set([2,7,0,5,10,3]);
const useFl=(r,minor)=>(minor?FLm:FLM).has(r),nm=(pc,fl)=>(fl?FL:SH)[((pc%12)+12)%12];
const css=`
.kth{margin:2px 2px 6px;color:var(--mut);font-size:14px;line-height:1.5}
.kg{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--g800);margin:18px 4px 8px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tile{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 2px 10px rgba(15,23,42,.04);min-height:116px;font-family:inherit}
.tile i{font-style:normal;width:40px;height:40px;border-radius:12px;background:var(--g100);display:grid;place-items:center;font-size:21px}
.tile b{font-size:14.5px;color:var(--ink)}.tile span{font-size:12px;color:var(--mut);line-height:1.35}
.tile:active{transform:scale(.97)}
.back{border:0;background:none;color:var(--g700);font-weight:700;font-size:15px;padding:6px 2px;margin-bottom:4px}
.ph2{font-size:22px;font-weight:800;margin:0 0 6px;color:var(--g900)}
.rs{background:var(--g50);border:1px solid var(--g100);border-radius:16px;padding:12px;margin-top:12px}
.rs audio{width:100%;margin:8px 0}
a.btn{display:inline-block;text-align:center;text-decoration:none}
.btn.on{background:#dc2626;color:#fff;border-color:#dc2626}
.ta{width:100%;min-height:96px;border:1.5px solid var(--g100);border-radius:12px;padding:10px;font-size:15px;font-family:inherit;resize:vertical;margin-bottom:6px}
.srow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.srow label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut)}
.num{display:flex;align-items:center;gap:8px}
.num button,.nb{width:38px;height:38px;border-radius:10px;border:1.5px solid var(--g600);background:#fff;color:var(--g700);font-size:18px;font-weight:700}
.num b{min-width:52px;text-align:center;font-size:20px;color:var(--g800)}
.sb{margin:18px 0 8px;font-size:12px;font-weight:800;color:var(--g800);letter-spacing:.06em;text-transform:uppercase}
.dl{font-size:12px;color:var(--mut);display:block;margin-bottom:8px}.dl span{float:right;color:var(--g700);font-weight:700}.dl input{width:100%;accent-color:#059669}
.sel{width:100%;padding:11px;border-radius:10px;border:1.5px solid var(--g100);background:#fff;font-size:14px;margin-bottom:8px}
.fxg{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}
.fxg label{font-size:12px;color:var(--mut);display:block}.fxg label span{float:right;color:var(--g700);font-weight:700}.fxg input{width:100%;accent-color:#059669}
.bm{display:grid;grid-template-columns:repeat(16,1fr);gap:3px;margin:3px 0 8px}
.bm button{height:30px;border:0;border-radius:5px;background:#e8f1ec;padding:0}.bm button.g{background:#cfe8dc}.bm button.on{background:var(--g600)}.bm button.pl{outline:2px solid #065f46}
.tport{display:flex;gap:10px;margin:6px 0 10px}.tport .btn{margin:0;flex:1}
.prog{background:#fff;border:1px solid var(--g100);border-radius:14px;padding:10px 12px;margin-top:10px}
.cs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px}
.cp{background:var(--g50);border:1px solid var(--g100);border-radius:10px;padding:6px 10px;font-weight:800;color:var(--g900);text-align:center}
.cp small{display:block;font-size:10px;color:var(--g700);font-weight:700}
.big2{font-size:30px;font-weight:800;color:var(--g800)}
.kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed var(--g100);font-size:14px}.kv span:first-child{color:var(--mut)}.kv b{text-align:right}
`;
const sty=document.createElement("style");sty.textContent=css;document.head.appendChild(sty);

/* ---------- shared helpers ---------- */
async function busy(btn,label,work){const t=btn.textContent;btn.disabled=true;try{await work(p=>{btn.textContent=label+" "+Math.round(Math.min(1,p)*100)+"%";});}catch(e){console.error(e);toast(e&&e.message==="short"?"Please use at least 3 seconds of audio":"Something went wrong. Try a shorter file.");}btn.disabled=false;btn.textContent=t;}
async function proc(buf,fn,prog){const sr=buf.sampleRate,cap=Math.min(buf.length,Math.floor(240*sr)),nc=buf.numberOfChannels,o=mkBuf(nc,cap,sr);for(let c=0;c<nc;c++){const r=await fn(buf.getChannelData(c).subarray(0,cap),sr,p=>prog&&prog((c+p)/nc));o.getChannelData(c).set(r);}return o;}
async function micRec(){
  const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});ac();
  const src=AC.createMediaStreamSource(s),sp=AC.createScriptProcessor(4096,1,1),mu=AC.createGain();mu.gain.value=0;const ch=[];let n=0;
  sp.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);ch.push(new Float32Array(d));n+=d.length;};src.connect(sp);sp.connect(mu);mu.connect(AC.destination);
  return{stop(){sp.onaudioprocess=null;sp.disconnect();src.disconnect();mu.disconnect();s.getTracks().forEach(t=>t.stop());const b=mkBuf(1,Math.max(1,n),AC.sampleRate),o=b.getChannelData(0);let p=0;ch.forEach(c=>{o.set(c,p);p+=c.length;});return b;}};
}
function audioIn(box,o){
  const st={buf:null,name:""};
  box.innerHTML=`<div class="srow"><button class="btn alt sm" data-a="f">📁 Choose audio</button>${o.rec?`<button class="btn alt sm" data-a="r">● ${o.rec}</button>`:""}</div><input type="file" accept="audio/*" class="hide"><div class="tip ai" style="margin:0 0 6px">No audio chosen yet.</div>`;
  const info=box.querySelector(".ai"),file=box.querySelector("input"),rb=box.querySelector('[data-a="r"]');
  const set=(b,n)=>{st.buf=b;st.name=n;info.innerHTML="<b>"+esc(n)+"</b> · "+fmt(b.duration)+(o.cap&&b.duration>240?" · the first 4 minutes will be used":"");};
  box.querySelector('[data-a="f"]').onclick=()=>file.click();
  file.onchange=async()=>{const f=file.files[0];if(!f)return;ac();info.textContent="Loading…";try{set(await AC.decodeAudioData(await f.arrayBuffer()),f.name.replace(/\.[^.]+$/,"").slice(0,28));}catch(e){info.textContent="Could not open that file. Try an MP3, M4A or WAV.";}file.value="";};
  if(rb){let R=null,iv=null,t0=0;rb.onclick=async()=>{
    if(R){clearInterval(iv);const b=R.stop();R=null;rb.textContent="● "+o.rec;rb.classList.remove("on");set(b,"My recording");return;}
    try{R=await micRec();}catch(e){toast("Microphone blocked");return;}
    t0=performance.now();rb.classList.add("on");iv=setInterval(()=>rb.textContent="■ Stop "+fmt((performance.now()-t0)/1000),250);};}
  return{get buf(){return st.buf},get name(){return st.name},set};
}
let URLS=[];
function showResults(box,items){
  URLS.forEach(u=>URL.revokeObjectURL(u));URLS=[];
  box.innerHTML=items.map((it,i)=>{const u=URL.createObjectURL(D.wavBlob(it.buf));URLS.push(u);return`<div class="rs"><b>${esc(it.label)}</b><audio controls preload="metadata" src="${u}"></audio><div class="srow" style="margin:0"><a class="btn sm" download="${esc(it.file)}.wav" href="${u}">⬇ Download</a>${it.again?`<button class="btn alt sm" data-again="${i}">Use as input</button>`:""}</div></div>`;}).join("");
  box.querySelectorAll("[data-again]").forEach(x=>x.onclick=()=>{items[+x.dataset.again].again();toast("Loaded as the new input");});
}
const chipsHTML=(arr,sel,attr)=>arr.map((t,i)=>`<button ${attr}="${i}" class="${i===sel?"on":""}">${t}</button>`).join("");
function bindChips(box,attr,cb){box.querySelectorAll("["+attr+"]").forEach(x=>x.onclick=()=>{box.querySelectorAll("["+attr+"]").forEach(y=>y.classList.toggle("on",y===x));cb(+x.getAttribute(attr));});}
function miniPiano(set,root){
  let w="",k="";const W=[0,2,4,5,7,9,11];
  for(let i=0;i<14;i++){const pc=W[i%7];w+=`<rect x="${i*20}" y="0" width="19" height="70" rx="3" fill="${set.has(pc)?(pc===root?"#047857":"#6ee7b7"):"#fff"}" stroke="#94a3b8"/>`;}
  for(let o=0;o<2;o++)[0,1,3,4,5].forEach(wi=>{const pc=W[wi]+1;k+=`<rect x="${(o*7+wi+1)*20-6}" y="0" width="12" height="42" rx="2" fill="${set.has(pc)?(pc===root?"#047857":"#10b981"):"#1f2937"}"/>`;});
  return`<svg viewBox="0 0 280 70" width="100%" style="max-width:420px;margin:8px 0">${w}${k}</svg>`;
}
function playMidi(ms,dur,gap,kind){ac();const t=AC.currentTime+.05;ms.forEach((m,i)=>voice(master,m,t+i*gap,.7,kind||"piano")(t+i*gap+dur));}
function diatonic(root,minor,sev){
  const fl=useFl(root,minor),off=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
  const q=minor?["m","dim","","m","m","",""]:["","m","m","","","m","dim"],s7=minor?["m7","m7♭5","maj7","m7","m7","maj7","7"]:["maj7","m7","m7","maj7","7","m7","m7♭5"];
  const iv={"":[0,4,7],m:[0,3,7],dim:[0,3,6],maj7:[0,4,7,11],m7:[0,3,7,10],"7":[0,4,7,10],"m7♭5":[0,3,6,10]},rn=["I","II","III","IV","V","VI","VII"];
  return off.map((o,i)=>{const r=(root+o)%12,qq=sev?s7[i]:q[i];let R=rn[i];if(/^m|dim/.test(qq))R=R.toLowerCase();if(qq==="dim"||qq==="m7♭5")R+="°";return{name:nm(r,fl)+(qq==="dim"?"°":qq),root:r,iv:iv[qq],rn:R};});
}
function playChord(c,when,dur,kind){const base=48+c.root;c.iv.forEach(i=>voice(master,base+i,when,.6,kind||"piano")(when+dur));voice(master,base-12,when,.7,"organ")(when+dur);}
const rootChips=(sel)=>chipsHTML(SH,sel,"data-r");

/* ---------- tools ---------- */
function tSplit(b){
  b.innerHTML=`<p class="desc">Separate a song into parts. Choose a song, pick what to split, then tap Split.</p><div id="ai"></div><div class="sb">What to split</div>
  <div class="seg" id="sm"><button data-m="vocals" class="on">Vocals / Music</button><button data-m="drums">Drums / No drums</button><button data-m="bass">Bass / No bass</button></div>
  <button class="btn" id="go">Split</button><div id="res"></div><p class="tip">This is a quick splitter, not AI, so some sounds may leak between the parts. It works best on stereo songs where the voice is in the middle. Up to 4 minutes at a time. Tap “Use as input” on a result to split it again, for example to take the drums out of the music.</p>`;
  const A=audioIn(b.querySelector("#ai"),{cap:true});
  b.querySelectorAll("#sm button").forEach(x=>x.onclick=()=>b.querySelectorAll("#sm button").forEach(y=>y.classList.toggle("on",y===x)));
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose a song first");return;}const mode=b.querySelector("#sm .on").dataset.m,src=A.buf,name=A.name;
    await busy(e.target,"Splitting",async p=>{
      const sr=src.sampleRate,cap=Math.min(src.length,Math.floor(240*sr)),nc=src.numberOfChannels,ch=Array.from({length:nc},(_,c)=>src.getChannelData(c).subarray(0,cap)),a=mkBuf(nc,cap,sr),bb=mkBuf(nc,cap,sr);
      await D.splitStems(ch,sr,mode,Array.from({length:nc},(_,c)=>a.getChannelData(c)),Array.from({length:nc},(_,c)=>bb.getChannelData(c)),p);
      const n={vocals:["Vocals","Music only"],drums:["Drums","No drums"],bass:["Bass","No bass"]}[mode];
      showResults(b.querySelector("#res"),[{label:n[0],buf:a,file:name+" - "+n[0],again:()=>A.set(a,name+" "+n[0])},{label:n[1],buf:bb,file:name+" - "+n[1],again:()=>A.set(bb,name+" "+n[1])}]);
    });
  };
}
const CAMM=["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"],CAMm=["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];
function tKey(b){
  b.innerHTML=`<p class="desc">Choose a song, or play or sing into the microphone for at least 10 seconds.</p><div id="ai"></div><button class="btn" id="go">Find key & tempo</button><div id="out"></div>`;
  const A=audioIn(b.querySelector("#ai"),{rec:"Listen with mic",cap:true});
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose a song or record first");return;}
    await busy(e.target,"Listening",async p=>{
      const b0=A.buf,x=b0.getChannelData(0);let m=x;if(b0.numberOfChannels>1){const y=b0.getChannelData(1);m=new Float32Array(x.length);for(let i=0;i<x.length;i++)m[i]=(x[i]+y[i])*.5;}
      const r=await D.analyzeKT(m,b0.sampleRate,p),k=r.keys[0],fl=useFl(k.k,k.minor),name=nm(k.k,fl)+(k.minor?" minor":" major");
      const rr=k.minor?(k.k+3)%12:(k.k+9)%12,rel=nm(rr,useFl(rr,!k.minor))+(k.minor?" major":" minor"),gap=k.s-r.keys[1].s,conf=gap>.08?"High":gap>.03?"Medium":"Low";
      const ch=diatonic(k.k,k.minor,false).map(c=>c.name).join("  ·  "),alt=r.keys.slice(1).map(z=>nm(z.k,useFl(z.k,z.minor))+(z.minor?" minor":" major")).join(", ");
      b.querySelector("#out").innerHTML=`<div class="rs"><div class="big2">${name}</div><div class="kv"><span>Tempo</span><b>${r.bpm} BPM</b></div><div class="kv"><span>Might also feel like</span><b>${Math.round(r.bpm/2)} or ${Math.round(r.bpm*2)} BPM</b></div><div class="kv"><span>Confidence</span><b>${conf}</b></div><div class="kv"><span>Relative key</span><b>${rel}</b></div><div class="kv"><span>Other possible keys</span><b>${alt}</b></div><div class="kv"><span>DJ key code</span><b>${(k.minor?CAMm:CAMM)[k.k]}</b></div><div class="kv"><span>Chords in this key</span><b>${ch}</b></div><button class="btn alt" id="pl">▶ Hear the scale</button></div>`;
      b.querySelector("#pl").onclick=()=>{const off=k.minor?[0,2,3,5,7,8,10,12]:[0,2,4,5,7,9,11,12];playMidi(off.map(o=>60+k.k+o),.4,.32);};
    });
  };
}
function tShift(b){
  let n=2;
  b.innerHTML=`<p class="desc">Raise or lower the pitch of a song without changing its speed. Works best for small changes, up to about 4 steps.</p><div id="ai"></div><div class="sb">Change by (half steps)</div><div class="srow"><div class="num"><button id="m">−</button><b id="v">+2</b><button id="p">+</button></div></div><button class="btn" id="go">Change the key</button><div id="res"></div><p class="tip">One half step is one key on the piano, for example C to C♯. Up to 4 minutes at a time. Big changes can sound a little watery.</p>`;
  const A=audioIn(b.querySelector("#ai"),{cap:true}),v=b.querySelector("#v"),show=()=>v.textContent=(n>0?"+":"")+n;
  b.querySelector("#m").onclick=()=>{n=Math.max(-12,n-1);show();};b.querySelector("#p").onclick=()=>{n=Math.min(12,n+1);show();};
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose a song first");return;}if(n===0){toast("Pick a change first");return;}const name=A.name,src=A.buf;
    await busy(e.target,"Changing",async p=>{
      const sr=src.sampleRate,cap=Math.min(src.length,Math.floor(240*sr)),nc=src.numberOfChannels,ch=Array.from({length:nc},(_,c)=>src.getChannelData(c).subarray(0,cap)),out=await D.pitchShift(ch,sr,n,p),o=mkBuf(nc,cap,sr);
      out.forEach((c,i)=>o.getChannelData(i).set(c));
      showResults(b.querySelector("#res"),[{label:"Key changed by "+(n>0?"+":"")+n,buf:o,file:name+" ("+(n>0?"+":"")+n+")",again:()=>A.set(o,name+" "+(n>0?"+":"")+n)}]);
    });
  };
}
function tPractice(b){
  b.innerHTML=`<p class="desc">Slow a song down to learn it, without changing the pitch, and loop the part you are practising.</p><div class="srow"><button class="btn alt sm" id="f">📁 Choose a song</button></div><input type="file" accept="audio/*,video/*" class="hide" id="fi"><audio id="pa" controls style="width:100%"></audio>
  <div class="sb">Speed</div><div class="ch" id="sp">${[.5,.6,.7,.8,.9,1,1.15,1.3].map(s=>`<button data-s="${s}" class="${s===1?"on":""}">${s===1?"Normal":s+"x"}</button>`).join("")}</div>
  <div class="sb">Loop a part</div><div class="srow"><button class="btn alt sm" id="a">Set start</button><button class="btn alt sm" id="e">Set end</button><button class="btn alt sm" id="lp">Loop: off</button></div><div class="tip" id="ab" style="margin:0">Play the song, then tap Set start and Set end at the places you want.</div>`;
  const pa=b.querySelector("#pa");let A=0,B=0,loop=false,url=null,spd=1;
  pa.preservesPitch=true;pa.webkitPreservesPitch=true;
  b.querySelector("#f").onclick=()=>b.querySelector("#fi").click();
  b.querySelector("#fi").onchange=e=>{const f=e.target.files[0];if(!f)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);pa.src=url;pa.onloadedmetadata=()=>{pa.playbackRate=spd;};};
  b.querySelectorAll("#sp button").forEach(x=>x.onclick=()=>{spd=+x.dataset.s;pa.playbackRate=spd;b.querySelectorAll("#sp button").forEach(y=>y.classList.toggle("on",y===x));});
  const lab=()=>b.querySelector("#ab").textContent="Start: "+fmt(A)+"   End: "+(B?fmt(B):"not set");
  b.querySelector("#a").onclick=()=>{A=pa.currentTime;lab();};b.querySelector("#e").onclick=()=>{B=pa.currentTime;lab();};
  b.querySelector("#lp").onclick=e=>{loop=!loop;e.target.textContent="Loop: "+(loop?"on":"off");};
  const iv=setInterval(()=>{if(loop&&B>A&&pa.currentTime>=B)pa.currentTime=A;},60);
  return()=>{clearInterval(iv);pa.pause();if(url)URL.revokeObjectURL(url);};
}
function tDenoise(b){
  b.innerHTML=`<p class="desc">Remove steady background noise like fans, hiss and hum from a recording.</p><div id="ai"></div><label class="dl">Strength <span id="sv">60%</span><input type="range" id="st" min="10" max="100" value="60"></label><button class="btn" id="go">Clean the noise</button><div id="res"></div><p class="tip">Best for steady noise. It cannot remove other people talking or music. Record a short quiet moment at the start for better results. Up to 4 minutes.</p>`;
  const A=audioIn(b.querySelector("#ai"),{rec:"Record voice",cap:true});
  b.querySelector("#st").oninput=e=>b.querySelector("#sv").textContent=e.target.value+"%";
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose or record audio first");return;}const s=b.querySelector("#st").value/100,name=A.name,src=A.buf;
    await busy(e.target,"Cleaning",async p=>{const o=await proc(src,(x,sr,pr)=>D.denoise(x,sr,s,pr),p);showResults(b.querySelector("#res"),[{label:"Cleaned audio",buf:o,file:name+" (clean)",again:()=>A.set(o,name+" clean")}]);});
  };
}
function tTune(b){
  let amt=100,spd=55;
  b.innerHTML=`<p class="desc">Fix off-key notes in a voice. Record or choose a clean, single voice, then pick the key of your song.</p><div id="ai"></div>
  <div class="sb">Style</div><div class="ch" id="q">${[["Natural",60,25],["Clean pop",100,55],["Hard tune",100,100]].map((a,i)=>`<button data-q="${i}" class="${i===1?"on":""}">${a[0]}</button>`).join("")}</div>
  <div class="srow" style="margin-top:12px"><select class="sel" id="rt" style="flex:1;margin:0">${SH.map((n,i)=>`<option value="${i}">Key: ${n}</option>`).join("")}</select><select class="sel" id="sc" style="flex:1.4;margin:0">${Object.keys(D.SCALES).map(s=>`<option>${s}</option>`).join("")}</select></div>
  <label class="dl">Correction strength <span id="av">100%</span><input type="range" id="am" min="0" max="100" value="100"></label><label class="dl">Speed (higher is more robotic) <span id="pv">55%</span><input type="range" id="sd" min="0" max="100" value="55"></label>
  <button class="btn" id="go">Apply auto-tune</button><div id="res"></div><p class="tip">Choose “Major” or “Minor” if you know your song’s key. Use the Key & tempo finder if you are not sure. Works best on a clean voice with no music. Up to 4 minutes.</p>`;
  const A=audioIn(b.querySelector("#ai"),{rec:"Record voice",cap:true}),pre=[[60,25],[100,55],[100,100]];
  const sync=()=>{b.querySelector("#am").value=amt;b.querySelector("#sd").value=spd;b.querySelector("#av").textContent=amt+"%";b.querySelector("#pv").textContent=spd+"%";};
  bindChips(b.querySelector("#q"),"data-q",i=>{amt=pre[i][0];spd=pre[i][1];sync();});
  b.querySelector("#am").oninput=e=>{amt=+e.target.value;b.querySelector("#av").textContent=amt+"%";};b.querySelector("#sd").oninput=e=>{spd=+e.target.value;b.querySelector("#pv").textContent=spd+"%";};
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose or record a voice first");return;}const o={root:+b.querySelector("#rt").value,scale:b.querySelector("#sc").value,amount:amt/100,speed:spd/100},name=A.name,src=A.buf;
    await busy(e.target,"Tuning",async p=>{const r=await proc(src,(x,sr,pr)=>D.autotune(x,sr,o,pr),p);showResults(b.querySelector("#res"),[{label:"Auto-tuned voice",buf:r,file:name+" (tuned)",again:()=>A.set(r,name+" tuned")}]);});
  };
}
function tFx(b){
  const loadCP=()=>{try{return JSON.parse(localStorage.getItem("humnote_presets")||"[]");}catch(e){return[];}};
  let fx=Object.assign({},D.FXD,D.PRE["Studio vocal"]),cur="Studio vocal";
  const all=()=>Object.keys(D.PRE).map(n=>({name:n,fx:D.PRE[n]})).concat(loadCP().map(p=>({name:p.name,fx:p.fx,c:1})));
  const fv=v=>Number.isInteger(v)?v:(+v).toFixed(2);
  b.innerHTML=`<p class="desc">Make a voice sound like it was recorded in a studio. Pick a preset, adjust it, or save your own.</p><div id="ai"></div><div class="sb">Presets</div><div class="ch" id="pr"></div><div class="sb">Fine tune</div><div class="fxg" id="fg"></div>
  <div class="ch" style="margin-top:12px"><button id="sv">＋ Save as my preset</button><button id="dl" class="hide" style="color:#b91c1c;border-color:#fecaca">Delete this preset</button></div><button class="btn" id="go">Apply effects</button><div id="res"></div>`;
  const A=audioIn(b.querySelector("#ai"),{rec:"Record voice",cap:true});
  const draw=()=>{
    const list=all();b.querySelector("#pr").innerHTML=list.map((p,i)=>`<button data-p="${i}" class="${p.name===cur?"on":""}">${esc(p.name)}</button>`).join("");
    b.querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>{const p=list[+x.dataset.p];fx=Object.assign({},D.FXD,p.fx);cur=p.name;draw();});
    b.querySelector("#fg").innerHTML=D.FXL.map(([k,l,mn,mx,sp])=>`<label>${l}<span>${fv(fx[k])}</span><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${sp}" value="${fx[k]}"></label>`).join("");
    b.querySelectorAll("[data-k]").forEach(x=>x.oninput=()=>{fx[x.dataset.k]=+x.value;cur=null;x.parentNode.querySelector("span").textContent=fv(+x.value);});
    b.querySelector("#dl").classList.toggle("hide",!loadCP().some(p=>p.name===cur));
  };
  draw();
  b.querySelector("#sv").onclick=()=>{const n=prompt("Name your preset","My preset "+(loadCP().length+1));if(!n)return;const a=loadCP().filter(p=>p.name!==n.trim());a.push({name:n.trim(),fx:Object.assign({},fx)});try{localStorage.setItem("humnote_presets",JSON.stringify(a));}catch(e){}cur=n.trim();draw();toast("Preset saved ✓");};
  b.querySelector("#dl").onclick=()=>{if(!confirm("Delete this preset?"))return;try{localStorage.setItem("humnote_presets",JSON.stringify(loadCP().filter(p=>p.name!==cur)));}catch(e){}cur=null;draw();};
  b.querySelector("#go").onclick=async e=>{
    if(!A.buf){toast("Choose or record a voice first");return;}const name=A.name,src=A.buf,f=Object.assign({},fx);
    await busy(e.target,"Working",async()=>{const o=await D.applyFx(src,f);showResults(b.querySelector("#res"),[{label:"With effects"+(cur?": "+cur:""),buf:o,file:name+" (effects)",again:()=>A.set(o,name+" fx")}]);});
  };
}
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function trTok(tok,n,mode){
  const m=tok.match(/^([A-G][#b♯♭]?)((?:maj|min|dim|aug|sus|add|m|M|\d+|[+°ø#b()\-])*)(?:\/([A-G][#b♯♭]?))?$/);if(!m)return tok;
  const pc=s=>(PC[s[0]]+(/[#♯]/.test(s[1]||"")?1:/[b♭]/.test(s[1]||"")?-1:0)+12)%12;
  return nm(pc(m[1])+n,mode)+m[2]+(m[3]?"/"+nm(pc(m[3])+n,mode):"");
}
function tTrans(b){
  let n=2,mode=0;
  b.innerHTML=`<p class="desc">Paste a line of chords and move them to a new key.</p><textarea class="ta" id="in" placeholder="Paste chords here, for example:&#10;C  Am  F  G&#10;Dm7  G7  Cmaj7"></textarea>
  <div class="sb">Move by</div><div class="seg" id="md"><button data-m="0" class="on">Steps</button><button data-m="1">Key to key</button></div>
  <div id="s1"><div class="srow"><div class="num"><button id="m">−</button><b id="v">+2</b><button id="p">+</button></div></div></div>
  <div id="s2" class="hide"><div class="srow"><select class="sel" id="fr" style="flex:1;margin:0">${SH.map((x,i)=>`<option value="${i}">From: ${x}</option>`).join("")}</select><select class="sel" id="to" style="flex:1;margin:0">${SH.map((x,i)=>`<option value="${i}" ${i===2?"selected":""}>To: ${x}</option>`).join("")}</select></div></div>
  <div class="sb">Spelling</div><div class="seg" id="sp"><button data-s="0" class="on">Auto</button><button data-s="1">Sharps ♯</button><button data-s="2">Flats ♭</button></div>
  <div class="rs"><b>Transposed chords</b><textarea class="ta" id="out" readonly style="margin-top:8px"></textarea><button class="btn sm" id="cp">Copy</button></div>
  <div class="sb">Capo helper</div><div class="srow"><select class="sel" id="ck" style="flex:1;margin:0">${SH.map((x,i)=>`<option value="${i}">Song key: ${x}</option>`).join("")}</select><select class="sel" id="cm" style="flex:1;margin:0"><option value="0">Major</option><option value="1">Minor</option></select></div><div id="cap"></div>
  <p class="tip">Paste only chords, not lyrics, because words like “A” or “Am” would also be changed.</p>`;
  let sp=0;const q=s=>b.querySelector(s);
  const steps=()=>mode===0?n:((+q("#to").value)-(+q("#fr").value)+12)%12;
  const run=()=>{const k=steps(),fl=sp===1?false:sp===2?true:(mode===1?useFl(+q("#to").value,false):k<0?true:false);q("#out").value=q("#in").value.replace(/[^\s|,]+/g,t=>trTok(t,k,fl));
    const r=+q("#ck").value,mn=q("#cm").value==="1",easy=mn?[9,4,2]:[0,7,2,9,4];let h="";
    for(let c=0;c<=7;c++){const sh=(r-c+12)%12,ok=easy.includes(sh);h+=`<div class="kv"><span>${c===0?"No capo":"Capo "+c}</span><b>play shapes in ${nm(sh,useFl(sh,mn))}${mn?"m":""}${ok?" ✓ easy":""}</b></div>`;}q("#cap").innerHTML=h;};
  q("#in").oninput=run;q("#m").onclick=()=>{n=Math.max(-11,n-1);q("#v").textContent=(n>0?"+":"")+n;run();};q("#p").onclick=()=>{n=Math.min(11,n+1);q("#v").textContent=(n>0?"+":"")+n;run();};
  bindChips(q("#md"),"data-m",i=>{mode=i;q("#s1").classList.toggle("hide",i===1);q("#s2").classList.toggle("hide",i===0);run();});
  bindChips(q("#sp"),"data-s",i=>{sp=i;run();});["#fr","#to","#ck","#cm"].forEach(s=>q(s).onchange=run);
  q("#cp").onclick=async()=>{try{await navigator.clipboard.writeText(q("#out").value);toast("Copied ✓");}catch(e){q("#out").select();}};
  run();
}
const CT={"Major":[0,4,7],"Minor":[0,3,7],"Dominant 7":[0,4,7,10],"Major 7":[0,4,7,11],"Minor 7":[0,3,7,10],"Diminished":[0,3,6],"Diminished 7":[0,3,6,9],"Augmented":[0,4,8],"Sus 2":[0,2,7],"Sus 4":[0,5,7],"Sixth (6)":[0,4,7,9],"Minor 6":[0,3,7,9],"Add 9":[0,4,7,14],"Ninth (9)":[0,4,7,10,14],"Minor 9":[0,3,7,10,14],"Power chord (5)":[0,7]};
const IVN=["1","♭2","2","♭3","3","4","♭5","5","♯5","6","♭7","7"];
function tChordF(b){
  let r=0;
  b.innerHTML=`<p class="desc">Choose a root note and a chord type to see its notes and hear it.</p><div class="ch" id="rc">${rootChips(0)}</div><select class="sel" id="ty" style="margin-top:12px">${Object.keys(CT).map(k=>`<option>${k}</option>`).join("")}</select><div class="rs" id="out"></div><div class="tport"><button class="btn" id="pl">▶ Play chord</button><button class="btn alt" id="ar">Play one by one</button></div>`;
  const q=s=>b.querySelector(s),show=()=>{const t=CT[q("#ty").value],fl=FLM.has(r),pcs=t.map(i=>(r+i)%12);
    q("#out").innerHTML=`<div class="big2">${nm(r,fl)} ${esc(q("#ty").value)}</div><div class="kv"><span>Notes</span><b>${[...new Set(pcs)].map(p=>nm(p,fl)).join("  ")}</b></div><div class="kv"><span>Formula</span><b>${t.map(i=>i>=12?"9":IVN[i]).join(" – ")}</b></div>${miniPiano(new Set(pcs),r)}`;};
  bindChips(q("#rc"),"data-r",i=>{r=i;show();});q("#ty").onchange=show;
  const ms=()=>CT[q("#ty").value].map(i=>60+r+i);
  q("#pl").onclick=()=>playMidi(ms(),1.6,0);q("#ar").onclick=()=>playMidi(ms(),.6,.35);show();
}
const SC={"Major":[0,2,4,5,7,9,11],"Natural minor":[0,2,3,5,7,8,10],"Harmonic minor":[0,2,3,5,7,8,11],"Melodic minor":[0,2,3,5,7,9,11],"Major pentatonic":[0,2,4,7,9],"Minor pentatonic":[0,3,5,7,10],"Blues":[0,3,5,6,7,10],"Dorian":[0,2,3,5,7,9,10],"Phrygian":[0,1,3,5,7,8,10],"Lydian":[0,2,4,6,7,9,11],"Mixolydian":[0,2,4,5,7,9,10],"Locrian":[0,1,3,5,6,8,10],"Whole tone":[0,2,4,6,8,10]};
function tScale(b){
  let r=0;
  b.innerHTML=`<p class="desc">Pick a key and scale to see its notes, and the chords that belong to it.</p><div class="ch" id="rc">${rootChips(0)}</div><select class="sel" id="ty" style="margin-top:12px">${Object.keys(SC).map(k=>`<option>${k}</option>`).join("")}</select><div class="rs" id="out"></div><button class="btn" id="pl">▶ Play the scale</button>`;
  const q=s=>b.querySelector(s),show=()=>{const nme=q("#ty").value,t=SC[nme],fl=FLM.has(r),pcs=t.map(i=>(r+i)%12);let h=`<div class="big2">${nm(r,fl)} ${esc(nme)}</div><div class="kv"><span>Notes</span><b>${pcs.map(p=>nm(p,fl)).join("  ")}</b></div>${miniPiano(new Set(pcs),r)}`;
    if(nme==="Major"||nme==="Natural minor"){const m=nme!=="Major";h+=`<div class="sb">Chords in this key</div><div class="cs">${diatonic(r,m,false).map(c=>`<div class="cp">${c.name}<small>${c.rn}</small></div>`).join("")}</div>`;}
    q("#out").innerHTML=h;};
  bindChips(q("#rc"),"data-r",i=>{r=i;show();});q("#ty").onchange=show;
  q("#pl").onclick=()=>{const t=SC[q("#ty").value];playMidi(t.concat([12]).map(o=>60+r+o),.4,.3);};show();
}
const STY={"Pop":{M:[[0,4,5,3],[5,3,0,4],[0,5,3,4],[0,3,5,4]],m:[[0,5,2,6],[0,3,6,2],[5,6,0,0],[0,6,5,6]]},"Afrobeats":{M:[[5,3,0,4],[0,5,1,4],[3,4,2,5],[0,3,5,4]],m:[[0,6,5,6],[0,5,6,0],[0,3,6,5],[5,6,0,2]]},"Gospel":{M:[[0,3,0,4],[0,2,3,4],[1,4,0,3],[0,5,1,4]],m:[[0,3,4,0],[0,5,3,4],[0,6,5,4],[1,4,0,0]]},"R&B":{M:[[1,4,0,5],[0,2,3,4],[5,1,4,0],[3,2,1,0]],m:[[0,3,6,2],[5,6,0,0],[0,5,1,4],[0,6,3,4]]},"Hip-hop":{M:[[0,5,3,4],[5,3,0,4],[0,0,3,3],[1,1,4,4]],m:[[0,0,5,6],[0,3,0,6],[0,5,3,6],[0,2,5,6]]},"Jazz":{M:[[1,4,0,0],[2,5,1,4],[0,5,1,4],[0,3,6,2]],m:[[1,4,0,0],[0,3,6,2],[0,5,1,4],[2,5,0,0]]}};
function tIdeas(b){
  let r=0,minor=false;
  b.innerHTML=`<p class="desc">Get chord progressions for your song. Pick a key and a style, then tap Play to hear each one.</p><div class="ch" id="rc">${rootChips(0)}</div><div class="seg" id="mm" style="margin-top:12px"><button data-m="0" class="on">Major</button><button data-m="1">Minor</button></div><select class="sel" id="st">${Object.keys(STY).map(k=>`<option>${k}</option>`).join("")}</select><label class="srow" style="margin:0 0 6px"><input type="checkbox" id="s7"> Use 7th chords (richer sound)</label><div id="out"></div><p class="tip">These are common patterns many songs use. Mix them, change the order, and make them your own.</p>`;
  const q=s=>b.querySelector(s),draw=()=>{const ch=diatonic(r,minor,q("#s7").checked),list=STY[q("#st").value][minor?"m":"M"];
    q("#out").innerHTML=list.map((p,i)=>`<div class="prog"><div class="cs">${p.map(d=>`<div class="cp">${ch[d].name}<small>${ch[d].rn}</small></div>`).join("")}</div><button class="btn sm" data-pl="${i}">▶ Play</button></div>`).join("");
    q("#out").querySelectorAll("[data-pl]").forEach(x=>x.onclick=()=>{ac();const t=AC.currentTime+.05,pr=list[+x.dataset.pl];for(let rep=0;rep<2;rep++)pr.forEach((d,j)=>playChord(ch[d],t+(rep*4+j)*1.3,1.25));});};
  bindChips(q("#rc"),"data-r",i=>{r=i;draw();});bindChips(q("#mm"),"data-m",i=>{minor=i===1;draw();});q("#st").onchange=draw;q("#s7").onchange=draw;draw();
}
function tBeat(b){
  const names=["Kick","Snare","Hi-hat","Open hat","Clap","Tom"],ids=[0,1,2,3,4,6];
  const PAT={"Hip-hop":[[0,7,10],[4,12],[0,2,4,6,8,10,12,14],[],[],[]],"Afrobeat":[[0,3,6,10,14],[4,12],[2,6,10,14],[7,15],[12],[9]],"Pop":[[0,4,8,12],[4,12],[2,6,10,14],[],[4,12],[]],"Trap":[[0,10],[8],[0,2,4,6,7,8,10,12,14,15],[],[8],[]],"Clear":[[],[],[],[],[],[]]};
  let rows=[],bars=4,bpm=95,iv=null;
  const set=n=>{rows=PAT[n].map(a=>{const r=new Array(16).fill(false);a.forEach(i=>r[i]=true);return r;});grid();};
  b.innerHTML=`<p class="desc">Tap squares to build a drum pattern, listen, then download it as an audio file.</p><div class="ch">${Object.keys(PAT).map(n=>`<button data-p="${n}">${n}</button>`).join("")}</div><div id="gr" style="margin-top:8px"></div>
  <div class="srow"><div class="num"><span style="font-size:13px;color:var(--mut)">Tempo</span><button id="m">−</button><b id="v">95</b><button id="p">+</button></div></div>
  <div class="srow"><span style="font-size:13px;color:var(--mut)">Bars</span><div class="seg" id="bs" style="flex:1;margin:0">${[1,2,4,8].map(n=>`<button data-b="${n}" class="${n===4?"on":""}">${n}</button>`).join("")}</div></div>
  <div class="tport"><button class="btn alt" id="pv">▶ Preview</button><button class="btn" id="dl">⬇ Download</button></div>`;
  const q=s=>b.querySelector(s);
  function grid(){q("#gr").innerHTML=rows.map((r,ri)=>`<div style="font-size:12px;color:var(--mut);margin-top:6px">${names[ri]}</div><div class="bm">${r.map((v,i)=>`<button data-r="${ri}" data-i="${i}" class="${v?"on":""} ${(i>>2)%2===0?"g":""}"></button>`).join("")}</div>`).join("");}
  q("#gr").onclick=e=>{const x=e.target.closest("[data-r]");if(!x)return;const r=+x.dataset.r,i=+x.dataset.i;rows[r][i]=!rows[r][i];x.classList.toggle("on",rows[r][i]);if(rows[r][i]){ac();drum(ids[r]);}};
  b.querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>set(x.dataset.p));
  q("#m").onclick=()=>{bpm=Math.max(50,bpm-1);q("#v").textContent=bpm;};q("#p").onclick=()=>{bpm=Math.min(200,bpm+1);q("#v").textContent=bpm;};
  b.querySelectorAll("#bs button").forEach(x=>x.onclick=()=>{bars=+x.dataset.b;b.querySelectorAll("#bs button").forEach(y=>y.classList.toggle("on",y===x));});
  const stop=()=>{if(iv){clearInterval(iv);iv=null;}q("#pv").textContent="▶ Preview";b.querySelectorAll(".bm .pl").forEach(x=>x.classList.remove("pl"));};
  q("#pv").onclick=()=>{if(iv){stop();return;}ac();let step=0,next=AC.currentTime+.08;q("#pv").textContent="■ Stop";
    iv=setInterval(()=>{while(next<AC.currentTime+.12){const s=step;rows.forEach((r,ri)=>{if(r[s])drum(ids[ri],next,master);});setTimeout(()=>{b.querySelectorAll(".bm .pl").forEach(x=>x.classList.remove("pl"));b.querySelectorAll(`.bm button[data-i="${s}"]`).forEach(x=>x.classList.add("pl"));},Math.max(0,(next-AC.currentTime)*1000));next+=15/bpm;step=(step+1)%16;}},25);};
  q("#dl").onclick=async e=>{
    if(!rows.some(r=>r.some(Boolean))){toast("Tap some squares first");return;}stop();ac();
    await busy(e.target,"Making",async()=>{const sr=AC.sampleRate,sd=15/bpm,oc=new OfflineAudioContext(2,Math.ceil((bars*16*sd+.8)*sr),sr),g=oc.createGain();g.gain.value=.9;g.connect(oc.destination);
      for(let k=0;k<bars;k++)for(let s=0;s<16;s++)rows.forEach((r,ri)=>{if(r[s])drum(ids[ri],(k*16+s)*sd,g);});
      const buf=await oc.startRendering(),u=URL.createObjectURL(D.wavBlob(buf)),a=document.createElement("a");a.href=u;a.download="my-beat.wav";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);toast("Beat downloaded ✓");});
  };
  set("Hip-hop");return stop;
}
const SECS=Array.from($("v-tools").children).filter(e=>e.tagName==="SECTION");
const moveSec=(b,i)=>{if(SECS[i])b.appendChild(SECS[i]);};

/* ---------- hub ---------- */
const TOOLS=[
 {g:"Song tools",id:"split",i:"✂️",n:"Song splitter",d:"Separate vocals, drums or bass from a song",f:tSplit},
 {g:"Song tools",id:"key",i:"🔑",n:"Key & tempo finder",d:"Find the key and BPM of a song or your voice",f:tKey},
 {g:"Song tools",id:"shift",i:"🎚️",n:"Song key changer",d:"Raise or lower the pitch of a song",f:tShift},
 {g:"Song tools",id:"prac",i:"🔁",n:"Practice player",d:"Slow a song down and loop a part",f:tPractice},
 {g:"Voice tools",id:"dn",i:"🧹",n:"Noise cleaner",d:"Remove background noise from a recording",f:tDenoise},
 {g:"Voice tools",id:"at",i:"🎤",n:"Auto-tune",d:"Fix off-key notes in a voice",f:tTune},
 {g:"Voice tools",id:"fx",i:"✨",n:"Voice effects",d:"Studio vocal presets and your own presets",f:tFx},
 {g:"Writing & theory",id:"tr",i:"🎼",n:"Chord transposer",d:"Move chords to another key, with capo help",f:tTrans},
 {g:"Writing & theory",id:"cf",i:"🎹",n:"Chord finder",d:"See and hear any chord",f:tChordF},
 {g:"Writing & theory",id:"sf",i:"🎶",n:"Scale finder",d:"Scales, notes and the chords in a key",f:tScale},
 {g:"Writing & theory",id:"id",i:"💡",n:"Chord ideas",d:"Progressions for Pop, Afrobeats, Gospel and more",f:tIdeas},
 {g:"Play & practice",id:"bm",i:"🥁",n:"Beat maker",d:"Build a drum beat and download it",f:tBeat},
 {g:"Play & practice",id:"mt",i:"⏱️",n:"Metronome",d:"Keep a steady beat",f:b=>moveSec(b,0)},
 {g:"Play & practice",id:"tu",i:"🎸",n:"Instrument tuner",d:"Tune a guitar, voice or any instrument",f:b=>moveSec(b,1)}
];
const KIT=$("v-kit");
KIT.innerHTML='<div class="kit-ok"></div><div id="kt-home"></div><div id="kt-pane" class="hide"><button class="back" id="kt-back">‹ All tools</button><h2 class="ph2" id="kt-title"></h2><div id="kt-body"></div></div>';
const gs=[...new Set(TOOLS.map(t=>t.g))];
$("kt-home").innerHTML='<p class="kth">Everything you need to write, practice and polish your music. Tap a tool to open it.</p>'+gs.map((g,gi)=>`<div class="kg">${g}</div><div class="tiles"${gi===0?' id="kt-grid"':""}>${TOOLS.filter(t=>t.g===g).map(t=>`<button class="tile" data-t="${t.id}"><i>${t.i}</i><b>${t.n}</b><span>${t.d}</span></button>`).join("")}</div>`).join("");
let cleanup=null;
function closeTool(){if(cleanup){try{cleanup();}catch(e){}cleanup=null;}if(typeof stopTuner==="function")stopTuner();$("kt-body").textContent="";$("kt-pane").classList.add("hide");$("kt-home").classList.remove("hide");}
KIT.addEventListener("click",e=>{
  const t=e.target.closest(".tile");if(t){const tool=TOOLS.find(x=>x.id===t.dataset.t);$("kt-home").classList.add("hide");$("kt-pane").classList.remove("hide");$("kt-title").textContent=tool.n;const b=$("kt-body");b.textContent="";const c=tool.f(b);cleanup=typeof c==="function"?c:null;window.scrollTo(0,0);return;}
  if(e.target.closest("#kt-back")){closeTool();window.scrollTo(0,0);}
});
const oldGo=window.go;
window.go=function(t){if(t!=="kit")closeTool();oldGo(t);};
})();
