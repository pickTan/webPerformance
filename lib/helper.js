const fs = require('fs')
const join = require('path').join

export  function  addPush(res){
  function add(url,fileData){
    var stream = res.push(url, {
      status: 200, // optional
      method: 'GET', // optional
      request: {
        accept: '*/*'
      },
      response: {
        'content-type': 'application/javascript'
      }
    });
    stream.on('error', function() {
    });
    stream.end(fileData);
    return add;
  }
  return add;
}

export function setPushs(list,res){
  const add = addPush(res);
  list.forEach(item=> ~item[0].indexOf('.html') ||~item[0].indexOf('.css')  || add(item[0],item[1]))
}

export  function getJsonFiles(jsonPath){
  let jsonFiles = [];
  function findJsonFile(path){
    let files = fs.readdirSync(path);
    files.forEach(function (item) {
      let fPath = join(path,item);
      let stat = fs.statSync(fPath);
      if(stat.isDirectory() === true) {
        findJsonFile(fPath);
      }
      if (stat.isFile() === true) {
        const  fileData = fs.readFileSync(join(__dirname, `../${fPath}`)),
          url = fPath.replace(`${jsonPath}`,'');
        jsonFiles.push([url,fileData]);
      }
    });
  }
  findJsonFile(jsonPath);
  return jsonFiles;
}




