param([string]$m = "chore: save")

git add -A
git commit -m $m
git push
