import Phaser from 'phaser'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.load.image('char-bumblebee', '/assets/characters/bumblebee.png')
    this.load.image('char-mario',     '/assets/characters/mario.png')
    this.load.image('char-pikmin',    '/assets/characters/pikmin.png')
    this.load.image('char-metagross', '/assets/characters/metagross.png')
    this.load.image('board-bg',       '/assets/board-bg.png')
  }

  create(): void {
    this.scene.start('MenuScene')
  }
}
