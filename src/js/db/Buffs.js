import { DbObjectListSerialize } from "../classes/DbObject/List/Serialize";
import { ElementalResonance } from "./Buffs/ElementalResonance";
import { Member } from "./Buffs/Member";
import { Static } from "./Buffs/Static";

export const Buffs = new DbObjectListSerialize({
    ElementalResonance: ElementalResonance,
    Member: Member,
    Static: Static,
});
