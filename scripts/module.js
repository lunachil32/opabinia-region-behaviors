
import {RegisterChangeJournalOwnershipBehavior} from "./changeJournalOwnership.js";

Hooks.once("init", () => {
    RegisterChangeJournalOwnershipBehavior();
});