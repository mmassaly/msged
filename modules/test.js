import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

function mapDirectory(pathPrefix,folderPath,parentPath) {
  const dirrectory = path.join(pathPrefix,parentPath,folderPath);
 
  const stats = fs.statSync(dirrectory);
  const mappedDirectory = {
    name: path.basename(folderPath),
    date: stats.mtime, // Last modified date
    isDirectory: stats.isDirectory(),
    path: path.join(parentPath,folderPath),
    parentPath: parentPath,
    subdirectories: []
  };

  if (mappedDirectory.isDirectory) {
    const items = fs.readdirSync(dirrectory);
    mappedDirectory.subdirectories = items.map(item =>
      mapDirectory(pathPrefix,item,path.join(parentPath,folderPath))
    );
  }

  return mappedDirectory;
}

console.log(mapDirectory("../","principal",""));
const hashedPassword = await bcrypt.hash("mpwd", 10);
const hashedPassword2 = await bcrypt.hash("mpwd", 10);
const hashedReturn = await bcrypt.compare("mpwd",hashedPassword2);
const hashedReturn1 = await bcrypt.compare("mpwd",hashedPassword);
console.log(hashedPassword);console.log(hashedPassword2);console.log(hashedReturn);console.log(hashedReturn1);