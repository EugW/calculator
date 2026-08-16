import { EnkaApi } from "../src/js/classes/API/Enka";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function makeBuildData(avatarId, level) {
    const char = DB.Chars.getByGameId(avatarId);

    return {
        avatarId: avatarId,
        propMap: {
            "1002": { ival: "6" },
            "4001": { ival: String(level) },
        },
        equipList: [],
        talentIdList: [],
        skillDepotId: char.skillDepotId,
        skillLevelMap: {},
    };
}

test("Enka builds import preserves character levels above 90", () => {
    const data = {
        "10000125": [
            {
                name: "Columbina",
                avatar_data: makeBuildData(10000125, 100),
            },
        ],
        "10000114": [
            {
                name: "Skirk",
                avatar_data: makeBuildData(10000114, 95),
            },
        ],
    };

    const result = new EnkaApi().processData(JSON.stringify(data), "builds");
    const levelsByTitle = Object.fromEntries(
        result.characters.map((item) => [item.title, item.set.getChar().getLevels().level])
    );

    expect(result.characters).toHaveLength(2);
    expect(levelsByTitle.Columbina).toBe(100);
    expect(levelsByTitle.Skirk).toBe(95);
});

test("Enka builds import caps unexpected character levels at supported maximum", () => {
    const data = {
        "10000125": [
            {
                name: "Columbina",
                avatar_data: makeBuildData(10000125, 101),
            },
        ],
    };

    const result = new EnkaApi().processData(JSON.stringify(data), "builds");

    expect(result.characters).toHaveLength(1);
    expect(result.characters[0].set.getChar().getLevels().level).toBe(100);
});
