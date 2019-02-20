<template>
    <div class="d-flex flex-column">
        <accounts/>
        <messages/>
    </div>
</template>

<script>
    import Accounts from '../components/Accounts.vue'
    import Messages from '../components/Messages.vue'

    export default {
        name: "sidebar",
        components: {
            'accounts': Accounts,
            'messages': Messages,
        }
    }
</script>
