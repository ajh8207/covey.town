// LLM link: https://chatgpt.com/share/6ad40bf8-6d2c-83ea-bf68-7a6772cb09c6
import Phaser from 'phaser';
import TownController from '../../classes/TownController';
import UnlockManifoldsEngine from '../../classes/impostor/tasks/UnlockManifoldsEngine';
export default class ImpostorShipScene extends Phaser.Scene {
  /**
   * Creates the impostor ship scene with the key `impostorShip`.
   */
  constructor() {
    super({ key: 'impostorShip' });
  }

  private _townController!: TownController;

  private _manifoldsEngine = new UnlockManifoldsEngine();

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
   * resumes the town and CoveyBoard scenes
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

    /**
     * Creates a button that opens the Unlock Manifolds task.
     */
    const taskButton = this.add
      .rectangle(190, 205, 130, 30, 0x2563eb)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(190, 205, 'UNLOCK MANIFOLDS', {
        color: '#ffffff',
        fontSize: '11px',
      })
      .setOrigin(0.5);

    taskButton.on('pointerdown', () => {
      this._openUnlockManifoldsTask();
    });
    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.stop('impostorShip');
      this._townController.unPause();
      this.scene.resume('coveyBoard');
      this.scene.resume('town');
    });
  }

  /**
   * Opens the Unlock Manifolds task panel and displays its keypad.
   * Updates progress based on the numbers selected by the player.
   * Resets task progress when the panel is closed.
   */
  private _openUnlockManifoldsTask(): void {
    this._manifoldsEngine.reset();

    const panel = this.add.container(0, 0);
    panel.setDepth(10);

    const background = this.add.rectangle(400, 300, 360, 410, 0x111827, 0.98);
    background.setStrokeStyle(3, 0x36a2eb);
    panel.add(background);

    panel.add(
      this.add
        .text(400, 120, 'UNLOCK MANIFOLDS', {
          color: '#ffffff',
          fontSize: '22px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    panel.add(
      this.add
        .text(400, 155, 'Select numbers in ascending order: 1 to 10', {
          color: '#d1d5db',
          fontSize: '13px',
        })
        .setOrigin(0.5),
    );

    const progressText = this.add
      .text(400, 190, 'Progress: 0 / 10', {
        color: '#ffffff',
        fontSize: '16px',
      })
      .setOrigin(0.5);
    panel.add(progressText);

    const statusText = this.add
      .text(400, 220, '', {
        color: '#facc15',
        fontSize: '14px',
      })
      .setOrigin(0.5);
    panel.add(statusText);

    /**
     * Creates the ten keypad buttons and checks each selected number.
     */
    for (let number = 1; number <= 10; number += 1) {
      const column = (number - 1) % 5;
      const row = Math.floor((number - 1) / 5);
      const x = 280 + column * 60;
      const y = 270 + row * 65;

      const button = this.add
        .rectangle(x, y, 48, 48, 0x374151)
        .setStrokeStyle(1, 0x9ca3af)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(x, y, String(number), {
          color: '#ffffff',
          fontSize: '20px',
        })
        .setOrigin(0.5);

      panel.add([button, label]);

      button.on('pointerdown', () => {
        if (this._manifoldsEngine.isComplete()) {
          return;
        }

        const accepted = this._manifoldsEngine.selectNumber(number);

        progressText.setText(`Progress: ${this._manifoldsEngine.progress} / 10`);

        if (this._manifoldsEngine.isComplete()) {
          statusText.setColor('#4ade80');
          statusText.setText('Task complete!');
        } else if (accepted) {
          statusText.setColor('#4ade80');
          statusText.setText('Correct!');
        } else {
          statusText.setColor('#f87171');
          statusText.setText('Incorrect order. Start again!');
        }
      });
    }
    /** Creates a button that closes the panel and resets the task. */
    const closeButton = this.add
      .rectangle(400, 495, 120, 36, 0xdc2626)
      .setInteractive({ useHandCursor: true });

    const closeLabel = this.add
      .text(400, 495, 'CLOSE TASK', {
        color: '#ffffff',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    panel.add([closeButton, closeLabel]);

    closeButton.on('pointerdown', () => {
      this._manifoldsEngine.reset();
      panel.destroy();
    });
  }
}
