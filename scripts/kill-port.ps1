# Kill any process using port 3000
$port = 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Killed process $processId on port $port" -ForegroundColor Green
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Host "Could not kill process $processId : $errorMsg" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No process found on port $port" -ForegroundColor Gray
}
