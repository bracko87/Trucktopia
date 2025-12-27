/**
 * finance-idempotency-test.ps1
 *
 * PowerShell script to test finance-apply idempotency:
 * - Sends two POSTs with the same idempotencyKey and prints responses.
 *
 * Usage:
 *   Open PowerShell and run:
 *     .\finance-idempotency-test.ps1
 *
 * Configure the variables below if needed.
 */

# Config
$endpoint = "https://www.trucktopia.org/.netlify/functions/finance-apply"
$companyId = "<PASTE_COMPANY_ID_HERE>"
$serviceRole = "<PASTE_SERVICE_ROLE_HERE>" # optional: used for debugging header if needed

# Build a single idempotency key for both requests
$ikey = [guid]::NewGuid().ToString()

# Common headers
$headers = @{
  "Content-Type" = "application/json"
  # Optional extra headers used in your environment. Keep only if required.
  "x-dev-bypass" = "1"
  "x-service-role" = $serviceRole
}

# Request body template
$bodyTemplate = @{
  companyId = $companyId
  deltaCents = 10000
  type = "income"
  description = "E2E idempotency test"
  idempotencyKey = $ikey
  meta = @{}
}

function Send-Apply {
  param($attempt)
  $b = $bodyTemplate | ConvertTo-Json -Depth 10
  Write-Host "=== Attempt $attempt ==="
  try {
    $resp = Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $b -ContentType 'application/json'
    Write-Host "Success:" $resp.success
    Write-Host "Transaction id:" $resp.transaction.id
    Write-Host "NewBalanceCents:" $resp.newBalanceCents
    return $resp
  } catch {
    Write-Host "Error:" $_.Exception.Message
    return $null
  }
}

# Run twice with same idempotency key
$r1 = Send-Apply -attempt 1
Start-Sleep -Seconds 1
$r2 = Send-Apply -attempt 2

Write-Host "`nSummary"
Write-Host "Idempotency key:" $ikey
Write-Host "First tx id:" ($r1.transaction.id -as [string])
Write-Host "Second tx id:" ($r2.transaction.id -as [string])