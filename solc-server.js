var directory = process.argv[2] ? process.argv[2] : __dirname
const PORT = 8081
const fs = require('fs')
const solc = require('solc')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

if(!directory.endsWith('/'))
    directory += '/'

if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
    console.error('"' + directory + '" doesn\'t exist or is not a directory.')
    process.exit(1)
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", "OPTIONS, HEAD, GET, POST, PUT, DELETE")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    res.header("Content-Type", "application/json")
    next();
})

app.get('/compile', function (req, res) {

    const sources = listDirForCompile('', {})
    const input = {
        language: 'Solidity',
        sources: sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': [ '*' ]
                }
            }
        }
    }

    const output = solc.compile(JSON.stringify(input))
    // Save built files?

    res.end(output.replace(new RegExp(directory, 'g'), ''))
})

//------------------------------------
// FILESYSTEM

// TODO check permissions
app.get('/directory', function(req, res) {
    if(req.query.root) {
        if (!fs.existsSync(req.query.root) || !fs.lstatSync(req.query.root).isDirectory()) {
            res.status(400);
            res.end('Given root directory doesn\'t exist or is not a directory.');
            return;
        }
        directory = req.query.root;

        if(!directory.endsWith('/'))
            directory += '/'
    }

    const result = listDir('', [])
    res.end(JSON.stringify(result))
})

// Fetch file
app.get('/file', function(req, res) {
    if(req.query.file) {
        const file = directory + req.query.file
        if (validateFile(file, res)) {
            res.end(fs.readFileSync(file).toString())
        }
    } else {
        res.status(400)
        res.end('File is required.')
    }
})

// Save file
app.put('/save', function(req, res) {
    var file = ''
    if(req.body.file) {
        file = directory + req.body.file
        if (!validateFile(file, res)) {
            return
        }
    } else {
        res.status(400)
        res.end('File is required.')
        return
    }

    if(req.body.content != undefined) {
        // TODO handle file permissions
        fs.writeFileSync(file, req.body.content)
        res.status(204)
        res.end()
    } else {
        res.status(400)
        res.end('Content is required.')
    }
})

// Delete file
app.delete('/delete', function(req, res) {
    if(req.body.file) {
        const file = directory + req.body.file
        if (validateFile(file, res)) {
            fs.unlinkSync(file)
            res.status(204)
            res.end()
        }

    } else {
        res.status(400)
        res.end('File is required.')
        return
    }
})

function listDir(dir, result) {
    const items = fs.readdirSync(directory + dir)

    for(let key in items) {
        const item = items[key]
        const stats = fs.lstatSync(directory + dir + item)
        if((stats.isFile() && !item.endsWith('.sol')) || (!stats.isFile() && !stats.isDirectory()))
            continue; // Skip non-sol files and non-directories
        const file = {name: item, path: dir + item, directory: stats.isDirectory(), state: 0, saved: true}
        result.push(file)
        if(stats.isDirectory()) {
            file.childs = listDir(dir + item + '/', [])
        }
    }

    return result;
}

function listDirForCompile(dir, result) {
    const items = fs.readdirSync(directory + dir)

    for(let key in items) {
        const item = items[key]
        const path = directory + dir + item
        const stats = fs.lstatSync(path)
        if(stats.isFile() && item.endsWith('.sol')) { // Skip non-sol files and non-directories
            result[path] = { content: fs.readFileSync(path).toString() }
        }

        if(stats.isDirectory()) {
            listDirForCompile(dir + item + '/', result)
        }
    }

    return result;
}

function validateFile(path, res) {
    if (!fs.existsSync(path) || !fs.lstatSync(path).isFile() || !path.endsWith('.sol')) {
        res.status(400)
        res.end('Given file doesn\'t exist or is not a solidity file.')
        return false
    }
    return true
}

// Create directory

// TODO Create file

//------------------------------------

app.get('/shutdown', function() {
    console.log('IDE closed, exiting.')
    process.exit(0)
})

app.listen(PORT, 'localhost', function () {
    console.log('Started solc server. Listening on localhost:' + PORT + ', directory "' + directory + '"')
})

setTimeout(function() {
    console.log("Starting ganache.")
    require('ganache-cli/cli')
}, 1);

if(process.argv && process.argv[2] == 'ide') { // TODO not working anymore with project directory parameter
    const url = 'file://' + __dirname + '/dist/index.html';
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    require('child_process').exec(start + ' ' + url);
}