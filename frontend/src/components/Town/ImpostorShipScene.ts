import Phaser from 'phaser';

export default class ImpostorShipScene extends Phaser.Scene {
  constructor() {
    super({ key: 'impostorShip' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#30343b');

    const graphics = this.add.graphics();
    graphics.fillStyle(0x777777, 1);

    graphics.fillRect(100, 100, 180, 140);
    graphics.fillRect(540, 100, 180, 140);
    graphics.fillRect(260, 240, 280, 140);
    graphics.fillRect(310, 380, 180, 140);

    this.add.text(345, 290, 'LOBBY', { color: '#ffffff' });
    this.add.text(140, 150, 'ROOM 1', { color: '#ffffff' });
    this.add.text(580, 150, 'ROOM 2', { color: '#ffffff' });
    this.add.text(350, 440, 'ROOM 3', { color: '#ffffff' });

    this.add.text(20, 20, 'Press ESC to return to town', {
      color: '#ffffff',
    });

    this.input.keyboard?.on('keydown-ESC', () => {
        this.scene.stop('impostorShip');
        this.scene.resume('coveyBoard');
    });

  }
}