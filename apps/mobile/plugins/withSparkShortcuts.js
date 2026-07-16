const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const shortcutsXml = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut android:shortcutId="spark_capture" android:enabled="true"
    android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_capture"
    android:shortcutLongLabel="@string/shortcut_capture_long">
    <intent android:action="android.intent.action.VIEW" android:data="spark://quick-capture" />
  </shortcut>
  <shortcut android:shortcutId="spark_focus" android:enabled="true"
    android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_focus"
    android:shortcutLongLabel="@string/shortcut_focus_long">
    <intent android:action="android.intent.action.VIEW" android:data="spark://focus-launch?minutes=2" />
  </shortcut>
  <shortcut android:shortcutId="spark_rescue" android:enabled="true"
    android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_rescue"
    android:shortcutLongLabel="@string/shortcut_rescue_long">
    <intent android:action="android.intent.action.VIEW" android:data="spark://rescue" />
  </shortcut>
  <shortcut android:shortcutId="spark_routine" android:enabled="true"
    android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_routine"
    android:shortcutLongLabel="@string/shortcut_routine_long">
    <intent android:action="android.intent.action.VIEW" android:data="spark://resume-routine" />
  </shortcut>
</shortcuts>
`;

function withManifest(config) {
  return withAndroidManifest(config, (result) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      result.modResults
    );
    const activity = application.activity?.find(
      (item) => item.$['android:name'] === '.MainActivity'
    );
    if (activity) {
      activity['meta-data'] = activity['meta-data'] || [];
      if (
        !activity['meta-data'].some(
          (item) => item.$['android:name'] === 'android.app.shortcuts'
        )
      ) {
        activity['meta-data'].push({
          $: {
            'android:name': 'android.app.shortcuts',
            'android:resource': '@xml/shortcuts'
          }
        });
      }
    }
    return result;
  });
}

function withResources(config) {
  return withDangerousMod(config, [
    'android',
    async (result) => {
      const xmlDirectory = path.join(
        result.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(xmlDirectory, { recursive: true });
      fs.writeFileSync(path.join(xmlDirectory, 'shortcuts.xml'), shortcutsXml);
      return result;
    }
  ]);
}

function withShortcutStrings(config) {
  return withStringsXml(config, (result) => {
    const values = {
      shortcut_capture: 'Quick capture',
      shortcut_capture_long: 'Park a thought in Spark',
      shortcut_focus: '2-minute focus',
      shortcut_focus_long: 'Start a two-minute focus launch',
      shortcut_rescue: 'Rescue my day',
      shortcut_rescue_long: 'Show one tiny action',
      shortcut_routine: 'Resume routine',
      shortcut_routine_long: 'Continue the running routine'
    };
    const strings = result.modResults.resources.string || [];
    for (const [name, value] of Object.entries(values)) {
      const existing = strings.find((item) => item.$.name === name);
      if (existing) {
        existing._ = value;
      } else {
        strings.push({ $: { name }, _: value });
      }
    }
    result.modResults.resources.string = strings;
    return result;
  });
}

module.exports = function withSparkShortcuts(config) {
  return withResources(withShortcutStrings(withManifest(config)));
};
