/**
 * AI Sound Studio Module (Kila BizAccount)
 * Generates Short-Form Video Audio (Voiceover + BGM + SFX) for TikTok / Reels / Shorts
 */

export class SoundStudio {
  constructor() {
    this.audioCtx = null;
    this.voiceSynth = window.speechSynthesis;
    this.isPlaying = false;
    this.bgmGain = null;
    this.voiceGain = null;
    this.sfxGain = null;
    this.analyser = null;
    this.animFrameId = null;
    this.isBgmPlaying = false;
    this.selectedBgmStyle = 'samba';
    this.audioPlayer = null;
    this.audioSourceNode = null;

    // Preset High-Quality Edge Neural Voices
    this.neuralVoices = [
      { id: 'th-TH-NiwatNeural', name: '🇹🇭 ไทย - Niwat (เสียงผู้ชาย ดุดัน มั่นใจ)', lang: 'th' },
      { id: 'th-TH-PremwadeeNeural', name: '🇹🇭 ไทย - Premwadee (เสียงผู้หญิง สดใส ชัดเจน)', lang: 'th' },
      { id: 'lo-LA-ChanthavongNeural', name: '🇱🇦 ລາວ - Chanthavong (ສຽງຜູ້ຊາຍ ມ່ວນໆ)', lang: 'la' },
      { id: 'lo-LA-KeomanyNeural', name: '🇱🇦 ລາວ - Keomany (ສຽງຜູ້ຍິງ ມ່ວນນຸ່ມ)', lang: 'la' },
      { id: 'en-US-GuyNeural', name: '🌐 English - Guy (Male Energetic)', lang: 'en' },
      { id: 'en-US-AvaNeural', name: '🌐 English - Ava (Female Friendly)', lang: 'en' }
    ];

    // Default State
    this.state = {
      language: 'th', // 'th' | 'la' | 'en'
      selectedVoiceId: 'th-TH-NiwatNeural',
      speechRate: 1.15,
      speechPitch: 1.0,
      speechVolume: 1.0,
      bgmVolume: 0.25,
      autoDucking: true,
      scriptText: 'สายสตรีตห้ามพลาด! เสื้อทีมชาติบราซิลตัวนี้ ตราปักแน่นๆ ดาว 5 ดวง ลาย Jacquard เล่นแสง สภาพกริ๊บ มีตัวเดียว ทักแชตด่วน!',
      productType: 'football',
      mood: 'energetic'
    };

    // Preset Script Templates
    this.templates = {
      th: {
        football: [
          'สายสตรีตห้ามพลาด! เสื้อทีมชาติบราซิลตัวนี้ ตราปักแน่นๆ ดาว 5 ดวง ลาย Jacquard เล่นแสง สภาพกริ๊บ มีตัวเดียว ทักแชตด่วน!',
          'เสื้อบอลวินเทจสายสะสม! ตัวนี้สภาพสวยมาก ผ้าใส่สบาย ลายตัวผ้าเนียนตาสุดๆ ใครหาอยู่กดใส่ตะกร้าด่วน!',
          'ของมันต้องมี! เสื้อบอลสโมสรงานพรีเมียม ปักตราคมชัดทุกจุด นุ່ງเที่ยวก็เท่ นุ່ງเตะบอลก็เก๋ ทักแชตด่วนเลยครับ!'
        ],
        streetwear: [
          'สวยสะกดสายตา! เสื้อยืดสตรีตสไตล์ ลายพิมพ์จัดเต็ม ผ้าคอตตอนนุ่มใส่สบาย แมตช์ง่ายได้ทุกจังหวะ สั่งเลย!',
          'ไอเทมฮิตติดเทรนด์! เสื้อโอเวอร์ไซส์สายสตรีต ดีไซน์เท่ๆ ใส่ง่ายได้ทั้งชายและหญิง มีจำนวนจำกัดนะ!'
        ],
        sneakers: [
          'จัดเต็มทุกสนาม! รองเท้าสปอร์ตสุดเท่ น้ำหนักเบา พื้นหนึบ สภาพสวยกริ๊บ ทักแชตจับจองด่วน!',
          'สายสปอร์ตต้องโดน! รองเท้าผ้าใบดีไซน์ล้ำ ใส่สบาย ไม่เจ็บเท้า พร้อมลุยทุกกิจกรรม สั่งซื้อวันนี้รับโปรพิเศษ!'
        ]
      },
      la: {
        football: [
          'ສາຍສະຕຣີດຫ້າມພາດ! ເສື້ອທີມຊາດບຣາຊິນໂຕນີ້ ຕາປັກແໜ້ນໆ ດາວ 5 ດວງ ລາຍ Jacquard ຫຼິ້ນແສງງາມຫຼາຍ ສະພາບກຣິບ ມີໂຕດຽວ ທັກແຊັດດ່ວນ!',
          'ເສື້ອບານວິນເທຈສາຍສະສົມ! ໂຕນີ້ສະພາບງາມຫຼາຍ ແພນຸ່ງສະບາຍ ລາຍໂຕແພນຽນຕາສຸດໆ ໃຜຊອກຢູ່ ຮີບສັ່ງເລີຍ!',
          'ຂອງມັນຕ້ອງມີ! ເສື້ອບານສະໂມສອນງານພຣີມຽມ ປັກຕາຄົມຊັດທຸກຈຸດ ນຸ່ງທ່ຽວກໍ່ເທ່ ນຸ່ງເຕະບານກໍ່ເກ໋ ທັກແຊັດເລີຍຄັບ!'
        ],
        streetwear: [
          'ງາມສະກົດສາຍຕາ! ເສື້ອຢືດສະຕຣີດສະໄຕລ໌ ລາຍພິມຈັດເຕັມ ແພນຸ່ງສະບາຍ ແມັດຊ໌ງ່າຍໄດ້ທຸກລຸກ ສັ່ງເລີຍ!',
          'ໄອເທັມຮິດຕິດຕຣານ! ເສື້ອໂອເວີໄຊສ໌ສາຍສະຕຣີດ ດີໄຊເທ່ໆ ນຸ່ງງ່າຍໄດ້ທັງຊາຍແລະຍິງ ມີຈຳນວນຈຳກັດເດີ!'
        ],
        sneakers: [
          'ຈັດເຕັມທຸກສະໜາມ! ເກີບສະປອດສຸດເທ່ ນ້ຳໜັກເບົາ ພື້ນໜຶບ ສະພາບງາມກຣິບ ທັກແຊັດຈອງດ່ວນ!',
          'ສາຍສະປອດຕ້ອງໂດນ! ເກີບຜ້າໃບດີໄຊລ້ຳ ນຸ່ງສະບາຍ ພ້ອມລຸຍທຸກກິດຈະກຳ ສັ່ງຊື້ວັນນີ້ຮັບໂປຣພິເສດ!'
        ]
      }
    };
  }

  init() {
    this.initAudioContext();
    this.populateVoices();
    this.bindEvents();
    this.updateScriptEstimate();
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      
      this.voiceGain = this.audioCtx.createGain();
      this.bgmGain = this.audioCtx.createGain();
      this.sfxGain = this.audioCtx.createGain();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;

      this.voiceGain.connect(this.analyser);
      this.bgmGain.connect(this.analyser);
      this.sfxGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.voiceGain.gain.value = this.state.speechVolume;
      this.bgmGain.gain.value = this.state.bgmVolume;
      this.sfxGain.gain.value = 0.8;
    }
  }

  populateVoices() {
    const select = document.getElementById('ssVoiceSelect');
    if (!select) return;

    select.innerHTML = '';

    const lang = this.state.language;
    const filteredVoices = this.neuralVoices.filter(v => v.lang === lang || lang === 'all');
    const displayList = filteredVoices.length > 0 ? filteredVoices : this.neuralVoices;

    displayList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name;
      select.appendChild(opt);
    });

    if (displayList.length > 0) {
      this.state.selectedVoiceId = displayList[0].id;
      select.value = displayList[0].id;
    }
  }

  bindEvents() {
    // Language buttons
    document.querySelectorAll('.ss-lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.ss-lang-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.state.language = e.currentTarget.dataset.lang;
        this.populateVoices();
        this.applyTemplate();
      });
    });

    // Product Category selector
    document.getElementById('ssProductCategory')?.addEventListener('change', (e) => {
      this.state.productType = e.target.value;
      this.applyTemplate();
    });

    // Generate Script Button
    document.getElementById('btnSSGenerateScript')?.addEventListener('click', () => {
      this.applyTemplate();
    });

    // Script Input Textarea
    const scriptEl = document.getElementById('ssScriptText');
    scriptEl?.addEventListener('input', (e) => {
      this.state.scriptText = e.target.value;
      this.updateScriptEstimate();
    });

    // Sliders
    document.getElementById('ssSpeechRate')?.addEventListener('input', (e) => {
      this.state.speechRate = parseFloat(e.target.value);
      document.getElementById('lblSSRate').textContent = `${this.state.speechRate.toFixed(2)}x`;
      this.updateScriptEstimate();
    });

    document.getElementById('ssSpeechPitch')?.addEventListener('input', (e) => {
      this.state.speechPitch = parseFloat(e.target.value);
      document.getElementById('lblSSPitch').textContent = `${this.state.speechPitch.toFixed(1)}`;
    });

    document.getElementById('ssBgmVolume')?.addEventListener('input', (e) => {
      this.state.bgmVolume = parseFloat(e.target.value);
      document.getElementById('lblSSBgmVol').textContent = `${Math.round(this.state.bgmVolume * 100)}%`;
      if (this.bgmGain) this.bgmGain.gain.value = this.state.bgmVolume;
    });

    document.getElementById('ssAutoDucking')?.addEventListener('change', (e) => {
      this.state.autoDucking = e.target.checked;
    });

    document.getElementById('ssVoiceSelect')?.addEventListener('change', (e) => {
      this.state.selectedVoiceId = e.target.value;
    });

    document.getElementById('ssBgmStyle')?.addEventListener('change', (e) => {
      this.selectedBgmStyle = e.target.value;
      if (this.isBgmPlaying) {
        this.stopBGM();
        this.startBGM();
      }
    });

    // Playback Controls
    document.getElementById('btnSSPlay')?.addEventListener('click', () => this.togglePlayback());
    document.getElementById('btnSSStop')?.addEventListener('click', () => this.stopPlayback());

    // SFX Buttons
    document.querySelectorAll('.ss-sfx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.sfx;
        this.playSFX(type);
      });
    });
  }

  applyTemplate() {
    const lang = this.state.language;
    const cat = this.state.productType;
    const tList = (this.templates[lang] && this.templates[lang][cat]) || this.templates['th']['football'];
    const randomScript = tList[Math.floor(Math.random() * tList.length)];
    
    this.state.scriptText = randomScript;
    const scriptEl = document.getElementById('ssScriptText');
    if (scriptEl) scriptEl.value = randomScript;
    this.updateScriptEstimate();
  }

  updateScriptEstimate() {
    const text = this.state.scriptText || '';
    const charCount = text.length;
    const rate = this.state.speechRate || 1.15;
    
    const estSec = Math.max(1, Math.round((charCount / 14) / rate));
    
    const countEl = document.getElementById('ssCharCount');
    const estEl = document.getElementById('ssEstSec');
    
    if (countEl) countEl.textContent = `${charCount} ตัวอักษร`;
    if (estEl) estEl.textContent = `~${estSec} วินาที (${estSec <= 15 ? 'TikTok 15s' : estSec <= 30 ? 'Reels 30s' : 'Long Video'})`;
  }

  // --- Sound Effects Synthesizer (Web Audio API) ---
  playSFX(type) {
    this.initAudioContext();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    if (type === 'whoosh') {
      const bufferSize = Math.round(this.audioCtx.sampleRate * 0.4);
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.4);

    } else if (type === 'pop') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);

    } else if (type === 'ding') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.08);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.6);

    } else if (type === 'cash') {
      [0, 0.1].forEach((delay, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 987.77 : 1318.51, now + delay);

        gain.gain.setValueAtTime(0.7, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      });
    }
  }

  // --- Synthesized Background Music Generator ---
  startBGM() {
    if (this.isBgmPlaying) return;
    this.initAudioContext();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isBgmPlaying = true;
    this.bgmGain.gain.value = this.state.bgmVolume;

    const style = this.selectedBgmStyle;
    const stepTime = style === 'samba' ? 0.18 : style === 'funk' ? 0.22 : 0.35;
    let step = 0;

    const playBeat = () => {
      if (!this.isBgmPlaying) return;
      const now = this.audioCtx.currentTime;

      // Bass note
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      bassOsc.type = 'sawtooth';

      const freq = step % 4 === 0 ? 110 : step % 4 === 2 ? 146.83 : 130.81;
      bassOsc.frequency.setValueAtTime(freq, now);

      bassGain.gain.setValueAtTime(0.12, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.8);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(now);
      bassOsc.stop(now + stepTime * 0.8);

      // Hi-hat / Percussion
      if (step % 2 === 1) {
        const noiseBuf = this.audioCtx.createBuffer(1, Math.round(this.audioCtx.sampleRate * 0.05), this.audioCtx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
        
        const noiseSrc = this.audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.04, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        noiseSrc.connect(noiseGain);
        noiseGain.connect(this.bgmGain);
        noiseSrc.start(now);
      }

      step++;
      this.bgmTimer = setTimeout(playBeat, stepTime * 1000);
    };

    playBeat();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) clearTimeout(this.bgmTimer);
  }

  // --- Voiceover & Audio Engine Playback ---
  togglePlayback() {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback() {
    const text = this.state.scriptText || '';
    if (!text.trim()) return;

    this.initAudioContext();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // Set playing state & start BGM + Visualizer + SFX immediately!
    this.isPlaying = true;
    this.updatePlayButtonUI(true);
    this.playSFX('whoosh'); // Intro Whoosh
    this.startBGM();
    this.startVisualizer();

    if (this.state.autoDucking && this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.state.bgmVolume * 0.3, this.audioCtx.currentTime);
    }

    // Play High Quality Edge Neural Voice
    this.playEdgeTTS(text);
  }

  playEdgeTTS(text) {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }

    const voice = this.state.selectedVoiceId || 'th-TH-NiwatNeural';
    const ratePercent = Math.round((this.state.speechRate - 1.0) * 100);
    const rateParam = ratePercent >= 0 ? `%2B${ratePercent}%25` : `${ratePercent}%25`;

    const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rateParam}`;

    this.audioPlayer = new Audio();
    this.audioPlayer.src = apiUrl;
    this.audioPlayer.volume = this.state.speechVolume;

    // Route audio element through Web Audio API for auto-ducking & visualizer
    try {
      if (!this.audioSourceNode) {
        this.audioSourceNode = this.audioCtx.createMediaElementSource(this.audioPlayer);
        this.audioSourceNode.connect(this.voiceGain);
      }
    } catch (e) {
      console.log('MediaElementSource note:', e);
    }

    this.audioPlayer.onended = () => {
      this.playSFX('cash');
      setTimeout(() => this.stopPlayback(), 500);
    };

    this.audioPlayer.onerror = (err) => {
      console.warn('API TTS error, falling back to browser speech:', err);
      this.fallbackBrowserSpeech(text);
    };

    const playPromise = this.audioPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay catch, falling back to browser speech:', err);
        this.fallbackBrowserSpeech(text);
      });
    }
  }

  fallbackBrowserSpeech(text) {
    if (!this.voiceSynth) return;

    this.voiceSynth.cancel();
    if (this.voiceSynth.paused) {
      this.voiceSynth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.state.language === 'la' ? 'lo-LA' : (this.state.language === 'th' ? 'th-TH' : 'en-US');
    utterance.rate = this.state.speechRate;
    utterance.pitch = this.state.speechPitch;
    utterance.volume = this.state.speechVolume;

    utterance.onend = () => {
      this.playSFX('cash');
      setTimeout(() => this.stopPlayback(), 500);
    };

    utterance.onerror = (e) => {
      console.warn('Browser Speech error:', e);
      this.stopPlayback();
    };

    this.voiceSynth.speak(utterance);
  }

  stopPlayback() {
    this.isPlaying = false;

    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }

    if (this.voiceSynth) {
      this.voiceSynth.cancel();
    }

    this.stopBGM();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.updatePlayButtonUI(false);
  }

  updatePlayButtonUI(isPlaying) {
    const btn = document.getElementById('btnSSPlay');
    if (!btn) return;
    if (isPlaying) {
      btn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>หยุดเล่น (Pause)</span>`;
      btn.classList.replace('btn-primary', 'btn-danger');
    } else {
      btn.innerHTML = `<i class="fa-solid fa-play"></i> <span>ทดลองฟังเสียง (Play Audio)</span>`;
      btn.classList.replace('btn-danger', 'btn-primary');
    }
  }

  startVisualizer() {
    const canvas = document.getElementById('ssVisualizerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      this.animFrameId = requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    draw();
  }
}

export const soundStudio = new SoundStudio();
