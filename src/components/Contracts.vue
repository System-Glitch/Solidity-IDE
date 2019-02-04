<template>
    <b-tabs class="w-100 bg-dark d-flex flex-column fit-parent" id="contracts-container">
        <b-tab v-for="(contract, index) in contracts" :key="index" class="container-fluid fit-parent">
            <template slot="title">
                <span>{{ contract.name }}</span><button class="ml-1 close text-light" type="button" @click="dismiss(index)">×</button>
            </template>
            <contract v-bind:contract="contract.contract" v-bind:abi="contract.abi"/>
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
                contracts: []
            }
        },
        methods: {
            dismiss: function(index) {
                this.contracts.splice(index, 1);
            }
        },
        mounted() {
            Event.$on('contract', (contract) => {
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