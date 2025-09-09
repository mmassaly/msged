//npm install @imgly/background-removal-node
const { removeBackground } = require("@imgly/background-removal-node");
const fs = require("fs");
const path = require("path");
const mime = require("mime");

const removeBackgroundFunc = (imagePath) => {
  return new Promise((res,rej)=>{removeBackground(imagePath).then((blob) => {
    fs.writeFileSync(`products/nobg/${path.basename(imagePath)}.${mime.getExtension(blob.type)}`, blob);
    res( {image: fs.readFileSync(`products/nobg/${path.basename(imagePath)}.${mime.getExtension(blob.type)}`)});
  }).catch(err => rej(err));
});
}

module.exports = removeBackgroundFunc;