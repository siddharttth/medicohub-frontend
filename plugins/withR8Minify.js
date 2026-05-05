const { withGradleProperties } = require('@expo/config-plugins');

module.exports = (config) =>
  withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;

    const set = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');

    return cfg;
  });
