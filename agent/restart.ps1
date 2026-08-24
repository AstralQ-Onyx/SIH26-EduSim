#!/usr/bin/env pwsh
# ── EduSim Agent Restart Script ──────────────────────────────
# Kills any old instances on ports 3745 and 3746, then starts fresh.

Write-Host "`n[EduSim] Stopping old agent processes..." -ForegroundColor Yellow

# Kill anything using port 3745 (WebSocket)
try {
  $pid3745 = (Get-NetTCPConnection -LocalPort 3745 -ErrorAction SilentlyContinue).OwningProcess
  if ($pid3745) {
    Stop-Process -Id $pid3745 -Force -ErrorAction SilentlyContinue
    Write-Host "[EduSim] Freed port 3745 (PID $pid3745)" -ForegroundColor Green
  }
} catch {}

# Kill anything using port 3746 (HTTP REST)
try {
  $pid3746 = (Get-NetTCPConnection -LocalPort 3746 -ErrorAction SilentlyContinue).OwningProcess
  if ($pid3746) {
    Stop-Process -Id $pid3746 -Force -ErrorAction SilentlyContinue
    Write-Host "[EduSim] Freed port 3746 (PID $pid3746)" -ForegroundColor Green
  }
} catch {}

Start-Sleep -Milliseconds 500
Write-Host "[EduSim] Starting server...`n" -ForegroundColor Cyan
node server.js
