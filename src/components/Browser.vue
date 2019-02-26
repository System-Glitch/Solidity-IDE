<template>
    <div class="d-flex flex-column bg-dark">
        <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
            <h5 class="m-0 d-inline-block">Browser</h5>
            <div>
                <button class="btn btn-success btn-sm" @click="updateFileList">Refresh</button>
            </div>
        </div>
        <div class="p-2 d-flex">
            <b-input-group class="w-auto flex-nowrap">
                <b-form-input v-model.trim="newFile" type="text" placeholder="New file..." size="sm" id="new-file" ref="create" @keyup.enter.native="create" @keydown="onInput"/>
                <b-input-group-append>
                    <b-button variant="success" size="sm" class="flex-shrink-0" v-on:click="create" :disabled="!validateNewFile()">Create</b-button>
                </b-input-group-append>
            </b-input-group>
        </div>
        <file-tree v-bind:files="files" v-on:select="select" v-on:delete="onDelete" v-bind:selected="selected" ref="tree"/>
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
    import FileTree from '../components/FileTree.vue';
    const forbiddenCharacters = '\\<>:"\'|?*~#\n\t\v\f\r'.split('');

    export default {
        name: "browser",
        components: {
            "file-tree": FileTree,
        },
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
                setTimeout(() => {
                    this.$refs.tree.updateDirectoryTree();
                }, 0);
            },
            updateSelection: function() {
                if(this.files.length > 0 && this.files.indexOf(this.selected) == -1) {
                    this.selectIndex(0);
                }
            },
            create: function() {

                if(!this.validateNewFile()) return;
                var name = this.newFile;

                if(!name.endsWith('.sol'))
                    name += '.sol';

                localStorage.setItem(name, '');
                const obj = {name: name, saved: true, state: 0};
                this.files.push(obj);
                this.files.sort(this.sort);
                this.$refs.tree.addFile(obj);

                this.newFile = '';

                this.select(obj);
            },
            onDelete: function(file) {
                this.deletingFile = file;
                this.$refs.confirmModal.show();
            },
            cancelDelete: function() {
                this.deletingFile = null;
            },
            deleteFile: function() {
                const index = this.files.indexOf(this.deletingFile);
                if(index != -1) {
                    this.files.splice(index, 1);
                    localStorage.removeItem(this.deletingFile.name);
                    this.$refs.tree.removeFile(this.deletingFile);
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
                const file = this.files[index];
                this.select(file);
            },
            handleFileChanged: function(fileName) {
                this.setFileSaved(fileName, false);
            },
            handleFileSaved: function(fileName) {
                this.resetStates();
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

                if(!fileName.endsWith('.sol'))
                    fileName += '.sol';

                for(let key in this.files) {
                    if(this.files[key].name == fileName) {
                        return this.files[key];
                    }
                }
                return null;
            },
            setFileSaved: function(fileName, saved) {
                const file = this.findFile(fileName);
                if(file.saved != saved) {
                    file.saved = saved;
                }
            },
            sort: function(a, b) {
                return a.name.localeCompare(b.name);
            },
            onInput: function(e) {
                if(forbiddenCharacters.indexOf(e.key) != -1) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
            validateNewFile: function() {
                return this.newFile.length &&
                    !this.newFile.endsWith('.') &&
                    !this.newFile.endsWith('/') &&
                    this.findFile(this.newFile) == null
            }
        },
        mounted() {
            GlobalEvent.$on('fileChanged', this.handleFileChanged);
            GlobalEvent.$on('fileSaved', this.handleFileSaved);
            GlobalEvent.$on('messages', this.handleFileState);

            this.updateFileList();

            if(localStorage['openFile']) {
                this.selected = this.findFile(localStorage['openFile']);
            }
        },
        beforeDestroy() {
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