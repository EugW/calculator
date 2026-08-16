import { charScales } from "../src/js/db/generated/CharScale";

const expectedLevels = {
    s4hp: [1, 1.083, 1.743, 8.349, 8.431, 9.174],
    s4atk: [1, 1.083, 1.743, 8.349, 8.653, 11.392],
    s5hp: [1, 1.083, 1.751, 8.739, 8.83, 9.652],
    s5atk: [1, 1.083, 1.751, 8.739, 9.028, 11.629],
};

test.each(Object.entries(expectedLevels))(
    '%s is generated in numeric level order',
    (name, expected) => {
        const table = charScales[name];
        const values = table.getValues();

        expect(values).toHaveLength(100);
        for (let level = 2; level <= values.length; level++) {
            expect(table.getValue(level)).toBeGreaterThan(table.getValue(level - 1));
        }

        expect([
            table.getValue(1),
            table.getValue(2),
            table.getValue(10),
            table.getValue(90),
            table.getValue(91),
            table.getValue(100),
        ]).toEqual(expected);
    },
);
