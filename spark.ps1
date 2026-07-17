<#
.SYNOPSIS
Runs common Spark development, testing, Android, and local-service tasks.

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
    'clean'
  )]
  [string]$Command = 'help',

  [ValidateSet('DevClient', 'ExpoGo', 'Web')]
  [string]$Target = 'DevClient',

  [ValidateSet('All', 'Mobile', 'Domain', 'Api', 'Admin', 'Packages')]
  [string]$Scope = 'All',

  [ValidateSet('Quick', 'Full', 'Release')]
  [string]$Level = 'Quick',

  [string]$Topic,
  [string]$Device,
  [string]$Avd,
  [int]$Port = 0,
  [switch]$Clear,
  [switch]$Offline,
  [switch]$Coverage,
  [switch]$Persist,
  [switch]$Select,
  [switch]$List,
  [switch]$Yes,
  [switch]$Help
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$script:Root = $PSScriptRoot
$script:PackageName = 'com.sparkhabits.app'

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
  client, installs it, and starts Spark.

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
  Checks required release files and reports unresolved manual/legal gates.
  For the complete automated sequence, use check -Level Release.

  Example:
    .\spark.cmd release
'@ | Write-Host
    }
    'clean' {
      @'
clean
  Removes generated build and coverage directories managed by Spark.

  Example:
    .\spark.cmd clean
'@ | Write-Host
    }
    default {
      Write-Heading 'Spark command helper'
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
  release        Run release placeholder/file checks
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
      $arguments = @('run', 'start', '--')
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
      Invoke-Npm $arguments
    }
    'android' {
      $environment = Initialize-AndroidEnvironment
      if (-not $environment.JavaHome -or -not $environment.AndroidHome) {
        throw 'Android Java/SDK is incomplete. Run ".\spark.cmd setup-android -Persist".'
      }
      $arguments = @('run', 'android', '--')
      if ($Select -and $Device) {
        throw 'Use either -Select or -Device, not both.'
      }
      if ($Select) {
        $arguments += '--device'
      } elseif ($Device) {
        $arguments += @('--device', (Resolve-ExpoDeviceName $Device))
      }
      Invoke-Npm $arguments
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
      Invoke-Npm @('run', 'release:check')
    }
    'clean' {
      Invoke-Npm @('run', 'clean')
    }
  }
} catch {
  Write-Host ""
  Write-Host "Spark command failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Run '.\spark.cmd $Command -Help' for this command's usage." -ForegroundColor Yellow
  exit 1
}
