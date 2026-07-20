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
    Write-Host 'Operation canceled; no change was made.' -ForegroundColor Yellow
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

  Write-SparkStatus 'Android package ID' $packageName $(if ($packageName -eq $script:PackageName) { 'Good' } else { 'Bad' })
  Write-SparkStatus 'Public app version' $appVersion 'Good'
  Write-SparkStatus 'Mobile package version' ([string]$mobilePackage.version) $(if ($appVersion -eq [string]$mobilePackage.version) { 'Good' } else { 'Bad' })
  Write-SparkStatus 'Local Play output' 'signed Android App Bundle (.aab)' 'Good'
  Write-SparkStatus 'Optional EAS output' ([string]$eas.build.production.android.buildType) 'Normal'
  Write-SparkStatus 'Optional EAS submit track' ([string]$eas.submit.internal.android.track) 'Normal'

  $gradle = Join-Path $script:Root 'apps\mobile\android\app\build.gradle'
  if (Test-Path -LiteralPath $gradle) {
    $nativeId = Get-SparkRegexValue -Path $gradle -Pattern 'applicationId\s+[''"]([^''"]+)[''"]'
    $nativeVersion = Get-SparkRegexValue -Path $gradle -Pattern 'versionName\s+[''"]([^''"]+)[''"]'
    $nativeCode = Get-SparkRegexValue -Path $gradle -Pattern 'versionCode\s+(\d+)'
    Write-SparkStatus 'Generated native ID' $nativeId $(if ($nativeId -eq $packageName) { 'Good' } else { 'Bad' })
    Write-SparkStatus 'Generated native version' "$nativeVersion ($nativeCode)" $(if ($nativeVersion -eq $appVersion) { 'Good' } else { 'Warn' })
  } else {
    Write-SparkStatus 'Generated native project' 'not present; LocalBuild will generate it from app.config.ts' 'Normal'
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
  Write-SparkStatus 'Optional EAS project ID' $(if ($easProjectId) { 'configured (value hidden)' } else { 'not configured locally' }) 'Normal'
  Write-SparkStatus 'Local API URL' $(if ($apiUrl) { 'configured (value hidden)' } else { 'blank / offline' }) $(if ($apiUrl) { 'Warn' } else { 'Good' })
  Write-SparkStatus 'Local remote config' $(if ($remoteConfig -eq 'true') { 'enabled' } else { 'disabled' }) $(if ($remoteConfig -eq 'true') { 'Warn' } else { 'Good' })
  Write-SparkStatus 'Local creator tip' $(if ($tipLink -eq 'true') { 'enabled' } else { 'disabled' }) $(if ($tipLink -eq 'true') { 'Warn' } else { 'Good' })
  $easBuildsAllowed = [Environment]::GetEnvironmentVariable('SPARK_ALLOW_EAS_RELEASES', 'Process') -eq 'true'
  Write-SparkStatus 'Optional EAS releases' $(if ($easBuildsAllowed) { 'enabled for this PowerShell process' } else { 'blocked by default' }) $(if ($easBuildsAllowed) { 'Warn' } else { 'Good' })
  Write-Host 'Local .env values are ignored by Git. LocalBuild uses these local values; optional hosted EAS builds use a separate environment.' -ForegroundColor DarkGray

  $branch = [string](& git branch --show-current 2>$null)
  $dirty = @(& git status --porcelain 2>$null)
  Write-SparkStatus 'Git branch' $branch 'Normal'
  Write-SparkStatus 'Working tree' $(if ($dirty.Count) { "$($dirty.Count) changed path(s)" } else { 'clean' }) $(if ($dirty.Count) { 'Warn' } else { 'Good' })
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

function Get-SparkLocalSigningInfo {
  $mobileRoot = Join-Path $script:Root 'apps\mobile'
  [pscustomobject]@{
    Alias = 'spark-upload'
    Keystore = Join-Path $mobileRoot 'credentials\spark-upload.p12'
    CredentialsDirectory = Join-Path $mobileRoot 'credentials'
    NativeGradle = Join-Path $mobileRoot 'android\app\build.gradle'
    GeneratedBundle = Join-Path $mobileRoot 'android\app\build\outputs\bundle\release\app-release.aab'
    BundleMetadata = Join-Path $mobileRoot 'android\app\build\intermediates\bundle_ide_model\release\produceReleaseBundleIdeListingFile\output-metadata.json'
    ManifestMetadata = Join-Path $mobileRoot 'android\app\build\intermediates\packaged_manifests\release\processReleaseManifestForPackage\output-metadata.json'
  }
}

function Get-SparkPublisherInfo {
  $credentialsDirectory = Join-Path $script:Root 'apps\mobile\credentials'
  [pscustomobject]@{
    PublisherConfig = Join-Path $script:Root 'store\android\publisher-config.json'
    ReleaseNotes = Join-Path $script:Root 'store\android\release-notes\current.json'
    PublisherScript = Join-Path $script:Root 'scripts\google-play-publisher.mjs'
    CredentialsDirectory = $credentialsDirectory
    DefaultSecrets = Join-Path $credentialsDirectory 'local-release.secrets.json'
    ExampleSecrets = Join-Path $credentialsDirectory 'local-release.secrets.example.json'
    DefaultServiceAccountKey = Join-Path $credentialsDirectory 'google-play-publisher.json'
  }
}

function Get-SparkJsonProperty {
  param(
    [AllowNull()][object]$Object,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Read-SparkJson {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if (-not (Test-Path -LiteralPath $Path)) { throw "$Label does not exist: $Path" }
  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    throw "$Label is not valid JSON: $Path. $($_.Exception.Message)"
  }
}

function Resolve-SparkPathFromFile {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$ContainingFile
  )
  if ([IO.Path]::IsPathRooted($Value)) { return [IO.Path]::GetFullPath($Value) }
  return [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $ContainingFile) $Value))
}

function Assert-SparkPrivatePathIgnored {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $fullPath = [IO.Path]::GetFullPath($Path)
  $rootPath = [IO.Path]::GetFullPath($script:Root).TrimEnd('\') + '\'
  if (-not $fullPath.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase)) { return }
  $relative = $fullPath.Substring($rootPath.Length).Replace('\', '/')
  & git.exe -C $script:Root check-ignore --quiet -- $relative 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "$Label is inside the repository but is not ignored by Git: $fullPath"
  }
}

function Get-SparkServiceAccountInfo {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Google Play service-account JSON does not exist: $Path"
  }
  Assert-SparkPrivatePathIgnored -Path $Path -Label 'Google Play service-account JSON'
  $credential = Read-SparkJson -Path $Path -Label 'Google Play service-account JSON'
  $credentialType = [string](Get-SparkJsonProperty -Object $credential -Name 'type')
  $email = [string](Get-SparkJsonProperty -Object $credential -Name 'client_email')
  $privateKey = [string](Get-SparkJsonProperty -Object $credential -Name 'private_key')
  $tokenUri = [string](Get-SparkJsonProperty -Object $credential -Name 'token_uri')
  if (
    $credentialType -ne 'service_account' -or
    $email -notmatch '^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$' -or
    $privateKey -notmatch 'BEGIN PRIVATE KEY'
  ) {
    throw 'The Google Play credential must be a service-account JSON key with client_email and private_key.'
  }
  if ($tokenUri -and $tokenUri -ne 'https://oauth2.googleapis.com/token') {
    throw "Refusing unexpected service-account token URI: $tokenUri"
  }
  $privateKey = $null
  $credential = $null
  return [pscustomobject]@{
    Path = [IO.Path]::GetFullPath($Path)
    Email = $email
  }
}

function Get-SparkReleaseSecrets {
  param(
    [string]$SecretsFile,
    [switch]$RequireUploadPassword,
    [switch]$RequireGooglePlay
  )
  $publisher = Get-SparkPublisherInfo
  $explicitFile = [bool]$SecretsFile
  $resolvedSecrets = if ($SecretsFile) {
    if ([IO.Path]::IsPathRooted($SecretsFile)) {
      [IO.Path]::GetFullPath($SecretsFile)
    } else {
      [IO.Path]::GetFullPath((Join-Path $script:Root $SecretsFile))
    }
  } else {
    $publisher.DefaultSecrets
  }
  $config = $null
  if (Test-Path -LiteralPath $resolvedSecrets) {
    Assert-SparkPrivatePathIgnored -Path $resolvedSecrets -Label 'Local release secrets file'
    $config = Read-SparkJson -Path $resolvedSecrets -Label 'Local release secrets file'
  } elseif ($explicitFile) {
    throw "The requested secrets file does not exist: $resolvedSecrets"
  }

  $password = $null
  $passwordSource = 'not-required'
  if ($RequireUploadPassword) {
    $configuredPassword = [string](Get-SparkJsonProperty -Object $config -Name 'uploadKeyPassword')
    if ($configuredPassword -and $configuredPassword -notlike 'PASTE_*') {
      if ($configuredPassword.Length -lt 20) {
        throw 'uploadKeyPassword in the local secrets file must contain at least 20 characters.'
      }
      $password = $configuredPassword
      $passwordSource = 'ignored-config-file'
    } else {
      $password = Read-SparkSigningPassword
      $passwordSource = 'hidden-console-prompt'
    }
  }

  $serviceAccount = $null
  $serviceAccountSource = 'not-required'
  if ($RequireGooglePlay) {
    $configuredKey = [string](Get-SparkJsonProperty -Object $config -Name 'googlePlayServiceAccountKeyFile')
    $keyPath = $null
    if ($configuredKey) {
      $keyPath = Resolve-SparkPathFromFile -Value $configuredKey -ContainingFile $resolvedSecrets
      $serviceAccountSource = 'ignored-config-file'
    } elseif (Test-Path -LiteralPath $publisher.DefaultServiceAccountKey) {
      $keyPath = $publisher.DefaultServiceAccountKey
      $serviceAccountSource = 'default-ignored-key-file'
    } else {
      $enteredPath = Read-Host 'Path to the Google Play service-account JSON key'
      if (-not $enteredPath) {
        throw 'A Google Play service-account JSON key is required. Run PlaySetup or provide -SecretsFile.'
      }
      $keyPath = if ([IO.Path]::IsPathRooted($enteredPath)) {
        [IO.Path]::GetFullPath($enteredPath)
      } else {
        [IO.Path]::GetFullPath((Join-Path $script:Root $enteredPath))
      }
      $serviceAccountSource = 'console-path-prompt'
    }
    $serviceAccount = Get-SparkServiceAccountInfo -Path $keyPath
  }

  return [pscustomobject]@{
    SecretsFile = $(if (Test-Path -LiteralPath $resolvedSecrets) { $resolvedSecrets } else { $null })
    UploadKeyPassword = $password
    UploadKeyPasswordSource = $passwordSource
    ServiceAccountKeyFile = $(if ($serviceAccount) { $serviceAccount.Path } else { $null })
    ServiceAccountEmail = $(if ($serviceAccount) { $serviceAccount.Email } else { $null })
    ServiceAccountSource = $serviceAccountSource
  }
}

function Get-SparkGitMetadata {
  $commit = [string](& git.exe -C $script:Root rev-parse HEAD 2>$null)
  $branch = [string](& git.exe -C $script:Root branch --show-current 2>$null)
  $changes = @(& git.exe -C $script:Root status --porcelain 2>$null)
  return [ordered]@{
    commit = $commit.Trim()
    branch = $branch.Trim()
    dirty = ($changes.Count -gt 0)
  }
}

function Write-SparkOperationRecord {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Record,
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
  )
  $destination = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
    [IO.Path]::GetFullPath($OutputDirectory)
  } else {
    [IO.Path]::GetFullPath((Join-Path $script:Root $OutputDirectory))
  }
  $historyDirectory = Join-Path $destination 'history'
  [void][IO.Directory]::CreateDirectory($historyDirectory)
  $operationId = [string]$Record['operationId']
  if (-not $operationId) {
    $operationId = "{0}-{1}-{2}" -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ'), $Kind, ([Guid]::NewGuid().ToString('N').Substring(0, 8))
    $Record['operationId'] = $operationId
  }
  $historyPath = Join-Path $historyDirectory "$operationId.json"
  $latestPath = Join-Path $destination "latest-$Kind.json"
  $Record['outputJson'] = [ordered]@{
    history = $historyPath
    latest = $latestPath
  }
  if (-not $Record.Contains('git')) { $Record['git'] = Get-SparkGitMetadata }
  $json = $Record | ConvertTo-Json -Depth 20
  [IO.File]::WriteAllText($historyPath, "$json`r`n", [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($latestPath, "$json`r`n", [Text.UTF8Encoding]::new($false))
  Write-Host "  JSON:    $historyPath" -ForegroundColor Green
  Write-Host "  Latest:  $latestPath" -ForegroundColor DarkGray
  return [pscustomobject]@{ History = $historyPath; Latest = $latestPath }
}

function Set-SparkAndroidVersionCode {
  param([Parameter(Mandatory = $true)][int]$VersionCode)
  if ($VersionCode -lt 1) { throw 'Android version code must be positive.' }
  $path = Join-Path $script:Root 'apps\mobile\app.config.ts'
  $content = Get-Content -LiteralPath $path -Raw
  $pattern = '(?m)^(\s*versionCode:\s*)\d+(,\s*)$'
  $matches = [regex]::Matches($content, $pattern)
  if ($matches.Count -ne 1) {
    throw "Expected exactly one Android versionCode in $path; found $($matches.Count)."
  }
  $updated = [regex]::Replace($content, $pattern, "`${1}$VersionCode`${2}")
  [IO.File]::WriteAllText($path, $updated, [Text.UTF8Encoding]::new($false))
  Write-Host "Android versionCode updated to $VersionCode in apps/mobile/app.config.ts." -ForegroundColor Green
}

function Get-SparkPublisherConfig {
  $publisher = Get-SparkPublisherInfo
  return Read-SparkJson -Path $publisher.PublisherConfig -Label 'Google Play publisher configuration'
}

function Show-SparkLocalSigningStatus {
  $signing = Get-SparkLocalSigningInfo
  $publisher = Get-SparkPublisherInfo
  Write-Heading 'Local Google Play signing status'
  $hasKeystore = Test-Path -LiteralPath $signing.Keystore
  Write-SparkStatus 'Private upload keystore' $(if ($hasKeystore) { $signing.Keystore } else { 'not created' }) $(if ($hasKeystore) { 'Good' } else { 'Warn' })
  Write-SparkStatus 'Upload-key alias' $signing.Alias 'Good'
  $hasSecretConfig = Test-Path -LiteralPath $publisher.DefaultSecrets
  $hasPublisherKey = Test-Path -LiteralPath $publisher.DefaultServiceAccountKey
  Write-SparkStatus 'Password source' $(if ($hasSecretConfig) { 'ignored local config or hidden prompt' } else { 'hidden prompt (ignored config is optional)' }) 'Good'
  Write-SparkStatus 'Local secret config' $(if ($hasSecretConfig) { $publisher.DefaultSecrets } else { 'not present; prompts will be used' }) 'Normal'
  Write-SparkStatus 'Play publisher key' $(if ($hasPublisherKey) { $publisher.DefaultServiceAccountKey } else { 'not present; run PlaySetup when ready' }) $(if ($hasPublisherKey) { 'Good' } else { 'Normal' })
  if ($hasKeystore) {
    $hash = (Get-FileHash -LiteralPath $signing.Keystore -Algorithm SHA256).Hash
    Write-SparkStatus 'Keystore SHA-256' $hash 'Good'
  }
  $nativeReady = (Test-Path -LiteralPath $signing.NativeGradle) -and
    (Get-Content -LiteralPath $signing.NativeGradle -Raw).Contains('// Spark application local production signing')
  Write-SparkStatus 'Generated signing guard' $(if ($nativeReady) { 'present' } else { 'not generated yet; LocalBuild runs Expo prebuild' }) $(if ($nativeReady) { 'Good' } else { 'Normal' })
  Write-SparkStatus 'EAS hosted build required' 'no' 'Good'
  Write-Host 'The Spark application is the mobile product. spark.cmd is only this repository''s PowerShell launcher.' -ForegroundColor DarkGray
}

function Read-SparkSigningPassword {
  $secure = Read-Host 'Enter the Spark application upload-key password (hidden)' -AsSecureString
  try {
    if ($secure.Length -lt 20) {
      throw 'The upload-key password must contain at least 20 characters.'
    }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
  } finally {
    $secure.Dispose()
  }
}

function Test-SparkUploadKeystore {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Password
  )

  try {
    $flags = [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet
    $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
      $Path,
      $Password,
      $flags
    )
    try {
      if (-not $certificate.HasPrivateKey) {
        throw 'The selected PKCS#12 file does not contain a private upload key.'
      }
      if ($certificate.Subject -notmatch 'CN=Domantas Judeikis') {
        throw "Unexpected upload certificate owner: $($certificate.Subject)"
      }
      return $certificate.Subject
    } finally {
      $certificate.Dispose()
    }
  } catch {
    throw "Could not unlock the local upload keystore. Check the LastPass password and file backup. $($_.Exception.Message)"
  }
}

function Initialize-SparkLocalSigning {
  param([switch]$SkipConfirmation)

  $environment = Initialize-AndroidEnvironment
  if (-not $environment.JavaHome) {
    throw 'Java is unavailable. Run ".\spark.cmd setup-android -Persist" first.'
  }
  $keytool = Join-Path $environment.JavaHome 'bin\keytool.exe'
  if (-not (Test-Path -LiteralPath $keytool)) {
    throw "keytool.exe was not found under $($environment.JavaHome)."
  }

  $signing = Get-SparkLocalSigningInfo
  if (Test-Path -LiteralPath $signing.Keystore) {
    Show-SparkLocalSigningStatus
    Write-Host 'The private upload key already exists. It was not changed or replaced.' -ForegroundColor Green
    return
  }

  Write-Host 'Before continuing, create a LastPass item with a unique 20+ character password.' -ForegroundColor Cyan
  Write-Host 'keytool will request that password twice without displaying it. Use the same password for both prompts.' -ForegroundColor Cyan
  Write-Warning 'This upload key becomes part of the Spark application release identity. Back up both the .p12 file and password before the first Play upload.'
  if (-not (Confirm-SparkExternalChange `
      -Description 'This creates one private upload key locally. It does not contact EAS, Google Play, Firebase, or Google Cloud.' `
      -Expected 'CREATE LOCAL UPLOAD KEY' `
      -SkipConfirmation:$SkipConfirmation)) { return }

  [void][IO.Directory]::CreateDirectory($signing.CredentialsDirectory)
  Invoke-External -Executable $keytool -Arguments @(
    '-genkeypair', '-v',
    '-keystore', $signing.Keystore,
    '-storetype', 'PKCS12',
    '-alias', $signing.Alias,
    '-keyalg', 'RSA',
    '-keysize', '4096',
    '-sigalg', 'SHA256withRSA',
    '-validity', '10000',
    '-dname', 'CN=Domantas Judeikis, OU=djpokis team, O=Domantas Judeikis, L=Vilnius, C=LT'
  )

  if (-not (Test-Path -LiteralPath $signing.Keystore)) {
    throw 'keytool completed without creating the expected upload keystore.'
  }
  $hash = (Get-FileHash -LiteralPath $signing.Keystore -Algorithm SHA256).Hash
  Write-Host ''
  Write-Host 'Local upload key created. Save these items in LastPass before building:' -ForegroundColor Green
  Write-Host "  File:   $($signing.Keystore)"
  Write-Host "  Alias:  $($signing.Alias)"
  Write-Host "  SHA256: $hash"
  Write-Host '  Password: the value you just entered; spark.cmd did not save it.'
}

function Invoke-SparkLocalReleaseBuildCore {
  param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$UploadPassword,
    [Parameter(Mandatory = $true)][ref]$Result
  )

  $environment = Initialize-AndroidEnvironment
  if (-not $environment.JavaHome -or -not $environment.AndroidHome) {
    throw 'Android Java/SDK tooling is incomplete. Run ".\spark.cmd setup-android -Persist" first.'
  }
  $signing = Get-SparkLocalSigningInfo
  if (-not (Test-Path -LiteralPath $signing.Keystore)) {
    throw 'The local upload key does not exist. Run ".\spark.cmd release -Action LocalSetup" first.'
  }

  Write-Heading 'Local signed Google Play bundle'
  Write-Host 'This builds the Spark application entirely on this PC. It does not contact or consume EAS.' -ForegroundColor Cyan
  Push-Location (Join-Path $script:Root 'apps\mobile')
  try {
    Invoke-External -Executable 'npx.cmd' -Arguments @(
      'expo', 'prebuild', '--platform', 'android', '--no-install'
    )
  } finally {
    Pop-Location
  }
  Invoke-Npm @('run', 'release:check')

  $password = $UploadPassword
  $oldStoreFile = $env:SPARK_UPLOAD_STORE_FILE
  $oldPassword = $env:SPARK_UPLOAD_PASSWORD
  $oldAlias = $env:SPARK_UPLOAD_ALIAS
  $oldNodeEnv = $env:NODE_ENV
  $oldCmakeParallelLevel = $env:CMAKE_BUILD_PARALLEL_LEVEL
  $releaseArchitectures = 'armeabi-v7a,arm64-v8a'
  $releaseBuildWorkers = 2
  try {
    $subject = Test-SparkUploadKeystore -Path $signing.Keystore -Password $password
    Write-Host "Upload certificate unlocked: $subject" -ForegroundColor Green
    $env:SPARK_UPLOAD_STORE_FILE = $signing.Keystore
    $env:SPARK_UPLOAD_PASSWORD = $password
    $env:SPARK_UPLOAD_ALIAS = $signing.Alias
    $env:NODE_ENV = 'production'
    # Google Play phone/tablet releases need the paired 32/64-bit ARM ABIs. Debug builds still
    # retain x86/x86_64 for local emulators. Bounding both Gradle and CMake concurrency prevents
    # Windows from silently terminating memory-heavy React Native C++ compiler processes.
    $env:CMAKE_BUILD_PARALLEL_LEVEL = [string]$releaseBuildWorkers
    Write-Host "Release native targets: $releaseArchitectures; maximum parallel workers: $releaseBuildWorkers." -ForegroundColor Cyan
    Push-Location (Join-Path $script:Root 'apps\mobile\android')
    try {
      Invoke-External -Executable '.\gradlew.bat' -Arguments @(
        '--no-daemon',
        "--max-workers=$releaseBuildWorkers",
        "-PreactNativeArchitectures=$releaseArchitectures",
        ':app:bundleRelease'
      )
    } finally {
      Pop-Location
    }
  } finally {
    $env:SPARK_UPLOAD_STORE_FILE = $oldStoreFile
    $env:SPARK_UPLOAD_PASSWORD = $oldPassword
    $env:SPARK_UPLOAD_ALIAS = $oldAlias
    $env:NODE_ENV = $oldNodeEnv
    $env:CMAKE_BUILD_PARALLEL_LEVEL = $oldCmakeParallelLevel
    $password = $null
  }

  if (-not (Test-Path -LiteralPath $signing.GeneratedBundle)) {
    throw "Gradle succeeded but the expected AAB was not found: $($signing.GeneratedBundle)"
  }
  $destinationDirectory = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
    [IO.Path]::GetFullPath($OutputDirectory)
  } else {
    [IO.Path]::GetFullPath((Join-Path $script:Root $OutputDirectory))
  }
  [void][IO.Directory]::CreateDirectory($destinationDirectory)
  $appConfigPath = Join-Path $script:Root 'apps\mobile\app.config.ts'
  $version = Get-SparkRegexValue -Path $appConfigPath -Pattern '(?m)^\s*version:\s*[''"]([^''"]+)[''"]'
  $versionCode = Get-SparkRegexValue -Path $signing.NativeGradle -Pattern 'versionCode\s+(\d+)'
  $destination = Join-Path $destinationDirectory "spark-application-android-$version-$versionCode.aab"

  $jarsigner = Join-Path $environment.JavaHome 'bin\jarsigner.exe'
  & $jarsigner '-verify' '-verbose' '-certs' $signing.GeneratedBundle *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "jarsigner could not verify the produced AAB (exit code $LASTEXITCODE)."
  }
  $keytool = Join-Path $environment.JavaHome 'bin\keytool.exe'
  $certificateText = (& $keytool '-printcert' '-jarfile' $signing.GeneratedBundle 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0 -or $certificateText -match 'Android Debug') {
    throw 'The produced AAB is missing the expected production signature or is debug-signed.'
  }

  if (-not (Test-Path -LiteralPath $signing.BundleMetadata) -or -not (Test-Path -LiteralPath $signing.ManifestMetadata)) {
    throw 'Gradle did not produce the bundle/manifest identity metadata required for verification.'
  }
  $bundleMetadata = Get-Content -LiteralPath $signing.BundleMetadata -Raw | ConvertFrom-Json
  $manifestMetadata = Get-Content -LiteralPath $signing.ManifestMetadata -Raw | ConvertFrom-Json
  $bundleElement = @($bundleMetadata.elements) | Select-Object -First 1
  $manifestElement = @($manifestMetadata.elements) | Select-Object -First 1
  $applicationId = [string]$bundleMetadata.applicationId
  $builtVersion = [string]$manifestElement.versionName
  $builtCode = [string]$manifestElement.versionCode
  $bundleOutputName = [IO.Path]::GetFileName([string]$bundleElement.outputFile)
  if (
    [string]$bundleMetadata.artifactType.type -ne 'BUNDLE' -or
    [string]$bundleMetadata.variantName -ne 'release' -or
    $bundleOutputName -ne [IO.Path]::GetFileName($signing.GeneratedBundle) -or
    [string]$manifestMetadata.applicationId -ne $applicationId -or
    $applicationId -ne $script:PackageName -or
    $builtVersion -ne $version -or
    $builtCode -ne $versionCode
  ) {
    throw "AAB identity mismatch: package '$applicationId', version '$builtVersion', code '$builtCode'."
  }

  Copy-Item -LiteralPath $signing.GeneratedBundle -Destination $destination -Force
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  [IO.File]::WriteAllText(
    "$destination.sha256",
    "$hash  $([IO.Path]::GetFileName($destination))`r`n",
    [Text.UTF8Encoding]::new($false)
  )
  Write-Host ''
  Write-Host 'Play-ready local Android App Bundle created and verified:' -ForegroundColor Green
  Write-Host "  AAB:     $destination"
  Write-Host "  Package: $applicationId"
  Write-Host "  Version: $builtVersion ($builtCode)"
  Write-Host "  SHA256:  $hash"
  Write-Host 'No EAS hosted build was requested or consumed.' -ForegroundColor Green
  $Result.Value = [pscustomobject]@{
    AabPath = $destination
    ChecksumPath = "$destination.sha256"
    Sha256 = $hash
    SizeBytes = (Get-Item -LiteralPath $destination).Length
    PackageName = $applicationId
    VersionName = $builtVersion
    VersionCode = [int]$builtCode
    Architectures = @('armeabi-v7a', 'arm64-v8a')
    MaximumBuildWorkers = $releaseBuildWorkers
    SigningAlias = $signing.Alias
    CertificateSubject = $certificateText.Trim()
  }
}

function Invoke-SparkLocalReleaseBuild {
  param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [string]$SecretsFile,
    [AllowNull()][string]$UploadPassword,
    [string]$PasswordSource = '',
    [ref]$Result
  )
  $started = [DateTime]::UtcNow
  $appConfigPath = Join-Path $script:Root 'apps\mobile\app.config.ts'
  $record = [ordered]@{
    schemaVersion = 1
    operation = 'local-android-build'
    status = 'running'
    startedAt = $started.ToString('o')
    completedAt = $null
    durationSeconds = $null
    packageName = $script:PackageName
    versionName = Get-SparkRegexValue -Path $appConfigPath -Pattern '(?m)^\s*version:\s*[''"]([^''"]+)[''"]'
    versionCode = [int](Get-SparkRegexValue -Path $appConfigPath -Pattern 'versionCode:\s*(\d+)')
    providers = [ordered]@{
      build = 'local Windows/Gradle'
      easUsed = $false
      googlePlayContacted = $false
    }
    nativeBuild = [ordered]@{
      architectures = @('armeabi-v7a', 'arm64-v8a')
      maximumWorkers = 2
    }
    secretSources = $null
    artifact = $null
    links = [ordered]@{
      playConsole = 'https://play.google.com/console/developers'
      playStoreListing = "https://play.google.com/store/apps/details?id=$script:PackageName"
      privacyPolicy = 'https://djpokis-spark-habits.web.app/privacy.html'
    }
    error = $null
  }
  $secrets = $null
  $build = $null
  try {
    if (-not $UploadPassword) {
      $secrets = Get-SparkReleaseSecrets -SecretsFile $SecretsFile -RequireUploadPassword
      $UploadPassword = $secrets.UploadKeyPassword
      $PasswordSource = $secrets.UploadKeyPasswordSource
    }
    if (-not $PasswordSource) { $PasswordSource = 'provided-by-parent-operation' }
    $record['secretSources'] = [ordered]@{
      uploadKeyPassword = $PasswordSource
      secretsFile = $(if ($secrets) { $secrets.SecretsFile } else { $null })
    }
    $buildReference = [ref]$build
    Invoke-SparkLocalReleaseBuildCore `
      -OutputDirectory $OutputDirectory `
      -UploadPassword $UploadPassword `
      -Result $buildReference
    $record['status'] = 'succeeded'
    $record['versionName'] = $build.VersionName
    $record['versionCode'] = $build.VersionCode
    $record['artifact'] = [ordered]@{
      aabPath = $build.AabPath
      checksumPath = $build.ChecksumPath
      sha256 = $build.Sha256
      sizeBytes = $build.SizeBytes
      signingAlias = $build.SigningAlias
    }
  } catch {
    $record['status'] = 'failed'
    $record['error'] = [ordered]@{
      type = $_.Exception.GetType().FullName
      message = $_.Exception.Message
    }
    throw
  } finally {
    $completed = [DateTime]::UtcNow
    $record['completedAt'] = $completed.ToString('o')
    $record['durationSeconds'] = [Math]::Round(($completed - $started).TotalSeconds, 3)
    $manifest = Write-SparkOperationRecord -Record $record -Kind 'build' -OutputDirectory $OutputDirectory
    if ($build) {
      $build | Add-Member -NotePropertyName HistoryJson -NotePropertyValue $manifest.History -Force
      $build | Add-Member -NotePropertyName LatestJson -NotePropertyValue $manifest.Latest -Force
    }
    $UploadPassword = $null
    if ($secrets) { $secrets.UploadKeyPassword = $null }
  }
  if ($PSBoundParameters.ContainsKey('Result')) { $Result.Value = $build }
}

function Invoke-SparkPublisherNode {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('inspect', 'publish')][string]$Action,
    [Parameter(Mandatory = $true)][string]$ServiceAccountKeyFile,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [string]$AabPath,
    [string]$Track,
    [string]$ReleaseStatus,
    [string]$ReleaseName,
    [int]$VersionCode,
    [double]$RolloutFraction = 0,
    [string]$ReleaseNotesFile,
    [Parameter(Mandatory = $true)][ref]$Result
  )
  $publisher = Get-SparkPublisherInfo
  if (-not (Test-Path -LiteralPath $publisher.PublisherScript)) {
    throw "Google Play publisher helper is missing: $($publisher.PublisherScript)"
  }
  $destination = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
    [IO.Path]::GetFullPath($OutputDirectory)
  } else {
    [IO.Path]::GetFullPath((Join-Path $script:Root $OutputDirectory))
  }
  [void][IO.Directory]::CreateDirectory($destination)
  $temporaryResult = Join-Path $destination ('.publisher-result-{0}.json' -f [Guid]::NewGuid().ToString('N'))
  $arguments = @(
    $publisher.PublisherScript,
    '--action', $Action,
    '--package', $script:PackageName,
    '--service-account-key', $ServiceAccountKeyFile,
    '--publisher-config', $publisher.PublisherConfig,
    '--output', $temporaryResult
  )
  if ($Action -eq 'publish') {
    $arguments += @(
      '--aab', $AabPath,
      '--track', $Track,
      '--release-status', $ReleaseStatus,
      '--release-name', $ReleaseName,
      '--version-code', [string]$VersionCode
    )
    if ($RolloutFraction -gt 0) {
      $arguments += @('--rollout-fraction', $RolloutFraction.ToString([Globalization.CultureInfo]::InvariantCulture))
    }
    if ($ReleaseNotesFile) { $arguments += @('--release-notes', $ReleaseNotesFile) }
  }
  $node = Get-Command 'node.exe' -ErrorAction SilentlyContinue
  if (-not $node) { throw 'Node.js was not found. Run ".\spark.cmd doctor".' }
  Write-Host ''
  Write-Host "> node.exe google-play-publisher.mjs --action $Action ..." -ForegroundColor DarkGray
  & $node.Source @arguments
  $exitCode = $LASTEXITCODE
  $publisherResult = $null
  if (Test-Path -LiteralPath $temporaryResult) {
    try {
      $publisherResult = Read-SparkJson -Path $temporaryResult -Label 'Google Play publisher result'
    } finally {
      [IO.File]::Delete($temporaryResult)
    }
  }
  $Result.Value = $publisherResult
  if ($exitCode -ne 0) {
    $errorObject = Get-SparkJsonProperty -Object $publisherResult -Name 'error'
    $errorMessage = [string](Get-SparkJsonProperty -Object $errorObject -Name 'message')
    $errorStage = [string](Get-SparkJsonProperty -Object $errorObject -Name 'stage')
    if (-not $errorMessage) { $errorMessage = "publisher helper exited with code $exitCode" }
    throw "Google Play operation failed at '$errorStage': $errorMessage"
  }
  if (-not $publisherResult -or [string]$publisherResult.status -ne 'succeeded') {
    throw 'Google Play publisher did not produce a successful result record.'
  }
}

function Initialize-SparkPlayPublisher {
  param(
    [string]$ProjectId,
    [string]$SecretsFile,
    [string]$OutputDirectory,
    [switch]$SkipConfirmation
  )
  $started = [DateTime]::UtcNow
  $publisher = Get-SparkPublisherInfo
  $config = Get-SparkPublisherConfig
  $configuredProject = [string](Get-SparkJsonProperty -Object $config -Name 'googleCloudProjectId')
  $project = if ($ProjectId) { $ProjectId } else { $configuredProject }
  Assert-SparkProjectId $project
  if ($configuredProject -and $project -ne $configuredProject) {
    throw "Requested Google Cloud project '$project' does not match publisher-config.json project '$configuredProject'."
  }
  $serviceAccountId = [string](Get-SparkJsonProperty -Object $config -Name 'serviceAccountId')
  Assert-SparkToken -Value $serviceAccountId -Name 'Service account ID' -Pattern '^[a-z][a-z0-9-]{4,28}[a-z0-9]$'
  $serviceAccountEmail = "$serviceAccountId@$project.iam.gserviceaccount.com"
  $resolvedSecrets = if ($SecretsFile) {
    if ([IO.Path]::IsPathRooted($SecretsFile)) { [IO.Path]::GetFullPath($SecretsFile) }
    else { [IO.Path]::GetFullPath((Join-Path $script:Root $SecretsFile)) }
  } else { $publisher.DefaultSecrets }
  $keyPath = $publisher.DefaultServiceAccountKey
  if (Test-Path -LiteralPath $resolvedSecrets) {
    Assert-SparkPrivatePathIgnored -Path $resolvedSecrets -Label 'Local release secrets file'
    $existingSecretConfig = Read-SparkJson -Path $resolvedSecrets -Label 'Local release secrets file'
    $configuredKeyPath = [string](Get-SparkJsonProperty -Object $existingSecretConfig -Name 'googlePlayServiceAccountKeyFile')
    if ($configuredKeyPath) {
      $keyPath = Resolve-SparkPathFromFile -Value $configuredKeyPath -ContainingFile $resolvedSecrets
    }
  }
  $record = [ordered]@{
    schemaVersion = 1
    operation = 'google-play-publisher-setup'
    status = 'running'
    startedAt = $started.ToString('o')
    completedAt = $null
    durationSeconds = $null
    packageName = $script:PackageName
    googleCloudProjectId = $project
    serviceAccountEmail = $serviceAccountEmail
    createdServiceAccount = $false
    createdServiceAccountKey = $false
    enabledAndroidPublisherApi = $false
    secretFiles = [ordered]@{
      releaseSecrets = $resolvedSecrets
      serviceAccountKey = $keyPath
    }
    links = [ordered]@{
      googleCloudApi = "https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=$project"
      googleCloudServiceAccounts = "https://console.cloud.google.com/iam-admin/serviceaccounts?project=$project"
      playConsoleUsersAndPermissions = 'https://play.google.com/console/developers'
    }
    remainingManualSteps = @(
      'Back up google-play-publisher.json in LastPass before continuing.',
      'Invite the printed service-account email in Play Console Users and permissions.',
      'Give it app-only access to com.djpokis.sparkhabits.app and Release apps to testing tracks.',
      'Run PlayStatus to confirm access before LocalPublish.'
    )
    error = $null
  }
  try {
    if (-not (Confirm-SparkExternalChange `
        -Description "This enables the free Google Play Developer API in '$project', creates a least-privilege service-account identity, and creates one ignored local JSON key if absent. It does not grant Play Console access or publish an app." `
        -Expected "SETUP PLAY PUBLISHER $project" `
        -SkipConfirmation:$SkipConfirmation)) {
      $record['status'] = 'canceled'
      return
    }
    $gcloud = Assert-SparkCommand -Name 'gcloud.cmd' -InstallHint 'Install the Google Cloud CLI.'
    Invoke-External -Executable $gcloud -Arguments @(
      'services', 'enable', 'androidpublisher.googleapis.com', '--project', $project
    )
    $record['enabledAndroidPublisherApi'] = $true
    $existingAccounts = @(& $gcloud iam service-accounts list `
      '--project' $project `
      "--filter=email:$serviceAccountEmail" `
      '--format=value(email)' 2>&1)
    if ($LASTEXITCODE -ne 0) {
      throw "Could not list service accounts for '$project': $($existingAccounts -join ' ')"
    }
    if ($existingAccounts -notcontains $serviceAccountEmail) {
      Invoke-External -Executable $gcloud -Arguments @(
        'iam', 'service-accounts', 'create', $serviceAccountId,
        '--project', $project,
        '--display-name', 'Spark application Google Play publisher'
      )
      $record['createdServiceAccount'] = $true
    }
    [void][IO.Directory]::CreateDirectory($publisher.CredentialsDirectory)
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $keyPath))
    if (-not (Test-Path -LiteralPath $keyPath)) {
      Invoke-External -Executable $gcloud -Arguments @(
        'iam', 'service-accounts', 'keys', 'create', $keyPath,
        '--iam-account', $serviceAccountEmail,
        '--project', $project
      )
      $record['createdServiceAccountKey'] = $true
    }
    Assert-SparkPrivatePathIgnored -Path $keyPath -Label 'Generated service-account key'
    [void](Get-SparkServiceAccountInfo -Path $keyPath)
    if (-not (Test-Path -LiteralPath $resolvedSecrets)) {
      Assert-SparkPrivatePathIgnored -Path $resolvedSecrets -Label 'Local release secrets file'
      [void][IO.Directory]::CreateDirectory((Split-Path -Parent $resolvedSecrets))
      $relativeKey = if ((Split-Path -Parent $resolvedSecrets) -eq (Split-Path -Parent $keyPath)) {
        './google-play-publisher.json'
      } else {
        $keyPath
      }
      $secretTemplate = [ordered]@{
        schemaVersion = 1
        uploadKeyPassword = ''
        googlePlayServiceAccountKeyFile = $relativeKey
      } | ConvertTo-Json -Depth 5
      [IO.File]::WriteAllText($resolvedSecrets, "$secretTemplate`r`n", [Text.UTF8Encoding]::new($false))
    }
    $record['status'] = 'succeeded'
    Write-Host ''
    Write-Host 'Google Cloud publisher identity prepared. Google Play permission remains manual:' -ForegroundColor Green
    Write-Host "  Service account: $serviceAccountEmail"
    Write-Host "  Private key:     $keyPath"
    Write-Host "  Secrets config:  $resolvedSecrets"
    Write-Warning 'Back up the JSON key in LastPass now. Then invite the service-account email in Play Console with app-only testing-release permission.'
  } catch {
    $record['status'] = 'failed'
    $record['error'] = [ordered]@{ type = $_.Exception.GetType().FullName; message = $_.Exception.Message }
    throw
  } finally {
    $completed = [DateTime]::UtcNow
    $record['completedAt'] = $completed.ToString('o')
    $record['durationSeconds'] = [Math]::Round(($completed - $started).TotalSeconds, 3)
    [void](Write-SparkOperationRecord -Record $record -Kind 'play-setup' -OutputDirectory $OutputDirectory)
  }
}

function Get-SparkPlayPublisherStatus {
  param(
    [string]$SecretsFile,
    [string]$OutputDirectory
  )
  $started = [DateTime]::UtcNow
  $record = [ordered]@{
    schemaVersion = 1
    operation = 'google-play-publisher-status'
    status = 'running'
    startedAt = $started.ToString('o')
    completedAt = $null
    durationSeconds = $null
    packageName = $script:PackageName
    serviceAccountEmail = $null
    maxVersionCode = $null
    bundles = @()
    tracks = @()
    links = $null
    secretSources = $null
    error = $null
  }
  $secrets = $null
  $publisherResult = $null
  try {
    $secrets = Get-SparkReleaseSecrets -SecretsFile $SecretsFile -RequireGooglePlay
    $record['serviceAccountEmail'] = $secrets.ServiceAccountEmail
    $record['secretSources'] = [ordered]@{
      serviceAccount = $secrets.ServiceAccountSource
      secretsFile = $secrets.SecretsFile
    }
    Invoke-SparkPublisherNode `
      -Action inspect `
      -ServiceAccountKeyFile $secrets.ServiceAccountKeyFile `
      -OutputDirectory $OutputDirectory `
      -Result ([ref]$publisherResult)
    $record['status'] = 'succeeded'
    $record['maxVersionCode'] = [int]$publisherResult.maxVersionCode
    $record['bundles'] = @($publisherResult.bundles)
    $record['tracks'] = @($publisherResult.tracks)
    $record['links'] = $publisherResult.links
    Write-Heading 'Google Play publisher access'
    Write-SparkStatus 'Service account' $secrets.ServiceAccountEmail 'Good'
    Write-SparkStatus 'Highest used version code' ([string]$publisherResult.maxVersionCode) 'Good'
    Write-SparkStatus 'Configured tracks returned' ([string]@($publisherResult.tracks).Count) 'Good'
  } catch {
    $record['status'] = 'failed'
    if ($publisherResult) {
      $record['publisherResult'] = $publisherResult
      $publisherError = Get-SparkJsonProperty -Object $publisherResult -Name 'error'
    } else { $publisherError = $null }
    $record['error'] = [ordered]@{
      type = $_.Exception.GetType().FullName
      message = $_.Exception.Message
      stage = Get-SparkJsonProperty -Object $publisherError -Name 'stage'
      statusCode = Get-SparkJsonProperty -Object $publisherError -Name 'statusCode'
    }
    throw
  } finally {
    $completed = [DateTime]::UtcNow
    $record['completedAt'] = $completed.ToString('o')
    $record['durationSeconds'] = [Math]::Round(($completed - $started).TotalSeconds, 3)
    [void](Write-SparkOperationRecord -Record $record -Kind 'play-status' -OutputDirectory $OutputDirectory)
  }
}

function Publish-SparkLocalRelease {
  param(
    [Parameter(Mandatory = $true)][string]$Track,
    [Parameter(Mandatory = $true)][string]$RequestedReleaseStatus,
    [double]$RolloutPercent,
    [string]$SecretsFile,
    [string]$ReleaseNotesFile,
    [string]$OutputDirectory,
    [switch]$DisableAutoVersionCode,
    [switch]$SkipConfirmation
  )
  Assert-SparkToken -Value $Track -Name 'Google Play track' -Pattern '^[A-Za-z0-9._-]+$'
  $started = [DateTime]::UtcNow
  $effectiveStatus = if ($RequestedReleaseStatus -and $RequestedReleaseStatus -ne 'Auto') {
    switch ($RequestedReleaseStatus) {
      'Draft' { 'draft' }
      'Completed' { 'completed' }
      'InProgress' { 'inProgress' }
      default { throw "Unsupported release status: $RequestedReleaseStatus" }
    }
  } elseif ($Track -eq 'production') { 'draft' } else { 'completed' }
  if ($effectiveStatus -eq 'inProgress') {
    if ($Track -ne 'production') { throw 'Staged rollout is supported only for the production track.' }
    if ($RolloutPercent -le 0 -or $RolloutPercent -ge 100) {
      throw 'InProgress requires -RolloutPercent greater than 0 and less than 100.'
    }
  } elseif ($RolloutPercent -gt 0) {
    throw '-RolloutPercent is valid only with -ReleaseStatus InProgress.'
  }
  $publisher = Get-SparkPublisherInfo
  $notesPath = if ($ReleaseNotesFile) {
    if ([IO.Path]::IsPathRooted($ReleaseNotesFile)) { [IO.Path]::GetFullPath($ReleaseNotesFile) }
    else { [IO.Path]::GetFullPath((Join-Path $script:Root $ReleaseNotesFile)) }
  } else { $publisher.ReleaseNotes }
  $record = [ordered]@{
    schemaVersion = 1
    operation = 'local-build-and-google-play-publish'
    status = 'running'
    startedAt = $started.ToString('o')
    completedAt = $null
    durationSeconds = $null
    packageName = $script:PackageName
    track = $Track
    releaseStatus = $effectiveStatus
    rolloutPercent = $(if ($effectiveStatus -eq 'inProgress') { $RolloutPercent } else { $null })
    versionName = $null
    versionCode = $null
    previousMaximumVersionCode = $null
    autoAdvancedVersionCode = $false
    artifact = $null
    buildOutputJson = $null
    serviceAccountEmail = $null
    secretSources = $null
    publisherResult = $null
    links = $null
    providers = [ordered]@{ build = 'local Windows/Gradle'; publishing = 'Google Play Developer API'; easUsed = $false }
    error = $null
  }
  $secrets = $null
  $inspection = $null
  $publisherResult = $null
  $build = $null
  try {
    $secrets = Get-SparkReleaseSecrets -SecretsFile $SecretsFile -RequireUploadPassword -RequireGooglePlay
    $record['serviceAccountEmail'] = $secrets.ServiceAccountEmail
    $record['secretSources'] = [ordered]@{
      uploadKeyPassword = $secrets.UploadKeyPasswordSource
      serviceAccount = $secrets.ServiceAccountSource
      secretsFile = $secrets.SecretsFile
    }
    Write-Heading 'Checking Google Play before building'
    Invoke-SparkPublisherNode `
      -Action inspect `
      -ServiceAccountKeyFile $secrets.ServiceAccountKeyFile `
      -OutputDirectory $OutputDirectory `
      -Result ([ref]$inspection)
    $record['previousMaximumVersionCode'] = [int]$inspection.maxVersionCode
    $appConfigPath = Join-Path $script:Root 'apps\mobile\app.config.ts'
    $versionName = Get-SparkRegexValue -Path $appConfigPath -Pattern '(?m)^\s*version:\s*[''"]([^''"]+)[''"]'
    $currentVersionCode = [int](Get-SparkRegexValue -Path $appConfigPath -Pattern 'versionCode:\s*(\d+)')
    $nextVersionCode = $currentVersionCode
    if ($currentVersionCode -le [int]$inspection.maxVersionCode) {
      if ($DisableAutoVersionCode) {
        throw "Android versionCode $currentVersionCode has already been used. Remove -NoAutoVersionCode or set a code above $($inspection.maxVersionCode)."
      }
      $nextVersionCode = [int]$inspection.maxVersionCode + 1
      $record['autoAdvancedVersionCode'] = $true
    }
    $record['versionName'] = $versionName
    $record['versionCode'] = $nextVersionCode
    $record['links'] = $inspection.links
    $releaseName = "$versionName ($nextVersionCode)"
    $description = "This builds the Spark application on this PC and publishes $releaseName to Google Play track '$Track' with status '$effectiveStatus'. Google Play review and policy gates still apply."
    if ($Track -eq 'production') {
      $description += ' PRODUCTION can make an approved build available to real users.'
    }
    $expected = "PUBLISH $($Track.ToUpperInvariant()) $nextVersionCode"
    $allowSkip = $SkipConfirmation -and $Track -ne 'production'
    if (-not (Confirm-SparkExternalChange -Description $description -Expected $expected -SkipConfirmation:$allowSkip)) {
      $record['status'] = 'canceled'
      return
    }
    if ($nextVersionCode -ne $currentVersionCode) {
      Set-SparkAndroidVersionCode -VersionCode $nextVersionCode
    }
    Invoke-SparkLocalReleaseBuild `
      -OutputDirectory $OutputDirectory `
      -UploadPassword $secrets.UploadKeyPassword `
      -PasswordSource $secrets.UploadKeyPasswordSource `
      -Result ([ref]$build)
    $record['artifact'] = [ordered]@{
      aabPath = $build.AabPath
      checksumPath = $build.ChecksumPath
      sha256 = $build.Sha256
      sizeBytes = $build.SizeBytes
    }
    $record['buildOutputJson'] = [ordered]@{ history = $build.HistoryJson; latest = $build.LatestJson }
    Invoke-SparkPublisherNode `
      -Action publish `
      -ServiceAccountKeyFile $secrets.ServiceAccountKeyFile `
      -OutputDirectory $OutputDirectory `
      -AabPath $build.AabPath `
      -Track $Track `
      -ReleaseStatus $effectiveStatus `
      -ReleaseName $releaseName `
      -VersionCode $nextVersionCode `
      -RolloutFraction $(if ($effectiveStatus -eq 'inProgress') { $RolloutPercent / 100 } else { 0 }) `
      -ReleaseNotesFile $notesPath `
      -Result ([ref]$publisherResult)
    $record['status'] = 'succeeded'
    $record['publisherResult'] = $publisherResult
    $record['links'] = $publisherResult.links
    Write-Heading 'Google Play release recorded'
    Write-SparkStatus 'Track' $Track 'Good'
    Write-SparkStatus 'Release status' $effectiveStatus 'Good'
    Write-SparkStatus 'Version' "$versionName ($nextVersionCode)" 'Good'
    Write-Host 'Google Play may still review the release. Use the JSON links below to follow it.' -ForegroundColor Cyan
  } catch {
    $record['status'] = 'failed'
    if ($publisherResult) { $record['publisherResult'] = $publisherResult }
    $publisherError = Get-SparkJsonProperty -Object $publisherResult -Name 'error'
    $record['error'] = [ordered]@{
      type = $_.Exception.GetType().FullName
      message = $_.Exception.Message
      stage = Get-SparkJsonProperty -Object $publisherError -Name 'stage'
      statusCode = Get-SparkJsonProperty -Object $publisherError -Name 'statusCode'
      uploadedVersionCode = Get-SparkJsonProperty -Object $publisherError -Name 'uploadedVersionCode'
    }
    throw
  } finally {
    $completed = [DateTime]::UtcNow
    $record['completedAt'] = $completed.ToString('o')
    $record['durationSeconds'] = [Math]::Round(($completed - $started).TotalSeconds, 3)
    [void](Write-SparkOperationRecord -Record $record -Kind 'publish' -OutputDirectory $OutputDirectory)
    if ($secrets) { $secrets.UploadKeyPassword = $null }
  }
}

function Show-SparkReleaseHistory {
  param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [ValidateRange(1, 50)][int]$Limit = 10
  )
  $destination = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
    [IO.Path]::GetFullPath($OutputDirectory)
  } else {
    [IO.Path]::GetFullPath((Join-Path $script:Root $OutputDirectory))
  }
  $historyDirectory = Join-Path $destination 'history'
  Write-Heading 'Local release history'
  if (-not (Test-Path -LiteralPath $historyDirectory)) {
    Write-Host 'No recorded release operations yet.' -ForegroundColor Yellow
    Write-Host "History will appear under: $historyDirectory"
    return
  }
  $files = @(Get-ChildItem -LiteralPath $historyDirectory -Filter '*.json' -File |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First $Limit)
  if (-not $files.Count) {
    Write-Host 'No recorded release operations yet.' -ForegroundColor Yellow
    return
  }
  foreach ($file in $files) {
    try {
      $entry = Read-SparkJson -Path $file.FullName -Label 'Release history record'
      $version = if ($null -ne (Get-SparkJsonProperty -Object $entry -Name 'versionCode')) {
        "{0} ({1})" -f (Get-SparkJsonProperty -Object $entry -Name 'versionName'), (Get-SparkJsonProperty -Object $entry -Name 'versionCode')
      } else { '-' }
      $track = [string](Get-SparkJsonProperty -Object $entry -Name 'track')
      if (-not $track) { $track = '-' }
      Write-Host ("{0}  {1,-10}  {2,-42}  {3,-16}  {4}" -f `
        ([string](Get-SparkJsonProperty -Object $entry -Name 'startedAt')), `
        ([string](Get-SparkJsonProperty -Object $entry -Name 'status')), `
        ([string](Get-SparkJsonProperty -Object $entry -Name 'operation')), `
        $version, `
        $track)
      Write-Host "  $($file.FullName)" -ForegroundColor DarkGray
    } catch {
      Write-Warning "Could not read history record $($file.FullName): $($_.Exception.Message)"
    }
  }
  Write-Host ''
  $latestFiles = @(
    [ordered]@{ Label = 'Latest build'; Path = (Join-Path $destination 'latest-build.json') },
    [ordered]@{ Label = 'Latest publish'; Path = (Join-Path $destination 'latest-publish.json') },
    [ordered]@{ Label = 'Latest Play status'; Path = (Join-Path $destination 'latest-play-status.json') },
    [ordered]@{ Label = 'Latest Play setup'; Path = (Join-Path $destination 'latest-play-setup.json') }
  )
  foreach ($latest in $latestFiles) {
    $displayPath = if (Test-Path -LiteralPath $latest.Path) { $latest.Path } else { "$($latest.Path) (not created yet)" }
    Write-Host ("{0,-20} {1}" -f "$($latest.Label):", $displayPath) -ForegroundColor DarkGray
  }
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
    [string]$GoogleCloudProjectId,
    [string]$SecretsFile,
    [string]$ReleaseNotesFile,
    [string]$RequestedReleaseStatus,
    [double]$RolloutPercent,
    [switch]$DisableAutoVersionCode,
    [switch]$QueueOnly,
    [switch]$ResetBuildCache,
    [switch]$SkipConfirmation
  )

  $action = Resolve-SparkAction -Requested $RequestedAction -Default 'Check' -Allowed @(
    'Inspect', 'Check', 'Verify', 'Assets', 'Native',
    'LocalStatus', 'LocalSetup', 'LocalBuild', 'PlaySetup', 'PlayStatus', 'LocalPublish', 'History',
    'EasSetup', 'EasProject', 'EasCredentials', 'EasBuild', 'EasList', 'EasDownload', 'EasSubmit',
    'Setup', 'Project', 'Credentials', 'Build', 'List', 'Download', 'Submit'
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
      $arguments = @('--variant', 'debugOptimized')
      if ($TargetDevice) {
        $arguments += @('--device', (Resolve-ExpoDeviceName $TargetDevice))
      } else {
        Write-Host 'Choose the phone or emulator for the release-like install.' -ForegroundColor Cyan
        $arguments += '--device'
      }
      Write-Warning 'This installs a locally optimized, debug-signed APK for device testing. It is not the signed AAB uploaded to Google Play.'
      Invoke-MobileCommand -Mode 'android' -Arguments $arguments
    }
    'LocalStatus' { Show-SparkLocalSigningStatus }
    'LocalSetup' { Initialize-SparkLocalSigning -SkipConfirmation:$SkipConfirmation }
    'LocalBuild' {
      Invoke-SparkLocalReleaseBuild -OutputDirectory $DownloadDirectory -SecretsFile $SecretsFile
    }
    'PlaySetup' {
      Initialize-SparkPlayPublisher `
        -ProjectId $GoogleCloudProjectId `
        -SecretsFile $SecretsFile `
        -OutputDirectory $DownloadDirectory `
        -SkipConfirmation:$SkipConfirmation
    }
    'PlayStatus' {
      Get-SparkPlayPublisherStatus -SecretsFile $SecretsFile -OutputDirectory $DownloadDirectory
    }
    'LocalPublish' {
      Publish-SparkLocalRelease `
        -Track $SubmitTrack `
        -RequestedReleaseStatus $RequestedReleaseStatus `
        -RolloutPercent $RolloutPercent `
        -SecretsFile $SecretsFile `
        -ReleaseNotesFile $ReleaseNotesFile `
        -OutputDirectory $DownloadDirectory `
        -DisableAutoVersionCode:$DisableAutoVersionCode `
        -SkipConfirmation:$SkipConfirmation
    }
    'History' { Show-SparkReleaseHistory -OutputDirectory $DownloadDirectory -Limit $ListLimit }
    'EasSetup' {
      Invoke-Eas @('login')
      Invoke-Eas @('init')
      Invoke-Eas @('project:info')
    }
    'EasProject' {
      Invoke-Eas @('whoami')
      Invoke-Eas @('project:info')
    }
    'EasCredentials' {
      Write-Warning 'EAS will open its interactive Android credentials manager. Review every prompt carefully; do not place downloaded keystores or passwords in this repository.'
      Invoke-Eas @('credentials', '--platform', 'android')
    }
    'EasBuild' {
      if ([Environment]::GetEnvironmentVariable('SPARK_ALLOW_EAS_RELEASES', 'Process') -ne 'true') {
        throw 'EAS hosted builds are blocked by default and are not needed for local releases. Only after reviewing cost and signing migration, set SPARK_ALLOW_EAS_RELEASES=true in this PowerShell process and retry EasBuild.'
      }
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
    'EasList' {
      Invoke-Eas @(
        'build:list', '--platform', 'android', '--build-profile', $BuildProfile,
        '--limit', [string]$ListLimit
      )
    }
    'EasDownload' {
      if (-not $ExactBuildId) {
        throw "EasDownload requires -BuildId. Run '.\spark.cmd release -Action EasList' first."
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
    'EasSubmit' {
      if ([Environment]::GetEnvironmentVariable('SPARK_ALLOW_EAS_RELEASES', 'Process') -ne 'true') {
        throw 'EAS submission is blocked by default. Set SPARK_ALLOW_EAS_RELEASES=true in this PowerShell process only after deliberately choosing the optional EAS workflow.'
      }
      if (-not $ExactBuildId) {
        throw "EasSubmit requires an exact -BuildId. Run '.\spark.cmd release -Action EasList' first."
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
    { $_ -in @('Setup', 'Project', 'Credentials', 'Build', 'List', 'Download', 'Submit') } {
      throw "Release action '$action' was renamed to make local versus EAS behavior explicit. Use LocalSetup/LocalBuild or prefix the old name with Eas (for example EasBuild)."
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
