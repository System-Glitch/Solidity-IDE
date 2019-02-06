<template>
    <b-tabs class="w-100 bg-dark d-flex flex-column fit-parent" id="contracts-container" no-fade>
        <b-tab v-for="contract in contracts" :key="contract.id" class="container-fluid fit-parent">
            <template slot="title">
                <span>{{ contract.name + printDuplicateNumber(contract.duplicateNumber) }}</span><button class="ml-1 close text-light" type="button" @click="dismiss(contract)">×</button>
            </template>
            <contract v-once v-bind:contract="contract.contract" v-bind:abi="contract.abi"/>
        </b-tab>
    </b-tabs>
</template>

<script>
    import Contract from '../components/Contract.vue'

    export default {
        name: "contracts",
        components: {
            'contract': Contract
        },
        data: function() {
            return {
                contracts: [],
                contractsCounters: {},
                counter: 0
            }
        },
        methods: {
            dismiss: function(contract) {
                this.contracts.splice(this.contracts.indexOf(contract), 1);
                this.updateContractsCounter(contract);

                if(this.contracts.length == 0) {
                    setTimeout(() => {
                        Event.$emit('contractsViewUpdated');
                    }, 0);
                }
            },
            updateContractsCounter: function(contract) {
                for(let key in this.contracts) {
                    if(this.contracts[key].name == contract.name)
                        return;
                }
                this.contractsCounters[contract.name] = undefined;
            },
            getDuplicateNumber: function(contract) {
                if(this.contractsCounters[contract.name] != undefined) {
                    this.contractsCounters[contract.name]++;
                } else {
                    this.contractsCounters[contract.name] = 0;
                }
                return this.contractsCounters[contract.name];
            },
            printDuplicateNumber: function(number) {
                return number > 0 ? ' (' + number + ')' : '';
            }
        },
        mounted() {
            Event.$on('contract', (contract) => {
                contract.id = this.counter++;
                contract.duplicateNumber = this.getDuplicateNumber(contract);

                setTimeout(() => {
                    Event.$emit('contractsViewUpdated');
                }, 0);

                this.contracts.push(contract);

            });
        }
    }
</script>
<style scoped>
    #contracts-container {
        min-height: 250px;
        max-height: 250px;
    }
</style>
