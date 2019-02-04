<template>
            <div class="mb-2 row">
                <button class="btn btn-sm col-6" v-bind:class="method.payable ? 'btn-info' : 'btn-secondary'" @click="run()">{{ method.name }}</button>
                <b-form-input :disabled="method.payable !== true" class="col-3 form-control-sm bg-light"
                      type="number"
                      required
                      min="0"
                      placeholder="Amount"
                      v-model="amount" />
                <b-form-select :disabled="method.payable !== true" v-model="selectedOption" :options="options" class="col-3 form-control-sm bg-light" />
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
        data: function() {
            return {
                selectedOption: 'ether',
                amount: "0",
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
                    method: this.method 
                });
            }
        },
        mounted() {
            
        }
    }
</script>