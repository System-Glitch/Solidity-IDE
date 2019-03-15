<template>
    <div class="mb-2 mx-auto input-group">
        <div class="col p-0" :class="method.payable !== true && !method.inputs.length ? '' : 'input-group-prepend'">
            <button class="btn btn-sm btn-block" v-bind:class="method.stateMutability != 'view' && method.stateMutability != 'pure' ? 'btn-info' : 'btn-secondary'" @click="run()" :title="method.name">{{ method.name }}</button>
        </div>
        <b-form-input class="col form-control-sm bg-light"
              type="text"
              required
              :placeholder="paramsPlaceholder"
              v-model="params"
              v-if="method.inputs.length"
              @keyup.enter.native="run()" />
        <b-form-input class="col form-control-sm bg-light amount-select"
              type="number"
              required
              min="0"
              placeholder="Amount"
              v-model="amount"
              v-if="method.payable === true" />
        <b-form-select v-if="method.payable === true" v-model="selectedOption" :options="options" class="col form-control-sm bg-light unit-select" />
    </div>
</template>

<script>
    export default {
        name: "contract",
        props: {
            method: {
                type: Object,
                required: true
            }
        },
        computed: {
            paramsPlaceholder: function() {
                var placeholder = '';
                for(let key in this.method.inputs) {
                    if(key > 0) placeholder += ', ';
                    placeholder += this.method.inputs[key].type + ' ' + this.method.inputs[key].name;
                }
                return placeholder;
            }
        },
        data: function() {
            return {
                selectedOption: 'ether',
                amount: "0",
                params: '',
                options: [
                    { value: 'ether', text: 'Ether' },
                    { value: 'wei', text: 'Wei' },
                ],
            }
        },
        methods: {
            run: function() {
                this.$emit('method-run', {
                    amount: this.amount,
                    unit: this.selectedOption,
                    method: this.method,
                    params: this.method.inputs.length ? '[' + this.params + ']' : '[]'
                });
            }
        }
    }
</script>
<style scoped>
    .unit-select, .amount-select {
        max-width: 70px;
    }
</style>
