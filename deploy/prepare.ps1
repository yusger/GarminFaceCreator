$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
dotnet publish backend/GarminFaceCreator.Api.csproj -c Release -p:UseAppHost=false -o deploy/publish
if ($LASTEXITCODE -ne 0) { throw 'Backend publish failed' }
Write-Host 'Upload the source, dist and deploy/publish to /opt/garminfacecreator; preserve runtime/.'
Write-Host 'On server: docker compose build && docker compose up -d'