# PowerShell script to open GitHub Pages settings
# This will open your browser to the GitHub Pages settings page

$repoOwner = "loumizhu"
$repoName = "VirtualTour-FishEYE"

$url = "https://github.com/$repoOwner/$repoName/settings/pages"

Write-Host "Opening GitHub Pages settings..." -ForegroundColor Green
Write-Host ""
Write-Host "To enable GitHub Pages:" -ForegroundColor Yellow
Write-Host "1. Under 'Source', select 'Deploy from a branch'" -ForegroundColor White
Write-Host "2. Select branch: 'main'" -ForegroundColor White
Write-Host "3. Select folder: '/ (root)'" -ForegroundColor White
Write-Host "4. Click 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "Your site will be available at:" -ForegroundColor Cyan
Write-Host "  https://$repoOwner.github.io/$repoName/" -ForegroundColor Green
Write-Host ""

Start-Process $url

