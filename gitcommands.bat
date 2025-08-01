…or create a new repository on the command line
echo "# msged" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M mmain
git remote add origin https://github.com/mmassaly/msged.git
git push -u origin mmain

…or push an existing repository from the command line
git remote add origin https://github.com/mmassaly/msged.git
git branch -M mmain
git push -u origin mmain


when you got problems 
git fetch origin
git reset --hard origin/<branch-name>