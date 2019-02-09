<template>
    <div class="flex-grow-1">
        <div class="h-100" v-on:resize="handleResize">
            <div :id="'editor' + _uid" class="h-100 w-100 monospace"></div>
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
        props: {
            fileName: {
                type: String,
                default: 'contract.sol' // TODO file name
            }
        },
        data: function() {
            return {
                editor: null,
                langTools: null,
                content: [],
            }
        },
        methods: {
            compile: function(callback) {
                this.save();
                Event.$emit('clearMessages');
                Event.$emit('processing', true);

                const data = {};
                data[this.fileName] = this.editor.getValue();

                window.$.ajax({
                    method: 'POST',
                    url: 'http://localhost:8081/compile',
                    crossDomain: true,
                    dataType: 'json',
                    data: data
                }).done(function(data) {
                    this.clearMarkers();
                    this.editor.getSession().clearAnnotations();
                    if(data.contracts != undefined) {
                        for(let key in data.contracts) {
                            Event.$emit('message', {severity: 'success', formattedMessage: key + ": Compilation successful."});
                            if(callback != undefined) {
                                callback(data.contracts[key]);
                            }
                        }
                    }
                    if(data.errors != undefined) {
                        Event.$emit('messages', data.errors);
                        this.editor.getSession().setAnnotations(this.buildAnnotations(data.errors));
                    }
                    if(callback == undefined || data.contracts == undefined) {
                        Event.$emit('processing', false);
                    }
                }.bind(this))
                .fail(function( jqXHR ) {
                    Event.$emit('message', {severity: 'error', formattedMessage: "Compilation request failed with status " + jqXHR.status + ": " + jqXHR.responseText });
                    Event.$emit('processing', false);
                });
            },
            deploy: function(contractName, compiledContract) {
                const contract = new window.web3.eth.Contract(compiledContract.abi);
                const activeAccount = window.accountManager.getActiveAccount();
                Event.$emit('processing', true);
                contract.deploy({
                    data: compiledContract.evm.bytecode.object,
                }).send({
                    from: activeAccount.address,
                    gas: '4700000',
                }).then((contract) => {
                    if (typeof contract.options !== 'undefined') {
                        Event.$emit('message', {severity: 'success', formattedMessage: contractName + ": Deploy success.\nContract address: " + contract.options.address});
                        Event.$emit('contract', {contract: contract, abi: compiledContract.abi, name: contractName});
                        Event.$emit('refreshAccounts', [activeAccount.address]);
                    }
                    Event.$emit('processing', false);
                }).catch((error) => {
                    Event.$emit('message', {severity: 'error', formattedMessage: "Deploy failed: " + error.message});
                    Event.$emit('processing', false);
                });
            },
            compileAndDeploy: function() {
                this.compile(function(contracts) {
                    if(window.accountManager.selectedAccount == -1) { // Fetch accounts if missing
                        Event.$emit('refreshAccounts', window.accountManager.selectedAccount, () => {
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
            save: function() {
                localStorage[this.fileName] = this.editor.getValue(); // TODO handle multiple files
            },
            load: function(contract) {
                if(localStorage[contract]) {
                    const session = ace.createEditSession(localStorage[contract], 'ace/mode/solidity');
                    this.editor.setSession(session);
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
            }
        },
        mounted() {

            this.langTools = ace.acequire('ace/ext/language_tools');
            this.langTools.setCompleters([this.langTools.keyWordCompleter]);

            this.editor = ace.edit('editor' + this._uid);
            this.editor.getSession().setMode('ace/mode/solidity');
            this.editor.setTheme('ace/theme/tomorrow_night');
            this.editor.setOptions({
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true
            });
            this.editor.resize();

            Event.$on('compile', this.compile);
            Event.$on('deploy', this.compileAndDeploy);
            Event.$on('resizeEditor', this.handleResize);

            this.load(this.fileName);  // TODO handle multiple files
        },
        beforeDestroy() {
            Event.$off('compile', this.compile);
            Event.$off('deploy', this.compileAndDeploy);
            Event.$off('resizeEditor', this.handleResize);
            this.editor.destroy();
        }
    }
</script>
