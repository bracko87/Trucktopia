<#
.SYNOPSIS
  Replay migration_items rows by POSTing their payloads to the migrate endpoint.

.DESCRIPTION
  This PowerShell script fetches migration_items rows from a Supabase REST endpoint
  and re-sends each row's payload to the configured migrate function endpoint.
  Use this to re-process previously-stored migration rows through the updated
  /migrate function (which performs upserts into users/companies/hubs).

.NOTES
  - Requires PowerShell 5+ or PowerShell 7+
#>

# -------------------------
# Configuration
# -------------------------
$supabaseUrl = 'https://earcqjwonukjjufsmffk.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhcmNxandvbnVramp1ZnNtZmZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgyMjcyNiwiZXhwIjoyMDgwMzk4NzI2fQ.HMhDYg8RJHBO4GuIzG9qfndbEX2CGfiwAf1Qlmk-i8I'
$migrateUrl = 'https://tracktopiasandbox.netlify.app/.netlify/functions/migrate'
$migrateAuth = 'Bearer 7c541df6-5f09-405e-a9ca-cf196c8bea59'
$limit = 50
$onlyCollection = ''    # optional: 'users'
$dryRun = $false        # set $true for a dry-run
$delaySeconds = 0.5

# -------------------------
# Helper functions
# -------------------------
function Build-FetchUrl {
    param ($baseUrl, $limit, $onlyCollection)
    $encodedLimit = [System.Uri]::EscapeDataString($limit.ToString())
    $select = "select=id,collection_name,payload,metadata,inserted_at"
    $order = "order=inserted_at.asc"
    $filter = ""
    if ($onlyCollection -and $onlyCollection.Trim() -ne '') {
        $filter = "collection_name=eq.$([System.Uri]::EscapeDataString($onlyCollection))&"
    }
    return "/rest/v1/migration_items?$select&$filter&limit=$encodedLimit&$order"
}

function Safe-InvokeRestMethod {
    param($method, $url, $headers, $body)
    try {
        if ($body) {
            return Invoke-RestMethod -Uri $url -Method $method -Headers $headers -Body $body -ContentType 'application/json' -TimeoutSec 120
        } else {
            return Invoke-RestMethod -Uri $url -Method $method -Headers $headers -TimeoutSec 120
        }
    } catch {
        $err = $_
        $respBody = $null
        if ($err.Exception.Response -ne $null) {
            try {
                $stream = $err.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $respBody = $reader.ReadToEnd()
            } catch {
                $respBody = $err.Exception.Message
            }
        } else {
            $respBody = $err.Exception.Message
        }
        return @{ __error = $true; message = $err.Exception.Message; response = $respBody }
    }
}

# -------------------------
# Main
# -------------------------
Write-Host "Replay migration_items started at $(Get-Date -Format o)"

# Build fetch URL
$fetchPath = Build-FetchUrl -baseUrl $supabaseUrl -limit $limit -onlyCollection $onlyCollection
$fetchUrl = ($supabaseUrl.TrimEnd('/')) + $fetchPath

$headers = @{
    apikey = $supabaseKey
    Authorization = "Bearer $supabaseKey"
}

Write-Host "Fetching up to $limit migration_items from Supabase..."
Write-Host "GET $fetchUrl"
$items = Safe-InvokeRestMethod -method 'GET' -url $fetchUrl -headers $headers -body $null

if ($null -eq $items) {
    Write-Host "No items returned or fetch failed." -ForegroundColor Yellow
    exit 1
}

if ($items -isnot [System.Array]) { $items = ,$items }
Write-Host "Fetched $($items.Count) items."

$counter = 0
$successCount = 0
$errorCount = 0
$fallbackCount = 0
$summary = @()

foreach ($row in $items) {
    $counter++
    $id = $row.id
    $collection = $row.collection_name
    $insertedAt = $row.inserted_at

    Write-Host "[$counter/$($items.Count)] Replaying id=$id collection=$collection inserted_at=$insertedAt"

    $reqObj = @{
        collection_name = $collection
        payload = $row.payload
        metadata = $row.metadata
    }

    $jsonBody = $null
    try { $jsonBody = $reqObj | ConvertTo-Json -Depth 10 } catch {
        Write-Warning "Failed to convert payload to JSON for id=$id. Skipping."
        $errorCount++
        $summary += @{ id=$id; collection=$collection; status='json-serialize-failed'; message=$_.Exception.Message }
        continue
    }

    $postHeaders = @{ 'Content-Type'='application/json'; Authorization=$migrateAuth }
    if ($dryRun) { $postHeaders['X-Dry-Run'] = 'true' }

    $resp = Safe-InvokeRestMethod -method 'POST' -url $migrateUrl -headers $postHeaders -body $jsonBody

    if ($null -eq $resp) {
        Write-Host "  -> No response (null). Marking as error." -ForegroundColor Red
        $errorCount++
        $summary += @{ id=$id; collection=$collection; status='no-response' }
    } elseif ($resp -is [hashtable] -and $resp.__error -eq $true) {
        Write-Host "  -> HTTP error: $($resp.message)" -ForegroundColor Red
        $errorCount++
        $summary += @{ id=$id; collection=$collection; status='http-error'; message=$resp.response }
    } else {
        Write-Host "  -> Success" -ForegroundColor Green
        $successCount++
        $summary += @{ id=$id; collection=$collection; status='ok'; response=$resp }
    }

    Start-Sleep -Seconds $delaySeconds
}

Write-Host "Replay finished at $(Get-Date -Format o)"
Write-Host "Total processed: $counter"
Write-Host "Errors: $errorCount"
Write-Host "Success entries logged: $successCount"

# Optional: save JSON log
$logDir = Join-Path -Path (Get-Location) -ChildPath 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("replay_log_{0:yyyyMMdd_HHmmss}.json" -f (Get-Date))
$summary | ConvertTo-Json -Depth 10 | Out-File -FilePath $logFile -Encoding utf8
Write-Host "Detailed log saved to $logFile"
Write-Host "Done."
