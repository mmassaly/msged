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


-------------------------------------------------------------
git config --global user.name "Your New Name"
git config --global user.email "yournewemail@example.com"

https://github.com/mmassaly/attendance-mobile-logging.git

--------------------------------------------------------------
if you are connected to basic repository
git pull https://github.com/mmassaly/project-skeleton mmain 
git pull https://github.com/mmassaly/project-skeleton mmain

-------------------------------------------------------------
If you’ve accidentally added a file to staging (git add) or even committed it, here’s how you can remove it cleanly:

1. Remove from Staging (before commit)
If you ran git add file.txt but haven’t committed yet:
git reset HEAD file.txt


This unstages the file but keeps it in your working directory.

2. Remove from Commit (but keep locally)
If you already committed the file but want to stop tracking it in Git while keeping it on disk:
git rm --cached file.txt
git commit -m "Stop tracking file.txt"


- --cached removes it from the repository index but leaves your local copy intact.
- After this, add the file to .gitignore so it won’t be added again.

3. Remove Entire Folder from Tracking
For a folder (like modules/Data):
git rm -r --cached modules/Data
git commit -m "Stop tracking modules/Data"


Then add modules/Data/ to .gitignore.

4. If You Want to Delete the File Everywhere
If you want Git to delete the file from both the repo and your local disk:
git rm file.txt
git commit -m "Remove file.txt"



✅ Summary:
- Unstage only → git reset HEAD file.txt
- Stop tracking but keep locally → git rm --cached file.txt
- Remove completely → git rm file.txt

Do you want me to show you the exact commands for removing a tracked folder like modules/Data from Git but keeping it locally, so you can safely ignore it going forward?
349803