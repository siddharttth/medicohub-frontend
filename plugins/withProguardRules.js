const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RULES = `
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Hermes / SoLoader
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.react.devsupport.** { *; }

# OkHttp (used internally by React Native networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Preserve source file names and line numbers so the mapping file is useful
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
`.trimStart();

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
      const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
      if (!existing.includes('-keepattributes SourceFile,LineNumberTable')) {
        fs.writeFileSync(dest, existing + '\n' + RULES);
      }
      return cfg;
    },
  ]);
