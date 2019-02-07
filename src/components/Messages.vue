<template>
        <div class="d-flex flex-column h-50 bg-dark bottom-separator">
            <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
                <h5 class="m-0 d-inline-block">Messages</h5>
                <div class="text-nowrap">
                    <button class="btn btn-sm btn-primary mr-1" @click="compile()">Compile</button>
                    <button class="btn btn-sm btn-primary" @click="deploy()">Deploy</button>
                </div>
            </div>
            <div class="flex scrollable flex-grow-1">
                <div class="col mb-2">
                    <b-progress :value="100" :max="100" variant="success" animated v-if="processing"></b-progress>
                </div>
                <div class="col">
                    <b-alert v-for="message in messages" :key="message.id" :variant="getVariant(message.severity)" show dismissible class="p-1 pr-4 mb-2" @dismissed="dismiss(message)">
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
                messages: [],
                messageCount: 0,
                processing: false,
            }
        },
        methods: {
            compile: function() {
                Event.$emit('compile');
            },
            deploy: function() {
                Event.$emit('deploy');
            },
            dismiss: function(message) {
                this.messages.splice(this.messages.indexOf(message), 1);
            },
            getVariant: function(severity) {
                switch(severity) {
                    case 'error': return 'danger';
                    case 'warning': return 'warning';
                    case 'success': return 'success';
                    default: return 'info';
                }
            },
            clearMessages: function() {
                this.messages = [];
            },
            addMessages: function(messages) {
                for(let i = 0 ; i < messages.length ; i++) {
                    this.addMessage(messages[i]);
                }
            },
            addMessage: function(message) {
                message.id = this.messageCount++;
                this.messages.push(message);
            },
            setProcessing: function(processing) {
                this.processing = processing;
            }
        },
        mounted() {
            Event.$on('messages', this.addMessages);
            Event.$on('message', this.addMessage);
            Event.$on('clearMessages', this.clearMessages);
            Event.$on('processing', this.setProcessing);
        },
        beforeDestroy() {
            Event.$off('messages', this.addMessages);
            Event.$off('message', this.addMessage);
            Event.$off('clearMessages', this.clearMessages);
            Event.$off('processing', this.setProcessing);
        }
    }
</script>
<style scoped>
    .alert {
        white-space: pre;
        font-size: 12px;
    }
</style>