/* HumNote DSP: sound processing engine */
(function(){
const tick=()=>new Promise(r=>setTimeout(r));
/*DSP-START*/
function fft(re,im,inv){const n=re.length;
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=n;len<<=1){const a=(inv?2:-2)*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a),h=len>>1;
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<h;k++){const u=i+k,v=u+h,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}
  if(inv)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}}
async function denoise(x,sr,str,prog){
  const N=1024,H=256,n=x.length,w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=Math.sin(Math.PI*(i+.5)/N);
  const p=new Float32Array(n+2*N);p.set(x,N);
  const nf=Math.floor((p.length-N)/H)+1,f0=N/H,f1=nf-N/H;if(f1-f0<10)return x;
  const en=[];for(let f=f0;f<f1;f++){let e=0;for(let i=0;i<N;i+=4){const v=p[f*H+i];e+=v*v;}en.push([e,f]);}
  en.sort((a,b)=>a[0]-b[0]);const take=Math.max(8,Math.floor(en.length*.12)),K=N/2+1,noise=new Float32Array(K);
  const re=new Float32Array(N),im=new Float32Array(N);
  for(let q=0;q<take;q++){const f=en[q][1];for(let i=0;i<N;i++){re[i]=p[f*H+i]*w[i];im[i]=0;}fft(re,im,false);for(let k=0;k<K;k++)noise[k]+=Math.hypot(re[k],im[k])/take;}
  const alpha=1+str*2.2,beta=.12-.08*str,out=new Float32Array(p.length),prev=new Float32Array(K).fill(1);
  for(let f=0;f<nf;f++){
    for(let i=0;i<N;i++){re[i]=p[f*H+i]*w[i];im[i]=0;}
    fft(re,im,false);
    for(let k=0;k<K;k++){const mag=Math.hypot(re[k],im[k]);let g=mag>1e-9?Math.max(beta,1-alpha*noise[k]/mag):1;g=.6*g+.4*prev[k];prev[k]=g;re[k]*=g;im[k]*=g;if(k>0&&k<N/2){re[N-k]*=g;im[N-k]*=g;}}
    fft(re,im,true);
    for(let i=0;i<N;i++)out[f*H+i]+=re[i]*w[i]*.5;
    if(f%200===0){prog&&prog(f/nf);await tick();}
  }
  return out.slice(N,N+n);
}
const SCALES={"Chromatic (all notes)":[0,1,2,3,4,5,6,7,8,9,10,11],"Major":[0,2,4,5,7,9,11],"Minor":[0,2,3,5,7,8,10],"Major pentatonic":[0,2,4,7,9],"Minor pentatonic":[0,3,5,7,10]};
async function autotune(x,sr,o,prog){
  const D=Math.max(1,Math.round(sr/11025)),s2=sr/D,n2=Math.floor(x.length/D),y=new Float32Array(n2);
  for(let i=0;i<n2;i++){let s=0;for(let k=0;k<D;k++)s+=x[i*D+k];y[i]=s/D;}
  let pk=0;for(let i=0;i<n2;i++)pk=Math.max(pk,Math.abs(y[i]));if(pk<1e-4)return x;
  const gain=Math.min(30,.5/pk);for(let i=0;i<n2;i++)y[i]*=gain;
  const N=512,Hh=128,nf=Math.floor((n2-N)/Hh);if(nf<4)return x;
  const hz=new Float32Array(nf);
  for(let f=0;f<nf;f++){hz[f]=detectPitch(y.subarray(f*Hh,f*Hh+N),s2);if(f%150===0){prog&&prog(f/nf);await tick();}}
  const hz2=hz.slice();
  for(let f=2;f<nf-2;f++){if(!hz[f])continue;const w=[];for(let j=f-2;j<=f+2;j++)if(hz[j])w.push(hz[j]);w.sort((a,b)=>a-b);const m=w[w.length>>1];hz2[f]=Math.abs(hz[f]/m-1)>.2?m:hz[f];}
  const mask=new Array(12).fill(false);(SCALES[o.scale]||SCALES.Major).forEach(d=>mask[(d+o.root)%12]=true);
  const ratio=new Float32Array(nf),P=new Float32Array(nf),alpha=.03+.97*Math.pow(o.speed,1.5);let sm=0,lastT=null;
  for(let f=0;f<nf;f++){const h=hz2[f];
    if(h>0){const m=69+12*Math.log2(h/440),r0=Math.round(m);let best=r0,bd=99;for(let c=r0-2;c<=r0+2;c++){if(!mask[((c%12)+12)%12])continue;const d=Math.abs(c-m);if(d<bd){bd=d;best=c;}}
      if(lastT!==null&&mask[((lastT%12)+12)%12]&&Math.abs(lastT-m)<=bd+.3)best=lastT;lastT=best;sm+=((best-m)*o.amount-sm)*alpha;P[f]=Math.max(sr/900,Math.min(sr/h,sr/60));}
    else{sm*=.6;lastT=null;P[f]=Math.round(.009*sr);}
    ratio[f]=Math.pow(2,sm/12);}
  const fidx=p=>Math.max(0,Math.min(nf-1,Math.round((p/D-N/2)/Hh)));
  const marks=[],Pm=[];let p=0;
  while(p<x.length){const fi=fidx(p),Pp=Math.max(40,P[fi]|0);marks.push(p);Pm.push(Pp);let q=p+Pp;
    if(hz2[fi]>0){let bi=q,bv=-1;const a=Math.max(0,q-(Pp>>2)),b=Math.min(x.length-1,q+(Pp>>2));for(let i=a;i<=b;i++){const v=Math.abs(x[i]);if(v>bv){bv=v;bi=i;}}q=bi;}
    p=Math.max(p+(Pp>>1)+1,q);}
  const out=new Float32Array(x.length);let ts=marks[0],mi=0;
  while(ts<x.length){
    while(mi+1<marks.length&&Math.abs(marks[mi+1]-ts)<Math.abs(marks[mi]-ts))mi++;
    const pm=marks[mi],Pp=Pm[mi],r=ratio[fidx(pm)],t0=Math.round(ts);
    for(let k=-Pp;k<Pp;k++){const si=pm+k,oi=t0+k;if(si<0||si>=x.length||oi<0||oi>=x.length)continue;out[oi]+=x[si]*.5*(1+Math.cos(Math.PI*k/Pp))/r;}
    ts+=Pp/r;}
  for(let i=0;i<out.length;i++){const v=out[i];out[i]=v>1?1:v<-1?-1:v;}
  return out;
}

function repl(a,off,w,ov,nv){let i=off;while(a[i]!==ov)i++;a[i]=nv;while(i>off&&a[i-1]>nv){a[i]=a[i-1];a[i-1]=nv;i--;}while(i<off+w-1&&a[i+1]<nv){a[i]=a[i+1];a[i+1]=nv;i++;}}
async function splitStems(src,sr,mode,outA,outB,prog){
  const N=1024,H=512,K=513,WN=17,HW=8,n=src[0].length,ch=src.length,nf=Math.ceil(n/H)+2,eps=1e-9;
  const w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=Math.sin(Math.PI*(i+.5)/N);
  const re=new Float32Array(N),im=new Float32Array(N),mag=new Float32Array(nf*K);
  const get=(c,i)=>i>=0&&i<n?src[c][i]:0;
  for(let f=0;f<nf;f++){
    const s=f*H-H;
    for(let j=0;j<N;j++){const i=s+j;re[j]=ch>1?(get(0,i)+get(1,i))*.5*w[j]:get(0,i)*w[j];im[j]=0;}
    fft(re,im,false);for(let k=0;k<K;k++)mag[f*K+k]=Math.hypot(re[k],im[k]);
    if(f%96===0){prog&&prog(f/nf*.15);await tick();}
  }
  const cl=(i)=>i<0?0:i>=nf?nf-1:i;
  const tw=new Float32Array(K*WN);
  for(let k=0;k<K;k++){for(let q=0;q<WN;q++)tw[k*WN+q]=mag[cl(q-HW)*K+k];tw.subarray(k*WN,k*WN+WN).sort();}
  const Lr=new Float32Array(N),Li=new Float32Array(N),Rr=new Float32Array(N),Ri=new Float32Array(N),fw=new Float32Array(WN),m1=new Float32Array(K);
  for(let f=0;f<nf;f++){
    const s=f*H-H,row=f*K;
    for(let j=0;j<N;j++){const i=s+j;Lr[j]=get(0,i)*w[j];Li[j]=0;if(ch>1){Rr[j]=get(1,i)*w[j];Ri[j]=0;}}
    fft(Lr,Li,false);if(ch>1)fft(Rr,Ri,false);
    for(let q=0;q<WN;q++)fw[q]=mag[row+Math.max(0,Math.min(K-1,q-HW))];fw.sort();
    for(let k=0;k<K;k++){
      const Hm=tw[k*WN+HW],Pm=fw[HW],ph=Pm*Pm,pmask=ph/(ph+Hm*Hm+eps),fr=k*sr/N;let m;
      if(mode==="drums")m=pmask;
      else if(mode==="bass")m=(1-pmask)*Math.min(1,Math.max(0,(260-fr)/140));
      else{let cen=1;if(ch>1){const d=Math.hypot(Lr[k]-Rr[k],Li[k]-Ri[k]),t=Math.hypot(Lr[k],Li[k])+Math.hypot(Rr[k],Ri[k])+eps;cen=1-Math.min(1,d/t);}m=(1-pmask)*cen*cen*Math.min(1,Math.max(0,(fr-120)/120));}
      m1[k]=m;
      if(k>0&&k<N/2){Lr[N-k]*=m;Li[N-k]*=m;if(ch>1){Rr[N-k]*=m;Ri[N-k]*=m;}}
      Lr[k]*=m;Li[k]*=m;if(ch>1){Rr[k]*=m;Ri[k]*=m;}
      // advance time window to next frame
      if(f<nf-1){const o=cl(f-HW),nw=cl(f+HW+1);if(o!==nw){const ov=mag[o*K+k],nv=mag[nw*K+k];if(ov!==nv)repl(tw,k*WN,WN,ov,nv);}}
    }
    fft(Lr,Li,true);if(ch>1)fft(Rr,Ri,true);
    for(let j=0;j<N;j++){const i=s+j;if(i>=0&&i<n){outA[0][i]+=Lr[j]*w[j];if(ch>1)outA[1][i]+=Rr[j]*w[j];}}
    if(f%48===0){prog&&prog(.15+f/nf*.85);await tick();}
  }
  for(let c=0;c<ch;c++)for(let i=0;i<n;i++)outB[c][i]=src[c][i]-outA[c][i];
}
/*DSP-END*/
function wavBlob(buf){const ch=buf.numberOfChannels,len=buf.length,sr=buf.sampleRate,o=new DataView(new ArrayBuffer(44+len*ch*2));
  const w=(p,s)=>{for(let i=0;i<s.length;i++)o.setUint8(p+i,s.charCodeAt(i));};
  w(0,"RIFF");o.setUint32(4,36+len*ch*2,true);w(8,"WAVEfmt ");o.setUint32(16,16,true);o.setUint16(20,1,true);o.setUint16(22,ch,true);o.setUint32(24,sr,true);o.setUint32(28,sr*ch*2,true);o.setUint16(32,ch*2,true);o.setUint16(34,16,true);w(36,"data");o.setUint32(40,len*ch*2,true);
  const d=[];for(let c=0;c<ch;c++)d.push(buf.getChannelData(c));let p=44;
  for(let i=0;i<len;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,d[c][i]));o.setInt16(p,s<0?s*32768:s*32767,true);p+=2;}
  return new Blob([o],{type:"audio/wav"});}


const FXD={lo:0,mid:0,hi:0,comp:0,drive:0,rev:0,echo:0,echoT:.3,lowcut:20,hicut:20000};
const FXL=[["lo","Low (bass)",-12,12,1],["mid","Mid (body)",-12,12,1],["hi","High (air)",-12,12,1],["comp","Compression",0,1,.01],["drive","Warmth",0,1,.01],["rev","Reverb",0,1,.01],["echo","Echo",0,1,.01],["echoT","Echo time (s)",.05,.8,.01],["lowcut","Low cut (Hz)",20,600,10],["hicut","High cut (Hz)",1500,20000,100]];
const PRE={"Clean":{},"Studio vocal":{mid:2,hi:3,comp:.5,drive:.1,rev:.15,lowcut:90},"Warm radio":{lo:3,mid:1,hi:1,comp:.6,drive:.25,rev:.1,lowcut:100},"Bright pop":{lo:-1,mid:2,hi:5,comp:.55,drive:.1,rev:.2,echo:.1,echoT:.25,lowcut:90},"Deep rap":{lo:5,mid:1,hi:1,comp:.7,drive:.2,rev:.08,lowcut:70},"Stadium":{hi:2,comp:.4,rev:.6,echo:.25,echoT:.38,lowcut:90},"Echo room":{rev:.3,echo:.4,echoT:.3,lowcut:90},"Backing vocal":{mid:-1,hi:2,comp:.4,rev:.35,echo:.1,echoT:.25,lowcut:120},"Telephone":{mid:4,drive:.3,lowcut:500,hicut:3000},"Lo-fi":{hi:-3,drive:.5,lowcut:200,hicut:4000}};

const bq=(c,type,f,g,q)=>{const n=c.createBiquadFilter();n.type=type;n.frequency.value=f;if(g!==undefined)n.gain.value=g;if(q)n.Q.value=q;return n;};
const IRC=new WeakMap();
function ir(c){let b=IRC.get(c);if(b)return b;const sr=c.sampleRate,len=Math.floor(sr*2.2);b=c.createBuffer(2,len,sr);for(let k=0;k<2;k++){const d=b.getChannelData(k);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}IRC.set(c,b);return b;}
function chain(c,tr,dest){
  const f=tr.fx,inp=c.createGain();
  const ns=[bq(c,"highpass",f.lowcut),bq(c,"lowshelf",200,f.lo),bq(c,"peaking",1500,f.mid,.8),bq(c,"highshelf",6000,f.hi),bq(c,"lowpass",f.hicut)];
  if(f.drive>0){const w=c.createWaveShaper(),k=f.drive*30,cv=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;cv[i]=(1+k)*x/(1+k*Math.abs(x));}w.curve=cv;w.oversample="2x";ns.push(w);}
  const cp=c.createDynamicsCompressor();cp.threshold.value=-6-f.comp*30;cp.ratio.value=1+f.comp*9;cp.knee.value=12;cp.attack.value=.006;cp.release.value=.2;ns.push(cp);
  let prev=inp;ns.forEach(n=>{prev.connect(n);prev=n;});
  const mix=c.createGain();mix.gain.value=1+f.comp*.5;prev.connect(mix);
  if(f.rev>0){const cv=c.createConvolver();cv.buffer=ir(c);const g=c.createGain();g.gain.value=f.rev*1.2;prev.connect(cv);cv.connect(g);g.connect(mix);}
  if(f.echo>0){const dl=c.createDelay(1),fb=c.createGain(),g=c.createGain();dl.delayTime.value=f.echoT;fb.gain.value=.38;g.gain.value=f.echo;prev.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(g);g.connect(mix);}
  const vol=c.createGain(),pan=c.createStereoPanner();mix.connect(vol);vol.connect(pan);pan.connect(dest);
  return{inp,vol,pan};
}


async function applyFx(buf,fx){
  const sr=buf.sampleRate,oc=new OfflineAudioContext(2,buf.length+Math.ceil(sr*2.6),sr),s=oc.createBufferSource(),mg=oc.createGain();
  mg.gain.value=.95;mg.connect(oc.destination);s.buffer=buf;const c=chain(oc,{fx},mg);s.connect(c.inp);s.start();return oc.startRendering();
}
const MAJP=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],MINP=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function corr12(a,b){const ma=a.reduce((x,y)=>x+y)/12,mb=b.reduce((x,y)=>x+y)/12;let n=0,da=0,db=0;for(let i=0;i<12;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2;}return n/Math.sqrt(da*db||1);}
async function analyzeKT(x,sr,prog){
  const D=Math.max(1,Math.round(sr/11025)),s2=sr/D,n=Math.min(Math.floor(x.length/D),Math.floor(s2*150)),y=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let k=0;k<D;k++)s+=x[i*D+k];y[i]=s/D;}
  if(n<s2*3)throw new Error("short");
  /* key */
  let N=4096,H=2048,w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  let re=new Float32Array(N),im=new Float32Array(N);const ch=new Float64Array(12);
  const lo=Math.ceil(65*N/s2),hi=Math.min(N/2-1,Math.floor(2200*N/s2)),pc=[];
  for(let k=lo;k<=hi;k++)pc[k]=((Math.round(12*Math.log2(k*s2/N/440))+69)%12+12)%12;
  let fr=0;
  for(let s=0;s+N<=n;s+=H){for(let i=0;i<N;i++){re[i]=y[s+i]*w[i];im[i]=0;}fft(re,im,false);for(let k=lo;k<=hi;k++)ch[pc[k]]+=Math.sqrt(Math.hypot(re[k],im[k]));if(++fr%30===0){prog&&prog(Math.min(.5,s/n*.5));await tick();}}
  const keys=[];
  for(let k=0;k<12;k++){const rot=Array.from({length:12},(_,i)=>ch[(i+k)%12]);keys.push({k,minor:false,s:corr12(rot,MAJP)});keys.push({k,minor:true,s:corr12(rot,MINP)});}
  keys.sort((a,b)=>b.s-a.s);
  /* tempo */
  N=1024;H=256;w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  re=new Float32Array(N);im=new Float32Array(N);
  const kmax=Math.min(N/2-1,Math.floor(4000*N/s2)),prev=new Float32Array(kmax+1),flux=[];fr=0;
  for(let s=0;s+N<=n;s+=H){for(let i=0;i<N;i++){re[i]=y[s+i]*w[i];im[i]=0;}fft(re,im,false);let f=0;for(let k=1;k<=kmax;k++){const m=Math.log(1+10*Math.hypot(re[k],im[k]));const d=m-prev[k];if(d>0)f+=d;prev[k]=m;}flux.push(f);if(++fr%200===0){prog&&prog(.5+Math.min(.45,s/n*.45));await tick();}}
  const L=flux.length,sm=new Float32Array(L);
  for(let i=0;i<L;i++){let a=0,c=0;for(let j=Math.max(0,i-12);j<=Math.min(L-1,i+12);j++){a+=flux[j];c++;}sm[i]=Math.max(0,flux[i]-a/c);}
  const fp=H/s2,maxLag=Math.ceil(4*60/50/fp)+2,acf=new Float32Array(maxLag+2);
  for(let l=0;l<=maxLag;l++){let a=0;for(let i=0;i+l<L;i++)a+=sm[i]*sm[i+l];acf[l]=a;}
  const A=lag=>{const i=Math.floor(lag);if(i+1>maxLag)return 0;const f=lag-i;return(acf[i]*(1-f)+acf[i+1]*f)/(acf[0]||1);};
  let best=100,bs=-1;
  for(let b=55;b<=200;b+=.5){const l=60/b/fp,sc=(A(l)+.5*A(2*l)+.25*A(4*l))*Math.exp(-.5*Math.pow(Math.log2(b/115)/.8,2));if(sc>bs){bs=sc;best=b;}}
  prog&&prog(1);
  return{keys:keys.slice(0,3),bpm:Math.round(best)};
}
async function pitchShift(chs,sr,semis,prog){
  const r=Math.pow(2,semis/12),N=2048,Ha=512,Hs=Math.max(1,Math.round(Ha*r)),alpha=Hs/Ha,K=N/2+1,w=new Float32Array(N);
  for(let i=0;i<N;i++)w[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  const res=[];
  for(let c=0;c<chs.length;c++){
    const x=chs[c],n=x.length,nf=Math.floor((n-N)/Ha)+1;if(nf<2){res.push(x.slice());continue;}
    const outLen=(nf-1)*Hs+N,y=new Float32Array(outLen),wn=new Float32Array(outLen),re=new Float32Array(N),im=new Float32Array(N),pp=new Float32Array(K),sp=new Float32Array(K),mag=new Float32Array(K);
    for(let f=0;f<nf;f++){
      const s=f*Ha;for(let i=0;i<N;i++){re[i]=x[s+i]*w[i];im[i]=0;}fft(re,im,false);
      for(let k=0;k<K;k++){const m=Math.hypot(re[k],im[k]),ph=Math.atan2(im[k],re[k]);let d=ph-pp[k]-2*Math.PI*k*Ha/N;d-=2*Math.PI*Math.round(d/(2*Math.PI));pp[k]=ph;sp[k]=f===0?ph:sp[k]+(2*Math.PI*k/N+d/Ha)*Hs;mag[k]=m;}
      for(let k=0;k<K;k++){re[k]=mag[k]*Math.cos(sp[k]);im[k]=mag[k]*Math.sin(sp[k]);}
      im[0]=0;im[N/2]=0;for(let k=1;k<N/2;k++){re[N-k]=re[k];im[N-k]=-im[k];}
      fft(re,im,true);
      const o=f*Hs;for(let i=0;i<N;i++){y[o+i]+=re[i]*w[i];wn[o+i]+=w[i]*w[i];}
      if(f%64===0){prog&&prog((c+f/nf)/chs.length);await tick();}
    }
    const out=new Float32Array(n);
    for(let i=0;i<n;i++){const p=i*alpha,i0=Math.floor(p),fr=p-i0;if(i0+1>=outLen)break;const a=y[i0]/(wn[i0]>1e-3?wn[i0]:1),b=y[i0+1]/(wn[i0+1]>1e-3?wn[i0+1]:1);out[i]=a+(b-a)*fr;}
    res.push(out);
  }
  return res;
}
window.DSP={denoise,autotune,splitStems,SCALES,wavBlob,FXD,FXL,PRE,applyFx,analyzeKT,pitchShift};
})();
