<template>
    <div id="app" class="h-100 d-flex flex-column">
        <div class="w-100 flex-grow-1 d-flex flex-nowrap">
            <editor/>
            <sidebar/>
        </div>
        <div class="w-100">
            <contracts/>
        </div>
    </div>
</template>

<script>
    import Sidebar from './components/Sidebar.vue'
    import Contracts from './components/Contracts.vue'
    import Editor from './components/Editor.vue'

    export default {
        name: 'app',
        components: {
            "sidebar": Sidebar,
            "editor": Editor,
            "contracts": Contracts,
        }
}
</script>
<style scoped lang="scss">
@import 'sass/app.scss'
</style>
