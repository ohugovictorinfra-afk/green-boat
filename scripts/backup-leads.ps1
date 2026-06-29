# Backup diário de leads — Green Boat 2026
# Salva JSON + CSV nos dois Google Drives sincronizados localmente

$API_URL  = "https://green-boat.vercel.app/api/leads"
$DRIVES   = @("G:\Meu Drive\Green Boat - Leads", "H:\Meu Drive\Green Boat - Leads")
$DATE     = Get-Date -Format "yyyy-MM-dd"
$LOG      = "$PSScriptRoot\backup.log"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') — $msg"
    Add-Content -Path $LOG -Value $line
    Write-Host $line
}

Log "Iniciando backup de leads..."

# Buscar leads da API
try {
    $response = Invoke-RestMethod -Uri $API_URL -Method Get -TimeoutSec 30
    $leads = $response
    Log "Leads encontrados: $($leads.Count)"
} catch {
    Log "ERRO ao buscar leads: $_"
    exit 1
}

if ($leads.Count -eq 0) {
    Log "Nenhum lead para salvar. Encerrando."
    exit 0
}

# Gerar JSON
$json = $leads | ConvertTo-Json -Depth 5

# Gerar CSV
$csvLines = @('"#","Nome","WhatsApp","Data","Hora"')
$i = 1
foreach ($l in $leads) {
    $dt  = [datetime]::Parse($l.timestamp)
    $date = $dt.ToString("dd/MM/yyyy")
    $time = $dt.ToString("HH:mm")
    $csvLines += "`"$i`",`"$($l.name)`",`"$($l.phone)`",`"$date`",`"$time`""
    $i++
}
$csv = $csvLines -join "`n"

# Salvar nos dois Drives
foreach ($dir in $DRIVES) {
    try {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Force $dir | Out-Null
            Log "Pasta criada: $dir"
        }

        $jsonFile = "$dir\leads-$DATE.json"
        $csvFile  = "$dir\leads-$DATE.csv"
        $latest   = "$dir\leads-LATEST.csv"

        [System.IO.File]::WriteAllText($jsonFile, $json,  [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($csvFile,  $csv,   [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($latest,   $csv,   [System.Text.Encoding]::UTF8)

        Log "Salvo em: $dir ($($leads.Count) leads)"
    } catch {
        Log "ERRO ao salvar em $dir`: $_"
    }
}

Log "Backup concluído."
