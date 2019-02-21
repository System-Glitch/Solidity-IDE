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
                defaultSession: null
            }
        },
        methods: {
            compile: function(callback) {
                this.save();
                GlobalEvent.$emit('clearMessages');
                GlobalEvent.$emit('processing', true);

                const data = {};
                data[this.fileName] = this.editor.getValue();

                window.axios.post('http://localhost:8081/compile', data)
                .then(function(response) {
                    this.clearMarkers();
                    this.editor.getSession().clearAnnotations();
                    if(response.data.contracts != undefined) {
                        for(let key in response.data.contracts) {
                            GlobalEvent.$emit('message', {severity: 'success', formattedMessage: key + ": Compilation successful."});
                            if(callback != undefined) {
                                callback(response.data.contracts[key]);
                            }
                        }
                    } else if(response.data.errors == undefined) {
                        for(let key in response.data.sources) {
                            GlobalEvent.$emit('message', {severity: 'success', formattedMessage: key + ": Compilation successful."});
                        }
                    }
                    if(response.data.errors != undefined) {
                        GlobalEvent.$emit('messages', response.data.errors);
                        this.editor.getSession().setAnnotations(this.buildAnnotations(response.data.errors));
                    }
                    if(callback == undefined || response.data.contracts == undefined) {
                        GlobalEvent.$emit('processing', false);
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
            compileAndDeploy: function() {
                this.compile(function(contracts) {
                    if(window.accountManager.selectedAccount == -1) { // Fetch accounts if missing
                        GlobalEvent.$emit('refreshAccounts', window.accountManager.selectedAccount, () => {
                            for(let key in contracts) {
                                this.deploy(key, contracts[key]);
                            }
                        });
                    } else {
                        for(let key in contracts) {
                            this.deploy(key, contracts[key]);
                        }
                    }

                }.bind(this));
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
            save: function() {
                localStorage[this.fileName] = this.editor.getValue();
                GlobalEvent.$emit('fileSaved', this.fileName);
            },
            load: function(file) {
                if(localStorage[file] != undefined) {

                    if(this.sessions[file] == undefined) {
                        this.sessions[file] = ace.createEditSession(localStorage[file], 'ace/mode/solidity');
                        this.sessions[file].on('change', function() {
                            GlobalEvent.$emit('fileChanged', file);
                        });
                    }
                    this.fileName = file;
                    localStorage.setItem('openFile', file);
                    this.editor.setSession(this.sessions[file]);
                    this.editor.setReadOnly(false);
                    this.editor.focus();
                }
            },
            buildAnnotations: function(errors) {
                const result = [];
                for(let key in errors) {
                    const message = errors[key];

                    if(message.sourceLocation.file == this.fileName) {
                        const rowStart = this.getRowAtPosition(message.sourceLocation.start);
                        const rowEnd = this.getRowAtPosition(message.sourceLocation.end);
                        const colStart = message.sourceLocation.start - this.getStartPositionForRow(rowStart) - 1;
                        const colEnd = message.sourceLocation.end - this.getStartPositionForRow(rowEnd) - 1;

                        const annotation = {
                            row: rowStart,
                            column: colStart,
                            text: message.message,
                            type: message.severity
                        }
                        result.push(annotation);
                        const range = new Range(rowStart, colStart, rowEnd, colEnd);
                        this.editor.getSession().addMarker(range, this.getMarkerClass(message.severity), "line", false);
                    }
                }
                return result;
            },
            clearMarkers: function() {
                const markers = this.editor.getSession().getMarkers();
                for(let key in markers) {
                    const marker = markers[key];
                    if(marker.clazz.indexOf('marker-') == 0)
                        this.editor.getSession().removeMarker(marker.id);
                }
            },
            getRowAtPosition: function(pos) {
                const text = this.editor.getValue();
                var count = 0;
                for(let i = 0 ; i < pos ; i++) {
                    if(text.charAt(i) == '\n') {
                        count++;
                    }
                }
                return count;
            },
            getStartPositionForRow: function(row) {
                const text = this.editor.getValue();
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
                    }
                    delete this.sessions[file];
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
