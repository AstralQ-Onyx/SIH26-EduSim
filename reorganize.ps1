# run this in the EduSim root directory
Write-Host "Creating directories..."
New-Item -ItemType Directory -Force -Path config
New-Item -ItemType Directory -Force -Path platform
New-Item -ItemType Directory -Force -Path core-engine
New-Item -ItemType Directory -Force -Path components
New-Item -ItemType Directory -Force -Path docs

Write-Host "Moving files to their respective domains..."
Move-Item -Path "auth.*" -Destination "platform/" -Force
Move-Item -Path "dashboard.*" -Destination "platform/" -Force
Move-Item -Path "ide.js" -Destination "platform/" -Force
Move-Item -Path "config.js" -Destination "config/" -Force

Move-Item -Path "virtual-lab/simulator.js" -Destination "core-engine/" -Force
Move-Item -Path "virtual-lab/components/registry.js" -Destination "components/" -Force
Remove-Item -Path "virtual-lab/components" -Force

# Move the markdown files generated earlier to docs/ (if they are in the current dir)
if (Test-Path "EduSim_Project_Timeline.md") { Move-Item "EduSim_Project_Timeline.md" "docs/" -Force }
if (Test-Path "EduSim_Team_Roles.md") { Move-Item "EduSim_Team_Roles.md" "docs/" -Force }

Write-Host "Reorganization complete! You can now delete this script."
