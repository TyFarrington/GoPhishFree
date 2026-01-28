# PowerShell script to push GoPhishFree to GitHub
# Run this from PowerShell in the project directory

Write-Host "`n=== GoPhishFree - Push to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "Error: Not a git repository. Run 'git init' first." -ForegroundColor Red
    exit 1
}

# Check git status
Write-Host "Checking git status..." -ForegroundColor Yellow
git status

Write-Host "`nStaging all changes..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Update README and extension files

- Cleaned up README with improved formatting and logo
- Added Quick Start section for easier onboarding
- Improved visual hierarchy and organization
- Updated for EECS582 Capstone Project
- Fixed extension icons to use PNG format
- Resolved merge conflicts"

Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
Write-Host "Note: You may need to authenticate (Personal Access Token)" -ForegroundColor Cyan

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Areyes42/EECS582-CapstoneProject" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed. Check authentication or run manually:" -ForegroundColor Red
    Write-Host "   git push origin main" -ForegroundColor Yellow
}
