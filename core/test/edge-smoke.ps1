param(
    [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

$edge = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $edge) {
    throw "Microsoft Edge não encontrado."
}

$coreRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $coreRoot)
$outputRoot = Join-Path ([System.IO.Path]::GetTempPath()) "mse-core-edge-smoke"
$stdoutLog = Join-Path $outputRoot "server.out.log"
$stderrLog = Join-Path $outputRoot "server.err.log"
$domPath = Join-Path $outputRoot "rendered.html"
$url = "http://127.0.0.1:$Port/mse-platform/core/demo/"
$viewportUrl = "http://127.0.0.1:$Port/mse-platform/core/test/viewport.html?width=320"
$forumUrl = "http://127.0.0.1:$Port/mse-platform/modules/forum/demo/"

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

function Invoke-EdgeCapture(
    [string[]]$arguments,
    [string]$artifact,
    [string]$profileRoot,
    [string]$standardOutput = ""
) {
    New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
    if (Test-Path -LiteralPath $artifact -PathType Leaf) {
        Remove-Item -LiteralPath $artifact -Force
    }

    $startOptions = @{
        FilePath = $edge
        ArgumentList = $arguments
        RedirectStandardError = "$profileRoot.err.log"
        WindowStyle = "Hidden"
        PassThru = $true
    }
    if ($standardOutput) {
        $startOptions.RedirectStandardOutput = $standardOutput
    }

    $process = Start-Process @startOptions
    $deadline = [DateTime]::UtcNow.AddSeconds(30)

    try {
        do {
            Start-Sleep -Milliseconds 100
            $ready = Test-Path -LiteralPath $artifact -PathType Leaf
            if ($ready) {
                $ready = (Get-Item -LiteralPath $artifact).Length -gt 0
            }
            $process.Refresh()
        } until ($ready -or [DateTime]::UtcNow -ge $deadline)
    } finally {
        $process.Refresh()
        if (-not $process.HasExited) {
            $null = $process.WaitForExit(5000)
            $process.Refresh()
        }
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }

    if (-not $ready) {
        throw "O Edge não gerou a evidência esperada: $artifact"
    }
}

$server = Start-Process python `
    -ArgumentList "-m", "http.server", $Port, "--bind", "127.0.0.1" `
    -WorkingDirectory $repositoryRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

try {
    $ready = $false
    foreach ($attempt in 1..20) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }

    if (-not $ready) {
        throw "O preview não respondeu em $url."
    }

    $domProfile = Join-Path $outputRoot "profile-$PID-dom"
    Invoke-EdgeCapture `
        -Arguments @(
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--virtual-time-budget=3000",
            "--user-data-dir=$domProfile",
            "--dump-dom",
            $url
        ) `
        -Artifact $domPath `
        -ProfileRoot $domProfile `
        -StandardOutput $domPath

    $dom = Get-Content -LiteralPath $domPath -Encoding UTF8 -Raw
    if ($dom -notmatch "mse-demo__summary--passed") {
        throw "As verificações registradas no DOM não foram concluídas com sucesso."
    }

    $mobileDomPath = Join-Path $outputRoot "viewport-320.html"
    $mobileProfile = Join-Path $outputRoot "profile-$PID-mobile-dom"
    Invoke-EdgeCapture `
        -Arguments @(
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--virtual-time-budget=5000",
            "--user-data-dir=$mobileProfile",
            "--window-size=600,1400",
            "--dump-dom",
            $viewportUrl
        ) `
        -Artifact $mobileDomPath `
        -ProfileRoot $mobileProfile `
        -StandardOutput $mobileDomPath

    $mobileDom = Get-Content -LiteralPath $mobileDomPath -Encoding UTF8 -Raw
    if ($mobileDom -notmatch 'data-mse-test-status="passed"') {
        throw "O viewport real de 320px apresentou falha ou overflow horizontal."
    }

    $forumDomPath = Join-Path $outputRoot "forum-rendered.html"
    $forumProfile = Join-Path $outputRoot "profile-$PID-forum-dom"
    Invoke-EdgeCapture `
        -Arguments @(
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--virtual-time-budget=5000",
            "--user-data-dir=$forumProfile",
            "--window-size=1366,1400",
            "--dump-dom",
            $forumUrl
        ) `
        -Artifact $forumDomPath `
        -ProfileRoot $forumProfile `
        -StandardOutput $forumDomPath

    $forumDom = Get-Content -LiteralPath $forumDomPath -Encoding UTF8 -Raw
    if ($forumDom -notmatch 'data-mse-test-status="passed"') {
        throw "O corte visual do fórum apresentou falha funcional ou overflow horizontal."
    }

    foreach ($width in 320, 768, 1366, 1920, 2560) {
        $screenshot = Join-Path $outputRoot "mse-core-$width.png"
        $screenshotProfile = Join-Path $outputRoot "profile-$PID-$width"
        $captureUrl = if ($width -eq 320) { $viewportUrl } else { $url }
        $windowWidth = if ($width -eq 320) { 600 } else { $width }
        $windowHeight = if ($width -eq 320) { 1400 } else { 1200 }
        Invoke-EdgeCapture `
            -Arguments @(
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--no-first-run",
                "--virtual-time-budget=3000",
                "--user-data-dir=$screenshotProfile",
                "--window-size=$windowWidth,$windowHeight",
                "--screenshot=$screenshot",
                $captureUrl
            ) `
            -Artifact $screenshot `
            -ProfileRoot $screenshotProfile
    }

    foreach ($width in 600, 1366) {
        $screenshot = Join-Path $outputRoot "mse-forum-$width.png"
        $screenshotProfile = Join-Path $outputRoot "profile-$PID-forum-$width"
        Invoke-EdgeCapture `
            -Arguments @(
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--no-first-run",
                "--virtual-time-budget=5000",
                "--user-data-dir=$screenshotProfile",
                "--window-size=$width,1400",
                "--screenshot=$screenshot",
                $forumUrl
            ) `
            -Artifact $screenshot `
            -ProfileRoot $screenshotProfile
    }

    Write-Output "Edge smoke: verificações concluídas com sucesso."
    Write-Output "Evidências: $outputRoot"
} finally {
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force
    }
}
