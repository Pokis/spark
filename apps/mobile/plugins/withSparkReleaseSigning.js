const { withAppBuildGradle } = require('@expo/config-plugins');

const marker = '// Spark application local production signing';

function replaceRequired(contents, pattern, replacement, label) {
  if (!pattern.test(contents)) {
    throw new Error(`Could not configure ${label}; the Expo Android Gradle template changed.`);
  }
  return contents.replace(pattern, replacement);
}

function applySparkReleaseSigning(contents) {
  if (contents.includes(marker)) return contents;

  let next = replaceRequired(
    contents,
    /^android\s*\{/m,
    `${marker}\n` +
      `def sparkUploadStoreFilePath = System.getenv('SPARK_UPLOAD_STORE_FILE') ?: "\${rootDir}/../credentials/spark-upload.p12"\n` +
      `def sparkUploadPassword = System.getenv('SPARK_UPLOAD_PASSWORD')\n` +
      `def sparkUploadAlias = System.getenv('SPARK_UPLOAD_ALIAS') ?: 'spark-upload'\n` +
      `def sparkReleaseSigningReady = sparkUploadPassword != null && !sparkUploadPassword.isEmpty() && file(sparkUploadStoreFilePath).isFile()\n\n` +
      `android {`,
    'local release-signing variables'
  );

  next = replaceRequired(
    next,
    /\n    \}\r?\n    buildTypes \{/,
    `\n        release {\n` +
      `            // Debug values keep Gradle configuration readable, but release output tasks\n` +
      `            // are blocked below unless the real upload key and password are present.\n` +
      `            storeFile sparkReleaseSigningReady ? file(sparkUploadStoreFilePath) : file('debug.keystore')\n` +
      `            storePassword sparkReleaseSigningReady ? sparkUploadPassword : 'android'\n` +
      `            keyAlias sparkReleaseSigningReady ? sparkUploadAlias : 'androiddebugkey'\n` +
      `            keyPassword sparkReleaseSigningReady ? sparkUploadPassword : 'android'\n` +
      `        }\n` +
      `    }\n` +
      `    buildTypes {`,
    'release signing configuration'
  );

  next = replaceRequired(
    next,
    /(buildTypes\s*\{[\s\S]*?\n\s*release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
    'release build signing selection'
  );

  next = replaceRequired(
    next,
    /^dependencies\s*\{/m,
    `gradle.taskGraph.whenReady { graph ->\n` +
      `    def sparkReleaseOutputTasks = ['assembleRelease', 'bundleRelease']\n` +
      `    def createsReleaseOutput = graph.allTasks.any { task ->\n` +
      `        task.project == project && sparkReleaseOutputTasks.contains(task.name)\n` +
      `    }\n` +
      `    if (createsReleaseOutput && !sparkReleaseSigningReady) {\n` +
      `        throw new GradleException("Spark application production signing is unavailable. From the repository root, run 'spark.cmd release -Action LocalSetup', then use LocalBuild so the password is requested securely.")\n` +
      `    }\n` +
      `}\n\n` +
      `dependencies {`,
    'unsigned release-output guard'
  );

  return next;
}

function withSparkReleaseSigning(config) {
  return withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== 'groovy') {
      throw new Error('Spark application local signing currently requires Groovy build.gradle.');
    }
    result.modResults.contents = applySparkReleaseSigning(result.modResults.contents);
    return result;
  });
}

module.exports = withSparkReleaseSigning;
module.exports.applySparkReleaseSigning = applySparkReleaseSigning;
module.exports.marker = marker;
