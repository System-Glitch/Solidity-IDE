<template>
    <b-tabs class="w-100 bg-dark d-flex flex-column fit-parent" id="contracts-container" no-fade>
        <b-tab v-for="contract in contracts" :key="contract.id" class="container-fluid fit-parent">
            <template slot="title">
                <span>{{ contract.name }}</span><button class="ml-1 close text-light" type="button" @click="dismiss(contract)">×</button>
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
                counter: 0
            }
        },
        methods: {
            dismiss: function(contract) {
                this.contracts.splice(this.contracts.indexOf(contract), 1);
            }
        },
        mounted() {
            Event.$on('contract', (contract) => {
                contract.id = this.counter++;
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