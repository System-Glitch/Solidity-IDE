<template>
    <div class="flex-grow-1">
        <div class="h-100" v-on:resize="handleResize">
            <div :id="'editor' + _uid" class="h-100 w-100"></div>
        </div>
    </div>
</template>

<script>
    const ace = require('brace');
    const Range = ace.acequire("ace/range").Range;
    require('ace-mode-solidity/build/remix-ide/mode-solidity');
    require('brace/theme/tomorrow_night');
    require("brace/ext/language_tools");

    export default {
        name: "editor",
        data: function() {
            return {
                editor: null,
                langTools: null,
                fontSize: 14,
                content: [],
                fileName: '',
                sessions: {},
                errors: undefined,
                defaultSession: null
            }
        },
        methods: {
            compile: function(callback) {
                this.saveAll(() => {
                    GlobalEvent.$emit('clearMessages');
                    GlobalEvent.$emit('processing', true);

                    window.axios.get('http://localhost:8081/compile')
                    .then(function(response) {
                        this.errors = response.data.errors;
                        this.updateAnnotations();
                        if(this.errors != undefined) {
                            GlobalEvent.$emit('messages', this.errors);
                        }

                        if(!this.checkHasErrors()) {
                            GlobalEvent.$emit('message', {severity: 'success', formattedMessage: "Compilation successful."});
                        }

                        if(callback == undefined || response.data.contracts == undefined) {
                            GlobalEvent.$emit('processing', false);
                        } else {
                            callback(response.data.contracts);
                        }
                    }.bind(this))
                    .catch(function( error ) {
                        GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Compilation request failed: " + error.message });
                        GlobalEvent.$emit('processing', false);
                    });
                });
            },
            deploy: function(contractName, compiledContract) {
                this.checkAbi(compiledContract.abi);
                const contract = new window.web3.eth.Contract(compiledContract.abi);
                const activeAccount = window.accountManager.getActiveAccount();
                GlobalEvent.$emit('processing', true);

                contract.deploy({
                    data: compiledContract.evm.bytecode.object,
                }).send({
                    from: activeAccount.address,
                    gas: '4700000',
                }).then((contract) => {
                    if (typeof contract.options !== 'undefined') {
                        GlobalEvent.$emit('message', {severity: 'success', formattedMessage: contractName + ": Deploy success.\nContract address: " + contract.options.address});
                        GlobalEvent.$emit('contract', {contract: contract, abi: compiledContract.abi, name: contractName});
                        GlobalEvent.$emit('refreshAccounts', [activeAccount.address]);
                    }
                    GlobalEvent.$emit('processing', false);
                }).catch((error) => {
                    GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Deploy failed: " + error.message});
                    GlobalEvent.$emit('processing', false);
                });
            },
            deployFile: function(file) {
                for(let key in file) {
                    this.deploy(key, file[key]);
                }
            },
            compileAndDeploy: function() {
                this.compile(function(files) {
                    if(window.accountManager.selectedAccount == -1) { // Fetch accounts if missing
                        GlobalEvent.$emit('refreshAccounts', window.accountManager.selectedAccount, () => {
                            for(let key in files) {
                                this.deployFile(files[key]);
                            }
                        });
                    } else {
                        for(let key in files) {
                            this.deployFile(files[key]);
                        }
                    }
                }.bind(this));
            },
            clear: function() {
                for(let key in this.sessions) {
                    const session = this.sessions[key];
                    this.clearMarkers(session);
                    session.clearAnnotations();
                }
            },
            updateAnnotations: function() {
                this.clear();
                if(this.errors != undefined) {
                    this.buildAnnotations();
                }
            },
            checkAbi: function(abi) { // Checks if abi contains a least one constructor. Injects default one if missing
                for(let key in abi) {
                    const method = abi[key];
                    if(method.type == "constructor")
                        return;
                }

                abi.push({
                    constant: undefined,
                    inputs: [],
                    payable: false,
                    signature: "constructor",
                    stateMutability: "nonpayable",
                    type: "constructor"
                });
            },
            checkHasErrors: function() {
                if(this.errors != undefined) {
                    for(let key in this.errors) {
                        if(this.errors[key].severity == 'error') {
                            return true;
                        }
                    }
                }
                return false;
            },
            save: function(file, content) {
                window.axios.put('http://localhost:8081/save', {
                    file: file,
                    content: content
                })
                .then(function() {
                    GlobalEvent.$emit('fileSaved', file);
                }.bind(this))
                .catch(function(error) {
                    GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't save file: " + error.message });
                });
            },
            saveAll: function(callback) {
                const promises = [];
                for(let key in this.sessions) {
                    promises.push(window.axios.put('http://localhost:8081/save', {
                        file: key,
                        content: this.sessions[key].getValue()
                    }))
                }

                window.axios.all(promises).then(function(results) {
                    results.forEach(function(response) {
                        const params = JSON.parse(response.config.data);
                        GlobalEvent.$emit('fileSaved', params.file);
                    });

                    if(callback != undefined) {
                        callback();
                    }
                });
            },
            load: function(file, force) {
                if(file != null) {
                    if(this.sessions[file] == undefined || force) {
                        window.axios.get('http://localhost:8081/file', {
                            params: {
                                file: file
                            }
                        })
                        .then(function(response) {
                            this.sessions[file] = ace.createEditSession(response.data, 'ace/mode/solidity');
                            this.sessions[file].on('change', function() {
                                GlobalEvent.$emit('fileChanged', file);
                            });
                            this.fileName = file;
                            localStorage.setItem('openFile', file);
                            this.editor.setSession(this.sessions[file]);
                            this.editor.setReadOnly(false);
                            this.editor.focus();

                            this.updateAnnotations();
                        }.bind(this))
                        .catch(function( error ) {
                            GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch file content: " + error.message });
                        });
                    } else {
                        this.fileName = file;
                        localStorage.setItem('openFile', file);
                        this.editor.setSession(this.sessions[file]);
                        this.editor.setReadOnly(false);
                        this.editor.focus();
                    }
                } else {
                    this.fileName = null;
                    this.editor.setSession(this.defaultSession);
                    this.editor.setReadOnly(true);
                    this.updateAnnotations();
                }
            },
            buildAnnotations: function() {
                for(let key in this.errors) {
                    const message = this.errors[key];
                    const session = this.sessions[message.sourceLocation.file];

                    if(session != undefined) {
                        const rowStart = this.getRowAtPosition(session, message.sourceLocation.start);
                        const rowEnd = this.getRowAtPosition(session, message.sourceLocation.end);
                        const colStart = message.sourceLocation.start - this.getStartPositionForRow(session, rowStart) - 1;
                        const colEnd = message.sourceLocation.end - this.getStartPositionForRow(session, rowEnd) - 1;

                        const annotation = {
                            row: rowStart,
                            column: colStart,
                            text: message.message,
                            type: message.severity
                        };

                        const range = new Range(rowStart, colStart, rowEnd, colEnd);
                        session.addMarker(range, this.getMarkerClass(message.severity), "line", false);
                        session.getAnnotations().push(annotation);
                        session.setAnnotations(session.getAnnotations());
                    }
                }
            },
            clearMarkers: function(session) {
                const markers = session.getMarkers();
                for(let key in markers) {
                    const marker = markers[key];
                    if(marker.clazz.indexOf('marker-') == 0)
                        session.removeMarker(marker.id);
                }
            },
            getRowAtPosition: function(session, pos) {
                const text = session.getValue();
                var count = 0;
                for(let i = 0 ; i < pos ; i++) {
                    if(text.charAt(i) == '\n') {
                        count++;
                    }
                }
                return count;
            },
            getStartPositionForRow: function(session, row) {
                const text = session.getValue();
                const length = text.length;
                var count = 0;

                for(let i = 0 ; i < length ; i++) {
                    if(text.charAt(i) == '\n') {
                        count++;
                    }

                    if(count == row) {
                        return i;
                    }
                }
                return -1;
            },
            getMarkerClass: function(severity) {
                return 'marker-' + severity;
            },
            parseRegExError: function(err) {
                return {
                    errFile: err[1],
                    errLine: parseInt(err[2], 10) - 1,
                    errCol: err[4] ? parseInt(err[4], 10) : 0
                }
            },
            handleResize: function() {
                this.editor.resize();
            },
            handleFontSize: function(up) {
                up ? this.fontSize++ : this.fontSize--;

                if(this.fontSize < 8) this.fontSize = 8;
                if(this.fontSize > 40) this.fontSize = 40;

                localStorage['font-size'] = this.fontSize;
                this.editor.setFontSize(this.fontSize);
            },
            handleFileDelete: function(file) {
                if(this.sessions[file] != undefined) {
                    if(file == this.fileName) {
                        this.editor.setSession(this.defaultSession);
                        this.editor.setReadOnly(true);
                        this.updateAnnotations();
                    }
                    delete this.sessions[file];

                    for(let key in this.errors) {
                        const message = this.errors[key];
                        if(message.sourceLocation.file == file) {
                            delete this.errors[key];
                        }
                    }
                }
            },
            handleBrowserRefresh: function() {
                for(let key in this.sessions) {
                    delete this.sessions[key];
                }

                this.errors = undefined;
                this.clear();
                if(this.fileName) {
                    this.load(this.fileName, true);
                }
            }
        },
        mounted() {

            this.langTools = ace.acequire('ace/ext/language_tools');
            this.langTools.setCompleters([this.langTools.keyWordCompleter]);

            this.editor = ace.edit('editor' + this._uid);
            this.defaultSession = this.editor.getSession();
            this.editor.getSession().setMode('ace/mode/solidity');
            this.editor.setTheme('ace/theme/tomorrow_night');
            this.editor.setOptions({
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                fontFamily: "'Monospace', monospace"
            });
            this.editor.setReadOnly(true);

            this.fontSize = localStorage['font-size'] ? parseInt(localStorage['font-size']) : 14;
            this.editor.setFontSize(this.fontSize);
            this.editor.resize();

            GlobalEvent.$on('compile', this.compile);
            GlobalEvent.$on('deploy', this.compileAndDeploy);
            GlobalEvent.$on('resizeEditor', this.handleResize);
            GlobalEvent.$on('fontSize', this.handleFontSize);
            GlobalEvent.$on('fileSelected', this.load);
            GlobalEvent.$on('fileDeleted', this.handleFileDelete);
            GlobalEvent.$on('browserRefresh', this.handleBrowserRefresh);
        },
        beforeDestroy() {
            GlobalEvent.$off('compile', this.compile);
            GlobalEvent.$off('deploy', this.compileAndDeploy);
            GlobalEvent.$off('resizeEditor', this.handleResize);
            GlobalEvent.$off('fontSize', this.handleFontSize);
            GlobalEvent.$off('fileSelected', this.load);
            GlobalEvent.$off('fileDeleted', this.handleFileDelete);
            GlobalEvent.$off('browserRefresh', this.handleBrowserRefresh);
            this.editor.destroy();
        }
    }
</script>
