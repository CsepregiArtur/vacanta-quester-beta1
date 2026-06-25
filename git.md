# 1. Crezi branch nou din develop
git checkout develop
git pull origin develop
git checkout -b feature/google-auth

# 2. Faci commit-uri
git add .
git commit -m "feat(auth): add google oauth"
git commit -m "test(auth): add google auth tests"

# 3. Push
git push -u origin feature/google-auth

# 4. Deschizi Pull Request pe GitHub
# (click "Compare & pull request")

# 5. GitHub Actions rulează testele automat
# (dacă fail, nu poți merge)

# 6. Fă review propriului cod (da, e important!)

# 7. Mergi PR
# (fie "Merge", fie "Rebase and merge")