import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";
import { Serializer } from "../src/js/classes/Serializer";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const ROTATION_BUILD = 'blDwggkkkdbcdDcDmgfbbfcBefubbedtgCgiCnkPoachfuccedveBpkMwhBqachfudgekKegGbbKjeCgachfuepekNtjBfgCbfCoachfufkejBjdqhCsgIcabgdCicGhcbcdqrdErlbIWuckjkdcelfigkhDvgbCGmcdefgBoEjgbFXwcdbefbhkmCbCcCriBifBhCBwBgfBfDZOiCdfCeBDPgCnbCoBDPgCpbCyhdabaabIqbbdyemdbb';

test('GPU optimizer compiles a serialized rotation objective', () => {
    const build = CalcSet.deserialize(Serializer.unpack(ROTATION_BUILD));
    const artifacts = Object.values(build.getArtifacts()).filter(Boolean);
    const suggester = new ArtifactsSuggest({
        build,
        artifacts,
        featureName: 'rotation.total',
        featureType: 'average',
        settings: {
            sets_settings: {},
            stats: {},
            setMinValues: {},
            setMaxValues: {},
        },
        limit: 20,
        useGPU: true,
        showBeta: true,
    });

    suggester.prepare();

    const compiler = new WGSLMegaKernelCompiler();
    compiler.addOptimizationPlan(suggester.optimizationPlan);

    expect(() => compiler.getMegaKernel({})).not.toThrow();
});
