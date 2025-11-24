<#
.SYNOPSIS
  Supabase health-check helper (plain input).
.DESCRIPTION
  Prompts for a Supabase service-role key (visible paste to avoid paste-splitting), runs two sanity checks
  against the migrated_collections table, prints JSON results or detailed error info (including HTTP response body),
  and clears the key variable from memory. If the second query fails because the column doesn't exist the script
  prints a clear note and exits successfully with the first result.
.NOTES
  - Run from project root:
      .\scripts\supabase-check-plain.ps1
    If ExecutionPolicy blocks:
      powershell -ExecutionPolicy Bypass -File .\scripts\supabase-check-plain.ps1
#>

param()

function TryInvoke {
  <#
  .SYNOPSIS
    Make a GET request and print JSON or detailed error output.
  .PARAMETER Uri
    The full request URI.
  .PARAMETER Headers
    Hashtable of headers.
  #>
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][hashtable]$Headers
  )

  Write-Host "`n== Requesting: $Uri`n" -ForegroundColor Cyan
  try {
    $res = Invoke-RestMethod -Uri $Uri -Headers $Headers -Method GET -ErrorAction Stop
    $json = $res | ConvertTo-Json -Depth 10
    Write-Host "== Success: JSON result ==`n" -ForegroundColor Green
    Write-Output $json
    return @{ success = $true; body = $res }
  } catch {
    Write-Host "== Request failed ==" -ForegroundColor Red
    Write-Host "Error message: $($_.Exception.Message)" -ForegroundColor Red

    # Try to read HTTP response body (if any)
    $respBody = $null
    if ($_.Exception.Response -ne $null) {
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $respBody = $reader.ReadToEnd()
        if (-not [string]::IsNullOrWhiteSpace($respBody)) {
          Write-Host "`n== Response body ==`n" -ForegroundColor Yellow
          Write-Output $respBody
        } else {
          Write-Host "Response body was empty." -ForegroundColor Yellow
        }
      } catch {
        Write-Host "Failed to read response body: $($_.Exception.Message)" -ForegroundColor Yellow
      }
    } else {
      Write-Host "No HTTP response object available on the exception." -ForegroundColor Yellow
    }

    return @{ success = $false; body = $respBody; message = $_.Exception.Message }
  }
}

Write-Host "Supabase health-check helper (plain input). This will NOT save your key to disk." -ForegroundColor White

# Read visible key to avoid paste-splitting issues
$key = Read-Host "Paste your Supabase service role key (visible input)"
if (-not $key) {
  Write-Host "No key provided, exiting." -ForegroundColor Yellow
  exit 1
}

$headers = @{ Authorization = "Bearer $key"; apikey = $key }
$baseUri = "https://yzzcipizchqntbijktaj.supabase.co/rest/v1/migrated_collections?select=*"

# Query 1: by collection_key
$uri1 = $baseUri + "&collection_key=eq.health_check_supabase"
$result1 = TryInvoke -Uri $uri1 -Headers $headers

# Query 2: by collection_name
$uri2 = $baseUri + "&collection_name=eq.health_check_supabase"
$result2 = TryInvoke -Uri $uri2 -Headers $headers

# Interpret results
if ($result1.success) {
  Write-Host "`nHealth check (collection_key) PASSED." -ForegroundColor Green
} else {
  Write-Host "`nHealth check (collection_key) FAILED. See above for details." -ForegroundColor Red
}

if (-not $result2.success) {
  # If response body mentions missing column, explain and avoid alarm
  $body = $result2.body
  if ($body -and $body -match "collection_name.*does not exist") {
    Write-Host "`nNote: The migrated_collections table does not have a column named 'collection_name'." -ForegroundColor Yellow
    Write-Host "Your database uses 'collection_key' instead. If you expected collection_name, run this SQL in Supabase:" -ForegroundColor Yellow
    Write-Host "`n  SELECT column_name" -ForegroundColor Yellow
    Write-Host "  FROM information_schema.columns" -ForegroundColor Yellow
    Write-Host "  WHERE table_schema = 'public' AND table_name = 'migrated_collections'" -ForegroundColor Yellow
    Write-Host "  ORDER BY ordinal_position;" -ForegroundColor Yellow
    Write-Host "`nYou can also update your application to use collection_key (recommended)." -ForegroundColor Yellow
  } else {
    Write-Host "`nSecond query failed for another reason. See above for details." -ForegroundColor Red
  }
}

# Clear sensitive variable
try {
  Remove-Variable -Name key -ErrorAction SilentlyContinue
} catch { }
$key = $null

Write-Host "`nDone. The in-memory key variable was cleared." -ForegroundColor Gray
