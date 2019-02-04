// Replace '/' paths in index.html to relative paths so ide can be run with file://
var fs = require('fs')
fs.readFile('dist/index.html', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/href=\//g, 'href=');
  result = result.replace(/src=\//g, 'src=');

  fs.writeFile('dist/index.html', result, 'utf8', function (err) {
     if (err) return console.log(err);
  });
});