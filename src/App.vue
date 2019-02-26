<template>
    <div id="app" class="h-100 d-flex flex-column">
        <div class="w-100 flex-grow-1 d-flex flex-nowrap flex-fit" id="main">
            <browser id="browser"/>
            <editor id="editor"/>
            <sidebar id="sidebar"/>
        </div>
        <contracts id="contracts"/>
    </div>
</template>

<script>
    import Sidebar from './components/Sidebar.vue'
    import Browser from './components/Browser.vue'
    import Contracts from './components/Contracts.vue'
    import Editor from './components/Editor.vue'
    import Split from 'split.js'

    export default {
        name: 'app',
        components: {
            "sidebar": Sidebar,
            "editor": Editor,
            "contracts": Contracts,
            "browser": Browser
        },
        data: function() {
            return {
                verticalSplit: null,
                horizontalSplit: null
            }
        },
        mounted() {
            var sizesHor = localStorage.getItem('split-sizes-horizontal');
            sizesHor = sizesHor ?  JSON.parse(sizesHor) : [10, 60, 30];
            var sizesVer = localStorage.getItem('split-sizes-vertical');
            sizesVer = sizesVer ?  JSON.parse(sizesVer) : [80, 20];


            this.horizontalSplit = Split(['#browser', '#editor', '#sidebar'], {
                sizes: sizesHor,
                minSize: [200, 300, 300],
                gutterSize: 3,
                snapOffset: 1,
                onDragEnd: (sizes) => {
                    GlobalEvent.$emit('resizeEditor');
                    localStorage.setItem('split-sizes-horizontal', JSON.stringify(sizes));
                },
            });
            this.verticalSplit = Split(['#main', '#contracts'], {
                sizes: sizesVer,
                minSize: [300, 200],
                gutterSize: 3,
                snapOffset: 1,
                direction: 'vertical',
                onDragEnd: (sizes) => {
                    GlobalEvent.$emit('resizeEditor');
                    localStorage.setItem('split-sizes-vertical', JSON.stringify(sizes));
                },
            });
            GlobalEvent.$emit('resizeEditor');
        },
        beforeDestroy() {
            this.horizontalSplit.destroy();
            this.verticalSplit.destroy();
        }
    }
</script>
<style scoped lang="scss">
@import 'sass/app.scss';

#contracts {
    min-height: 200px;
}

#browser {
    min-width: 200px;
}

#sidebar {
    min-width: 300px;
}
</style>
