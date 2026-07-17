[CmdletBinding()]
param(
  [string]$CaptureDirectory = 'store\android\source\phone',
  [string]$FeatureSource = 'store\android\source\feature-graphic-background.png',
  [string]$OutputDirectory = 'store\android\graphics',
  [switch]$ValidateOnly
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Resolve-SparkPath {
  param([Parameter(Mandatory)][string]$Path)

  if ([IO.Path]::IsPathRooted($Path)) {
    return [IO.Path]::GetFullPath($Path)
  }
  return [IO.Path]::GetFullPath((Join-Path $root $Path))
}

function New-SparkBitmap {
  param(
    [Parameter(Mandatory)][int]$Width,
    [Parameter(Mandatory)][int]$Height,
    [Parameter(Mandatory)][System.Drawing.Imaging.PixelFormat]$PixelFormat
  )

  return [System.Drawing.Bitmap]::new($Width, $Height, $PixelFormat)
}

function Set-HighQualityDrawing {
  param([Parameter(Mandatory)][System.Drawing.Graphics]$Graphics)

  $Graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
}

function Export-PhoneScreenshot {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination,
    [int]$CropOffsetY = 0
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    # Google recommends 9:16 portrait screenshots at 1080 x 1920. Spark's Pixel
    # source device is taller, so crop the real app capture instead of stretching it.
    $cropHeight = [int][Math]::Round($sourceImage.Width * 16 / 9)
    if ($cropHeight -gt $sourceImage.Height) {
      throw "Source screenshot is too short for a 9:16 crop: $Source"
    }
    $safeOffset = [Math]::Min([Math]::Max(0, $CropOffsetY), $sourceImage.Height - $cropHeight)
    $target = New-SparkBitmap -Width 1080 -Height 1920 -PixelFormat ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        Set-HighQualityDrawing $graphics
        $graphics.DrawImage(
          $sourceImage,
          [System.Drawing.Rectangle]::new(0, 0, 1080, 1920),
          [System.Drawing.Rectangle]::new(0, $safeOffset, $sourceImage.Width, $cropHeight),
          [System.Drawing.GraphicsUnit]::Pixel
        )
      } finally {
        $graphics.Dispose()
      }
      $target.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $target.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }
}

function Export-StoreIcon {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    # Play requires a 512 x 512, 32-bit PNG. An opaque alpha channel is valid.
    $target = New-SparkBitmap -Width 512 -Height 512 -PixelFormat ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        Set-HighQualityDrawing $graphics
        $graphics.Clear([System.Drawing.Color]::FromArgb(255, 11, 16, 32))
        $graphics.DrawImage($sourceImage, 0, 0, 512, 512)
      } finally {
        $graphics.Dispose()
      }
      $target.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $target.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }
}

function Export-FeatureGraphic {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    $targetAspect = 1024 / 500
    $sourceAspect = $sourceImage.Width / $sourceImage.Height
    if ($sourceAspect -ge $targetAspect) {
      $cropWidth = [int][Math]::Round($sourceImage.Height * $targetAspect)
      $cropHeight = $sourceImage.Height
      $cropX = [int][Math]::Floor(($sourceImage.Width - $cropWidth) / 2)
      $cropY = 0
    } else {
      $cropWidth = $sourceImage.Width
      $cropHeight = [int][Math]::Round($sourceImage.Width / $targetAspect)
      $cropX = 0
      $cropY = [int][Math]::Floor(($sourceImage.Height - $cropHeight) / 2)
    }

    $target = New-SparkBitmap -Width 1024 -Height 500 -PixelFormat ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        Set-HighQualityDrawing $graphics
        $graphics.DrawImage(
          $sourceImage,
          [System.Drawing.Rectangle]::new(0, 0, 1024, 500),
          [System.Drawing.Rectangle]::new($cropX, $cropY, $cropWidth, $cropHeight),
          [System.Drawing.GraphicsUnit]::Pixel
        )
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $coral = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#FF6B5F'))
        $midnight = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#0B1020'))
        $labelFont = [System.Drawing.Font]::new('Segoe UI', 23, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $headlineFont = [System.Drawing.Font]::new('Segoe UI', 48, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        try {
          $graphics.DrawString('SPARK', $labelFont, $coral, 64, 145)
          $graphics.DrawString("Make the next step`nvisible.", $headlineFont, $midnight, 60, 190)
        } finally {
          $headlineFont.Dispose()
          $labelFont.Dispose()
          $midnight.Dispose()
          $coral.Dispose()
        }
      } finally {
        $graphics.Dispose()
      }
      $target.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $target.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }
}

function Assert-Asset {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][int]$Width,
    [Parameter(Mandatory)][int]$Height,
    [Parameter(Mandatory)][string]$Kind
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing $Kind asset: $Path"
  }
  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    if ($image.Width -ne $Width -or $image.Height -ne $Height) {
      throw "$Kind must be ${Width}x${Height}; found $($image.Width)x$($image.Height): $Path"
    }
    if ($image.RawFormat.Guid -ne [System.Drawing.Imaging.ImageFormat]::Png.Guid) {
      throw "$Kind must be a PNG: $Path"
    }
    if ($Kind -ne 'app icon' -and $image.PixelFormat.ToString() -match 'Argb|Alpha') {
      throw "$Kind must not contain an alpha channel: $Path"
    }
    $size = (Get-Item -LiteralPath $Path).Length
    if ($Kind -eq 'app icon' -and $size -gt 1MB) {
      throw "App icon exceeds Play's 1 MB limit: $Path"
    }
    Write-Host ("OK  {0,-16} {1}x{2}  {3:N0} bytes  {4}" -f $Kind, $image.Width, $image.Height, $size, $Path) -ForegroundColor Green
  } finally {
    $image.Dispose()
  }
}

Add-Type -AssemblyName System.Drawing

$captures = Resolve-SparkPath $CaptureDirectory
$feature = Resolve-SparkPath $FeatureSource
$output = Resolve-SparkPath $OutputDirectory
$phoneOutput = Join-Path $output 'phone'
$iconOutput = Join-Path $output 'app-icon-512.png'
$featureOutput = Join-Path $output 'feature-graphic-1024x500.png'

$screenshots = @(
  @{ Source = '01-today-final.png'; Destination = '01-today.png'; Offset = 0 },
  @{ Source = 'focus-original.png'; Destination = '02-focus.png'; Offset = 0 },
  @{ Source = '03-capture-final-clean.png'; Destination = '03-capture.png'; Offset = 0 },
  @{ Source = '04-progress.png'; Destination = '04-progress.png'; Offset = 0 },
  @{ Source = '06-departure.png'; Destination = '05-leave-on-time.png'; Offset = 0 },
  @{ Source = '05-settings.png'; Destination = '06-settings.png'; Offset = 120 }
)

if (-not $ValidateOnly) {
  [void][IO.Directory]::CreateDirectory($output)
  [void][IO.Directory]::CreateDirectory($phoneOutput)

  Export-StoreIcon `
    -Source (Resolve-SparkPath 'apps\mobile\assets\spark-icon-v2.png') `
    -Destination $iconOutput
  Export-FeatureGraphic -Source $feature -Destination $featureOutput
  foreach ($screenshot in $screenshots) {
    Export-PhoneScreenshot `
      -Source (Join-Path $captures $screenshot.Source) `
      -Destination (Join-Path $phoneOutput $screenshot.Destination) `
      -CropOffsetY $screenshot.Offset
  }
}

Assert-Asset -Path $iconOutput -Width 512 -Height 512 -Kind 'app icon'
Assert-Asset -Path $featureOutput -Width 1024 -Height 500 -Kind 'feature graphic'
foreach ($screenshot in $screenshots) {
  Assert-Asset `
    -Path (Join-Path $phoneOutput $screenshot.Destination) `
    -Width 1080 `
    -Height 1920 `
    -Kind 'phone screenshot'
}

if ($screenshots.Count -lt 4) {
  throw 'At least four phone screenshots are required by Spark release policy.'
}

Write-Host "`nPlay Store assets are ready in $output" -ForegroundColor Cyan
