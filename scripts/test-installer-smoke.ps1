param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir
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
    [int]$Port
  )

  $url = "http://127.0.0.1:${Port}/health"

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
    if ($response.StatusCode -ne 200) {
      throw "Unexpected HTTP status: $($response.StatusCode)"
    }

    Write-Host "[ok] ${Name}: ${url}"
  }
  catch {
    throw "${Name} health check failed at ${url}. $($_.Exception.Message)"
  }
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

$ports = @(
  @{ Name = "agent"; Port = 47821 },
  @{ Name = "vm-helper"; Port = 47822 },
  @{ Name = "browser-helper"; Port = 47823 },
  @{ Name = "plugins-helper"; Port = 47824 },
  @{ Name = "cloud-sync"; Port = 47825 },
  @{ Name = "bridge"; Port = 47826 },
  @{ Name = "computer-use"; Port = 47828 }
)

foreach ($service in $ports) {
  Test-HealthEndpoint -Name $service.Name -Port $service.Port
}

Write-Host ""
Write-Host "Clean-machine installer smoke test passed."