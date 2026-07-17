# Release and deployment helpers dot-sourced by spark.ps1.
# Keep external writes behind an explicit action and typed confirmation.

function Resolve-SparkAction {
  param(
    [string]$Requested,
    [Parameter(Mandatory = $true)][string]$Default,
    [Parameter(Mandatory = $true)][string[]]$Allowed
  )

  if (-not $Requested) { return $Default }
  $match = $Allowed | Where-Object { $_ -ieq $Requested } | Select-Object -First 1
  if (-not $match) {
    throw "Unknown action '$Requested'. Choose one of: $($Allowed -join ', ')."
  }
  return $match
}

function Invoke-NpxPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Package,
    [string[]]$Arguments = @()
  )
  Invoke-External -Executable 'npx.cmd' -Arguments (@('--yes', $Package) + $Arguments)
}

function Invoke-Eas {
  param([string[]]$Arguments)

  Push-Location (Join-Path $script:Root 'apps\mobile')
  try {
    Invoke-NpxPackage -Package 'eas-cli@latest' -Arguments $Arguments
  } finally {
    Pop-Location
  }
}

function Confirm-SparkExternalChange {
  param(
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$Expected,
    [switch]$SkipConfirmation
  )

  Write-Warning $Description
  if ($SkipConfirmation) {
    Write-Host 'Confirmation skipped because -Yes was supplied.' -ForegroundColor Yellow
    return $true
  }

  $answer = Read-Host "Type '$Expected' to continue"
  if ($answer -cne $Expected) {
    Write-Host 'Operation canceled; no external change was requested.' -ForegroundColor Yellow
    return $false
  }
  return $true
}

function Assert-SparkToken {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Pattern
  )
  if ($Value -notmatch $Pattern) {
    throw "$Name '$Value' contains unsupported characters."
  }
}

function Assert-SparkProjectId {
  param([Parameter(Mandatory = $true)][string]$Value)
  if ($Value -like 'your-*' -or $Value -eq 'YOUR_FIREBASE_PROJECT_ID') {
    throw "Replace the example project ID '$Value' with your real Google Cloud project ID."
  }
  Assert-SparkToken -Value $Value -Name 'Project ID' -Pattern '^[a-z][a-z0-9-]{4,28}[a-z0-9]$'
}

function Get-SparkRegexValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Pattern
  )
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $match = [regex]::Match((Get-Content -LiteralPath $Path -Raw), $Pattern)
  if (-not $match.Success) { return $null }
  return $match.Groups[1].Value
}

function Read-SparkEnvFiles {
  param([string[]]$Paths)

  $values = @{}
  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) { continue }
    foreach ($line in Get-Content -LiteralPath $path) {
      if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
        $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
      }
    }
  }
  return $values
}

function Get-SparkEnvValue {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Values,
    [Parameter(Mandatory = $true)][string]$Name
  )
  $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if ($processValue) { return $processValue }
  if ($Values.ContainsKey($Name)) { return [string]$Values[$Name] }
  return ''
}

function Write-SparkStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [AllowEmptyString()][string]$Value,
    [ValidateSet('Normal', 'Good', 'Warn', 'Bad')][string]$State = 'Normal'
  )
  $color = switch ($State) {
    'Good' { 'Green' }
    'Warn' { 'Yellow' }
    'Bad' { 'Red' }
    default { 'Gray' }
  }
  Write-Host ("{0,-28} {1}" -f ($Label + ':'), $Value) -ForegroundColor $color
}

function Show-SparkReleaseInspection {
  Write-Heading 'Android release inspection'

  $appConfigPath = Join-Path $script:Root 'apps\mobile\app.config.ts'
  $mobilePackagePath = Join-Path $script:Root 'apps\mobile\package.json'
  $easPath = Join-Path $script:Root 'apps\mobile\eas.json'
  $packageName = Get-SparkRegexValue -Path $appConfigPath -Pattern 'const\s+packageName\s*=\s*[''"]([^''"]+)[''"]'
  $appVersion = Get-SparkRegexValue -Path $appConfigPath -Pattern '(?m)^\s*version:\s*[''"]([^''"]+)[''"]'
  $mobilePackage = Get-Content -LiteralPath $mobilePackagePath -Raw | ConvertFrom-Json
  $eas = Get-Content -LiteralPath $easPath -Raw | ConvertFrom-Json

  Write-SparkStatus 'Android package ID' $packageName $(if ($packageName -eq $script:PackageName) { 'Warn' } else { 'Good' })
  Write-SparkStatus 'Public app version' $appVersion 'Good'
  Write-SparkStatus 'Mobile package version' ([string]$mobilePackage.version) $(if ($appVersion -eq [string]$mobilePackage.version) { 'Good' } else { 'Bad' })
  Write-SparkStatus 'EAS production output' ([string]$eas.build.production.android.buildType) 'Good'
  Write-SparkStatus 'EAS version source' ([string]$eas.cli.appVersionSource) 'Good'
  Write-SparkStatus 'Default submit profile' ([string]$eas.submit.internal.android.track) 'Good'

  $gradle = Join-Path $script:Root 'apps\mobile\android\app\build.gradle'
  if (Test-Path -LiteralPath $gradle) {
    $nativeId = Get-SparkRegexValue -Path $gradle -Pattern 'applicationId\s+[''"]([^''"]+)[''"]'
    $nativeVersion = Get-SparkRegexValue -Path $gradle -Pattern 'versionName\s+[''"]([^''"]+)[''"]'
    $nativeCode = Get-SparkRegexValue -Path $gradle -Pattern 'versionCode\s+(\d+)'
    Write-SparkStatus 'Generated native ID' $nativeId $(if ($nativeId -eq $packageName) { 'Good' } else { 'Bad' })
    Write-SparkStatus 'Generated native version' "$nativeVersion ($nativeCode)" $(if ($nativeVersion -eq $appVersion) { 'Good' } else { 'Warn' })
  } else {
    Write-SparkStatus 'Generated native project' 'not present; EAS will prebuild from app.config.ts' 'Normal'
  }

  $privacyFiles = @(
    (Join-Path $script:Root 'docs\privacy-policy.md'),
    (Join-Path $script:Root 'apps\admin\public\privacy.html')
  )
  $placeholderFiles = @($privacyFiles | Where-Object {
      (Get-Content -LiteralPath $_ -Raw).Contains('REPLACE_ME')
    })
  Write-SparkStatus 'Privacy placeholders' $(if ($placeholderFiles.Count) { "$($placeholderFiles.Count) file(s) unresolved" } else { 'resolved' }) $(if ($placeholderFiles.Count) { 'Bad' } else { 'Good' })

  $mobileRoot = Join-Path $script:Root 'apps\mobile'
  $envValues = Read-SparkEnvFiles @(
    (Join-Path $mobileRoot '.env'),
    (Join-Path $mobileRoot '.env.local')
  )
  $easProjectId = Get-SparkEnvValue -Values $envValues -Name 'EXPO_PROJECT_ID'
  $apiUrl = Get-SparkEnvValue -Values $envValues -Name 'EXPO_PUBLIC_SPARK_API_URL'
  $remoteConfig = Get-SparkEnvValue -Values $envValues -Name 'EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED'
  $tipLink = Get-SparkEnvValue -Values $envValues -Name 'EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED'
  Write-SparkStatus 'Local EAS project ID' $(if ($easProjectId) { 'configured (value hidden)' } else { 'not configured locally' }) $(if ($easProjectId) { 'Good' } else { 'Warn' })
  Write-SparkStatus 'Local API URL' $(if ($apiUrl) { 'configured (value hidden)' } else { 'blank / offline' }) $(if ($apiUrl) { 'Warn' } else { 'Good' })
  Write-SparkStatus 'Local remote config' $(if ($remoteConfig -eq 'true') { 'enabled' } else { 'disabled' }) $(if ($remoteConfig -eq 'true') { 'Warn' } else { 'Good' })
  Write-SparkStatus 'Local creator tip' $(if ($tipLink -eq 'true') { 'enabled' } else { 'disabled' }) $(if ($tipLink -eq 'true') { 'Warn' } else { 'Good' })
  Write-Host 'Local .env values are ignored by Git; verify the separate EAS build environment before building.' -ForegroundColor DarkGray

  $branch = [string](& git branch --show-current 2>$null)
  $dirty = @(& git status --porcelain 2>$null)
  Write-SparkStatus 'Git branch' $branch 'Normal'
  Write-SparkStatus 'Working tree' $(if ($dirty.Count) { "$($dirty.Count) changed path(s)" } else { 'clean' }) $(if ($dirty.Count) { 'Warn' } else { 'Good' })
  if ($packageName -eq 'com.sparkhabits.app') {
    Write-Warning 'Confirm that com.sparkhabits.app is your intentional permanent Play package ID before uploading.'
  }
}

function Resolve-SparkTerraformPath {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [switch]$MustExist
  )

  $base = [IO.Path]::GetFullPath((Join-Path $script:Root 'infra\terraform'))
  $candidate = if ([IO.Path]::IsPathRooted($Value)) {
    [IO.Path]::GetFullPath($Value)
  } else {
    [IO.Path]::GetFullPath((Join-Path $base $Value))
  }
  $prefix = $base.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  if ($candidate -ne $base -and -not $candidate.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Terraform files must stay inside $base."
  }
  if ($MustExist -and -not (Test-Path -LiteralPath $candidate)) {
    throw "Terraform file not found: $candidate. Copy terraform.tfvars.example first if this is the variable file."
  }
  return $candidate
}

function Get-SparkHclValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $pattern = "(?m)^\s*$([regex]::Escape($Name))\s*=\s*([^#\r\n]+)"
  $value = Get-SparkRegexValue -Path $Path -Pattern $pattern
  if ($null -eq $value) { return $null }
  return $value.Trim().Trim('"').Trim("'")
}

function Assert-SparkCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InstallHint
  )
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { throw "$Name was not found. $InstallHint" }
  return $command.Source
}

function Show-SparkDeploymentStatus {
  param([string]$TerraformVarFile = 'terraform.tfvars')

  Write-Heading 'Deployment status (read-only)'

  foreach ($tool in @('gcloud.cmd', 'terraform', 'npx.cmd')) {
    $found = Get-Command $tool -ErrorAction SilentlyContinue
    Write-SparkStatus $tool $(if ($found) { $found.Source } else { 'not installed/found' }) $(if ($found) { 'Good' } else { 'Warn' })
  }

  $varPath = Resolve-SparkTerraformPath -Value $TerraformVarFile
  if (-not (Test-Path -LiteralPath $varPath)) {
    Write-SparkStatus 'Terraform variables' 'not created; no Spark cloud deployment configured' 'Good'
  } else {
    $project = Get-SparkHclValue -Path $varPath -Name 'project_id'
    Write-SparkStatus 'Terraform project' $project $(if ($project -and $project -notlike 'your-*') { 'Good' } else { 'Bad' })
    foreach ($flag in @(
        'enable_cloud_runtime',
        'enable_google_play_rtdn',
        'enable_maintenance_job',
        'enable_synthetic_monitoring'
      )) {
      $value = Get-SparkHclValue -Path $varPath -Name $flag
      Write-SparkStatus $flag $(if ($value) { $value } else { 'default false' }) $(if ($value -eq 'true') { 'Warn' } else { 'Good' })
    }
    $image = Get-SparkHclValue -Path $varPath -Name 'container_image'
    Write-SparkStatus 'container_image' $(if ($image) { 'configured (value hidden)' } else { 'blank' }) $(if ($image) { 'Warn' } else { 'Good' })
  }

  Write-SparkStatus 'Admin local config' $(if (Test-Path (Join-Path $script:Root 'apps\admin\.env.local')) { 'present' } else { 'not configured' }) 'Normal'
  Write-SparkStatus 'Mobile local cloud config' $(if (Test-Path (Join-Path $script:Root 'apps\mobile\.env.local')) { 'present' } else { 'not configured / offline' }) 'Normal'
  Write-Host 'Status never contacts Google/Firebase and never changes infrastructure.' -ForegroundColor DarkGray
  Write-Host 'Review docs/08-cost-controls.md before enabling any flag shown above.' -ForegroundColor DarkGray
}

function Invoke-SparkRelease {
  param(
    [string]$RequestedAction,
    [string]$BuildProfile,
    [string]$SubmitTrack,
    [string]$ExactBuildId,
    [string]$DownloadDirectory,
    [string]$BuildMessage,
    [int]$ListLimit,
    [string]$TargetDevice,
    [switch]$QueueOnly,
    [switch]$ResetBuildCache,
    [switch]$SkipConfirmation
  )

  $action = Resolve-SparkAction -Requested $RequestedAction -Default 'Check' -Allowed @(
    'Inspect', 'Check', 'Verify', 'Assets', 'Native', 'Setup', 'Project', 'Credentials', 'Build', 'List', 'Download', 'Submit'
  )

  switch ($action) {
    'Inspect' { Show-SparkReleaseInspection }
    'Check' { Invoke-Npm @('run', 'release:check') }
    'Verify' {
      Initialize-AndroidEnvironment | Out-Null
      Invoke-Npm @('run', 'doctor')
      Invoke-Npm @('run', 'typecheck')
      Invoke-Npm @('run', 'test:ci')
      Invoke-Npm @('run', 'test:coverage')
      Invoke-Npm @('run', 'build')
      Invoke-Npm @('run', 'release:check')
    }
    'Assets' {
      $assetScript = Join-Path $script:Root 'scripts\prepare-play-store-assets.ps1'
      Write-Host 'Generating and validating the tracked Google Play graphics. This is local-only and has no service cost.' -ForegroundColor Cyan
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $assetScript
      if ($LASTEXITCODE -ne 0) {
        throw "Play Store asset preparation failed with exit code $LASTEXITCODE."
      }
    }
    'Native' {
      $environment = Initialize-AndroidEnvironment
      if (-not $environment.JavaHome -or -not $environment.AndroidHome) {
        throw 'Android Java/SDK is incomplete. Run ".\spark.cmd setup-android -Persist".'
      }
      $arguments = @('--variant', 'release')
      if ($TargetDevice) {
        $arguments += @('--device', (Resolve-ExpoDeviceName $TargetDevice))
      } else {
        Write-Host 'Choose the phone or emulator for the release-like install.' -ForegroundColor Cyan
        $arguments += '--device'
      }
      Write-Warning 'This installs a local release-like APK for device testing. It is not the signed AAB uploaded to Google Play.'
      Invoke-MobileCommand -Mode 'android' -Arguments $arguments
    }
    'Setup' {
      Invoke-Eas @('login')
      Invoke-Eas @('init')
      Invoke-Eas @('project:info')
    }
    'Project' {
      Invoke-Eas @('whoami')
      Invoke-Eas @('project:info')
    }
    'Credentials' {
      Write-Warning 'EAS will open its interactive Android credentials manager. Review every prompt carefully; do not place downloaded keystores or passwords in this repository.'
      Invoke-Eas @('credentials', '--platform', 'android')
    }
    'Build' {
      Show-SparkReleaseInspection
      if ($BuildProfile -eq 'production') {
        Invoke-Npm @('run', 'release:check')
      } else {
        Write-Host "Running the mobile type check. Privacy/store placeholders are enforced only for a production build." -ForegroundColor DarkGray
        Invoke-Npm @('run', 'typecheck', '--workspace', '@spark/mobile')
      }
      if (-not (Confirm-SparkExternalChange `
          -Description "This queues an EAS Android '$BuildProfile' build. Hosted build quota or charges may apply." `
          -Expected "BUILD $BuildProfile" `
          -SkipConfirmation:$SkipConfirmation)) { return }
      $arguments = @('build', '--platform', 'android', '--profile', $BuildProfile)
      if ($BuildMessage) { $arguments += @('--message', $BuildMessage) }
      if ($QueueOnly) { $arguments += '--no-wait' }
      if ($ResetBuildCache) { $arguments += '--clear-cache' }
      Invoke-Eas $arguments
    }
    'List' {
      Invoke-Eas @(
        'build:list', '--platform', 'android', '--build-profile', $BuildProfile,
        '--limit', [string]$ListLimit
      )
    }
    'Download' {
      if (-not $ExactBuildId) {
        throw "Download requires -BuildId. Run '.\spark.cmd release -Action List' first."
      }
      Assert-SparkToken -Value $ExactBuildId -Name 'EAS build ID' -Pattern '^[A-Za-z0-9-]+$'
      $destination = if ([IO.Path]::IsPathRooted($DownloadDirectory)) {
        [IO.Path]::GetFullPath($DownloadDirectory)
      } else {
        [IO.Path]::GetFullPath((Join-Path $script:Root $DownloadDirectory))
      }
      [void][IO.Directory]::CreateDirectory($destination)
      Write-Host "Downloading build $ExactBuildId into $destination" -ForegroundColor Cyan
      Push-Location $destination
      try {
        Invoke-NpxPackage -Package 'eas-cli@latest' -Arguments @(
          'build:download', '--build-id', $ExactBuildId
        )
      } finally {
        Pop-Location
      }
    }
    'Submit' {
      if (-not $ExactBuildId) {
        throw "Submit requires an exact -BuildId. Run '.\spark.cmd release -Action List' first."
      }
      Assert-SparkToken -Value $ExactBuildId -Name 'EAS build ID' -Pattern '^[A-Za-z0-9-]+$'
      Invoke-Npm @('run', 'release:check')
      $description = "This sends EAS build $ExactBuildId to the Google Play '$SubmitTrack' track. The first Play upload must still be performed manually, and EAS Submit requires a least-privilege Google service-account key."
      if ($SubmitTrack -eq 'production') {
        $description += ' PRODUCTION can make an approved release public.'
      }
      if (-not (Confirm-SparkExternalChange `
          -Description $description `
          -Expected "SUBMIT $SubmitTrack $ExactBuildId" `
          -SkipConfirmation:$SkipConfirmation)) { return }
      $arguments = @(
        'submit', '--platform', 'android', '--profile', $SubmitTrack,
        '--id', $ExactBuildId
      )
      if ($QueueOnly) { $arguments += '--no-wait' }
      Invoke-Eas $arguments
    }
  }
}

function Invoke-SparkDeploy {
  param(
    [string]$RequestedAction,
    [string]$TargetProjectId,
    [string]$LoginProvider,
    [string]$TargetRegion,
    [string]$TargetImageTag,
    [string]$TerraformVarFile,
    [string]$TerraformPlanFile,
    [switch]$SkipConfirmation
  )

  $action = Resolve-SparkAction -Requested $RequestedAction -Default 'Status' -Allowed @(
    'Status', 'Login', 'Hosting', 'Firebase', 'Image', 'Plan', 'Apply', 'Outputs'
  )
  if ($action -eq 'Status') {
    Show-SparkDeploymentStatus -TerraformVarFile $TerraformVarFile
    return
  }

  if ($action -eq 'Login') {
    if ($LoginProvider -eq 'Firebase') {
      Invoke-NpxPackage -Package 'firebase-tools' -Arguments @('login')
    } else {
      $gcloud = Assert-SparkCommand -Name 'gcloud.cmd' -InstallHint 'Install the Google Cloud CLI.'
      Invoke-External -Executable $gcloud -Arguments @('auth', 'login')
      Invoke-External -Executable $gcloud -Arguments @('auth', 'application-default', 'login')
      if ($TargetProjectId) {
        Assert-SparkProjectId $TargetProjectId
        Invoke-External -Executable $gcloud -Arguments @('config', 'set', 'project', $TargetProjectId)
      }
    }
    return
  }

  if ($action -in @('Hosting', 'Firebase', 'Image')) {
    if (-not $TargetProjectId) { throw "$action requires -ProjectId <your-real-project-id>." }
    Assert-SparkProjectId $TargetProjectId
  }

  switch ($action) {
    'Hosting' {
      Invoke-Npm @('run', 'release:check')
      Invoke-Npm @('run', 'build', '--workspace', '@spark/admin')
      if (-not (Confirm-SparkExternalChange `
          -Description "This deploys the static admin shell and public privacy page to Firebase Hosting project '$TargetProjectId'. Hosting quota/overage pricing applies." `
          -Expected "DEPLOY HOSTING $TargetProjectId" `
          -SkipConfirmation:$SkipConfirmation)) { return }
      Invoke-NpxPackage -Package 'firebase-tools' -Arguments @(
        'deploy', '--only', 'hosting', '--project', $TargetProjectId
      )
    }
    'Firebase' {
      Invoke-Npm @('run', 'release:check')
      Invoke-Npm @('run', 'build', '--workspace', '@spark/admin')
      if (-not (Confirm-SparkExternalChange `
          -Description "This deploys Hosting, Firestore rules, and Firestore indexes to Firebase project '$TargetProjectId'. External state and usage charges are possible." `
          -Expected "DEPLOY FIREBASE $TargetProjectId" `
          -SkipConfirmation:$SkipConfirmation)) { return }
      Invoke-NpxPackage -Package 'firebase-tools' -Arguments @(
        'deploy', '--only', 'hosting,firestore:rules,firestore:indexes',
        '--project', $TargetProjectId
      )
    }
    'Image' {
      Assert-SparkToken -Value $TargetRegion -Name 'Region' -Pattern '^[a-z0-9-]+$'
      $gcloud = Assert-SparkCommand -Name 'gcloud.cmd' -InstallHint 'Install the Google Cloud CLI.'
      $mobilePackage = Get-Content (Join-Path $script:Root 'apps\mobile\package.json') -Raw | ConvertFrom-Json
      $tag = if ($TargetImageTag) { $TargetImageTag } else { [string]$mobilePackage.version }
      Assert-SparkToken -Value $tag -Name 'Image tag' -Pattern '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'
      $image = "$TargetRegion-docker.pkg.dev/$TargetProjectId/spark/control-plane:$tag"
      Invoke-Npm @('run', 'build:packages')
      Invoke-Npm @('run', 'test:ci', '--workspace', '@spark/control-plane')
      Invoke-Npm @('run', 'build', '--workspace', '@spark/control-plane')
      if (-not (Confirm-SparkExternalChange `
          -Description "This runs Google Cloud Build and pushes $image. Cloud Build and Artifact Registry pricing can apply." `
          -Expected "BUILD IMAGE $TargetProjectId" `
          -SkipConfirmation:$SkipConfirmation)) { return }
      Invoke-External -Executable $gcloud -Arguments @(
        'builds', 'submit', '--project', $TargetProjectId,
        '--config', 'cloudbuild.yaml', '--substitutions', "_IMAGE=$image", '.'
      )
      Write-Host "Image published. Set container_image = `"$image`" in your Terraform variable file, then create a new plan." -ForegroundColor Green
    }
    'Plan' {
      $terraform = Assert-SparkCommand -Name 'terraform' -InstallHint 'Install Terraform, then reopen PowerShell.'
      $varPath = Resolve-SparkTerraformPath -Value $TerraformVarFile -MustExist
      $planPath = Resolve-SparkTerraformPath -Value $TerraformPlanFile
      $project = Get-SparkHclValue -Path $varPath -Name 'project_id'
      if (-not $project) { throw "project_id is missing from $varPath." }
      Assert-SparkProjectId $project
      Show-SparkDeploymentStatus -TerraformVarFile $TerraformVarFile
      Push-Location (Join-Path $script:Root 'infra\terraform')
      try {
        Invoke-External -Executable $terraform -Arguments @('init')
        Invoke-External -Executable $terraform -Arguments @('fmt', '-check')
        Invoke-External -Executable $terraform -Arguments @('validate')
        Invoke-External -Executable $terraform -Arguments @(
          'plan', "-var-file=$varPath", "-out=$planPath"
        )
        Invoke-External -Executable $terraform -Arguments @('show', $planPath)
      } finally {
        Pop-Location
      }
      Write-Host "Saved plan: $planPath" -ForegroundColor Green
      Write-Warning 'Saved Terraform plans can contain sensitive values. This path is ignored by Git.'
      Write-Host "Review it carefully, then run: .\spark.cmd deploy -Action Apply -PlanFile '$TerraformPlanFile'" -ForegroundColor Cyan
    }
    'Apply' {
      $terraform = Assert-SparkCommand -Name 'terraform' -InstallHint 'Install Terraform, then reopen PowerShell.'
      $varPath = Resolve-SparkTerraformPath -Value $TerraformVarFile -MustExist
      $planPath = Resolve-SparkTerraformPath -Value $TerraformPlanFile -MustExist
      $project = Get-SparkHclValue -Path $varPath -Name 'project_id'
      if (-not $project) { throw "project_id is missing from $varPath." }
      Assert-SparkProjectId $project
      if ($TargetProjectId -and $TargetProjectId -ne $project) {
        throw "-ProjectId '$TargetProjectId' does not match terraform project_id '$project'."
      }
      $planInfo = Get-Item -LiteralPath $planPath
      $newerInputs = @(Get-ChildItem (Join-Path $script:Root 'infra\terraform') -Filter '*.tf' |
          Where-Object { $_.LastWriteTimeUtc -gt $planInfo.LastWriteTimeUtc })
      if ((Get-Item -LiteralPath $varPath).LastWriteTimeUtc -gt $planInfo.LastWriteTimeUtc) {
        $newerInputs += Get-Item -LiteralPath $varPath
      }
      if ($newerInputs.Count) {
        throw 'Terraform inputs changed after the saved plan. Run deploy -Action Plan again.'
      }
      Push-Location (Join-Path $script:Root 'infra\terraform')
      try {
        Invoke-External -Executable $terraform -Arguments @('show', $planPath)
        if (-not (Confirm-SparkExternalChange `
            -Description "This applies the exact saved Terraform plan to project '$project'. It may create, change, destroy, or charge for cloud resources." `
            -Expected "APPLY $project" `
            -SkipConfirmation:$SkipConfirmation)) { return }
        Invoke-External -Executable $terraform -Arguments @('apply', $planPath)
      } finally {
        Pop-Location
      }
    }
    'Outputs' {
      $terraform = Assert-SparkCommand -Name 'terraform' -InstallHint 'Install Terraform, then reopen PowerShell.'
      Push-Location (Join-Path $script:Root 'infra\terraform')
      try {
        Invoke-External -Executable $terraform -Arguments @('output')
      } finally {
        Pop-Location
      }
    }
  }
}
