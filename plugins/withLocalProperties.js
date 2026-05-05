const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const sdkDir = process.env.ANDROID_HOME ||
        process.env.ANDROID_SDK_ROOT ||
        path.join(os.homedir(), 'Library/Android/sdk');
      const localProps = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
      fs.writeFileSync(localProps, `sdk.dir=${sdkDir}\n`);
      return cfg;
    },
  ]);
