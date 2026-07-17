const {
  applySparkReleaseSigning,
  marker
} = require('./withSparkReleaseSigning');

const template = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
        }
    }
}

dependencies {
}
`;

describe('withSparkReleaseSigning', () => {
  it('adds an environment-only production signing configuration and output guard', () => {
    const result = applySparkReleaseSigning(template);

    expect(result).toContain(marker);
    expect(result).toContain("System.getenv('SPARK_UPLOAD_PASSWORD')");
    expect(result).toContain('credentials/spark-upload.p12');
    expect(result).toContain('signingConfig signingConfigs.release');
    expect(result).toContain("['assembleRelease', 'bundleRelease']");
    expect(result).toContain('Spark application production signing is unavailable');
  });

  it('is idempotent when Expo prebuild runs repeatedly', () => {
    const once = applySparkReleaseSigning(template);
    const twice = applySparkReleaseSigning(once);

    expect(twice).toBe(once);
    expect(twice.split(marker)).toHaveLength(2);
  });

  it('fails clearly when the Gradle template no longer has the expected structure', () => {
    expect(() => applySparkReleaseSigning('android {\n}\n')).toThrow(
      'Expo Android Gradle template changed'
    );
  });
});
