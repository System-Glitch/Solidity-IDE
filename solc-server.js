// OPTIONS:
// -d: development mode. If set, open 'localhost:8080' in the browser, use the local build instead
// <PATH>: path to the default directory (optional, use working directory if missing)

const argv = require('minimist')(process.argv.slice(2));
var directory = argv._.length ? argv._[0] : process.cwd()
const PORT = 8081
const FORBIDDEN_CHARACTERS = "\\\\|<|>|:|\\\"|\\'|\\||\\?|\\*|~|#|\\n|\\t|\\v|\\f|\\r"
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

// Create file
app.post('/create', function(req, res) {
    if(req.body.file) {
        const path = directory + req.body.file
        if (new RegExp(FORBIDDEN_CHARACTERS).test(req.body.file)) {
            res.status(400)
            res.end('Given file name contains forbidden characters.')
            return
        } else if(!validateSolidityFile(path)) {
            res.status(400)
            res.end('Given file is not a solidity file.')
            return
        } else if (fs.existsSync(path)) {
            res.status(400)
            res.end('File already exists.')
            return
        }

        fs.mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true })
        fs.writeFileSync(path, '')
        res.status(201)
        res.end()
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

function validateSolidityFile(path) {
    return path.endsWith('.sol') && path.substring(path.lastIndexOf('/') + 1) != '.sol'
}

// TODO Create directory without creating file

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

if(argv.d !== true) { // Not in dev mode
    const url = 'file://' + __dirname + '/dist/index.html';
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open')
    require('child_process').exec(start + ' ' + url)
}