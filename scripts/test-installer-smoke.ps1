param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir,
  [int]$LaunchTimeoutSec = 45,
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

function Assert-Exists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  if (-not (Test-Path $Path)) {
    throw "Missing ${Label}: ${Path}"
  }

  Write-Host "[ok] ${Label}: ${Path}"
}

function Test-HealthEndpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [int]$TimeoutSec
  )

  $url = "http://127.0.0.1:${Port}/health"
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
      if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
        Write-Host "[ok] ${Name}: ${url}"
        return
      }
      $lastError = "Unexpected HTTP status: $($response.StatusCode)"
    }
    catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = $_.Exception.Response.StatusCode.value__
      }
      if ($statusCode -eq 401) {
        Write-Host "[ok] ${Name}: ${url} (auth protected)"
        return
      }
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Milliseconds 500
  }

  throw "${Name} health check failed at ${url}. ${lastError}"
}

function Find-ResourceRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir
  )

  $candidates = @(
    (Join-Path $InstallDir "resources"),
    $InstallDir
  )

  foreach ($candidate in $candidates) {
    if ((Test-Path (Join-Path $candidate "manifest.json")) -and
        (Test-Path (Join-Path $candidate "sidecars"))) {
      return $candidate
    }
  }

  throw "Could not find bundled resources under ${InstallDir}."
}

Write-Host "Aura Work clean-machine installer smoke test"
Write-Host "InstallDir: ${InstallDir}"

Assert-Exists -Path $InstallDir -Label "installation directory"

$desktopCandidates = @(
  (Join-Path $InstallDir "Aura Work.exe"),
  (Join-Path $InstallDir "aura-work.exe"),
  (Join-Path $InstallDir "aura-desktop.exe")
)

$desktopExe = $desktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $desktopExe) {
  throw "Could not find an Aura Work desktop executable inside ${InstallDir}."
}

Write-Host "[ok] desktop executable: ${desktopExe}"

$resourceRoot = Find-ResourceRoot -InstallDir $InstallDir
Write-Host "[ok] resource root: ${resourceRoot}"

Assert-Exists -Path (Join-Path $resourceRoot "manifest.json") -Label "bundle manifest"
Assert-Exists -Path (Join-Path $resourceRoot "node\node.exe") -Label "bundled Node runtime"

$ports = @(
  @{ Id = "aura-agent"; Name = "agent"; Port = 47821 },
  @{ Id = "aura-vm-helper"; Name = "vm-helper"; Port = 47822 },
  @{ Id = "aura-browser-helper"; Name = "browser-helper"; Port = 47823 },
  @{ Id = "aura-plugins-helper"; Name = "plugins-helper"; Port = 47824 },
  @{ Id = "aura-cloud-sync"; Name = "cloud-sync"; Port = 47825 },
  @{ Id = "aura-bridge"; Name = "bridge"; Port = 47826 },
  @{ Id = "aura-computer-use"; Name = "computer-use"; Port = 47828 }
)

$appProcess = $null
try {
  foreach ($service in $ports) {
    Assert-Exists -Path (Join-Path $resourceRoot "sidecars\$($service.Id)\dist\index.js") -Label "$($service.Id) bundled entry"
  }

  if (-not $NoLaunch) {
    Write-Host "[info] launching Aura Work to start bundled sidecars..."
    $appProcess = Start-Process -FilePath $desktopExe -PassThru
  }

  foreach ($service in $ports) {
    Test-HealthEndpoint -Name $service.Name -Port $service.Port -TimeoutSec $LaunchTimeoutSec
  }
}
finally {
  if ($appProcess -and -not $appProcess.HasExited) {
    Stop-Process -Id $appProcess.Id -Force
  }
}

Write-Host ""
Write-Host "Clean-machine installer smoke test passed."
