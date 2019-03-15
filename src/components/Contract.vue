<template>
    <div class="row fit-parent" id="contract-container">
        <div class="col-4 scrollable pt-2 pb-2 h-100">
            <contract-action v-for="(method, index) in filteredAbi" :key="index" v-bind:method="method" class="mb-2 row" @method-run="run"/>
        </div>
        
        <div class="col-8 p-0 h-100">
            <div :id="'output-' + _uid" class="h-100 w-100 m-0"></div>
        </div>
    </div>
</template>

<script>
    import ContractAction from '../components/ContractAction.vue'
    const ace = require('brace');
    require('brace/mode/json');
    require('brace/theme/tomorrow_night');

    export default {
        name: "contract",
        components: {
            'contract-action': ContractAction
        },
        props: {
            contract: {
                type: Object,
                required: true
            },
            abi: {
                type: Array,
                required: true
            }
        },
        computed: {
            filteredAbi: function () {
                var index = 0;
                const filteredAbi = [];
                for(let key in this.abi) {
                    const method = this.abi[key];
                    if(method.type == 'function') {
                        filteredAbi[index++] = method;
                    }
                }
                return filteredAbi;
            }
        },
        data: function() {
            return {
                editor: null
            }
        },
        methods: {
            run: function(data) {
                if(data.unit == 'ether')
                    data.amount = window.web3.utils.toWei(data.amount, "ether");

                const method = this.contract.methods[data.method.name];
                const activeAccount = window.accountManager.getActiveAccount();
                try {
                    const params = JSON.parse(data.params);
                    if(params.length < data.method.inputs.length) {
                        throw {message:
                                'Invalid number of parameters for "' + data.method.name +
                                '". Got ' + params.length + ' expected ' + data.method.inputs.length + '!'
                            };
                    }

                    if(data.method.stateMutability == 'view' || data.method.stateMutability == 'pure') {
                        method.apply(null, params).call({from: activeAccount.address})
                        .then((result) => {
                            this.editor.getSession().setMode('ace/mode/json');
                            this.setMessage(JSON.stringify(result, null, 4));
                        })
                        .catch((result) => {
                            let error;
                            try {
                                error = JSON.parse(result.message.replace("Node error: ", "")).message;
                            } catch(err) {
                                error = result.message;
                            }
                            this.editor.getSession().setMode(null);
                            this.setMessage(error);
                        });
                    } else {
                        method.apply(null, params).send({value: data.amount, from: activeAccount.address, gas: 4700000})
                        .then((result) => {
                            this.editor.getSession().setMode('ace/mode/json');
                            this.setMessage(JSON.stringify(result, null, 4));
                            GlobalEvent.$emit('refreshAccounts', "all");
                        })
                        .catch((result) => {
                            let error;
                            const message = result.message.replace("Node error: ", "");
                            try {
                                error = JSON.parse(message).message;
                            } catch(err) {
                                error = message;
                            }
                            this.editor.getSession().setMode(null);
                            this.setMessage(error);
                            GlobalEvent.$emit('refreshAccounts', "all");
                        });
                    }
                } catch(error) {
                    this.editor.getSession().setMode(null);
                    this.setMessage(error.message);
                }
            },
            setMessage: function(message) {
                this.editor.setValue(message);
                this.editor.gotoLine(0, 0, false);
                this.editor.getSession().setScrollLeft(0);
            }
        },
        beforeDestroy() {
            this.editor.destroy();
        },
        mounted() {
            this.editor = ace.edit('output-' +  this._uid);
            this.editor.getSession().setMode('ace/mode/json');
            this.editor.setTheme('ace/theme/tomorrow_night');
            this.editor.setOptions({
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                readOnly: true,
                fontFamily: "'Monospace', monospace",
                fontSize: 14,
            });
            this.editor.resize();
        }
    }
</script>
