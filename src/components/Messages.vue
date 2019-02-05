<template>
        <div class="d-flex flex-column h-50 bg-dark bottom-separator">
            <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center scrollable flex-shrink-0">
                <h5 class="m-0 d-inline-block">Messages</h5>
                <div class="text-nowrap">
                    <button class="btn btn-sm btn-primary mr-1" @click="compile()">Compile</button>
                    <button class="btn btn-sm btn-primary" @click="deploy()">Deploy</button>
                </div>
            </div>
            <div class="flex scrollable flex-grow-1">
                <div class="col">
                    <b-alert v-for="(message, index) in messages" :key="index" :variant="getVariant(message.severity)" show dismissible class="p-1 pr-4 mb-2">
                        <div class="w-100 overflow-auto monospace">{{ message.formattedMessage }}</div>
                    </b-alert>
                </div>
            </div>
        </div>
</template>

<script>
    export default {
        name: "messages",
        data: function() {
            return {
                messages: []
            }
        },
        methods: {
            compile: function() {
                Event.$emit('compile');
            },
            deploy: function() {
                Event.$emit('deploy');
            },
            getVariant: function(severity) {
                switch(severity) {
                    case 'error': return 'danger';
                    case 'warning': return 'warning';
                    case 'success': return 'success';
                    default: return 'info';
                }
            }
        },
        mounted() {
            Event.$on('messages', (messages) => {
                this.messages = messages;
            });
            Event.$on('message', (message) => {
                this.messages.push(message);
            });
        }
    }
</script>
<style scoped>
    .alert {
        white-space: pre;
        font-size: 12px;
    }
</style>