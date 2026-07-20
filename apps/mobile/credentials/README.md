# Local Android upload key

This directory is the local home for the Spark application's Google Play **upload key**.

The expected private keystore is `spark-upload.p12`. It is deliberately ignored by Git. Never
commit, email, paste into chat, or place this private key in an ordinary cloud folder.

Create it with:

```powershell
.\spark.cmd release -Action LocalSetup
```

Before running setup, create a LastPass item with a unique password of at least 20 characters.
Paste that password into both hidden `keytool` prompts. After setup, attach `spark-upload.p12` to
that LastPass item and record:

- alias: `spark-upload`
- package: `com.djpokis.sparkhabits.app`
- certificate owner: Domantas Judeikis
- the SHA-256 file hash printed by `spark.cmd`

By default each local production build requests the password through a hidden PowerShell prompt
and passes it only to one non-daemon Gradle process.

## Optional one-command publishing secrets

The local publisher can read secrets either from prompts or from the ignored file
`local-release.secrets.json`. To create the file manually:

```powershell
Copy-Item apps/mobile/credentials/local-release.secrets.example.json `
  apps/mobile/credentials/local-release.secrets.json
```

Then fill:

- `uploadKeyPassword`: the same upload-key password stored in LastPass;
- `googlePlayServiceAccountKeyFile`: an absolute path or a path relative to the secrets file.

The convenience file stores the upload password as plaintext. It is ignored by Git but is only as
safe as this Windows account and disk. Prefer hidden prompts on a shared or weakly protected PC.
Never pass the password as a command-line parameter.

`PlaySetup` creates `google-play-publisher.json` here when Google API publishing is deliberately
configured. It also creates an ignored `local-release.secrets.json` containing the key path but an
empty password. Back up the generated JSON key in LastPass immediately. Grant its printed service
account email access only to the Spark application's Play Console entry and only the permissions
actually needed. Do not grant finance, account administration, or Production release permission
for an Internal-testing publisher.

All files in this directory are ignored except this README and the placeholder example. Release
history under `artifacts/release` records credential *sources* and service-account email only; it
never records the upload password, private key, OAuth assertion, or access token.
