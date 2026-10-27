// LLM link: https://chatgpt.com/share/6ad40bf8-6d2c-83ea-bf68-7a6772cb09c6
import Phaser from 'phaser';
import TownController from '../../classes/TownController';
export default class ImpostorShipScene extends Phaser.Scene {
  /**
   * Creates the impostor ship scene with the key `impostorShip`.
   */
  constructor() {
    super({
      key: 'impostorShip',
      physics: {
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    });
  }

  private _townController!: TownController;

  private _player!: Phaser.GameObjects.Rectangle;

  private _keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

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
   * Preloads the assets needed for the impostor ship scene, including
   * the Skeld background image and the tilemap JSON file.
   */
  preload(): void {
    this.load.image('skeld-bg', '/assets/tilesets/The_Skeld_map.jpg');
    this.load.tilemapTiledJSON('skeld-map', '/assets/maps/skeld.json');
  }

  /**
   * Creates the impostor ship scene, including the layer and
   * collision boundaries, and ESC key handler.
   *
   * Pressing ESC stops this scene, unpauses the town controller,
   * resumes the town and CoveyBoard scenes
   */
  create(): void {
    this.cameras.main.setBackgroundColor('#30343b');
    const map = this.make.tilemap({ key: 'skeld-map' });
   
    const background = this.add.image(0, 0, 'skeld-bg').setOrigin(0, 0);

    const mapWidth = background.width;
    const mapHeight = background.height;

    // Red rectangle as a temporary player.
    this._player = this.add.rectangle(450, 300, 24, 24, 0xff0000);
    this.matter.add.gameObject(this._player, {
      shape: {
        type: 'rectangle',
        width: 24,
        height: 24,
      },
      friction: 0,
      frictionAir: 0,
      restitution: 0,
    });

    this._player.setPosition(4300, 1200); // default spawn position, can be changed later
    // WASD controls.
    this._keys = this.input.keyboard!.addKeys('W,A,S,D') as typeof this._keys;

    const collisionLayer = map.getObjectLayer('Collision');

    collisionLayer.objects.forEach(obj => {
      if (!obj.polygon) {
        console.warn('Collision object does not have a polygon:', obj);
        return;
      }

        const x = obj.x ?? 0;
        const y = obj.y ?? 0;
        const angle = Phaser.Math.DegToRad(obj.rotation ?? 0);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Convert Tiled points to rotated world coordinates.
        const vertices = obj.polygon.map(point => ({
          x: x + point.x * cos - point.y * sin,
          y: y + point.x * sin + point.y * cos,
        }));

        // Calculate the polygon's area centroid.
        let area2 = 0;
        let centroidX = 0;
        let centroidY = 0;

        for (let i = 0; i < vertices.length; i++) {
          const current = vertices[i];
          const next = vertices[(i + 1) % vertices.length];
          const cross = current.x * next.y - next.x * current.y;

          area2 += cross;
          centroidX += (current.x + next.x) * cross;
          centroidY += (current.y + next.y) * cross;
        }

        centroidX /= 3 * area2;
        centroidY /= 3 * area2;

        const body = this.matter.add.fromVertices(
          centroidX,
          centroidY,
          [vertices],
          {
            isStatic: true,
            friction: 0,
            restitution: 0,
          },
          true,
          0.01,
          10,
        );
        if (body) {
          // Align the body's bounding box with the polygon's bounding box
          const xs = vertices.map(v => v.x);
          const ys = vertices.map(v => v.y);
          const expectedCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
          const expectedCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;

          const actualCenterX = (body.bounds.min.x + body.bounds.max.x) / 2;
          const actualCenterY = (body.bounds.min.y + body.bounds.max.y) / 2;

          this.matter.body.setPosition(body, {
            x: body.position.x + (expectedCenterX - actualCenterX),
            y: body.position.y + (expectedCenterY - actualCenterY),
          });
        }
      });
    

    const camera = this.cameras.main;
    camera.setBounds(0, 0, mapWidth, mapHeight);
    camera.setZoom(0.3);
    camera.startFollow(this._player, true);

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.stop('impostorShip');
      this._townController.unPause();
      this.scene.resume('coveyBoard');
      this.scene.resume('town');
    });
  }
 /**
  * Updates the player's position based on keyboard input (WASD) and applies velocity to the player's Matter.js body.
  * This method is called on every game tick.
  */
  update(): void {
    const body = this._player.body as MatterJS.BodyType;
    const speed = 7;

    let dx = 0;
    let dy = 0;

    if (this._keys.A.isDown) dx -= 1;
    if (this._keys.D.isDown) dx += 1;
    if (this._keys.W.isDown) dy -= 1;
    if (this._keys.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    this.matter.body.setVelocity(body, {
      x: dx * speed,
      y: dy * speed,
    });
  }
}
