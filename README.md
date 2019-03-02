# Solidity IDE

> A simple alternative to Remix IDE, working with Vue.js and Ganache

![IDE screenshot](solidity-ide.png?raw=true "Soldity IDE")

Solidity IDE is a light solution aimed at making Solidity development easier and more accessible, allowing you to concentrate only on your code by doing the Web3 part for you so you don't have to write anything else than Solidity.  

## Install

**Option 1:** Download the latest [release](https://github.com/System-Glitch/Solidity-IDE/releases) and run the IDE using: `npm run ide`.  
**Option 2:** Clone the repository and run `npm install`. On windows, you may need to install the [build tools](https://github.com/felixrieseberg/windows-build-tools) using: `npm install --global windows-build-tools`. Then build for a local usage and run:  

```
npm run build-local
npm run ide
```

The second command will run ganache and the solc server in the background, don't kill this process when using the IDE.


## For contributors

If you want to contribute to this project, fork, install the dependencies and run the development tools. On windows, you may need to install the [build tools](https://github.com/felixrieseberg/windows-build-tools) using: `npm install --global windows-build-tools`  

```
npm install

# Run solc server and ganache
npm run server

# Run vue.js server
npm run serve
```

## TODO

- Dark-themed inputs
- Config to select solc server host and ganache host
- Optimize file browser by not loading the whole file tree at once
- Your suggestions
