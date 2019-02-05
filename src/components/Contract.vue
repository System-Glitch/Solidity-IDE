<template>
    <div class="row fit-parent" id="contract-container">
        <div class="col-4 scrollable pt-2 pb-2 h-100">
            <contract-action v-for="(method, index) in abi"  v-if="method.type == 'function'" :key="index" v-bind:method="method" class="mb-2 row" @method-run="run"/>
        </div>
        
        <div class="col-8 p-0 scrollable h-100">
            <div id="output" class="h-100 w-100 m-0" :no-resize="true"></div>
        </div>
    </div>
</template>

<script>
    import ContractAction from '../components/ContractAction.vue'

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
        data: function() {
            return {
                editor: null
            }
        },
        methods: {
            run: function(data) {
                if(data.unit == 'ether')
                    data.amount = web3.utils.toWei(data.amount, "ether");

                const method = this.contract.methods[data.method.name];
                const activeAccount = accountManager.getActiveAccount();
                if(data.method.stateMutability == 'view') {
                    method().call({from: activeAccount.address})
                    .then((result) => {
                        this.editor.getSession().setMode('ace/mode/json');
                        this.editor.setValue(JSON.stringify(result, null, 4));
                    })
                    .catch((error) => {
                        this.editor.getSession().setMode(null);
                        this.editor.setValue(error.message);
                    });
                } else {
                    method().send({value: data.amount, from: activeAccount.address})
                    .on('error', (result) => {
                        this.editor.getSession().setMode(null);
                        this.editor.setValue(result.message);
                        Event.$emit('refreshAccounts', "all");
                    })
                    .on('receipt', (result) => {
                        this.editor.getSession().setMode('ace/mode/json');
                        this.editor.setValue(JSON.stringify(result, null, 4));
                        Event.$emit('refreshAccounts', "all");
                    });
                    
                }
            }
        },
        mounted() {
            const ace = require('brace');
            require('brace/mode/json');
            require('brace/theme/tomorrow_night');

            this.editor = ace.edit('output');
            this.editor.getSession().setMode('ace/mode/json');
            this.editor.setTheme('ace/theme/tomorrow_night');
            this.editor.setOptions({
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                readOnly: true
            });
            this.editor.resize();
        }
    }
</script>