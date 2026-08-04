# Force-redeploy Vercel project `modo-web` (modo.io.kr) to Production.
# Uses the latest Production deployment as the source (avoids uploading the monorepo).
#
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/force-deploy-web.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/force-deploy-web.ps1 -Project admin

param(
  [ValidateSet("web", "admin")]
  [string]$Project = "web"
)

$ErrorActionPreference = "Stop"

$map = @{
  web   = @{ Name = "modo-web"; Domain = "modo.io.kr" }
  admin = @{ Name = "modo";     Domain = "admin.modo.mom" }
}

$target = $map[$Project]
Write-Host "==> Force redeploy $($target.Name) ($($target.Domain))" -ForegroundColor Cyan

# Latest Production deployment URL for this project
$ls = vercel ls $target.Name 2>&1 | Out-String
$url = ($ls -split "`n" |
  Where-Object { $_ -match "https://\S+\.vercel\.app" -and $_ -match "Production" } |
  Select-Object -First 1)
if (-not $url) {
  # Fallback: first https URL in the table (newest)
  $url = ([regex]::Match($ls, "https://[a-z0-9-]+\.vercel\.app")).Value
}
if (-not $url) {
  throw "Could not find a deployment URL for $($target.Name). Are you logged in? (vercel whoami)"
}

$url = ($url -split "\s+" | Where-Object { $_ -like "https://*.vercel.app" } | Select-Object -First 1)
Write-Host "==> Redeploying: $url" -ForegroundColor Yellow

vercel redeploy $url --target production
if ($LASTEXITCODE -ne 0) { throw "vercel redeploy failed (exit $LASTEXITCODE)" }

Write-Host "==> Done. Check https://$($target.Domain)" -ForegroundColor Green
