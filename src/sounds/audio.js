export function createAudio(listener, physics) {
  let audioCtx = null, engineOscA, engineOscB, engineGain, driftNoise, driftGain, masterGain;
  return {
    async start() {
      if (!audioCtx) {
        audioCtx = listener.context;
        masterGain = audioCtx.createGain(); masterGain.gain.value = 0.17; masterGain.connect(audioCtx.destination);
        engineGain = audioCtx.createGain(); engineGain.gain.value = 0.01; engineGain.connect(masterGain);
        driftGain = audioCtx.createGain(); driftGain.gain.value = 0; driftGain.connect(masterGain);
        engineOscA = audioCtx.createOscillator(); engineOscA.type = 'sawtooth'; engineOscA.frequency.value = 90; engineOscA.connect(engineGain); engineOscA.start();
        engineOscB = audioCtx.createOscillator(); engineOscB.type = 'triangle'; engineOscB.frequency.value = 45; engineOscB.connect(engineGain); engineOscB.start();
        const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate); const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.75;
        const source = audioCtx.createBufferSource(); source.buffer = noiseBuffer; source.loop = true;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 1.1; source.connect(filter); filter.connect(driftGain); source.start(); driftNoise = filter;
      }
      if (audioCtx?.state === 'suspended') await audioCtx.resume();
    },
    update(input) {
      if (!audioCtx) return;
      const t = audioCtx.currentTime, speedN = Math.min(physics.state.speed / 36, 1.45), slide = Math.min(Math.abs(physics.getLateralSpeed()) / 14, 1);
      engineOscA.frequency.linearRampToValueAtTime(88 + speedN * 150 + (input.throttle ? 32 : 0), t + 0.08);
      engineOscB.frequency.linearRampToValueAtTime(42 + speedN * 76, t + 0.08);
      engineGain.gain.linearRampToValueAtTime(0.02 + speedN * 0.065, t + 0.08);
      driftGain.gain.linearRampToValueAtTime((input.drift || slide > 0.28) ? slide * 0.12 : 0, t + 0.04);
      driftNoise.frequency.linearRampToValueAtTime(700 + slide * 1200, t + 0.04);
    }
  };
}
