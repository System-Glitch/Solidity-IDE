# Solidity IDE

> A simple alternative to Remix IDE, working with Vue.js and Ganache

![IDE screenshot](solidity-ide.png?raw=true "Soldity IDE")

## Install

**Option 1:** Download the latest [release](https://github.com/System-Glitch/Solidity-IDE/releases).  
**Option 2:** Clone the repository and run `npm install`. On windows, you may need to install the [build tools](https://github.com/felixrieseberg/windows-build-tools) using: `npm install --global windows-build-tools`  

```
npm run build-local
npm run ide
```

The second command will run ganache and the solc server in the background, don't kill this process when using the IDE.


## For developers

If you want to contribute to this project, fork, install the dependencies and run the development tools. On windows, you may need to install the [build tools](https://github.com/felixrieseberg/windows-build-tools) using: `npm install --global windows-build-tools`  

```
npm install

# Run solc server and ganache
npm run server

# Run vue.js server
npm run serve
```

## TODO

- Multiple files
- Resizable columns
- Dark-themed inputs
- Basic completion
- Generators
- Config to select solc server host and ganache host
- Your suggestions
