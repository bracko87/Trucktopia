<#
/**
 * generate-admin-token.ps1
 *
 * PowerShell script to generate a 32-byte (256-bit) cryptographically secure hex admin token.
 *
 * Usage:
 *  - Run in PowerShell: .\scripts\generate-admin-token.ps1
 *  - If execution policy blocks it:
 *      powershell -ExecutionPolicy Bypass -File .\scripts\generate-admin-token.ps1
 *
 * Security:
 *  - Treat the printed token as a secret.
 *  - Optionally enable the commented section to save into .env.local (ensure .env.local is gitignored).
 */
#>

# Generate 32 random bytes
$bytes = New-Object Byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)

# Convert to 64-char hex token
$token = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''

# Print token to stdout
Write-Output $token

# Copy to clipboard if Set-Clipboard is available (PowerShell 5+ / Windows)
if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
    try {
        $token | Set-Clipboard
        Write-Output "Token copied to clipboard."
    } catch {
        Write-Output "Failed to copy to clipboard: $($_.Exception.Message)"
    }
}

# Optional: save to .env.local (commented out by default).
# Uncomment if you want the script to write the token to .env.local.
# Ensure you add .env.local to .gitignore and protect the file.
# $envFile = ".env.local"
# if (-not (Test-Path $envFile)) {
#     "ADMIN_TOKEN=$token" | Out-File -FilePath $envFile -Encoding ascii
#     Write-Output ".env.local created with ADMIN_TOKEN (ensure .env.local is gitignored)."
# } else {
#     $content = Get-Content $envFile -Raw
#     if ($content -match 'ADMIN_TOKEN=') {
#         $new = ($content -replace 'ADMIN_TOKEN=.*', "ADMIN_TOKEN=$token")
#         $new | Set-Content $envFile -Encoding ascii
#     } else {
#         Add-Content $envFile "`nADMIN_TOKEN=$token"
#     }
#     Write-Output ".env.local updated with new ADMIN_TOKEN."
# }
