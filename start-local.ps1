# Inicia MySQL + Backend + Frontend (desenvolvimento local)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$MysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$Datadir = Join-Path $Root "mysql-data"

# MySQL (se ainda nao estiver rodando)
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue
if (-not $mysqlRunning) {
  if (-not (Test-Path (Join-Path $Datadir "mysql"))) {
    Write-Host "Inicializando MySQL..."
    & "$MysqlBin\mysqld.exe" --initialize-insecure --datadir=$Datadir
  }
  Start-Process -FilePath "$MysqlBin\mysqld.exe" -ArgumentList "--datadir=$Datadir","--port=3306" -WindowStyle Hidden
  Start-Sleep -Seconds 4
  Write-Host "MySQL iniciado."
} else {
  Write-Host "MySQL ja esta rodando."
}

Write-Host "Iniciando backend (porta 3001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\hotspot\backend'; node server.js"

Start-Sleep -Seconds 2
Write-Host "Iniciando frontend (porta 5173)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\hotspot\frontend'; npm run dev"

Write-Host ""
Write-Host "Painel:  http://localhost:5173"
Write-Host "API:     http://localhost:3001"
Write-Host "Login:   admin@empresa.com / admin123"
