
import {RegisterChangeJournalOwnershipBehavior} from "./changeJournalOwnership.js";
import {RegisterToggleLightsBehavior} from "./toggleLights.js"

Hooks.once("init", () => {
    RegisterChangeJournalOwnershipBehavior();
    RegisterToggleLightsBehavior();
});