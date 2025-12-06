#
# scripts/patch-migrated-collections.ps1
#
# Safe per-row patcher for migrated_collections.metadata.
# - Ensures metadata is normalized into a mutable object before mutation.
# - Sets metadata.imported = $true and metadata.imported_at to the current ISO timestamp.
# - PATCHes only the metadata column (idempotent).
# - Prints verification JSON at the end.
#

# IDs to patch (edit as needed)
$ids = @( '18739020-eda3-4415-bf51-b7264a0a40c8', '1330cf10-befe-4c03-b56b-352c80b471ed', 'bfd2eab7-fda1-4c49-8e3e-08e0cdc1f57a', '5e7b1ea3-b719-4fd0-b3b8-00abf6078d34', 'db315a0a-edd4-4153-88d8-03b91d505ea6' )

# Supabase base and service role key from environment
$base = $env:SUPABASE_URL
$key = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $base -or -not $key) {
    Write-Host "Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in the environment." -ForegroundColor Red
    exit 2
}

#-----------------------------------------
# Helper: Normalize metadata to mutable PSCustomObject/hashtable
# - If metadata is null -> return empty hashtable
# - If metadata is string -> try ConvertFrom-Json
# - If metadata is already an object -> try to convert into PSCustomObject
# - Fallback: wrap raw value into 'raw' field
function Normalize-Metadata {
    param($meta)

    if ($null -eq $meta) {
        return @{}
    }

    # If it's already a hashtable or PSCustomObject, return a shallow copy
    if ($meta -is [hashtable]) {
        return @{} + $meta
    }
    if ($meta -is [System.Management.Automation.PSCustomObject]) {
        # return a copy to avoid readonly behavior
        $copy = @{}
        foreach ($k in $meta.PSObject.Properties.Name) { $copy[$k] = $meta.$k }
        return $copy
    }

    # If it's a string, attempt to parse as JSON
    if ($meta -is [string]) {
        try {
            $parsed = $meta | ConvertFrom-Json -ErrorAction Stop
            # ConvertFrom-Json returns PSCustomObject (good)
            $copy = @{}
            foreach ($k in $parsed.PSObject.Properties.Name) { $copy[$k] = $parsed.$k }
            return $copy
        } catch {
            # Not JSON — store raw
            return @{ raw = $meta }
        }
    }

    # For other types (JsonElement, JObject, etc), attempt conversion via ConvertTo-Json then ConvertFrom-Json
    try {
        $json = $meta | ConvertTo-Json -Depth 10 -ErrorAction Stop
        $parsed = $json | ConvertFrom-Json
        $copy = @{}
        foreach ($k in $parsed.PSObject.Properties.Name) { $copy[$k] = $parsed.$k }
        return $copy
    } catch {
        # As last resort, wrap the value
        return @{ raw = [string]$meta }
    }
}
#-----------------------------------------

Write-Host "Patching $($ids.Count) migrated_collections rows..." -ForegroundColor Cyan

foreach ($id in $ids) {
    try {
        # Fetch row (id + metadata)
        $getUri = "$base/rest/v1/migrated_collections?select=id,metadata&id=eq.$id"
        $row = Invoke-RestMethod -Uri $getUri -Headers @{ apikey = $key; Authorization = "Bearer $key" } -Method Get

        if (-not $row -or $row.Count -eq 0) {
            Write-Host "Row not found for id $id" -ForegroundColor Yellow
            continue
        }

        $rawMeta = $row[0].metadata
        $existingMeta = Normalize-Metadata $rawMeta

        # Ensure 'imported' and 'imported_at' are present and settable
        $existingMeta.imported = $true
        $existingMeta.imported_at = (Get-Date).ToString("o")

        # Prepare body and PATCH only metadata
        $body = @{ metadata = $existingMeta } | ConvertTo-Json -Depth 10

        $patchUri = "$base/rest/v1/migrated_collections?id=eq.$id"
        Invoke-RestMethod -Uri $patchUri -Method Patch -Headers @{ apikey = $key; Authorization = "Bearer $key"; 'Content-Type' = 'application/json' } -Body $body

        Write-Host "Patched $id" -ForegroundColor Green
        Start-Sleep -Milliseconds 150
    } catch {
        # Safely extract error message and print
        $errMsg = $null
        if ($_.Exception -ne $null -and $_.Exception.Message) { $errMsg = $_.Exception.Message } else { $errMsg = $_.ToString() }
        Write-Host ("Error patching {0}: {1}" -f $id, $errMsg) -ForegroundColor Red
    }
}

# Verification: fetch patched rows and print JSON
Write-Host "`nVerification: fetching patched rows..." -ForegroundColor Cyan
$idsList = ($ids -join ',')
$verifyUri = "$base/rest/v1/migrated_collections?select=id,metadata&id=in.($idsList)"
try {
    $verify = Invoke-RestMethod -Uri $verifyUri -Headers @{ apikey = $key; Authorization = "Bearer $key" } -Method Get
    $verify | ConvertTo-Json -Depth 6
} catch {
    $err = if ($_.Exception -ne $null) { $_.Exception.Message } else { $_.ToString() }
    Write-Host "Verification fetch failed: $err" -ForegroundColor Yellow
}
