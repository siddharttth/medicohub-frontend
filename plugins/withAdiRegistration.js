const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const src = path.join(__dirname, '../assets/adi-registration.properties');
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/assets/adi-registration.properties');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);
