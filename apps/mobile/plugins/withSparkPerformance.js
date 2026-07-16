const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSparkPerformance(config) {
  return withDangerousMod(config, [
    'android',
    async (result) => {
      const source = path.join(
        result.modRequest.projectRoot,
        'assets',
        'baseline-prof.txt'
      );
      const destination = path.join(
        result.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'baseline-prof.txt'
      );
      fs.copyFileSync(source, destination);
      return result;
    }
  ]);
};

