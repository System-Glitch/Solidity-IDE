<template>
    <div class="d-flex flex-column bg-dark">
        <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
            <h5 class="m-0 d-inline-block">Browser</h5>
        </div>
        <div class="p-2 d-flex">
            <b-input-group class="w-auto flex-nowrap">
                <b-form-input v-model.trim="newFile" type="text" placeholder="New file..." size="sm" id="new-file" ref="create" @keyup.enter.native="create"/>
                <b-input-group-append>
                    <b-button variant="success" size="sm" class="flex-shrink-0" v-on:click="create" :disabled="!newFile.length">Create</b-button>
                </b-input-group-append>
            </b-input-group>
        </div>
        <div class="scrollable">
            <b-list-group>
                <b-list-group-item
                v-for="file in files" v-bind:key="file.name"
                class="p-1 px-2 d-flex" v-bind:class="selected == file ? 'active' : ''"
                :title="file.name"
                v-on:click="select(file)">
                <span class="text-nowrap text-truncate w-100">
                    <span class="ace_gutter-cell ace_error" v-if="file.state == 2"></span>
                    <span class="ace_gutter-cell ace_warning" v-if="file.state == 1"></span>
                    <span v-if="!file.saved">*&nbsp;</span>
                    {{ file.name }}
                </span>
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
            <p>Are you sure you want to delete <strong class="monospace text-warning" v-if="deletingFile">{{ deletingFile.name }}</strong>?</p>
            <p>This action cannot be undone!</p>
        </b-modal>
    </div>
</template>

<script>

    export default {
        name: "browser",
        data: function() {
            return {
                selected: null,
                deletingFile: null,
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
                        this.files.push({name: key, saved: true, state: 0});
                    }
                }

                this.files.sort(this.sort);
                this.updateSelection();
            },
            updateSelection: function() {
                if(this.files.length > 0 && this.files.indexOf(this.selected) == -1) {
                    this.selectIndex(0);
                }
            },
            create: function() {
                var name = this.newFile;

                if(!name.endsWith('.sol'))
                    name += '.sol';

                localStorage.setItem(name, '');
                const obj = {name: name, saved: true, state: 0};
                this.files.push(obj);
                this.files.sort(this.sort);

                this.newFile = '';

                this.select(obj);
            },
            clickDelete: function(file, event) {
                this.deletingFile = file;
                this.$refs.confirmModal.show();

                if(event != undefined)
                    event.stopPropagation();
            },
            cancelDelete: function() {
                this.deletingFile = null;
            },
            deleteFile: function() {
                const index = this.files.indexOf(this.deletingFile);
                if(index != -1) {
                    this.files.splice(index, 1);
                    localStorage.removeItem(this.deletingFile.name);
                    GlobalEvent.$emit('fileDeleted', this.deletingFile.name);
                    this.deletingFile = null;

                    this.updateSelection();
                }
            },
            select: function(file) {
                this.selected = file;
                GlobalEvent.$emit('fileSelected', this.selected.name);
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
            },
            handleFileChanged: function(fileName) {
                this.setFileSaved(fileName, false);
            },
            handleFileSaved: function(fileName) {
                this.setFileSaved(fileName, true);
            },
            handleFileState: function(messages) {
                this.resetStates();
                for(let key in messages) {
                    const message = messages[key];
                    const file = this.findFile(message.sourceLocation.file);
                    if(file != null) {
                        const newState = this.getStateFromSeverity(message.severity);
                        file.state = file.state < newState ? newState : file.state;
                    }
                }
            },
            resetStates: function() {
                for(let key in this.files) {
                    this.files[key].state = 0;
                }
            },
            getStateFromSeverity: function(severity) {
                switch(severity) {
                    case 'error': return 2;
                    case 'warning': return 1;
                    default: return 0;
                }
            },
            findFile: function(fileName) {
                for(let key in this.files) {
                    if(this.files[key].name == fileName) {
                        return this.files[key];
                    }
                }
                return null;
            },
            setFileSaved: function(fileName, saved) {
                this.findFile(fileName).saved = saved;
            },
            sort: function(a, b) {
                return a.name.localeCompare(b.name);
            }
        },
        mounted() {
            GlobalEvent.$on('nextFile', this.handleNextFile);
            GlobalEvent.$on('previousFile', this.handlePreviousFile);
            GlobalEvent.$on('fileChanged', this.handleFileChanged);
            GlobalEvent.$on('fileSaved', this.handleFileSaved);
            GlobalEvent.$on('messages', this.handleFileState);

            this.updateFileList();

            if(localStorage['openFile']) {
                this.selected = this.findFile(localStorage['openFile']);
            }
        },
        beforeDestroy() {
            GlobalEvent.$off('nextFile', this.handleNextFile);
            GlobalEvent.$off('previousFile', this.handlePreviousFile);
            GlobalEvent.$off('fileChanged', this.handleFileChanged);
            GlobalEvent.$off('fileSaved', this.handleFileSaved);
            GlobalEvent.$off('messages', this.handleFileState);
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