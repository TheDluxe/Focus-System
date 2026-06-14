/* audio.js - Brown noise via Web Audio API */
let audioCtx=null, sourceNode=null, gainNode=null, noisePlaying=false;

function createNoiseBuffer(ctx) {
  const buf=ctx.createBuffer(1,2*ctx.sampleRate,ctx.sampleRate), out=buf.getChannelData(0);
  let last=0;
  for(let i=0;i<out.length;i++){
    const w=Math.random()*2-1;
    out[i]=(last+(0.02*w))/1.02; last=out[i]; out[i]*=3.5;
  }
  return buf;
}

function initAudio() {
  if(audioCtx) return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  gainNode=audioCtx.createGain(); gainNode.gain.value=0.5;
  gainNode.connect(audioCtx.destination);
}

function startBrownNoise(vol=50) {
  initAudio();
  if(audioCtx.state==="suspended") audioCtx.resume();
  if(noisePlaying) return;
  sourceNode=audioCtx.createBufferSource();
  sourceNode.buffer=createNoiseBuffer(audioCtx);
  sourceNode.loop=true;
  sourceNode.connect(gainNode);
  setNoiseVolume(vol);
  sourceNode.start();
  noisePlaying=true;
}

function stopBrownNoise() {
  if(!noisePlaying||!sourceNode) return;
  try{ sourceNode.stop(); }catch(e){}
  sourceNode=null; noisePlaying=false;
}

function setNoiseVolume(v) {
  if(gainNode) gainNode.gain.value=Math.max(0,Math.min(1,v/100));
}

function isNoisePlaying() { return noisePlaying; }

function playTone(freq=440, dur=0.4, vol=0.15) {
  try {
    initAudio();
    const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.frequency.value=freq; g.gain.value=vol;
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime+dur);
  } catch(e){}
}
