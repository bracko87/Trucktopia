#
# scripts/supabase-check.ps1
#
# Purpose:
# - Safely run two Supabase REST queries that return the migrated_collections rows
# - Avoid one-line paste problems by prompting you for the service-role key and using a hashtable
# - Print JSON (ConvertTo-Json -Depth 5) or show a helpful error
#
# Security:
# - The script does NOT save your key to disk. It only holds it in memory for the request.
# - Do NOT commit your service-role key to the repository.
#

param()

try {
  # Prompt for the Supabase Service Role Key (no echo)
  $secureKey = Read-Host -Prompt "Enter Supabase SERVICE ROLE KEY (won't be saved)" -AsSecureString
  if (-not $secureKey) {
    Write-Host "No key provided. Exiting." -ForegroundColor Yellow
    exit 1
  }

  # Convert secure string to plain text only in-memory for the HTTP header
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $sr = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

  # Prepare headers safely as a hashtable (avoid inline header pitfalls when pasting)
  $headers = @{
    Authorization = "Bearer $sr"
    apikey = $sr
  }

  # Endpoint base
  $baseUrl = "https://yzzcipizchqntbijktaj.supabase.co/rest/v1/migrated_collections"

  Write-Host ""
  Write-Host "Running primary query (collection_key)..." -ForegroundColor Cyan
  $uri1 = "$baseUrl?select=*&collection_key=eq.health_check_supabase"
  try {
    $res1 = Invoke-RestMethod -Uri $uri1 -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "Primary query result:" -ForegroundColor Green
    $res1 | ConvertTo-Json -Depth 5 | Write-Output
  } catch {
    Write-Host "Primary query failed or returned no rows. Error message / details below:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
  }

  Write-Host ""
  Write-Host "Running fallback query (collection_name)..." -ForegroundColor Cyan
  $uri2 = "$baseUrl?select=*&collection_name=eq.health_check_supabase"
  try {
    $res2 = Invoke-RestMethod -Uri $uri2 -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "Fallback query result:" -ForegroundColor Green
    $res2 | ConvertTo-Json -Depth 5 | Write-Output
  } catch {
    Write-Host "Fallback query failed or returned no rows. Error message / details below:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
  }

  # Clear secret variable from memory (best-effort)
  Remove-Variable sr -ErrorAction SilentlyContinue
  Remove-Variable secureKey -ErrorAction SilentlyContinue
  Remove-Variable headers -ErrorAction SilentlyContinue
}
catch {
  Write-Host "Unexpected error while running script:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}