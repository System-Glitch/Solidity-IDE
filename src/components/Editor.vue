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
                this.saveAll();
                GlobalEvent.$emit('clearMessages');
                GlobalEvent.$emit('processing', true);

                const data = {};
                for (let i = 0; i < localStorage.length; i++){
                    const key = localStorage.key(i);
                    if(key.endsWith('.sol')) {
                        data[key] = localStorage.getItem(key);
                    }
                }

                window.axios.post('http://localhost:8081/compile', data)
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
            save: function() {
                localStorage[this.fileName] = this.editor.getValue();
                GlobalEvent.$emit('fileSaved', this.fileName);
            },
            saveAll: function() {
                for(let key in this.sessions) {
                    localStorage[key] = this.sessions[key].getValue();
                    GlobalEvent.$emit('fileSaved', key);
                }
            },
            load: function(file) {
                var needUpdate = false;
                if(localStorage[file] != undefined) {

                    if(this.sessions[file] == undefined) {
                        this.sessions[file] = ace.createEditSession(localStorage[file], 'ace/mode/solidity');
                        this.sessions[file].on('change', function() {
                            GlobalEvent.$emit('fileChanged', file);
                        });
                        needUpdate = true;
                    }
                    this.fileName = file;
                    localStorage.setItem('openFile', file);
                    this.editor.setSession(this.sessions[file]);
                    this.editor.setReadOnly(false);
                    this.editor.focus();

                    if(needUpdate) {
                        this.updateAnnotations();
                    }
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

            if(localStorage['openFile']) {
                this.load(localStorage['openFile']);
            }
        },
        beforeDestroy() {
            GlobalEvent.$off('compile', this.compile);
            GlobalEvent.$off('deploy', this.compileAndDeploy);
            GlobalEvent.$off('resizeEditor', this.handleResize);
            GlobalEvent.$off('fontSize', this.handleFontSize);
            GlobalEvent.$off('fileSelected', this.load);
            GlobalEvent.$off('fileDeleted', this.handleFileDelete);
            this.editor.destroy();
        }
    }
</script>
