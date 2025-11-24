<#
.SYNOPSIS
  scripts\post-by-collection.ps1

.DESCRIPTION
  Split a full payload (full-payload.json) into per-collection POSTs to the migrate function.
  Usage:
    .\post-by-collection.ps1 -PayloadPath .\full-payload.json -Endpoint 'https://test25h.netlify.app/.netlify/functions/migrate' -Token 'YOUR_TOKEN'

.NOTES
  Requires PowerShell 7+ for improved JSON handling. Works in Windows PowerShell as well but consider PS7.
#>

param (
  [string]$PayloadPath = ".\full-payload.json",
  [string]$Endpoint = "https://test25h.netlify.app/.netlify/functions/migrate",
  [string]$Token = $(throw "Provide -Token or set MIGRATE_ADMIN_TOKEN environment variable.")
)

if (-not (Test-Path $PayloadPath)) {
  Write-Error "Payload file not found: $PayloadPath"
  exit 2
}

$raw = Get-Content -Path $PayloadPath -Raw
$payload = $raw | ConvertFrom-Json

$metadata = $payload.metadata
$collections = $payload.collections

if (-not $collections) {
  Write-Error "No collections found in payload."
  exit 3
}

$results = @()

foreach ($key in $collections.PSObject.Properties.Name) {
  $items = $collections.$key
  $bodyObj = @{
    metadata = $metadata
    collections = @{ ($key) = $items }
  }
  $jsonBody = $bodyObj | ConvertTo-Json -Depth 10

  Write-Host "Posting collection: $key (items: $($items.Count))"
  try {
    $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" } -Body $jsonBody
    $results += [PSCustomObject]@{ collection = $key; ok = $true; response = $resp }
    Write-Host " -> $key: OK"
  } catch {
    $err = $_.Exception
    $results += [PSCustomObject]@{ collection = $key; ok = $false; error = $err.Message }
    Write-Host " -> $key: FAIL - $($err.Message)" -ForegroundColor Red
  }

  Start-Sleep -Milliseconds 200
}

Write-Host "Summary:"
$results | Format-Table -AutoSize
