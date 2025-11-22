# PowerShell script to help create GitHub repository
# This will open your browser to the GitHub new repository page

$repoName = "VirtualTour-FishEYE"
$description = "360° virtual tour viewer built with Three.js"
$isPrivate = "true"

# GitHub new repository URL with pre-filled parameters
$encodedDescription = $description -replace ' ', '%20' -replace '°', '%C2%B0'
$url = "https://github.com/new?name=$repoName&description=$encodedDescription&private=$isPrivate"

Write-Host "Opening GitHub repository creation page..." -ForegroundColor Green
Write-Host "Repository name: $repoName" -ForegroundColor Cyan
Write-Host "Description: $description" -ForegroundColor Cyan
Write-Host "Visibility: Private" -ForegroundColor Cyan
Write-Host ""
Write-Host "After creating the repository, run:" -ForegroundColor Yellow
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host ""

Start-Process $url

