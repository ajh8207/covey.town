// LLM link: https://chatgpt.com/share/6ad40bf8-6d2c-83ea-bf68-7a6772cb09c6
import Phaser from 'phaser';
import TownController from '../../classes/TownController';

export default class ImpostorShipScene extends Phaser.Scene {
  /**
   * Creates the impostor ship scene with the key `impostorShip`.
   */
  constructor() {
    super({ key: 'impostorShip' });
  }

  private _townController!: TownController;

  /**
   * Initializes the scene with the existing town controller.
   *
   * @param data - The data passed when launching the scene,
   * including the town controller instance.
   */
  init(data: { townController: TownController }): void {
    this._townController = data?.townController;
  }

  /**
   * Creates the impostor ship scene, including its background,
   * placeholder rooms, labels, and ESC key handler.
   *
   * Pressing ESC stops this scene, unpauses the town controller,
   * resumes the town and CoveyBoard scenes, and restores focus
   * to the game canvas.
   */
  create(): void {
    this.cameras.main.setBackgroundColor('#30343b');

    /** Creates the graphics for the impostor ship scene (gray placeholder). */
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

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.stop('impostorShip');
      this._townController.unPause();
      this.scene.resume('coveyBoard');
      this.scene.resume('town');
    });
  }
}
