<template>
    <b-form-group
        :label="contract.name"
        :label-for="contract.name"
        v-if="visible"
    >
        <b-form-input :id="_uid + '_' + contract.name" v-model="params" trim :placeholder="paramsPlaceholder"/>
    </b-form-group>
</template>

<script>
    export default {
        name: "constructor-parameters",
        props: {
            contract: {
                type: Object,
                required: true,
            }
        },
        data: function() {
            return {
                params: '',
                method: null
            }
        },
        computed: {
            paramsPlaceholder: function() {
                var placeholder = '';
                if(this.method != null) {
                    for(let key in this.method.inputs) {
                        if(key > 0) placeholder += ', ';
                        placeholder += this.method.inputs[key].type + ' ' + this.method.inputs[key].name;
                    }
                }
                return placeholder;
            },
            value: function() {
                return this.method.inputs.length ? '[' + this.params + ']' : '[]';
            },
            visible: function() {
                return this.method && this.method.inputs.length;
            }
        },
        methods: {
            findConstructor: function() {
                for(let key in this.contract.abi) {
                    const method = this.contract.abi[key];
                    if(method.type == "constructor")
                        return method;
                }
                return null;
            }
        },
        mounted() {
            this.method = this.findConstructor();
        }
    }
</script>