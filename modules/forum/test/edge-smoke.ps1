param(
    [int]$Port = 4175
)

$ErrorActionPreference = "Stop"
$edge = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { throw "Microsoft Edge não encontrado." }

$forumRoot = Split-Path -Parent $PSScriptRoot
$repository = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $forumRoot))
$output = Join-Path ([IO.Path]::GetTempPath()) "mse-forum-edge-smoke"
$webRoot = Join-Path $output "webroot"
$edgeError = Join-Path $output "edge.err.log"
$serverOutput = Join-Path $output "server.out.log"
$serverError = Join-Path $output "server.err.log"
$url = "http://127.0.0.1:$Port/mse-platform/modules/forum/demo/index.html"
New-Item -ItemType Directory -Path $output -Force | Out-Null
if (Test-Path -LiteralPath $webRoot) {
    $resolvedWebRoot = (Resolve-Path -LiteralPath $webRoot).Path
    if (-not $resolvedWebRoot.StartsWith($output, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Pasta temporária inesperada: $resolvedWebRoot"
    }
    Remove-Item -LiteralPath $resolvedWebRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $webRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repository "mse-platform") -Destination (Join-Path $webRoot "mse-platform") -Recurse -Force

$server = Start-Process python `
    -ArgumentList "-m", "http.server", $Port, "--bind", "127.0.0.1" `
    -WorkingDirectory $webRoot `
    -RedirectStandardOutput $serverOutput `
    -RedirectStandardError $serverError `
    -WindowStyle Hidden `
    -PassThru

try {
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 100
        try { $ready = (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1).StatusCode -eq 200 } catch { $ready = $false }
    } until ($ready -or [DateTime]::UtcNow -ge $deadline)
    if (-not $ready) { throw "O preview não respondeu em $url." }

    foreach ($width in 600, 1366) {
        $profile = Join-Path $output "profile-$PID-$width"
        $dom = Join-Path $output "forum-$width.txt"
        if (Test-Path -LiteralPath $dom) { Remove-Item -LiteralPath $dom -Force }
        $process = Start-Process $edge `
            -ArgumentList @(
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--virtual-time-budget=8000",
                "--user-data-dir=$profile",
                "--window-size=$width,1400",
                "--dump-dom",
                $url
            ) `
            -RedirectStandardOutput $dom `
            -RedirectStandardError $edgeError `
            -WindowStyle Hidden `
            -PassThru
        if (-not $process.WaitForExit(30000)) {
            Stop-Process -Id $process.Id -Force
            throw "O Edge não concluiu o smoke do fórum em $width px."
        }
        $rendered = Get-Content -LiteralPath $dom -Encoding UTF8 -Raw
        if ($rendered -notmatch 'data-mse-test-status="passed"') {
            $status = [regex]::Match($rendered, '<p id="forum-demo-status"[^>]*>(.*?)</p>').Groups[1].Value
            throw "O smoke do fórum falhou em $width px: $status"
        }
        $status = [regex]::Match($rendered, '<p id="forum-demo-status"[^>]*>(.*?)</p>').Groups[1].Value
        Write-Output "Edge smoke do fórum em $width px: $status"
        Write-Output "Evidência: $dom"
    }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
