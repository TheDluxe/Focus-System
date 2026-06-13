/* audio.js
   Generates brown noise procedurally using Web Audio API.
   No external files needed - works fully offline.
*/

let audioCtx = null;
let brownNoiseNode = null;
let gainNode = null;
let noisePlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 3.5; // amplify since brown noise is quiet
  }

  brownNoiseNode = audioCtx.createBufferSource();
  brownNoiseNode.buffer = noiseBuffer;
  brownNoiseNode.loop = true;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;

  brownNoiseNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
}

function startBrownNoise(volume) {
  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (!noisePlaying) {
    // need a fresh source node each time it starts (can't restart a stopped source)
    if (brownNoiseNode._started) {
      // recreate
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      brownNoiseNode = audioCtx.createBufferSource();
      brownNoiseNode.buffer = noiseBuffer;
      brownNoiseNode.loop = true;
      brownNoiseNode.connect(gainNode);
    }
    setNoiseVolume(volume);
    brownNoiseNode.start();
    brownNoiseNode._started = true;
    noisePlaying = true;
  }
}

function stopBrownNoise() {
  if (noisePlaying && brownNoiseNode) {
    brownNoiseNode.stop();
    noisePlaying = false;
  }
}

function setNoiseVolume(vol) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, vol / 100));
  }
}

function isNoisePlaying() {
  return noisePlaying;
}
