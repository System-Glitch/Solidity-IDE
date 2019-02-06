<template>
    <div class="flex-grow-1 w-100">
        <div class="h-100" v-on:resize="handleResize">
            <div id="editor" class="h-100 w-100 monospace"></div>
        </div>
    </div>
</template>

<script>
    const ace = require('brace');
    const Range = ace.acequire("ace/range").Range;

    export default {
        name: "editor",
        data: function() {
            return {
                editor: null,
                content: [],
            }
        },
        methods: {
            compile: function(callback) {
                this.save();
                window.$.ajax({
                    method: 'POST',
                    url: 'http://localhost:8081/compile',
                    crossDomain: true,
                    dataType: 'json',
                    data: {
                        title: 'contract.sol',
                        source: this.editor.getValue()
                    }
                }).done(function(data) {
                    this.clearMarkers();
                    this.editor.getSession().clearAnnotations();
                    if(data.errors != undefined) {
                        Event.$emit('messages', data.errors);
                        this.editor.getSession().setAnnotations(this.buildAnnotations(data.errors));
                    } else {
                        Event.$emit('messages', [{severity: 'success', formattedMessage: "Compilation successful."}]);
                        if(callback != undefined) {
                            for(let key in data.contracts.title) {
                                callback(key, data.contracts.title[key]);
                            }
                        }
                    }
                }.bind(this))
                .fail(function( jqXHR ) {
                    Event.$emit('messages', [{severity: 'error', formattedMessage: "Compilation request failed with status " + jqXHR.status + ": " + jqXHR.responseText }]);
                });
            },
            deploy: function(contractName, compiledContract) {
                const contract = new window.web3.eth.Contract(compiledContract.abi);
                const activeAccount = window.accountManager.getActiveAccount();
                contract.deploy({
                    data: compiledContract.evm.bytecode.object,
                }).send({
                    from: activeAccount.address,
                    gas: '4700000',
                }).then((contract) => {
                    if (typeof contract.options !== 'undefined') {
                        Event.$emit('message', {severity: 'success', formattedMessage: "Deploy success.\nContract address: " + contract.options.address});
                        Event.$emit('contract', {contract: contract, abi: compiledContract.abi, name: contractName});
                        Event.$emit('refreshAccounts', [activeAccount.address]);
                    }
                }).catch((error) => {
                    Event.$emit('message', [{severity: 'error', formattedMessage: "Deploy failed: " + error.message}]);
                });
            },
            save: function() {
                localStorage['contract.sol'] = this.editor.getValue(); // TODO handle multiple files
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

                    const errLocation = message.formattedMessage.match(/^([^:]*):([0-9]*):(([0-9]*):)? /);
                    const annotation = {
                        row: parseInt(errLocation[2], 10) - 1,
                        column: errLocation[4] ? parseInt(errLocation[4], 10) : 0,
                        text: message.message,
                        type: message.severity
                    }
                    result.push(annotation);
                    const rowStart = this.getRowAtPosition(message.sourceLocation.start);
                    const rowEnd = this.getRowAtPosition(message.sourceLocation.end);
                    const range = new Range(
                            rowStart,
                            message.sourceLocation.start - this.getStartPositionForRow(rowStart) - 1,
                            rowEnd,
                            message.sourceLocation.end - this.getStartPositionForRow(rowEnd) - 1 
                        );
                    this.editor.getSession().addMarker(range, this.getMarkerClass(message.severity), "line", false);
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
                for(let i = 0 ; i < pos ; i++)
                    if(text.charAt(i) == '\n')
                        count++;
                return count;
            },
            getStartPositionForRow: function(row) {
                const text = this.editor.getValue();
                const length = text.length;
                var count = 0;

                for(let i = 0 ; i < length ; i++) {
                    if(text.charAt(i) == '\n')
                        count++;

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
            require('ace-mode-solidity/build/remix-ide/mode-solidity');
            require('brace/theme/tomorrow_night');

            this.editor = ace.edit('editor');
            this.editor.getSession().setMode('ace/mode/solidity');
            this.editor.setTheme('ace/theme/tomorrow_night');
            this.editor.setOptions({
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
            });
            this.editor.resize();

            Event.$on('compile', () => {
                this.compile();
            });

            Event.$on('deploy', () => {
                this.compile(function(contractName, compiledContract) {

                    if(window.accountManager.selectedAccount == -1) { // Fetch accounts if missing
                        Event.$emit('refreshAccounts', 'all', () => {
                            this.deploy(contractName, compiledContract);
                        });
                    } else {
                        this.deploy(contractName, compiledContract);
                    }

                }.bind(this));
            });

            Event.$on('contractsViewUpdated', () => {
                this.handleResize();
            });

            this.load('contract.sol');  // TODO handle multiple files
        }
    }
</script>
<style scoped>
    #editor {
        border-right: 1px solid #444;
        border-bottom: 1px solid #444;
    }
</style>
