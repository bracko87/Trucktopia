
Run the finance-apply POST (local or deployed)

PowerShell (local dev):
$headers = @{
  "Content-Type"  = "application/json"
  "x-dev-bypass"  = "1"
  "x-service-role" = "YOUR_SERVICE_ROLE_TOKEN"
}
$body = @{
  companyId       = "1a271563-5070-4625-9347-d61ec2b650ec"
  deltaCents      = -10000
  type            = "expense"
  description     = "hire test"
  idempotencyKey  = (New-Guid).Guid
} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/finance-apply" -Method POST -Headers $headers -Body $body -UseBasicParsing

cURL (deployed):
curl -X POST "https://your-site.netlify.app/.netlify/functions/finance-apply" \
  -H "Content-Type: application/json" \
  -H "x-dev-bypass: 1" \
  -H "x-service-role: YOUR_SERVICE_ROLE_TOKEN" \
  -d '{"companyId":"1a271563-5070-4625-9347-d61ec2b650ec","deltaCents":-10000,"type":"expense","description":"hire test","idempotencyKey":"REPLACE_WITH_UUID"}'

Notes:
- Replace YOUR_SERVICE_ROLE_TOKEN and REPLACE_WITH_UUID.
- If you run locally ensure `netlify dev` (or your functions server) is running.
- If request still returns "No rows returned", copy the JSON response and Netlify function logs and paste them here.
