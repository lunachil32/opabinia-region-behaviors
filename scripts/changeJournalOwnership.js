import { MODULE_ID, MODULE_FLAGS, LOCALIZATION_PREFIXES } from "./consts.js";

const CHANGE_JOURNAL_OWNERSHIP_TYPE = `${MODULE_ID}.changeJournalOwnership`;

export function RegisterChangeJournalOwnershipBehavior()
{
  CONFIG.RegionBehavior.dataModels[CHANGE_JOURNAL_OWNERSHIP_TYPE] = ChangeJournalOwnershipBehavior;
  CONFIG.RegionBehavior.typeLabels[CHANGE_JOURNAL_OWNERSHIP_TYPE] = `${LOCALIZATION_PREFIXES}.ChangeJournalOwnershipBehavior.Label`;
}

const ALLOWED_EVENTS = [
  CONST.REGION_EVENTS.TOKEN_ENTER,
  CONST.REGION_EVENTS.TOKEN_EXIT,
  CONST.REGION_EVENTS.TOKEN_MOVE_IN,
  CONST.REGION_EVENTS.TOKEN_MOVE_OUT
];

class ChangeJournalOwnershipBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {

  static defineSchema() {
    const f = foundry.data.fields;
    const EVENT_CHOICES = () =>
      Object.fromEntries(ALLOWED_EVENTS.map(ev => [ev, ev]));
    const OWNERSHIP_CHOICES = Object.fromEntries(
      ["NONE","LIMITED","OBSERVER","OWNER"].map(k => [k, game.i18n.localize(`OWNERSHIP.${k}`)])
    );
    const APPLY_TO_CHOICES = () => ({
      triggeringUser: "Triggering User",
      allPlayers: "All Players"
    });

    return {
      targetUuid: new f.DocumentUUIDField({ required: true }),
      eventType: new f.StringField({
        initial: CONST.REGION_EVENTS.TOKEN_ENTER,
        choices:EVENT_CHOICES
      }),
      changeToLevel: new f.StringField({
        required: true,
        initial: "OBSERVER",
        choices: OWNERSHIP_CHOICES
      }),
      applyTo: new f.StringField({
        required: true,
        initial: "triggeringUser",
        choices: APPLY_TO_CHOICES
      }),
      autoShowOnChange: new f.BooleanField({ initial: true })
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

    const doc = await fromUuid(this.targetUuid);
    if (!doc) return;

    const userIds =
      (this.applyTo === "allPlayers")
        ? game.users.filter(u => !u.isGM).map(u => u.id)
        : [event.user.id];

    const updates = {};
    const level = CONST.DOCUMENT_OWNERSHIP_LEVELS[this.changeToLevel];
    for (const uid of userIds) updates[`ownership.${uid}`] = level;
    await doc.update(updates);

    if (this.autoShowOnChange && (doc.documentName === "JournalEntry" || doc.documentName === "JournalEntryPage")) {
      await Journal.show(doc, { users: userIds });
    }
  }

  _resolveUsers(event) {
    if (this.applyTo === "allPlayers") {
      return game.users.filter(u => !u.isGM).map(u => u.id);
    }
    return [event.user.id];
  }
}