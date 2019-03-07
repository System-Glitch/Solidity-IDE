#!/usr/bin/env node
// OPTIONS:
// -d: development mode. If set, open 'localhost:8080' in the browser, use the local build instead
// --path=<PATH>: path to the default directory (optional, use working directory if missing)

const argv = require('minimist')(process.argv.slice(2));
for(let key in process.argv) {
    if(process.argv[key].startsWith('--path=')) {
        process.argv.splice(key, 1);
        break;
    }
}

const FILE_SEPARATOR = process.platform == 'win32'? '\\': '/'
var directory = argv.path ? argv.path : process.cwd()
const PORT = 8081
const FORBIDDEN_CHARACTERS = "\\\\|<|>|:|\\\"|\\'|\\||\\?|\\*|~|#|\\n|\\t|\\v|\\f|\\r"
const fs = require('fs')
const solc = require('solc')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

console.log("Starting solc server...")

if(!directory.endsWith(FILE_SEPARATOR))
    directory += FILE_SEPARATOR

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

app.get('/directory', function(req, res) {
    try {
        if(req.query.root) {
            if (!fs.existsSync(req.query.root) || !fs.lstatSync(req.query.root).isDirectory()) {
                res.status(400)
                res.end('Given root directory doesn\'t exist or is not a directory.')
                return
            }
            directory = req.query.root

            if(!directory.endsWith('/'))
                directory += '/'
        }

        if(req.query.dir) {
            if (!fs.existsSync(directory + req.query.dir) || !fs.lstatSync(directory + req.query.dir).isDirectory()) {
                res.status(400)
                res.end('Given directory doesn\'t exist or is not a directory.')
                return
            }

            if(!req.query.dir.endsWith('/'))
                req.query.dir += '/'
        }

        const result = listDir(req.query.dir ? req.query.dir : '')
        res.end(JSON.stringify(result))
    } catch(error) {
        res.status(403)
        res.end(error.message)
    }
})

// Fetch file
app.get('/file', function(req, res) {
    if(req.query.file) {
        const file = directory + req.query.file
        if (validateFile(file, res)) {
            try {
                res.end(fs.readFileSync(file).toString())
            } catch(error) {
                res.status(403)
                res.end(error.message)
            }
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

        try {
            fs.mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true })
            fs.writeFileSync(path, '')
            res.status(201)
            res.end()
        } catch(error) {
            res.status(403)
            res.end(error.message)
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
        try {
            fs.writeFileSync(file, req.body.content)
            res.status(204)
            res.end()
        } catch(error) {
            res.status(403)
            res.end(error.message)
        }

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
            try {
                fs.unlinkSync(file)
                res.status(204)
                res.end()
            } catch(error) {
                res.status(403)
                res.end(error.message)
            }
        }

    } else {
        res.status(400)
        res.end('File is required.')
        return
    }
})

function listDir(dir) {
    const result = []
    const items = fs.readdirSync(directory + dir)

    for(let key in items) {
        const item = items[key]

        try {
            const stats = fs.lstatSync(directory + dir + item)
            if((stats.isFile() && !item.endsWith('.sol')) || (!stats.isFile() && !stats.isDirectory()))
                continue; // Skip non-sol files and non-directories
            const file = {name: item, path: dir + item, directory: stats.isDirectory(), state: 0, saved: true}
            result.push(file)
            if(stats.isDirectory()) {
                file.childs = listDir(dir + item + FILE_SEPARATOR)
            }
        } catch(err) {
            // Ignore files without permission
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
            try {
                fs.accessSync(path, fs.constants.R_OK)
                result[path] = { content: fs.readFileSync(path).toString() }
            } catch(err) {
                // Skip if no read permission
            }
        }

        if(stats.isDirectory()) {
            listDirForCompile(dir + item + '/', result)
        }
    }

    return result;
}

function validateFile(path, res) {
    try {
        fs.accessSync(path, fs.constants.S_IFREG & fs.constants.R_OK);
        if (!path.endsWith('.sol')) {
            res.status(400)
            res.end('Given file doesn\'t exist or is not a solidity file.')
            return false
        }
    } catch(error) {
        res.status(403)
        res.end(error.message)
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
    console.log("Starting ganache...")
    require('ganache-cli/cli')
}, 1);

if(argv.d !== true) { // Not in dev mode
    const url = 'file://' + __dirname + '/dist/index.html';
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open')
    require('child_process').exec(start + ' ' + url)
}