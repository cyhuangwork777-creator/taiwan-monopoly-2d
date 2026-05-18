/**
 * 音效管理器
 * 使用 Web Audio API 合成音效與背景音樂，無需外部音訊檔案
 */

// 台灣風格五聲音階旋律（C 大調五聲：C D E G A）
const BGM_NOTES = [
  523, 587, 659, 784, 880, 784, 659, 587,
  523, 659, 784, 880, 784, 659, 587, 523
]
const BGM_TEMPO = 380 // 毫秒/拍

export class SoundManager {
  private ctx: AudioContext | null = null
  private bgmTimerId: ReturnType<typeof setInterval> | null = null
  private bgmBeat = 0
  private _bgmVolume = 0.4
  private _sfxVolume = 0.6
  private _muted = false

  // ====== 私有工具 ======

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  /**
   * 播放單一振盪器音調
   */
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    vol = 0.5,
    startDelay = 0
  ): void {
    if (this._muted) return
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = ctx.currentTime + startDelay
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol * this._sfxVolume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  /**
   * 播放白噪音（模擬骰子翻滾聲）
   */
  private noise(duration: number, vol = 0.3): void {
    if (this._muted) return
    const ctx = this.getCtx()
    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * this._sfxVolume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
    src.stop(ctx.currentTime + duration + 0.02)
  }

  // ====== 音效 ======

  /** 擲骰子：噪音爆破 */
  playDice(): void {
    this.noise(0.2, 0.4)
    this.tone(180, 0.1, 'square', 0.15)
  }

  /** 棋子移動一步：短促點擊聲 */
  playMove(): void {
    this.tone(700, 0.06, 'square', 0.12)
  }

  /** 購買地產：上升和弦 */
  playBuy(): void {
    ;[523, 659, 784].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.35, i * 0.07))
  }

  /** 升級建築：快速上行音階 */
  playUpgrade(): void {
    ;[523, 659, 784, 988].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.4, i * 0.055))
  }

  /** 過路費：下降音調 */
  playRent(): void {
    this.tone(440, 0.15, 'sawtooth', 0.3)
    this.tone(330, 0.2, 'sawtooth', 0.3, 0.12)
  }

  /** 抽卡：兩音提示聲 */
  playCard(): void {
    this.tone(1000, 0.1, 'sine', 0.4)
    this.tone(1320, 0.15, 'sine', 0.35, 0.08)
  }

  /** 經過起點領薪水：勝利上行 */
  playSalary(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.5, i * 0.06))
  }

  /** 破產：悲傷下行 */
  playBankrupt(): void {
    ;[440, 370, 311, 262].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.4, i * 0.14))
  }

  // ====== 背景音樂 ======

  startBGM(): void {
    if (this.bgmTimerId !== null) return
    this.bgmBeat = 0
    this.bgmTimerId = setInterval(() => {
      if (this._muted) return
      const ctx = this.getCtx()
      const freq = BGM_NOTES[this.bgmBeat % BGM_NOTES.length]
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const beatLen = BGM_TEMPO / 1000
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(this._bgmVolume * 0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + beatLen * 0.85)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + beatLen)
      this.bgmBeat++
    }, BGM_TEMPO)
  }

  stopBGM(): void {
    if (this.bgmTimerId !== null) {
      clearInterval(this.bgmTimerId)
      this.bgmTimerId = null
    }
  }

  // ====== 音量控制 ======

  get bgmVolume(): number { return this._bgmVolume }
  get sfxVolume(): number { return this._sfxVolume }
  get muted(): boolean { return this._muted }

  setBGMVolume(v: number): void {
    this._bgmVolume = Math.max(0, Math.min(1, v))
  }

  setSFXVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v))
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    if (muted) this.stopBGM()
    else this.startBGM()
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted)
    return this._muted
  }
}

export const soundManager = new SoundManager()
;(window as any).soundManager = soundManager
