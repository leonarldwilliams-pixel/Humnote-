/* HumNote guided tour */
(function(){
const css=`#tov{position:fixed;inset:0;z-index:200;display:none}#tov.on{display:block}#tov.dim{background:rgba(4,47,34,.78)}
#tsp{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px rgba(4,47,34,.78);transition:all .25s;pointer-events:none;border:2px solid #6ee7b7}
#ttip{position:fixed;left:14px;right:14px;max-width:420px;margin:0 auto;background:#fff;border-radius:22px;padding:18px 18px 14px;box-shadow:0 14px 44px rgba(0,0,0,.4);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
#ttip h3{margin:0 0 6px;font-size:18px;color:#064e3b}#ttip p{margin:0 0 14px;color:#334155;font-size:14.5px;line-height:1.5}
#ttip .tr{display:flex;align-items:center;gap:8px}#ttip .tc{flex:1;font-size:12px;color:#64748b;font-weight:700}
#ttip button{border:0;border-radius:12px;padding:10px 16px;font-size:14px;font-weight:700;font-family:inherit}
#tskip{background:none;color:#64748b;padding:10px 6px!important}#tback{background:#ecfdf5;color:#047857}#tnext{background:#059669;color:#fff}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
const ov=document.createElement("div");ov.id="tov";
ov.innerHTML='<div id="tsp"></div><div id="ttip"><h3 id="tt"></h3><p id="tx"></p><div class="tr"><span class="tc" id="tc"></span><button id="tskip">Skip</button><button id="tback">Back</button><button id="tnext">Next</button></div></div>';
document.body.appendChild(ov);
const $=id=>document.getElementById(id);
const S=[
 {t:"Welcome to HumNote 🎵",x:"This is your music studio in your pocket. This quick tour shows what each part does. You can skip it at any time."},
 {tab:"hum",sel:"#rec",t:"Hum to find your notes",x:"Tap the big button and hum a tune. HumNote finds the notes, the key, the tempo, and chords that fit. You can play it back and save your song."},
 {tab:"piano",sel:"#instrow",t:"Choose an instrument",x:"Swipe sideways to pick from lots of sounds: piano, flute, ocarina, jazz guitar, strings, bells and more."},
 {tab:"piano",sel:"#trrow",t:"Transpose and sustain",x:"Use the plus and minus to move every note higher or lower. Turn on Sustain to let notes ring out."},
 {tab:"piano",sel:"#kbw",t:"Play the keys",x:"Tap the keys. Make the piano bigger or smaller with the size buttons and sliders. Use Record a take to save what you play."},
 {tab:"drums",sel:"#pads",t:"Drum pads",x:"Tap the pads to play drums like a real drum machine. You can record your beat and save it."},
 {tab:"kit",sel:"#kt-grid",t:"Your music toolkit",x:"Pro tools live here: song splitter, key and tempo finder, key changer, noise cleaner, auto-tune, voice effects, chord tools, beat maker, metronome and tuner. Tap any tile to open it."},
 {tab:"songs",sel:'#nav [data-t="songs"]',t:"My songs",x:"Everything you save from Hum, Piano and Drums shows up here. You can play or delete it."},
 {tab:"hum",sel:"#helpbtn",t:"Need help later?",x:"Tap this ? button any time to see the tour again. Enjoy making music!"}
];
let i=0,active=false;
function pos(){
  const s=S[i],sp=$("tsp"),tip=$("ttip");
  const el=s.sel?document.querySelector(s.sel):null;
  if(!el){sp.style.display="none";ov.classList.add("dim");tip.style.top="50%";tip.style.bottom="auto";tip.style.transform="translateY(-50%)";return;}
  ov.classList.remove("dim");sp.style.display="block";tip.style.transform="none";
  if(el.id!=="helpbtn")el.scrollIntoView({block:"center"});
  const r=el.getBoundingClientRect(),pad=6;
  sp.style.left=Math.max(4,r.left-pad)+"px";sp.style.top=Math.max(4,r.top-pad)+"px";sp.style.width=Math.min(innerWidth-8,r.width+pad*2)+"px";sp.style.height=Math.min(innerHeight-8,r.height+pad*2)+"px";
  if(r.top+r.height/2<innerHeight/2){tip.style.top="auto";tip.style.bottom="24px";}else{tip.style.bottom="auto";tip.style.top="24px";}
}
function show(){
  const s=S[i];if(s.tab&&typeof go==="function")go(s.tab);
  $("tt").textContent=s.t;$("tx").textContent=s.x;$("tc").textContent=(i+1)+" of "+S.length;
  $("tback").style.display=i>0?"":"none";$("tnext").textContent=i===S.length-1?"Done":"Next";$("tskip").style.display=i===S.length-1?"none":"";
  requestAnimationFrame(()=>requestAnimationFrame(pos));
}
function end(){active=false;ov.classList.remove("on","dim");try{localStorage.setItem("humnote_toured","1");}catch(e){}if(typeof go==="function")go("hum");window.scrollTo(0,0);}
function start(){i=0;active=true;ov.classList.add("on");show();}
$("tnext").onclick=()=>{if(i>=S.length-1){end();return;}i++;show();};
$("tback").onclick=()=>{if(i>0){i--;show();}};
$("tskip").onclick=end;
window.addEventListener("resize",()=>{if(active)pos();});
const hb=document.getElementById("helpbtn");if(hb)hb.onclick=start;
let seen=false;try{seen=!!localStorage.getItem("humnote_toured");}catch(e){}
if(!seen)setTimeout(start,1200);
})();
