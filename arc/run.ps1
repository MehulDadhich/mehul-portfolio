# Starts Arc locally: the model server (llama.cpp, port 8081) and the Arc API (FastAPI, port 8000).
# Ctrl+C stops both. Run arc\setup.ps1 once first.
#
#   powershell -ExecutionPolicy Bypass -File arc\run.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\python.exe"
$server = Join-Path $root "bin\llama\llama-server.exe"
$model = if ($env:ARC_MODEL_FILE) { $env:ARC_MODEL_FILE } else { Join-Path $root "models\Llama-3.2-3B-Instruct-Q4_K_M.gguf" }
foreach ($need in $py, $server, $model) {
    if (-not (Test-Path $need)) { throw "$need is missing: run arc\setup.ps1 first" }
}
# an Arc left running elsewhere would keep serving old code while this one fails to start
foreach ($port in 8000, 8081) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use: Arc may already be running in another window. Close it (Ctrl+C) and try again."
    }
}

# -ngl 99 puts every layer on the GPU (ignored by the CPU build); one slot, since answers stream one at a time
$llama = Start-Process -FilePath $server -PassThru -NoNewWindow -RedirectStandardError (Join-Path $root "llama-server.log") -ArgumentList @(
    "-m", "`"$model`"", "--host", "127.0.0.1", "--port", "8081", "-c", "8192", "-ngl", "99", "-np", "1", "--jinja"
)
try {
    Write-Host "Loading the model (log: arc\llama-server.log)..."
    for ($i = 0; $i -lt 120; $i++) {
        if ($llama.HasExited) { throw "llama-server exited: see arc\llama-server.log" }
        try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8081/health -TimeoutSec 2).StatusCode -eq 200) { break } } catch {}
        Start-Sleep -Milliseconds 500
    }
    Write-Host "Model ready. Starting the Arc API on http://127.0.0.1:8000"
    Push-Location (Join-Path $root "server")
    & $py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
} finally {
    Pop-Location -ErrorAction SilentlyContinue
    if (-not $llama.HasExited) { Stop-Process -Id $llama.Id -Force }
}
