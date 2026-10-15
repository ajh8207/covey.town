import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class ImpostorArcade extends Interactable {
    addedToScene(): void {
    super.addedToScene();

    // Keep the interaction object's physics body, but hide its sprite.
    this.setVisible(false);

    // Draw a visible placeholder arcade cabinet.
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

  isOverlappingOnServer(): boolean {
    return true;
  }

 interact(): void {
  this._scene.scene.launch('impostorShip');
  this._scene.scene.pause('coveyBoard');
}


  getType(): KnownInteractableTypes {
    return 'impostorArcade';
  }
}
