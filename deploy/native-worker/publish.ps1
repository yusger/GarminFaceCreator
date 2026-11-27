$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$project=Join-Path $repoRoot 'simulator-worker/GarminFaceCreator.SimulatorWorker.csproj'
$tests=Join-Path $repoRoot 'simulator-worker/tests/SandboxTests.csproj'
$published=Join-Path $repoRoot 'Temp/native-worker-publish'
dotnet build $project -c Release --nologo
if($LASTEXITCODE -ne 0){throw 'Native worker build failed; no publish performed'}
dotnet run --project $tests -c Release
if($LASTEXITCODE -ne 0){throw 'Native worker checks failed; no publish performed'}
dotnet publish $project -c Release -p:UseAppHost=false -o $published --nologo
if($LASTEXITCODE -ne 0){throw 'Native worker publish failed; do not deploy previous outputs'}
Write-Host "Verified worker publish: $published"
