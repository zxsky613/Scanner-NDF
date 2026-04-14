module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    /** Obligatoire pour Reanimated 4 / worklets ; doit rester en dernier. */
    plugins: ['react-native-reanimated/plugin'],
  };
};
