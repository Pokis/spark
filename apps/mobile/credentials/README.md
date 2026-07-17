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

The build never stores the password. Each local production build requests it through a hidden
PowerShell prompt and passes it only to one non-daemon Gradle process.
