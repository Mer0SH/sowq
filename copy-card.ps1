$s = Get-Content 'src/components/ProductCard.tsx' -Raw
Set-Clipboard -Value $s
$c = Get-Clipboard -Raw
Write-Output "copied=$($c.Length)"