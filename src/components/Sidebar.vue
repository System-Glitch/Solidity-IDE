<template>
    <div class="d-flex flex-column" id="sidebar">
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
<style scoped>
    #sidebar {
        width: 30%;
        min-width: 30%;
    }
</style>