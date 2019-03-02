<template>
    <div class="d-flex flex-column bg-dark">
        <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
            <h5 class="m-0 d-inline-block">Browser</h5>
            <div>
                <button class="btn btn-primary btn-sm" @click="updateFileList"><i class="icon refresh"></i></button>
            </div>
        </div>
        <div class="p-2 d-flex">
            <b-input-group class="w-auto flex-nowrap">
                <b-form-input v-model.trim="newFile" type="text" placeholder="New file..." size="sm" id="new-file" maxlength="255" ref="create" @keyup.enter.native="create" @keydown="onInput"/>
                <b-input-group-append>
                    <b-button variant="success" size="sm" class="flex-shrink-0" v-on:click="create" :disabled="!validateNewFile()">Create</b-button>
                </b-input-group-append>
            </b-input-group>
        </div>
        <div class="scrollable d-flex">
            <b-list-group v-if="files" class="w-100">
                <directory v-bind:files="files" v-on:select="select" v-on:delete="onDelete" v-bind:selected="selected" ref="rootDirectory"/>
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
            <p>Are you sure you want to delete <strong class="monospace text-warning" v-if="deletingFile">{{ deletingFile.path }}</strong>?</p>
            <p>This action cannot be undone!</p>
        </b-modal>
    </div>
</template>

<script>
    import Directory from '../components/Directory.vue';
    const forbiddenCharacters = '\\<>:"\'|?*~#\n\t\v\f\r'.split('');

    export default {
        name: "browser",
        components: {
            "directory": Directory,
        },
        data: function() {
            return {
                selected: null,
                deletingFile: null, // Temp storage of instance of file to delete (awaiting user confirmation)
                deletingFiles: null, // Used to know from which array to remove the deleted file
                newFile: '',
                files: []
            }
        },
        methods: {
            updateFileList: function() {

                window.axios.get('http://localhost:8081/directory') // TODO don't load the whole tree at once
                .then(function(response) {
                    this.files = [];
                    for(let key in response.data) {
                        const file = response.data[key];
                        this.files.push(file);
                    }

                    this.files.sort(this.sort);
                    this.updateSelection();
                    this.$refs.rootDirectory.open = true;
                    this.$refs.rootDirectory.updateSelectedOpen();
                    GlobalEvent.$emit('browserRefresh');
                }.bind(this))
                .catch(function( error ) {
                    GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch directory content: " + error.message });
                });
            },
            updateSelection: function() {
                const file = this.selected != null ? this.findFile(this.files, this.selected.path) : null;
                if(this.selected != file)
                    this.selected = file;
            },
            create: function() {

                if(!this.validateNewFile()) return;
                var name = this.newFile;

                if(!name.endsWith('.sol'))
                    name += '.sol';

                localStorage.setItem(name, '');
                const obj = {name: name, directory: false, saved: true, state: 0};
                this.files.push(obj);
                this.files.sort(this.sort);
                this.$refs.tree.addFile(obj);

                this.newFile = '';

                this.select(obj);
            },
            onDelete: function(file, files) {
                this.deletingFile = file;
                this.deletingFiles = files;
                this.$refs.confirmModal.show();
            },
            cancelDelete: function() {
                this.deletingFile = null;
                this.deletingFiles = null;
            },
            deleteFile: function() {
                const index = this.deletingFiles.indexOf(this.deletingFile);
                if(index != -1) {
                    window.axios.delete('http://localhost:8081/delete', {
                        data: {
                            file: this.deletingFile.path
                        }
                    })
                    .then(function() {
                        this.deletingFiles.splice(index, 1);
                        GlobalEvent.$emit('fileDeleted', this.deletingFile.path);
                        this.cancelDelete();

                        this.updateSelection();
                    }.bind(this))
                    .catch(function(error) {
                        GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't delete file: " + error.message});
                    });
                }
            },
            select: function(file) {
                this.selected = file;
                GlobalEvent.$emit('fileSelected', this.selected ? this.selected.path : null);
            },
            handleFileChanged: function(fileName) {
                this.setFileSaved(fileName, false);
            },
            handleFileSaved: function(fileName) {
                this.resetStates(this.files);
                this.setFileSaved(fileName, true);
            },
            handleFileState: function(messages) {
                this.resetStates(this.files);
                for(let key in messages) {
                    const message = messages[key];
                    const file = this.findFile(this.files, message.sourceLocation.file);
                    if(file != null) {
                        const newState = this.getStateFromSeverity(message.severity);
                        file.state = file.state < newState ? newState : file.state;
                    }
                }
            },
            handleBrowserRefresh: function() {
                if(localStorage['openFile']) {
                    this.select(this.findFile(this.files, localStorage['openFile']));
                }
            },
            resetStates: function(dir) {
                for(let key in dir) { // TODO not working anymore
                    dir[key].state = 0;

                    if(dir[key].directory) {
                        this.resetStates(dir[key].childs);
                    }
                }
            },
            getStateFromSeverity: function(severity) {
                switch(severity) {
                    case 'error': return 2;
                    case 'warning': return 1;
                    default: return 0;
                }
            },
            findFile: function(dir, fileName) {

                if(!fileName.endsWith('.sol'))
                    fileName += '.sol';

                for(let key in dir) {
                    if(!dir[key].directory && dir[key].path == fileName) {
                        return dir[key];
                    }
                }

                for(let key in dir) {
                    if(dir[key].directory && dir[key].childs.length) {
                        const file = this.findFile(dir[key].childs, fileName);
                        if(file != null)
                            return file;
                    }
                }

                return null;
            },
            setFileSaved: function(fileName, saved) {
                const file = this.findFile(this.files, fileName);
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
                return this.newFile.length > 0 &&
                    this.newFile.length <= 255 &&
                    !this.newFile.endsWith('.') &&
                    !this.newFile.endsWith('/') &&
                    this.findFile(this.files, this.newFile) == null
            }
        },
        mounted() {
            GlobalEvent.$on('fileChanged', this.handleFileChanged);
            GlobalEvent.$on('fileSaved', this.handleFileSaved);
            GlobalEvent.$on('messages', this.handleFileState);
            GlobalEvent.$on('browserRefresh', this.handleBrowserRefresh);

            this.updateFileList();
        },
        beforeDestroy() {
            GlobalEvent.$off('fileChanged', this.handleFileChanged);
            GlobalEvent.$off('fileSaved', this.handleFileSaved);
            GlobalEvent.$off('messages', this.handleFileState);
            GlobalEvent.$off('browserRefresh', this.handleBrowserRefresh);
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