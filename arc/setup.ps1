# One-time setup for running Arc locally on Windows:
#   1. a Python virtual environment with the API's packages
#   2. llama.cpp's server (CUDA build when an NVIDIA GPU is present, CPU build otherwise)
#   3. the model: Llama 3.2 3B Instruct, 4-bit GGUF (~2 GB)
#
#   powershell -ExecutionPolicy Bypass -File arc\setup.ps1

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # Invoke-WebRequest is very slow with its progress bar
$root = $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\python.exe"

Write-Host "== Python environment"
if (-not (Test-Path $py)) { python -m venv (Join-Path $root ".venv") }
& $py -m pip install --quiet --upgrade pip
& $py -m pip install --quiet -r (Join-Path $root "server\requirements.txt")
if ($LASTEXITCODE) { throw "pip install failed" }

Write-Host "== llama.cpp server"
$bin = Join-Path $root "bin\llama"
if (-not (Test-Path (Join-Path $bin "llama-server.exe"))) {
    $gpu = [bool](Get-Command nvidia-smi -ErrorAction SilentlyContinue)
    $flavour = if ($gpu) { "bin-win-cuda-12.4-x64.zip" } else { "bin-win-cpu-x64.zip" }
    # parentheses: Windows PowerShell passes a JSON array down the pipeline as one object otherwise
    $release = (Invoke-RestMethod "https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=5") |
        Where-Object { $_.assets.name -like "llama-*-$flavour" } | Select-Object -First 1
    New-Item -ItemType Directory -Force $bin | Out-Null
    # the CUDA build comes in two zips: llama.cpp itself and the CUDA runtime DLLs
    foreach ($asset in $release.assets | Where-Object { $_.name -like "*$flavour" }) {
        Write-Host "   $($asset.name) ($([math]::Round($asset.size / 1MB)) MB)"
        $zip = Join-Path $env:TEMP $asset.name
        curl.exe -sSL -o $zip $asset.browser_download_url
        Expand-Archive -Force $zip $bin
        Remove-Item $zip
    }
    # some releases nest the binaries in a folder
    $exe = Get-ChildItem $bin -Recurse -Filter llama-server.exe | Select-Object -First 1
    if ($exe.DirectoryName -ne $bin) { Get-ChildItem $exe.DirectoryName | Move-Item -Destination $bin -Force }
    Write-Host "   $($release.tag_name), $(if ($gpu) { 'CUDA' } else { 'CPU' })"
}

Write-Host "== Model"
$models = Join-Path $root "models"
$model = Join-Path $models "Llama-3.2-3B-Instruct-Q4_K_M.gguf"
New-Item -ItemType Directory -Force $models | Out-Null
if (-not (Test-Path $model) -or (Get-Item $model).Length -lt 2000000000) {
    # -C - resumes an interrupted download
    curl.exe -L -C - --fail -o $model "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
    if ($LASTEXITCODE) { throw "model download failed; run setup again to resume" }
}
Write-Host "   $model ($([math]::Round((Get-Item $model).Length / 1GB, 2)) GB)"

Write-Host "== Knowledge base"
Push-Location (Split-Path $root)
npm run --silent arc:knowledge
Pop-Location

Write-Host "`nDone. Start Arc with: powershell -ExecutionPolicy Bypass -File arc\run.ps1"
