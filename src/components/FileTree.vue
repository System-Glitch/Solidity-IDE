<template>
    <div class="scrollable d-flex">
        <b-list-group v-if="directoryTree" class="w-100">
            <directory v-bind:directory="directoryTree" v-on:select="select" v-on:delete="onDelete" v-bind:selected="selected" ref="rootDirectory"/>
        </b-list-group>
    </div>
</template>

<script>
    import Directory from '../components/Directory.vue';

    export default {
        name: "file-tree",
        components: {
            'directory': Directory
        },
        props: {
            files: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            selected: {
                type: Object,
                required: false,
                default: function() {
                    return null;
                }
            }
        },
        data: function() {
            return {
                directoryTree: null
            }
        },
        methods: {
            select: function(file) {
                this.$emit('select', file);
            },
            onDelete: function(file) {
                this.$emit('delete', file);
            },
            updateDirectoryTree: function() {
                this.directoryTree = {
                    files: [],
                    directories: {}
                };

                for(let key in this.files) {
                    const file = this.files[key];
                    this.addFile(file);
                }

                this.directoryTree.files.sort();
                setTimeout(() => {
                    if(!this.$refs.rootDirectory.open) {
                        this.$refs.rootDirectory.open = true;
                        this.$refs.rootDirectory.updateSelectedIndicator();
                    }
                }, 0);
            },
            addFile: function(file) {
                const index = file.name.lastIndexOf('/');

                if(index != -1) {
                    const path = file.name.substring(0, index);
                    const directories = path.split('/');

                    var currentDirectory = this.directoryTree;

                    for(let i = 0 ; i < directories.length ; i++) {
                        if(currentDirectory.directories[directories[i]] == undefined) {
                            currentDirectory.directories[directories[i]] = {
                                files: [],
                                directories: {}
                            };
                        }
                        currentDirectory = currentDirectory.directories[directories[i]];
                    }
                    currentDirectory.files.push(file);
                } else {
                    this.directoryTree.files.push(file);
                }
            },
            removeFile: function(file) {
                this.removeFileFromDirectory(file, this.directoryTree);
            },
            removeFileFromDirectory(file, directory) {
                const fileIndex = directory.files.indexOf(file);

                if(fileIndex != -1) {
                    directory.files.splice(fileIndex, 1);
                    return true;
                } else {
                    for(let key in directory.directories) {
                        const subDirectory = directory.directories[key];
                        if(this.removeFileFromDirectory(file, subDirectory)) {
                            if(subDirectory.files.length == 0) {
                                delete directory.directories[key];
                            }
                            return true;
                        }
                    }
                }

                return false;
            }
        }
    }
</script>