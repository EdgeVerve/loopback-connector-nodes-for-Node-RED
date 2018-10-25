var fs = require('fs');
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
var initDir = process.env.INIT_CWD;
deleteFolderRecursive(initDir + "/node_modules/node-red-node-email");
deleteFolderRecursive(initDir + "/node_modules/mailparser");
deleteFolderRecursive(initDir + "/node_modules/mimelib");
console.log("Removed node-red-node-email module");
