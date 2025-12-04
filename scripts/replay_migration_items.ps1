# scripts/replay_migration_items.ps1
#
# Purpose:
# - Fetch migration_items rows from a Supabase REST endpoint.
# - Repost each row payload to your migrate endpoint (optionally dry-run).
# - Optionally mark migration_items rows as replayed (metadata.replayed = true + replayed_at).
# - Save a detailed JSON log to ./logs/replay_log_YYYYMMDD_HHMMSS.json
#
# Usage (example):
#  # set your env / variables in the same session, then run the script:
#  $supabaseUrl = 'https://your-project.supabase.co'
#  $supabaseKey = 'YOUR_SERVICE_ROLE_KEY'
#  $migrateUrl = 'https://your-migrate-endpoint/.netlify/functions/migrate'
#  $migrateAuth = 'Bearer YOUR_NETLIFY_FUNCTION_TOKEN'
#  $limit = 200
#  $onlyCollection = ''    # optional: 'users'
#  $dryRun = $true         # true = don't modify remote tables, only preview
#  $markReplayed = $true   # true = PATCH migration_items after successful replay
#  $delaySeconds = 0.5
#  .\scripts\replay_migration_items.ps1
#
# Notes:
# - This script does NOT delete migration_items rows. Marking is a PATCH to metadata only.
# - The script is idempotent: you can dry-run first ($dryRun=$true) then run real ($dryRun=$false).
# - The script expects global variables as shown above; set them before invoking the script.
# - The script uses Invoke-RestMethod and requires PowerShell with internet access.
#
# Logging:
# - Creates ./logs directory if missing and writes a single JSON file with one object per item processed.
# - Each entry contains: id, collection, status, requestBody, response (raw).
#

# Basic validation of required variables
if (-not $supabaseUrl) {
    Write-Error "Missing $supabaseUrl. Please set: `\$supabaseUrl = 'https://...supabase.co'"
    exit 2
}
if (-not $supabaseKey) {
    Write-Error "Missing $supabaseKey. Please set: `\$supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'"
    exit 2
}
if (-not $migrateUrl) {
    Write-Error "Missing $migrateUrl. Please set: `\$migrateUrl = 'https://.../.netlify/functions/migrate'"
    exit 2
}
if (-not $migrateAuth) {
    Write-Warning "No migrateAuth provided. Continuing without Authorization header for migrate endpoint."
}

if (-not $limit) { $limit = 100 }
if (-not $delaySeconds) { $delaySeconds = 0.5 }
if (-not ($null -ne $onlyCollection)) { $onlyCollection = '' }
if (-not ($null -ne $dryRun)) { $dryRun = $false }
if (-not ($null -ne $markReplayed)) { $markReplayed = $false }

# Ensure logs directory exists
$logsDir = Join-Path -Path (Get-Location) -ChildPath "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -Path $logsDir -ItemType Directory | Out-Null
}

# Normalize base url (no trailing slash)
function Normalize-BaseUrl {
    param($u)
    return $u.TrimEnd('/')
}

$SUPABASE_URL = Normalize-BaseUrl $supabaseUrl
$SUPABASE_KEY = $supabaseKey
$MIGRATE_URL = $migrateUrl
$MIGRATE_AUTH = $migrateAuth

# Build supabase REST path
$select = "select=id,collection_name,payload,metadata,inserted_at"
$filter = "limit=$limit&order=inserted_at.asc"
if ($onlyCollection -and $onlyCollection.Trim() -ne '') {
    # exact match filter for collection_name
    $filter = "collection_name=eq.$([Uri]::EscapeDataString($onlyCollection))&$filter"
}

$fetchPath = "/rest/v1/migration_items`?$select&$filter"

$fetchUrl = "$SUPABASE_URL$fetchPath"

Write-Host "Replay migration_items started at $(Get-Date -Format o)"
Write-Host "Fetching up to $limit migration_items from Supabase..."
Write-Host "GET $fetchUrl"

try {
    $headers = @{ apikey = $SUPABASE_KEY; Authorization = "Bearer $SUPABASE_KEY" }
    $itemsResp = Invoke-RestMethod -Uri $fetchUrl -Headers $headers -Method GET -ErrorAction Stop
} catch {
    Write-Error "Failed to fetch migration_items: $($_.Exception.Message)"
    exit 3
}

# Supabase may return an array directly or a wrapper { value: [...] }
if ($itemsResp -is [System.Collections.IEnumerable] -and -not ($itemsResp.PSObject.Properties.Name -contains 'value')) {
    $items = $itemsResp
} elseif ($itemsResp.PSObject.Properties.Name -contains 'value') {
    $items = $itemsResp.value
} else {
    $items = @()
}

$count = ($items | Measure-Object).Count
Write-Host "Fetched $count items."

$logEntries = @()

$idx = 0
foreach ($it in $items) {
    $idx++
    $id = $it.id
    $collection = $it.collection_name
    $inserted_at = $it.inserted_at
    Write-Host "[$idx/$count] Replaying id=$id collection=$collection inserted_at=$inserted_at"

    # Build request body (keep original payload & metadata)
    $requestBodyObj = @{
        collection_name = $collection
        payload = $it.payload
        metadata = $it.metadata
    }
    $requestJson = $requestBodyObj | ConvertTo-Json -Depth 20

    # Prepare headers for migrate endpoint
    $migrateHeaders = @{ "Content-Type" = "application/json" }
    if ($MIGRATE_AUTH -and $MIGRATE_AUTH.Trim() -ne '') { $migrateHeaders.Authorization = $MIGRATE_AUTH }
    if ($dryRun) { $migrateHeaders["X-Dry-Run"] = "true" }

    # Post to migrate endpoint
    try {
        $resp = Invoke-RestMethod -Uri $MIGRATE_URL -Method POST -Headers $migrateHeaders -Body $requestJson -TimeoutSec 120 -ErrorAction Stop
        $entry = @{
            id = $id
            collection = $collection
            status = "ok"
            requestBody = $requestBodyObj
            response = $resp
            replayed_at = (Get-Date).ToString("o")
        }
        Write-Host "  -> Success"
    } catch {
        # Capture HTTP error / exception details
        $err = $_
        $respText = $err.Exception.Response | ForEach-Object { try { (New-Object System.IO.StreamReader($_.GetResponseStream())).ReadToEnd() } catch { $_.Exception.Message } }
        $entry = @{
            id = $id
            collection = $collection
            status = "error"
            errorMessage = $err.Exception.Message
            responseText = $respText
            requestBody = $requestBodyObj
            replayed_at = (Get-Date).ToString("o")
        }
        Write-Warning "  -> Error: $($err.Exception.Message)"
    }

    $logEntries += $entry

    # If success and marking enabled (and not dry-run), patch migration_items metadata.replayed = true
    if ($markReplayed -and -not $dryRun -and $entry.status -eq "ok") {
        try {
            $patchBody = @{ metadata = @{ replayed = $true; replayed_at = (Get-Date).ToString("o") } } | ConvertTo-Json -Depth 10
            $patchUrl = "$SUPABASE_URL/rest/v1/migration_items?id=eq.$id"
            Invoke-RestMethod -Uri $patchUrl -Method PATCH -Headers @{ apikey = $SUPABASE_KEY; Authorization = "Bearer $SUPABASE_KEY"; "Content-Type" = "application/json" } -Body $patchBody -ErrorAction Stop
            Write-Host "    -> Marked as replayed (id=$id)"
            # annotate log entry
            $entry.marked_replayed = $true
        } catch {
            Write-Warning "    -> Failed to mark replayed for id=$id : $($_.Exception.Message)"
            $entry.marked_replayed = $false
            $entry.marked_replayed_error = $_.Exception.Message
        }
    }

    # Respect delay between requests
    Start-Sleep -Seconds $delaySeconds
}

# Save log file
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir "replay_log_$ts.json"
($logEntries | ConvertTo-Json -Depth 20) | Out-File -FilePath $logPath -Encoding UTF8
Write-Host "Replay finished at $(Get-Date -Format o)"
Write-Host "Total processed: $($logEntries.Count)"
$errors = ($logEntries | Where-Object { $_.status -ne "ok" }).Count
Write-Host "Errors: $errors"
$successCount = ($logEntries | Where-Object { $_.status -eq "ok" }).Count
Write-Host "Success entries logged: $successCount"
Write-Host "Detailed log saved to $logPath"
