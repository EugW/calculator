module.exports = {
    presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
    // Tests never ship their output. An explicit value also keeps Babel from
    // noting that the generated tables are over its 500KB limit for styled output.
    compact: false,
};
