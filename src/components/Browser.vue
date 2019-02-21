<template>
    <div class="d-flex flex-column bg-dark">
        <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
            <h5 class="m-0 d-inline-block">Browser</h5>
        </div>
        <div class="p-2 d-flex">
            <b-input-group class="w-auto flex-nowrap">
                <b-form-input v-model="newFile" type="text" placeholder="New file..." size="sm" id="new-file" ref="create" @keyup.enter.native="create"/>
                <b-input-group-append>
                    <b-button variant="success" size="sm" class="flex-shrink-0" v-on:click="create" :disabled="!newFile.length">Create</b-button>
                </b-input-group-append>
            </b-input-group>
        </div>
        <div class="scrollable">
            <b-list-group>
                <b-list-group-item
                v-for="file in files" v-bind:key="file"
                class="p-1 px-2 d-flex" v-bind:class="selected == file ? 'active' : ''"
                :title="file"
                v-on:click="select(file)">
                <span class="text-nowrap text-truncate w-100">{{ file }}</span>
                <button type="button" aria-label="Close" class="close" @click="clickDelete(file, $event)">×</button>
            </b-list-group-item>
        </b-list-group>
        </div>
        <b-modal
            ref="confirmModal"
            title="Are you sure?"
            ok-title="Delete"
            v-on:ok="deleteFile"
            v-on:cancel="cancelDelete"
            lazy
            content-class="bg-transparent"
            header-bg-variant="danger" header-text-variant="light"
            body-bg-variant="dark" body-text-variant="light"
            footer-bg-variant="dark" footer-text-variant="light"
            ok-variant="danger" cancel-variant="primary"
        >
            <p>Are you sure you want to delete <strong class="monospace text-warning">{{ deletingFile }}</strong>?</p>
            <p>This action cannot be undone!</p>
        </b-modal>
    </div>
</template>

<script>

    export default {
        name: "browser",
        data: function() {
            return {
                selected: '',
                deletingFile: '',
                newFile: '',
                files: []
            }
        },
        methods: {
            updateFileList: function() {
                this.files = [];
                for (let i = 0; i < localStorage.length; i++){
                    const key = localStorage.key(i);
                    if(key.endsWith('.sol')) {
                        this.files.push(key);
                    }
                }

                this.files.sort();
                this.updateSelection();
            },
            updateSelection: function() {
                if(this.files.length > 0 && this.files.indexOf(this.selected) == -1) {
                    this.select(this.files[0]);
                }
            },
            create: function() {
                var name = this.newFile;

                if(!name.endsWith('.sol'))
                    name += '.sol';

                localStorage.setItem(name, '');
                this.files.push(name);
                this.files.sort();

                this.newFile = '';

                this.select(name);
            },
            clickDelete: function(file, event) {
                this.deletingFile = file;
                this.$refs.confirmModal.show();

                if(event != undefined)
                    event.stopPropagation();
            },
            cancelDelete: function() {
                this.deletingFile = '';
            },
            deleteFile: function() {
                const index = this.files.indexOf(this.deletingFile);
                if(index != -1) {
                    this.files.splice(index, 1);
                    localStorage.removeItem(this.deletingFile);
                    GlobalEvent.$emit('fileDeleted', this.deletingFile);
                    this.deletingFile = '';

                    this.updateSelection();
                }
            },
            select: function(file) {
                this.selected = file;
                GlobalEvent.$emit('fileSelected', this.selected);
            },
            selectIndex: function(index) {
                this.select(this.files[index]);
            },
            handleNextFile: function() {
                const index = this.files.indexOf(this.selected);
                if(index == this.files.length - 1) {
                    this.selectIndex(0);
                } else {
                    this.selectIndex(index + 1);
                }
            },
            handlePreviousFile: function() {
                const index = this.files.indexOf(this.selected);
                if(index == 0) {
                    this.selectIndex(this.files.length - 1);
                } else {
                    this.selectIndex(index - 1);
                }
            }
        },
        mounted() {
            GlobalEvent.$on('nextFile', this.handleNextFile);
            GlobalEvent.$on('previousFile', this.handlePreviousFile);

            this.updateFileList();

            if(localStorage['openFile']) {
                this.selected = localStorage['openFile'];
            }
        },
        beforeDestroy() {
            GlobalEvent.$off('nextFile', this.handleNextFile);
            GlobalEvent.$off('previousFile', this.handlePreviousFile);
        }
    }
</script>
<style scoped>
#new-file {
    width: auto;
    min-width: 0;
}

.input-group {
    max-width: 100%;
}
</style>