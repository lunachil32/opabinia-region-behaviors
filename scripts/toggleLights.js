import { MODULE_ID, MODULE_FLAGS, MODULE_LOCALIZATION_PREFIXES } from "./consts.js";

const TOGGLE_LIGHTS_TYPE = `${MODULE_ID}.toggleLights`;

export function RegisterToggleLightsBehavior()
{
  CONFIG.RegionBehavior.dataModels[TOGGLE_LIGHTS_TYPE] = ToggleLightsBehavior;
  CONFIG.RegionBehavior.typeLabels[TOGGLE_LIGHTS_TYPE] = `${MODULE_LOCALIZATION_PREFIXES}.ToggleLightsBehavior.Label`;
}


const ALLOWED_EVENTS = [
  CONST.REGION_EVENTS.TOKEN_ENTER,
  CONST.REGION_EVENTS.TOKEN_EXIT,
  CONST.REGION_EVENTS.TOKEN_MOVE_IN,
  CONST.REGION_EVENTS.TOKEN_MOVE_OUT
];

class ToggleLightsBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = [
    `${MODULE_LOCALIZATION_PREFIXES}.ToggleLightsBehavior`
  ];

  static defineSchema() {
    const f = foundry.data.fields;

    const EVENT_CHOICES = Object.fromEntries(ALLOWED_EVENTS.map(ev => [ev, ev]));
    const OP_CHOICES = {
      ENABLE:  game.i18n.localize(`${this.LOCALIZATION_PREFIXES[0]}.Choices.Operation.ENABLE`),
      DISABLE: game.i18n.localize(`${this.LOCALIZATION_PREFIXES[0]}.Choices.Operation.DISABLE`),
      TOGGLE:  game.i18n.localize(`${this.LOCALIZATION_PREFIXES[0]}.Choices.Operation.TOGGLE`)
    };

    return {
      lightUuids: new f.SetField(
        new f.DocumentUUIDField({
          required: true,
          type: "AmbientLight",
          embedded: true
        }),
        { required: true, initial: [] }
      ),

      eventType: new f.StringField({
        initial: CONST.REGION_EVENTS.TOKEN_ENTER,
        choices: EVENT_CHOICES
      }),

      operation: new f.StringField({
        initial: "TOGGLE",
        choices: OP_CHOICES
      })
    };
  }

  static events = Object.fromEntries(
    ALLOWED_EVENTS.map(ev => [ev, async function (event) {
      return this._maybeApply(event);
    }])
  );

  async _maybeApply(event) {
    if (event.name !== this.eventType) return;

    if (!game.user.isGM) return;
    if (game.users.activeGM && game.user.id !== game.users.activeGM.id) return;

    const uuids = Array.from(this.lightUuids ?? []);
    if (!uuids.length) return;

    const docs = (await Promise.all(uuids.map(u => fromUuid(u)))).filter(Boolean);

    const byScene = new Map();
    for (const doc of docs) {
      if (doc.documentName !== "AmbientLight") continue;
      const scene = doc.parent;
      if (!scene) continue;
      (byScene.get(scene) ?? byScene.set(scene, []).get(scene)).push(doc);
    }

    for (const [scene, list] of byScene) {
      const updates = list.map(d => ({
        _id: d.id,
        hidden: this._computeHidden(d)
      }));
      if (updates.length) await scene.updateEmbeddedDocuments("AmbientLight", updates);
    }
  }

  _computeHidden(lightDoc) {
    switch (this.operation) {
      case "ENABLE":  return false;
      case "DISABLE": return true;
      case "TOGGLE":
      default:        return !lightDoc.hidden;
    }
  }
}