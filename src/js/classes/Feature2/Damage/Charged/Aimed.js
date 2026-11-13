import { CCritRate } from "../../Compile/Types/Damage";
import { CConst } from "../../Compile/Types/Item";
import { FeatureDamageCharged } from "../Charged";
import { enemyScope } from "../../../Team/Scope";

export class FeatureDamageChargedAimed extends FeatureDamageCharged {
    getCritRateBlock(data) {
        if (enemyScope(data.settings).enemy_weak_shot) {
            return new CCritRate([new CConst({value: 1})]);
        }

        return super.getCritRateBlock(data);
    }
}
