// LLM link: https://chatgpt.com/share/6ad40bf8-6d2c-83ea-bf68-7a6772cb09c6
import Interactable, { KnownInteractableTypes } from '../../Interactable';

export default class ImpostorArcade extends Interactable {
  /**
   * Adds the arcade object to the scene, hides its original sprite,
   * and draws a visible placeholder arcade cabinet.
   */
  addedToScene(): void {
    super.addedToScene();

    /** Keep the interaction object's physics body, but hide its sprite. */
    this.setVisible(false);

    /** Draw a visible placeholder arcade cabinet. */
    const cabinet = this.scene.add.graphics();

    cabinet.fillStyle(0x555b66, 1);
    cabinet.fillRoundedRect(this.x - 16, this.y - 24, 32, 40, 3);

    cabinet.fillStyle(0x36a2eb, 1);
    cabinet.fillRect(this.x - 11, this.y - 19, 22, 12);

    cabinet.fillStyle(0x222831, 1);
    cabinet.fillRect(this.x - 10, this.y - 4, 20, 13);

    cabinet.fillStyle(0xf2c14e, 1);
    cabinet.fillCircle(this.x, this.y + 1, 3);

    cabinet.setDepth(4);
  }

  /**
   * Pauses the town controller and the town-related scenes,
   * then launches the impostor ship scene with the existing
   * town controller instance.
   */
  interact(): void {
    this.townController.pause();
    this._scene.scene.pause('town');
    this._scene.scene.pause('coveyBoard');
    this._scene.scene.launch('impostorShip', {
      townController: this.townController,
    });
  }

  /**
   * Returns the type identifier for this interactable.
   *
   * @returns The `impostorArcade` interactable type.
   */
  getType(): KnownInteractableTypes {
    return 'impostorArcade';
  }
}
