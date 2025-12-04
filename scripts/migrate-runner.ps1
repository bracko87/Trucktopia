<#
.SYNOPSIS
  migrate-runner.ps1
.DESCRIPTION
  PowerShell helper to perform safe migrations via the Netlify migrate function.
  - Performs a dry-run first (prints normalizedRows)
  - Prompts for confirmation
  - Performs real run (upsert) when confirmed
  - Supports optional batching for large payload files

USAGE:
  .\migrate-runner.ps1 -Endpoint "https://your-site.netlify.app/.netlify/functions/migrate" `
                      -AdminToken "xxxx" `
                      -Collection users `
                      -PayloadFile ".\users.json" `
                      -BatchSize 200

NOTES:
  - Ensure your payload JSON is either:
    * an object with collection_name / payload / metadata or
    * a raw array/object - the server normalizer will handle it
  - The function will perform upsert into known tables (users, companies, hubs) when available.

#>

param(
  [Parameter(Mandatory = $true)]
  [string] $Endpoint,

  [Parameter(Mandatory = $true)]
  [string] $AdminToken,

  [Parameter(Mandatory = $true)]
  [ValidateSet("users","companies","hubs","migration_items","other")]
  [string] $Collection,

  [Parameter(Mandatory = $true)]
  [string] $PayloadFile,

  [int] $BatchSize = 0, # 0 => single request; >0 chunked payload arrays

  [switch] $ConfirmAuto # skip prompt and run real
)

function Read-JsonFile {
  param([string]$path)
  if (-not (Test-Path $path)) {
    throw "Payload file not found: $path"
  }
  $raw = Get-Content -Raw -Path $path -ErrorAction Stop
  try {
    return ConvertFrom-Json -InputObject $raw -ErrorAction Stop
  } catch {
    throw "Invalid JSON in payload file: $($_.Exception.Message)"
  }
}

function Invoke-Migrate {
  param(
    [string]$endpoint,
    [string]$adminToken,
    [object]$body,
    [switch]$dryRun
  )

  $headers = @{
    Authorization = "Bearer $adminToken"
    "Content-Type" = "application/json"
  }
  if ($dryRun) { $headers["X-Dry-Run"] = "true" }

  $json = $body | ConvertTo-Json -Depth 20
  try {
    $res = Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $json -ErrorAction Stop
    return $res
  } catch {
    Write-Error "Request failed: $($_.Exception.Message)"
    if ($_.Exception.Response -and ($_.Exception.Response | Select-Object -ExpandProperty StatusCode -ErrorAction SilentlyContinue)) {
      Write-Error "HTTP status: $($_.Exception.Response.StatusCode.Value__)"
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $sr = New-Object System.IO.StreamReader($stream)
        $txt = $sr.ReadToEnd()
        Write-Error "Body: $txt"
      }
    }
    throw $_
  }
}

# Main
Write-Host "Migrator Runner"
Write-Host "Endpoint: $Endpoint"
Write-Host "Collection: $Collection"
Write-Host "Payload: $PayloadFile"
Write-Host "BatchSize: $BatchSize"
Write-Host ""

$payload = Read-JsonFile -path $PayloadFile

# Build request payload envelope. The function normalizer accepts many shapes; provide collection wrapper to be explicit.
$envelope = @{
  collection_name = $Collection
  payload = $payload
  metadata = @{
    migrated_by = "migrate-runner.ps1"
    migrated_at = (Get-Date).ToString("o")
  }
}

# Dry-run
Write-Host "`n--- Dry-run (no inserts) ---`n"
$dryRes = Invoke-Migrate -endpoint $Endpoint -adminToken $AdminToken -body $envelope -dryRun
Write-Host "Dry-run response:"
$dryRes | ConvertTo-Json -Depth 10
Write-Host ""

# Show normalizedRows summary if present
if ($dryRes.normalizedRows) {
  Write-Host "Normalized rows count: $($dryRes.normalizedRows.Count)"
}

if (-not $ConfirmAuto) {
  $answer = Read-Host "Proceed to real run (will perform upsert into SUPABASE via function)? Type 'yes' to confirm"
  if ($answer -ne 'yes') {
    Write-Host "Aborted by user."
    exit 0
  }
} else {
  Write-Host "Auto-confirm enabled: proceeding to real run..."
}

# Real run (optionally batched)
if ($BatchSize -gt 0 -and $payload -is [System.Collections.IEnumerable]) {
  # If payload is an array, chunk; else, send one chunk with the object.
  $items = @()
  if ($payload -is [System.Collections.IEnumerable] -and -not ($payload -is [string])) {
    $items = @($payload)
    # payload may already be array-like ConvertFrom-Json yields arrays as ArrayList
    if ($items.Count -eq 1 -and ($items[0] -is [System.Collections.IEnumerable]) -and -not ($items[0] -is [string])) {
      $items = @($items[0])
    }
  } else {
    $items = @($payload)
  }

  $total = $items.Count
  $index = 0
  while ($index -lt $total) {
    $chunk = $items[$index..[math]::Min($index + $BatchSize - 1, $total - 1)]
    $chunkEnvelope = @{
      collection_name = $Collection
      payload = @{ items = $chunk }
      metadata = $envelope.metadata
    }
    Write-Host "Sending chunk $([int]($index/$BatchSize + 1)) (items: $($chunk.Count)) ..."
    $res = Invoke-Migrate -endpoint $Endpoint -adminToken $AdminToken -body $chunkEnvelope
    Write-Host ($res | ConvertTo-Json -Depth 10)
    $index += $BatchSize
  }
} else {
  # Single request
  Write-Host "`n--- Real run (upsert) ---`n"
  $realRes = Invoke-Migrate -endpoint $Endpoint -adminToken $AdminToken -body $envelope
  Write-Host "Real-run response:"
  $realRes | ConvertTo-Json -Depth 10
}

Write-Host "`nDone."