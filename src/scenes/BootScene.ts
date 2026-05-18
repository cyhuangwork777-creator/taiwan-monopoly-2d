import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    console.log('[BootScene] create - transitioning to PreloadScene')
    this.scene.start('PreloadScene')
  }
}
