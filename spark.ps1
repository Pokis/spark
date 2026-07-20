<#
.SYNOPSIS
Runs common Spark application development, testing, Android, and local-service tasks.

.DESCRIPTION
Use ".\spark.cmd help" for the command catalog. The .cmd launcher allows this
PowerShell script to run even when Windows has a restrictive script execution
policy. Each command also supports -Help.

.EXAMPLE
.\spark.cmd start -Target Web -Clear

.EXAMPLE
.\spark.cmd setup-android -Persist

.EXAMPLE
.\spark.cmd test -Scope Mobile -Coverage

.EXAMPLE
.\spark.cmd check -Level Full

.EXAMPLE
.\spark.cmd release -Action Inspect

.EXAMPLE
.\spark.cmd deploy -Action Status
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet(
    'help',
    'install',
    'doctor',
    'setup-android',
    'start',
    'android',
    'stop',
    'emulator',
    'devices',
    'logs',
    'reset-app',
    'test',
    'check',
    'build',
    'e2e',
    'admin',
    'api',
    'emulators',
    'seed',
    'release',
    'deploy',
    'clean'
  )]
  [string]$Command = 'help',

  [ValidateSet('DevClient', 'ExpoGo', 'Web')]
  [string]$Target = 'DevClient',

  [ValidateSet('All', 'Mobile', 'Domain', 'Api', 'Admin', 'Packages')]
  [string]$Scope = 'All',

  [ValidateSet('Quick', 'Full', 'Release')]
  [string]$Level = 'Quick',

  [string]$Action,

  [ValidateSet('development', 'preview', 'production')]
  [string]$Profile = 'production',

  [ValidateSet('internal', 'alpha', 'beta', 'production')]
  [string]$Track = 'internal',

  [ValidateSet('Auto', 'Draft', 'Completed', 'InProgress')]
  [string]$ReleaseStatus = 'Auto',

  [string]$Topic,
  [string]$Device,
  [string]$Avd,
  [string]$BuildId,
  [string]$OutputDirectory = 'artifacts\release',
  [string]$SecretsFile,
  [string]$ReleaseNotesFile,
  [string]$Message,
  [string]$ProjectId,
  [string]$Region = 'europe-central2',
  [string]$ImageTag,
  [string]$VarFile = 'terraform.tfvars',
  [string]$PlanFile = 'spark.tfplan',
  [ValidateSet('Firebase', 'Google')]
  [string]$Provider = 'Firebase',
  [ValidateRange(1, 50)]
  [int]$Limit = 10,
  [ValidateRange(0, 100)]
  [double]$RolloutPercent = 0,
  [int]$Port = 0,
  [switch]$Clear,
  [switch]$Offline,
  [switch]$Coverage,
  [switch]$Persist,
  [switch]$Select,
  [switch]$List,
  [switch]$Yes,
  [switch]$NoWait,
  [switch]$ClearCache,
  [switch]$NoAutoVersionCode,
  [switch]$Help
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$script:Root = $PSScriptRoot
$script:PackageName = 'com.djpokis.sparkhabits.app'
$script:MobileProcessFile = Join-Path $script:Root '.expo\spark-mobile-process.json'

function Write-Heading {
  param([string]$Text)
  Write-Host ""
  Write-Host $Text -ForegroundColor Cyan
  Write-Host ("-" * $Text.Length) -ForegroundColor DarkCyan
}

function Write-CommandHelp {
  param([string]$Name)

  switch ($Name.ToLowerInvariant()) {
    'install' {
      @'
install
  Installs repository dependencies from package-lock.json.

  Example:
    .\spark.cmd install
'@ | Write-Host
    }
    'doctor' {
      @'
doctor
  Checks Node, npm, dependencies, Android tools, and optional cloud tools.

  Example:
    .\spark.cmd doctor
'@ | Write-Host
    }
    'setup-android' {
      @'
setup-android
  Auto-detects Android Studio Java and the Android SDK, configures this process,
  and shows adb devices. Use -Persist to save JAVA_HOME, ANDROID_HOME, and Path
  entries for your Windows user. Reopen terminals after persisting.

  Parameters:
    -Persist   Save detected values for future terminals.

  Examples:
    .\spark.cmd setup-android
    .\spark.cmd setup-android -Persist
'@ | Write-Host
    }
    'start' {
      @'
start
  Starts Expo Metro. DevClient is the default; its QR code opens the installed
  Spark development app, not Expo Go. ExpoGo is a limited UI-only preview.

  Parameters:
    -Target DevClient|ExpoGo|Web   Default: DevClient
    -Clear                         Rebuild Metro's cache.
    -Offline                       Disable Expo network access.
    -Port <number>                 Use a specific Metro port.

  Examples:
    .\spark.cmd start
    .\spark.cmd start -Target Web -Clear
    .\spark.cmd start -Target ExpoGo
    .\spark.cmd start -Port 8090 -Offline
'@ | Write-Host
    }
    'android' {
      @'
android
  Detects the local Android toolchain, generates/builds the native development
  client, installs it, and starts the Spark application.

  Parameters:
    -Select                Show Expo's interactive device picker.
    -Device <name-or-id>   Target an Expo name or an ADB ID. Wireless ADB IDs
                           are automatically translated to the phone model name.

  Examples:
    .\spark.cmd android
    .\spark.cmd android -Select
    .\spark.cmd android -Device 25113PN0EG
    .\spark.cmd android -Device "adb-d64c77ee-example._adb-tls-connect._tcp"
'@ | Write-Host
    }
    'stop' {
      @'
stop
  Stops the spark.cmd-owned local Expo/Metro/Android build process tree recorded by
  the most recent start or android command. Run it from a second PowerShell if
  Ctrl+C is unavailable. With -Device, it also force-stops the installed Spark
  app on that Android target without deleting its data.

  Parameters:
    -Device <name-or-id>   Also stop Spark on one connected Android device.

  Examples:
    .\spark.cmd stop
    .\spark.cmd stop -Device 25113PN0EG
'@ | Write-Host
    }
    'emulator' {
      @'
emulator
  Lists or starts Android Virtual Devices created in Android Studio.

  Parameters:
    -List          List available virtual-device names.
    -Avd <name>    Start the named virtual device in its own window.

  Examples:
    .\spark.cmd emulator -List
    .\spark.cmd emulator -Avd Pixel_9_API_36
'@ | Write-Host
    }
    'devices' {
      @'
devices
  Lists connected Android emulators, USB phones, and Wi-Fi debugging phones.
  It also prints the exact Spark launch value for each device.

  Example:
    .\spark.cmd devices
'@ | Write-Host
    }
    'logs' {
      @'
logs
  Streams Spark React Native JavaScript logs from the connected Android device.
  Stop with Ctrl+C.

  Parameters:
    -Device <name-or-id>   Read logs from a specific connected device.

  Example:
    .\spark.cmd logs
    .\spark.cmd logs -Device 25113PN0EG
'@ | Write-Host
    }
    'reset-app' {
      @'
reset-app
  Clears Spark's Android app data on the connected device. This permanently
  deletes local habits, completions, secure keys, and backup folder grants.

  Parameters:
    -Device <name-or-id>   Clear Spark on a specific connected device.
    -Yes   Skip the interactive destructive-action confirmation.

  Examples:
    .\spark.cmd reset-app
    .\spark.cmd reset-app -Device 25113PN0EG
    .\spark.cmd reset-app -Yes
'@ | Write-Host
    }
    'test' {
      @'
test
  Runs automated tests once.

  Parameters:
    -Scope All|Mobile|Domain|Api|Admin   Default: All
    -Coverage                            Run coverage and enforce thresholds.

  Examples:
    .\spark.cmd test
    .\spark.cmd test -Scope Mobile
    .\spark.cmd test -Coverage
'@ | Write-Host
    }
    'check' {
      @'
check
  Runs a predefined validation sequence and stops at the first failure.

  Parameters:
    -Level Quick     doctor + typecheck + tests
    -Level Full      Quick + coverage + production builds
    -Level Release   Full + release placeholder/file checks

  Examples:
    .\spark.cmd check
    .\spark.cmd check -Level Full
    .\spark.cmd check -Level Release
'@ | Write-Host
    }
    'build' {
      @'
build
  Builds one part of Spark or the whole workspace. Mobile is an Android
  JavaScript export, not an APK/AAB.

  Parameters:
    -Scope All|Mobile|Domain|Api|Admin|Packages   Default: All

  Examples:
    .\spark.cmd build
    .\spark.cmd build -Scope Mobile
    .\spark.cmd build -Scope Admin
'@ | Write-Host
    }
    'e2e' {
      @'
e2e
  Runs the Maestro offline Android flow. Requires an installed native Spark
  build, a connected device/emulator, and Maestro.

  Example:
    .\spark.cmd e2e
'@ | Write-Host
    }
    'admin' {
      @'
admin
  Starts the optional local admin dashboard. Stop with Ctrl+C.

  Example:
    .\spark.cmd admin
'@ | Write-Host
    }
    'api' {
      @'
api
  Builds shared packages and starts the optional control-plane API in watch
  mode. Stop with Ctrl+C.

  Example:
    .\spark.cmd api
'@ | Write-Host
    }
    'emulators' {
      @'
emulators
  Builds the admin dashboard and starts local Firebase Auth, Firestore,
  Hosting, and emulator UI. Stop with Ctrl+C.

  Examples:
    .\spark.cmd emulators
    .\spark.cmd seed
'@ | Write-Host
    }
    'seed' {
      @'
seed
  Seeds deterministic users, config, support, promo, and audit data into
  already-running local Firebase emulators.

  Example:
    .\spark.cmd seed
'@ | Write-Host
    }
    'release' {
      @'
release
  Prepares and builds the Spark application for Google Play on this Windows PC.
  The primary path is local and does not contact or consume EAS. EAS means Expo
  Application Services and remains available only through explicitly named
  Eas* actions. Running without -Action performs the fast release check.

  Actions:
    LocalStatus  Show whether the private upload key and native signing guard exist.
    LocalSetup   Create the private Google Play upload key on this PC. Run once.
    LocalBuild   Build and verify a signed Android App Bundle (.aab) on this PC.
    PlaySetup    One-time Google Cloud API/service-account/key preparation; guarded.
    PlayStatus   Verify the Play credential and show bundles/tracks; no release change.
    LocalPublish Check version, build locally, upload, and update a Play track.
    History      Show recent build/publish/setup JSON records and their paths.
    Native       Build/install an optimized debug-signed APK for phone testing.
    Inspect      Fast local identity/version/flag/privacy summary; no network.
    Check        Required-file, identity, and privacy-placeholder check (default).
    Verify       Full doctor, types, tests, coverage, builds, and release check.
    Assets       Regenerate and validate the tracked Google Play graphics locally.

  Optional EAS actions (not required by the local process):
    EasSetup       Sign in and link an Expo Application Services project.
    EasProject     Show its Expo account and project link.
    EasCredentials Open its Android signing-credentials manager.
    EasBuild       Start a hosted Android build; blocked unless its cost flag is enabled.
    EasList        List hosted Android builds.
    EasDownload    Download one exact hosted build.
    EasSubmit      Submit one hosted build; blocked unless its cost flag is enabled.

  Parameters:
    -OutputDirectory <path>  Local build/download plus JSON history; default: artifacts\release.
    -SecretsFile <path>      Optional ignored JSON containing the upload-key password
                             and service-account-key path. Otherwise prompt securely.
    -ReleaseNotesFile <path> Optional localized JSON; default: store Android current notes.
    -Device <model-or-id>    Native-test target; omit for the device picker.
    -Profile <name>          Optional EasBuild/EasList profile; default: production.
    -Track <name>            LocalPublish/EasSubmit Play track; default: internal.
    -ReleaseStatus <value>   Auto|Draft|Completed|InProgress. Auto completes testing
                             releases but leaves production as a draft.
    -RolloutPercent <0..100> Required only for production InProgress rollout.
    -NoAutoVersionCode       Refuse rather than advancing an already-used Play code.
    -ProjectId <id>          PlaySetup Google Cloud project; publisher config is default.
    -BuildId <id>            Required for EasDownload/EasSubmit.
    -Message <text>          Optional EasBuild message.
    -Limit 1..50             EasList/History count; default: 10.
    -NoWait                  Queue EasBuild/EasSubmit without waiting.
    -ClearCache              Clear the hosted EAS build cache.
    -Yes                     Skip eligible confirmations. Production always asks.

  Recommended local sequence:
    .\spark.cmd release -Action LocalStatus
    .\spark.cmd release -Action LocalSetup
    .\spark.cmd release -Action LocalBuild
    .\spark.cmd release -Action PlaySetup -ProjectId djpokis-spark-habits
    .\spark.cmd release -Action PlayStatus
    .\spark.cmd release -Action LocalPublish -Track internal
    .\spark.cmd release -Action History

  Other examples:
    .\spark.cmd release -Action Verify
    .\spark.cmd release -Action Assets
    .\spark.cmd release -Action Native -Device 25113PN0EG
    .\spark.cmd release -Action EasBuild -Profile production

  Cost guard for the optional hosted workflow:
    $env:SPARK_ALLOW_EAS_RELEASES = 'true' # current PowerShell process only
    # Review signing migration and current Expo pricing before setting it.
'@ | Write-Host
    }
    'deploy' {
      @'
deploy
  Provides guarded Firebase and Google Cloud deployment utilities. Status is
  read-only. Hosting, Firebase, Image, and Apply can create costs or external
  state and require typed confirmation unless -Yes is supplied.

  Actions:
    Status     Show local deployment tools, IDs, flags, and missing files (default).
    Login      Authenticate Firebase or Google Cloud CLI.
    Hosting    Build/deploy static admin + privacy hosting only.
    Firebase   Build/deploy Hosting plus Firestore rules and indexes.
    Image      Build/push the control-plane image with Google Cloud Build.
    Plan       Init/format/validate Terraform and save/show an exact plan.
    Apply      Show and apply an existing saved Terraform plan.
    Outputs    Print current Terraform outputs after deployment.

  Parameters:
    -ProjectId <id>             Required for Hosting/Firebase/Image; checked
                                against terraform.tfvars for Apply when supplied.
    -Provider Firebase|Google   Login provider; default: Firebase.
    -Region <region>            Image registry region; default: europe-central2.
    -ImageTag <tag>             Image tag; defaults to the mobile app version.
    -VarFile <name>             File inside infra\terraform; default: terraform.tfvars.
    -PlanFile <name>            Saved plan inside infra\terraform; default: spark.tfplan.
    -Yes                        Skip the typed external-change confirmation.

  Examples:
    .\spark.cmd deploy
    .\spark.cmd deploy -Action Login -Provider Firebase
    .\spark.cmd deploy -Action Hosting -ProjectId djpokis-spark-habits
    .\spark.cmd deploy -Action Plan
    .\spark.cmd deploy -Action Apply
    .\spark.cmd deploy -Action Image -ProjectId djpokis-spark-habits
    .\spark.cmd deploy -Action Outputs
'@ | Write-Host
    }
    'clean' {
      @'
clean
  Removes generated build and coverage directories managed by this repository.

  Example:
    .\spark.cmd clean
'@ | Write-Host
    }
    default {
      Write-Heading 'spark.cmd command helper'
      @'
Usage:
  .\spark.cmd <command> [parameters]
  .\spark.cmd <command> -Help
  .\spark.cmd help -Topic <command>

First-time path:
  .\spark.cmd install
  .\spark.cmd setup-android -Persist
  .\spark.cmd doctor
  .\spark.cmd start -Target Web
  .\spark.cmd android

Development:
  start          Start Expo for DevClient, Expo Go, or Web
  android        Build/install the native Android development app
  stop           Stop the spark.cmd-owned process tree; optionally the app
  emulator       List or start Android virtual devices
  devices        List Android devices and emulators
  logs           Stream React Native Android logs
  reset-app      Destructively clear local Android app data
  admin          Start the optional admin dashboard
  api            Start the optional API
  emulators      Start local Firebase emulators
  seed           Seed local Firebase emulator data

Quality:
  doctor         Inspect the local development environment
  test           Run all or scoped tests, optionally with coverage
  check          Run Quick, Full, or Release validation
  build          Build all or a selected workspace
  e2e            Run the Maestro Android flow
  release        Build signed Android releases locally; optional EAS actions
  deploy         Inspect or run guarded Firebase/GCP/Terraform deployments
  clean          Remove generated outputs

Setup:
  install        Install locked npm dependencies
  setup-android  Detect/configure Java, Android SDK, and adb

Examples:
  .\spark.cmd start -Target Web -Clear
  .\spark.cmd test -Scope Mobile -Coverage
  .\spark.cmd check -Level Full

Use ".\spark.cmd <command> -Help" for parameter details.
'@ | Write-Host
    }
  }
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [string[]]$Arguments = @()
  )
  Write-Host ""
  Write-Host ("> {0} {1}" -f $Executable, ($Arguments -join ' ')) -ForegroundColor DarkGray
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Executable exited with code $LASTEXITCODE."
  }
}

function Invoke-Npm {
  param([string[]]$Arguments)
  Invoke-External -Executable 'npm.cmd' -Arguments $Arguments
}

function Stop-ExternalProcessTree {
  param([Parameter(Mandatory = $true)][int]$ProcessId)

  if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) { return }
  if ($env:OS -eq 'Windows_NT') {
    & taskkill.exe '/pid' ([string]$ProcessId) '/t' '/f' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
      throw "Could not stop process tree $ProcessId (taskkill exit code $LASTEXITCODE)."
    }
    return
  }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Remove-MobileProcessRecord {
  param([int]$ExpectedProcessId = 0)

  if (-not (Test-Path -LiteralPath $script:MobileProcessFile)) { return }
  if ($ExpectedProcessId -gt 0) {
    try {
      $record = Get-Content -LiteralPath $script:MobileProcessFile -Raw | ConvertFrom-Json
      if ([int]$record.processId -ne $ExpectedProcessId) { return }
    } catch {
      return
    }
  }
  Remove-Item -LiteralPath $script:MobileProcessFile -Force -ErrorAction SilentlyContinue
}

function Write-MobileProcessRecord {
  param([Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process)

  $directory = Split-Path -Parent $script:MobileProcessFile
  [void][System.IO.Directory]::CreateDirectory($directory)
  [ordered]@{
    processId = $Process.Id
    processName = $Process.ProcessName
    startedAtUtc = $Process.StartTime.ToUniversalTime().ToString('o')
    stopRequested = $false
  } |
    ConvertTo-Json |
    Set-Content -LiteralPath $script:MobileProcessFile -Encoding UTF8
}

function Stop-RecordedMobileProcess {
  if (-not (Test-Path -LiteralPath $script:MobileProcessFile)) {
    Write-Host 'No spark.cmd-recorded Expo/Android process is running.'
    return
  }

  try {
    $record = Get-Content -LiteralPath $script:MobileProcessFile -Raw | ConvertFrom-Json
    $recordedId = [int]$record.processId
    $recordedStart = [DateTime]::Parse(
      [string]$record.startedAtUtc,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::RoundtripKind
    )
    $process = Get-Process -Id $recordedId -ErrorAction Stop
    $startDifference = [Math]::Abs(
      ($process.StartTime.ToUniversalTime() - $recordedStart.ToUniversalTime()).TotalSeconds
    )
    if ($process.ProcessName -ne 'node' -or $startDifference -gt 2) {
      throw 'The recorded PID now belongs to another process.'
    }
  } catch {
    Remove-MobileProcessRecord
    Write-Warning 'The process recorded by spark.cmd was stale, so no process was terminated.'
    return
  }

  $record | Add-Member -NotePropertyName 'stopRequested' -NotePropertyValue $true -Force
  $record | ConvertTo-Json | Set-Content -LiteralPath $script:MobileProcessFile -Encoding UTF8
  Write-Host "Stopping the spark.cmd development process tree (PID $recordedId)..." -ForegroundColor Yellow
  Stop-ExternalProcessTree -ProcessId $recordedId
  Write-Host 'Stopped the local spark.cmd development process tree.' -ForegroundColor Green
}

function ConvertTo-NativeArgument {
  param([AllowEmptyString()][string]$Argument)

  if ($Argument.Length -gt 0 -and $Argument -notmatch '[\s"]') {
    return $Argument
  }

  $builder = New-Object System.Text.StringBuilder
  [void]$builder.Append('"')
  $backslashes = 0
  foreach ($character in $Argument.ToCharArray()) {
    if ($character -eq '\') {
      $backslashes++
      continue
    }
    if ($character -eq '"') {
      [void]$builder.Append(('\' * (($backslashes * 2) + 1)))
      [void]$builder.Append('"')
      $backslashes = 0
      continue
    }
    if ($backslashes -gt 0) {
      [void]$builder.Append(('\' * $backslashes))
      $backslashes = 0
    }
    [void]$builder.Append($character)
  }
  if ($backslashes -gt 0) {
    [void]$builder.Append(('\' * ($backslashes * 2)))
  }
  [void]$builder.Append('"')
  return $builder.ToString()
}

function Invoke-InterruptibleExternal {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [string[]]$Arguments = @(),
    [switch]$RecordAsMobileProcess
  )

  Write-Host ""
  Write-Host ("> {0} {1}" -f $Executable, ($Arguments -join ' ')) -ForegroundColor DarkGray
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $Executable
  $startInfo.Arguments = (($Arguments | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' ')
  $startInfo.WorkingDirectory = $script:Root
  $startInfo.UseShellExecute = $false
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()
  $stopWasRequested = $false
  if ($RecordAsMobileProcess) {
    Write-MobileProcessRecord -Process $process
  }

  try {
    $process | Wait-Process
  } finally {
    $process.Refresh()
    if ($RecordAsMobileProcess) {
      if (Test-Path -LiteralPath $script:MobileProcessFile) {
        try {
          $record = Get-Content -LiteralPath $script:MobileProcessFile -Raw | ConvertFrom-Json
          $stopWasRequested =
            [int]$record.processId -eq $process.Id -and $record.stopRequested -eq $true
        } catch {
          $stopWasRequested = $false
        }
      } else {
        $stopWasRequested = $false
      }
    }
    if (-not $process.HasExited) {
      Write-Host ""
      Write-Host 'Stopping Spark development processes...' -ForegroundColor Yellow
      Stop-ExternalProcessTree -ProcessId $process.Id
    }
    if ($RecordAsMobileProcess) {
      Remove-MobileProcessRecord -ExpectedProcessId $process.Id
    }
  }

  $process.Refresh()
  if ($process.ExitCode -ne 0 -and -not $stopWasRequested) {
    throw "$Executable exited with code $($process.ExitCode)."
  }
  if ($stopWasRequested) {
    Write-Host 'Spark development processes stopped.' -ForegroundColor Green
  }
}

function Invoke-MobileCommand {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('start', 'android', 'ios')][string]$Mode,
    [string[]]$Arguments = @()
  )

  $node = Get-Command 'node.exe' -ErrorAction SilentlyContinue
  if (-not $node) {
    throw 'Node.js was not found. Install the current Node.js LTS release and reopen PowerShell.'
  }
  Invoke-InterruptibleExternal `
    -Executable $node.Source `
    -Arguments (@((Join-Path $script:Root 'scripts\mobile-command.mjs'), $Mode) + $Arguments) `
    -RecordAsMobileProcess
}

function Add-ProcessPath {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return }
  $parts = @($env:Path -split ';' | Where-Object { $_ })
  if ($parts -notcontains $Path) {
    $env:Path = "$Path;$env:Path"
  }
}

function Add-UserPath {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return }
  $current = [Environment]::GetEnvironmentVariable('Path', 'User')
  $parts = @($current -split ';' | Where-Object { $_ })
  if ($parts -notcontains $Path) {
    [Environment]::SetEnvironmentVariable(
      'Path',
      (($parts + $Path) -join ';'),
      'User'
    )
  }
}

function Find-JavaHome {
  $candidates = @(
    $env:JAVA_HOME,
    'C:\Program Files\Android\Android Studio\jbr',
    'C:\Program Files\Android\Android Studio\jre'
  )
  return $candidates |
    Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) } |
    Select-Object -First 1
}

function Find-AndroidHome {
  $candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
  )
  return $candidates |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
    Select-Object -First 1
}

function Initialize-AndroidEnvironment {
  param([switch]$SaveForUser)

  $javaHome = Find-JavaHome
  $androidHome = Find-AndroidHome

  if ($javaHome) {
    $env:JAVA_HOME = $javaHome
    Add-ProcessPath (Join-Path $javaHome 'bin')
    Write-Host "Java: $javaHome" -ForegroundColor Green
  } else {
    Write-Warning 'Android Studio Java was not found.'
  }

  if ($androidHome) {
    $env:ANDROID_HOME = $androidHome
    $env:ANDROID_SDK_ROOT = $androidHome
    Add-ProcessPath (Join-Path $androidHome 'platform-tools')
    Add-ProcessPath (Join-Path $androidHome 'emulator')
    Add-ProcessPath (Join-Path $androidHome 'cmdline-tools\latest\bin')
    Write-Host "Android SDK: $androidHome" -ForegroundColor Green
  } else {
    Write-Warning 'Android SDK was not found. Install it from Android Studio SDK Manager.'
  }

  if ($SaveForUser) {
    if ($javaHome) {
      [Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')
      Add-UserPath (Join-Path $javaHome 'bin')
    }
    if ($androidHome) {
      [Environment]::SetEnvironmentVariable('ANDROID_HOME', $androidHome, 'User')
      [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $androidHome, 'User')
      Add-UserPath (Join-Path $androidHome 'platform-tools')
      Add-UserPath (Join-Path $androidHome 'emulator')
      Add-UserPath (Join-Path $androidHome 'cmdline-tools\latest\bin')
    }
    Write-Host 'Saved detected Android variables for your Windows user.' -ForegroundColor Green
    Write-Host 'Reopen PowerShell/terminal windows so other programs receive them.'
  }

  return [pscustomobject]@{
    JavaHome = $javaHome
    AndroidHome = $androidHome
  }
}

function Get-Adb {
  $command = Get-Command 'adb.exe' -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  if ($env:ANDROID_HOME) {
    $candidate = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return $null
}

function Assert-Adb {
  $adb = Get-Adb
  if (-not $adb) {
    throw 'adb was not found. Run ".\spark.cmd setup-android" and install Android SDK Platform-Tools if needed.'
  }
  return $adb
}

function Get-AndroidDevices {
  $adb = Assert-Adb
  $output = @(& $adb 'devices' '-l' 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "adb devices exited with code $LASTEXITCODE."
  }

  $devices = @()
  foreach ($line in $output) {
    $text = [string]$line
    $text = $text.Trim()
    if (-not $text -or $text -eq 'List of devices attached') { continue }

    $parts = @($text -split '\s+' | Where-Object { $_ })
    if ($parts.Count -lt 2) { continue }

    $serial = $parts[0]
    $state = $parts[1]
    $properties = @{}
    for ($index = 2; $index -lt $parts.Count; $index++) {
      $property = $parts[$index] -split ':', 2
      if ($property.Count -eq 2) {
        $properties[$property[0]] = $property[1]
      }
    }

    $connection = if ($serial -like 'emulator-*') {
      'Emulator'
    } elseif ($serial -like '*_adb-tls-connect._tcp' -or $serial -match '^\d+\.\d+\.\d+\.\d+:\d+$') {
      'Wi-Fi'
    } elseif ($properties.ContainsKey('usb')) {
      'USB'
    } else {
      'ADB'
    }

    $expoName = $null
    if ($serial -like 'emulator-*' -and $state -eq 'device') {
      $expoName = [string](& $adb '-s' $serial 'shell' 'getprop' 'ro.boot.qemu.avd_name' 2>$null)
      $expoName = $expoName.Trim()
    } elseif ($properties.ContainsKey('model')) {
      $expoName = [string]$properties['model']
    } elseif ($state -eq 'device') {
      $expoName = [string](& $adb '-s' $serial 'shell' 'getprop' 'ro.product.model' 2>$null)
      $expoName = $expoName.Trim()
    }

    $devices += [pscustomobject]@{
      Serial = $serial
      State = $state
      Model = $(if ($properties.ContainsKey('model')) { [string]$properties['model'] } else { $null })
      ExpoName = $expoName
      Connection = $connection
    }
  }
  return @($devices)
}

function Resolve-ExpoDeviceName {
  param([Parameter(Mandatory = $true)][string]$RequestedDevice)

  $devices = @(Get-AndroidDevices)
  $match = $devices |
    Where-Object {
      $_.Serial -ieq $RequestedDevice -or
      ($_.ExpoName -and $_.ExpoName -ieq $RequestedDevice)
    } |
    Select-Object -First 1

  if (-not $match) {
    $wirelessToken = if ($RequestedDevice -match '^adb-([^-]+)-') { $Matches[1] } else { $null }
    $staleMatch = if ($wirelessToken) {
      $devices |
        Where-Object { $_.Serial -ieq $wirelessToken } |
        Select-Object -First 1
    } else {
      $null
    }
    if ($staleMatch -and $staleMatch.State -ne 'device') {
      throw "Wireless Android device '$RequestedDevice' is $($staleMatch.State), not connected. Unlock the phone, toggle Wireless debugging off/on (or reconnect it in Android Studio Device Manager), then run '.\spark.cmd devices' again."
    }
    throw "Connected Android device '$RequestedDevice' was not found. Wi-Fi ADB serials can change after reconnecting. Run '.\spark.cmd devices' and use the newly printed model/ID, or use '.\spark.cmd android -Select'."
  }
  if ($match.State -ne 'device') {
    throw "Android device '$RequestedDevice' is $($match.State), not ready. Unlock/reconnect it, then run '.\spark.cmd devices' until its state is 'device'."
  }
  if ($match.Serial -ine $RequestedDevice) {
    Write-Host "Resolved '$RequestedDevice' to connected $($match.Connection) target '$($match.Serial)'." -ForegroundColor Green
  } else {
    Write-Host "Targeting connected $($match.Connection) device '$($match.Serial)'." -ForegroundColor Green
  }
  return $match.Serial
}

function Resolve-AdbDeviceId {
  param([string]$RequestedDevice)

  if (-not $RequestedDevice) { return $null }
  $match = @(Get-AndroidDevices) |
    Where-Object {
      $_.Serial -ieq $RequestedDevice -or
      ($_.ExpoName -and $_.ExpoName -ieq $RequestedDevice)
    } |
    Select-Object -First 1
  if (-not $match) {
    throw "Connected Android device '$RequestedDevice' was not found. Run '.\spark.cmd devices'."
  }
  if ($match.State -ne 'device') {
    throw "Android device '$RequestedDevice' is $($match.State), not ready. Unlock/reconnect it, then run '.\spark.cmd devices' until its state is 'device'."
  }
  return $match.Serial
}

function Show-AndroidDevices {
  $devices = @(Get-AndroidDevices)
  Write-Heading 'Connected Android devices'
  if (-not $devices.Count) {
    Write-Host 'No connected devices found.'
    return
  }

  $number = 0
  foreach ($item in $devices) {
    $number++
    $displayName = if ($item.ExpoName) { $item.ExpoName } elseif ($item.Model) { $item.Model } else { $item.Serial }
    $stateColor = if ($item.State -eq 'device') { 'Green' } else { 'Yellow' }
    Write-Host ("[{0}] {1} ({2}, {3})" -f $number, $displayName, $item.Connection, $item.State) -ForegroundColor $stateColor
    Write-Host "    ADB ID: $($item.Serial)"
    if ($item.State -ne 'device') {
      Write-Host '    Not launchable: unlock/reconnect the device until its state is device.' -ForegroundColor Yellow
    } elseif ($item.ExpoName) {
      Write-Host ('    Launch: .\spark.cmd android -Device "{0}"' -f $item.ExpoName)
      if ($item.Serial -ine $item.ExpoName) {
        Write-Host '    The exact ADB ID also works with Spark.'
      }
    } else {
      Write-Host '    Launch: .\spark.cmd android -Select'
    }
  }
  Write-Host ""
  if (@($devices | Where-Object { $_.State -eq 'device' }).Count) {
    Write-Host 'Interactive picker: .\spark.cmd android -Select'
  }
}

function Invoke-Tests {
  $scriptName = if ($Coverage) { 'test:coverage' } else { 'test:ci' }
  $workspace = switch ($Scope) {
    'Mobile' { '@spark/mobile' }
    'Domain' { '@spark/domain' }
    'Api' { '@spark/control-plane' }
    'Admin' { '@spark/admin' }
    'Packages' { throw 'Packages is not a valid test scope. Use All, Mobile, Domain, Api, or Admin.' }
    default { $null }
  }
  $arguments = @('run', $scriptName)
  if ($workspace) { $arguments += @('--workspace', $workspace) }
  Invoke-Npm $arguments
}

function Invoke-Build {
  switch ($Scope) {
    'All' { Invoke-Npm @('run', 'build') }
    'Mobile' { Invoke-Npm @('run', 'build', '--workspace', '@spark/mobile') }
    'Domain' { Invoke-Npm @('run', 'build', '--workspace', '@spark/domain') }
    'Api' { Invoke-Npm @('run', 'build', '--workspace', '@spark/control-plane') }
    'Admin' { Invoke-Npm @('run', 'build', '--workspace', '@spark/admin') }
    'Packages' { Invoke-Npm @('run', 'build:packages') }
  }
}

. (Join-Path $script:Root 'scripts\spark-ops.ps1')

if ($Help -or $Command -eq 'help') {
  Write-CommandHelp $(if ($Help) { $Command } elseif ($Topic) { $Topic } else { 'help' })
  exit 0
}

Set-Location -LiteralPath $script:Root

try {
  switch ($Command) {
    'install' {
      Invoke-Npm @('install')
    }
    'doctor' {
      Initialize-AndroidEnvironment | Out-Null
      Invoke-Npm @('run', 'doctor')
    }
    'setup-android' {
      Write-Heading 'Android environment'
      $environment = Initialize-AndroidEnvironment -SaveForUser:$Persist
      if (-not $environment.JavaHome -or -not $environment.AndroidHome) {
        throw 'The Android toolchain is incomplete. Open Android Studio SDK Manager and install the SDK, Platform-Tools, Emulator, and Command-line Tools.'
      }
      Invoke-External -Executable (Join-Path $environment.JavaHome 'bin\java.exe') -Arguments @('-version')
      $adb = Assert-Adb
      Invoke-External -Executable $adb -Arguments @('devices', '-l')
    }
    'start' {
      $arguments = @()
      switch ($Target) {
        'DevClient' {
          Write-Host 'The QR code opens the installed Spark development app, not Expo Go.' -ForegroundColor Cyan
          $arguments += '--dev-client'
        }
        'ExpoGo' {
          Write-Warning 'Expo Go is only a limited UI preview. Spark native integrations require the development build.'
          $arguments += '--go'
        }
        'Web' { $arguments += '--web' }
      }
      if ($Clear) { $arguments += '--clear' }
      if ($Offline) { $arguments += '--offline' }
      if ($Port -gt 0) { $arguments += @('--port', [string]$Port) }
      Invoke-MobileCommand -Mode 'start' -Arguments $arguments
    }
    'android' {
      $environment = Initialize-AndroidEnvironment
      if (-not $environment.JavaHome -or -not $environment.AndroidHome) {
        throw 'Android Java/SDK is incomplete. Run ".\spark.cmd setup-android -Persist".'
      }
      $arguments = @()
      if ($Select -and $Device) {
        throw 'Use either -Select or -Device, not both.'
      }
      if ($Select) {
        $arguments += '--device'
      } elseif ($Device) {
        $arguments += @('--device', (Resolve-ExpoDeviceName $Device))
      }
      Invoke-MobileCommand -Mode 'android' -Arguments $arguments
    }
    'stop' {
      Stop-RecordedMobileProcess
      if ($Device) {
        Initialize-AndroidEnvironment | Out-Null
        $adbDevice = Resolve-AdbDeviceId $Device
        Invoke-External -Executable (Assert-Adb) -Arguments @(
          '-s',
          $adbDevice,
          'shell',
          'am',
          'force-stop',
          $script:PackageName
        )
        Write-Host "Stopped the Spark application on Android device '$adbDevice' without clearing its data." -ForegroundColor Green
      }
    }
    'emulator' {
      $environment = Initialize-AndroidEnvironment
      if (-not $environment.AndroidHome) {
        throw 'Android SDK was not found. Run ".\spark.cmd setup-android".'
      }
      $emulator = Join-Path $environment.AndroidHome 'emulator\emulator.exe'
      if (-not (Test-Path -LiteralPath $emulator)) {
        throw 'Android Emulator is not installed. Add it in Android Studio SDK Manager.'
      }
      $available = @(& $emulator '-list-avds' | Where-Object { $_.Trim() })
      if ($LASTEXITCODE -ne 0) {
        throw "Android Emulator exited with code $LASTEXITCODE."
      }
      if ($List -or -not $Avd) {
        Write-Heading 'Available Android virtual devices'
        if (-not $available.Count) {
          Write-Host 'No virtual devices found. Create one in Android Studio Device Manager.'
        } else {
          $available | ForEach-Object { Write-Host "  $_" }
          if (-not $Avd) {
            Write-Host ""
            Write-Host 'Start one with: .\spark.cmd emulator -Avd <name>'
          }
        }
        if (-not $Avd) { break }
      }
      if ($available -notcontains $Avd) {
        throw "Virtual device '$Avd' was not found. Run '.\spark.cmd emulator -List'."
      }
      Write-Host "Starting Android emulator: $Avd" -ForegroundColor Green
      Start-Process -FilePath $emulator -ArgumentList @('-avd', $Avd)
      Write-Host 'Wait for Android to finish booting, then run ".\spark.cmd devices".'
    }
    'devices' {
      Initialize-AndroidEnvironment | Out-Null
      Show-AndroidDevices
    }
    'logs' {
      Initialize-AndroidEnvironment | Out-Null
      $arguments = @()
      $adbDevice = Resolve-AdbDeviceId $Device
      if ($adbDevice) { $arguments += @('-s', $adbDevice) }
      $arguments += @(
        'logcat',
        'ReactNativeJS:V',
        '*:S'
      )
      Invoke-External -Executable (Assert-Adb) -Arguments $arguments
    }
    'reset-app' {
      Initialize-AndroidEnvironment | Out-Null
      if (-not $Yes) {
        Write-Warning "This permanently deletes all local Spark data for $script:PackageName."
        $confirmation = Read-Host 'Type RESET to continue'
        if ($confirmation -cne 'RESET') {
          Write-Host 'Reset canceled.'
          exit 0
        }
      }
      $arguments = @()
      $adbDevice = Resolve-AdbDeviceId $Device
      if ($adbDevice) { $arguments += @('-s', $adbDevice) }
      $arguments += @(
        'shell',
        'pm',
        'clear',
        $script:PackageName
      )
      Invoke-External -Executable (Assert-Adb) -Arguments $arguments
    }
    'test' {
      Invoke-Tests
    }
    'check' {
      Initialize-AndroidEnvironment | Out-Null
      Invoke-Npm @('run', 'doctor')
      Invoke-Npm @('run', 'typecheck')
      Invoke-Npm @('run', 'test:ci')
      if ($Level -in @('Full', 'Release')) {
        Invoke-Npm @('run', 'test:coverage')
        Invoke-Npm @('run', 'build')
      }
      if ($Level -eq 'Release') {
        Invoke-Npm @('run', 'release:check')
      }
    }
    'build' {
      Invoke-Build
    }
    'e2e' {
      if (-not (Get-Command 'maestro' -ErrorAction SilentlyContinue)) {
        throw 'Maestro was not found. See docs/testing.md for Windows/WSL setup.'
      }
      Initialize-AndroidEnvironment | Out-Null
      Assert-Adb | Out-Null
      Invoke-Npm @('run', 'e2e:android')
    }
    'admin' {
      Invoke-Npm @('run', 'admin')
    }
    'api' {
      Invoke-Npm @('run', 'api')
    }
    'emulators' {
      Invoke-Npm @('run', 'emulators')
    }
    'seed' {
      Invoke-Npm @('run', 'emulators:seed')
    }
    'release' {
      Invoke-SparkRelease `
        -RequestedAction $Action `
        -BuildProfile $Profile `
        -SubmitTrack $Track `
        -ExactBuildId $BuildId `
        -DownloadDirectory $OutputDirectory `
        -BuildMessage $Message `
        -ListLimit $Limit `
        -TargetDevice $Device `
        -GoogleCloudProjectId $ProjectId `
        -SecretsFile $SecretsFile `
        -ReleaseNotesFile $ReleaseNotesFile `
        -RequestedReleaseStatus $ReleaseStatus `
        -RolloutPercent $RolloutPercent `
        -DisableAutoVersionCode:$NoAutoVersionCode `
        -QueueOnly:$NoWait `
        -ResetBuildCache:$ClearCache `
        -SkipConfirmation:$Yes
    }
    'deploy' {
      Invoke-SparkDeploy `
        -RequestedAction $Action `
        -TargetProjectId $ProjectId `
        -LoginProvider $Provider `
        -TargetRegion $Region `
        -TargetImageTag $ImageTag `
        -TerraformVarFile $VarFile `
        -TerraformPlanFile $PlanFile `
        -SkipConfirmation:$Yes
    }
    'clean' {
      Invoke-Npm @('run', 'clean')
    }
  }
} catch {
  Write-Host ""
  Write-Host "spark.cmd failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Run '.\spark.cmd $Command -Help' for this command's usage." -ForegroundColor Yellow
  exit 1
}
