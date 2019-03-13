<template>
    <b-list-group-item class="d-flex flex-column" :title="directory ? directory.name : ''">
        <span v-on:click="toggleOpen()" class="pl-0 py-1 pr-2 text-nowrap" v-if="directory">
            <span class="icon icon-pad" :class="open ? 'directory-open' : 'directory'"></span>
            {{ directory.name }}
        </span>
        <b-list-group :class="open ? '' : 'd-none'">
            <directory v-for="subdirectory in directories" v-bind:key="subdirectory.path" v-bind:files="subdirectory.childs" v-bind:directory="subdirectory" v-on:select="select" v-on:delete="onDelete" v-on:loaded="onLoaded" v-bind:selected="selected" :ref="'directory_' + subdirectory.path"/>
            <b-list-group-item
            v-for="file in childFiles" v-bind:key="file.name"
            class="pl-0 py-1 pr-2 d-flex file" v-bind:class="selected == file ? 'active' : ''"
            :title="file.name"
            v-on:click="select(file)">
                <span class="text-nowrap text-truncate pr-1">
                    <span class="ace_gutter-cell ace_error" v-if="file.state == 2"></span>
                    <span class="ace_gutter-cell ace_warning" v-if="file.state == 1"></span>
                    <span class="icon icon-pad file" v-if="file.state == 0"></span>
                    <span v-if="!file.saved">*&nbsp;</span>
                    {{ file.name }}
                </span>
                <button type="button" aria-label="Close" class="close" @click="clickDelete(file, $event)">×</button>
                <div class="selected-indicator" :ref="file.name + '_select'"></div>
            </b-list-group-item>
        </b-list-group>
    </b-list-group-item>
</template>

<script>
    export default {
        name: "directory",
        props: {
            files: {
                type: Array,
                required: true
            },
            directory: {
                type: Object,
                required: false
            },
            selected: {
                type: Object,
                required: false,
                default: function() {
                    return null;
                }
            },
        },
        data: function() {
            return {
                open: false
            }
        },
        watch: {
            selected: function() {
                setTimeout(() => {
                    this.updateSelectedOpen();
                }, 0);
            }
        },
        computed: {
            childFiles: function () {
                return this.files.filter(function (file) {
                    return !file.directory;
                })
            },
            directories: function () {
                return this.files.filter(function (file) {
                    return file.directory;
                })
            }
        },
        methods: {
            select: function(file) {
                this.$emit('select', file);
            },
            onDelete: function(file, files) {
                this.$emit('delete', file, files ? files : this.files);
            },
            onLoaded: function(directory) {
                this.$emit('loaded', directory);
            },
            clickDelete: function(file, event) {
                this.onDelete(file);

                if(event != undefined)
                    event.stopPropagation();
            },
            toggleOpen: function(callback) {
                if(this.files.indexOf(this.selected) == -1) {
                    this.open = !this.open;
                    if(this.open && this.directory && this.files.length == 0) {
                        window.axios.get('http://localhost:8081/directory', {params: {dir: this.directory.path}})
                        .then(function(response) {
                            this.directory.childs = response.data;
                            this.updateSelectedIndicator();
                            this.$emit('loaded', this);

                            if(callback) {
                                callback(this.directory);
                            }
                        }.bind(this))
                        .catch(function( error ) {
                            if(error.response != undefined) {
                                GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch directory content: " + error.response.data });
                            } else {
                                GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch directory content: no response from server"});
                            }
                        });
                    }
                }
            },
            updateSelectedIndicator: function() {
                if(this.childFiles.length > 0) {
                    const elements = this.$refs[this.childFiles[0].name + '_select'];
                    if(elements != undefined && elements[0] != undefined) {
                        const element = elements[0];
                        element.style.left = '';
                        const position = this.calculatePosition(element);

                        for(let i = 0 ; i < this.childFiles.length ; i++) {
                            const element = this.$refs[this.childFiles[i].name + '_select'][0];
                            if(element.style.left == '') {
                                element.style.left = position;
                            }
                        }
                    }
                }
            },
            updateSelectedOpen: function() {
                for(let key in this.directories) {
                    const directory = this.$refs['directory_' + this.directories[key].path][0];
                    if(directory != undefined && directory.updateSelectedOpen()) {
                        this.open = true;
                        setTimeout(() => { this.updateSelectedIndicator() }, 0);
                        return true;
                    }
                }

                if(this.files.indexOf(this.selected) != -1) {
                    this.open = true;
                    setTimeout(() => { this.updateSelectedIndicator() }, 0);
                    return true;
                }

                return false;
            },
            calculatePosition: function(element) {
                const left = element.getBoundingClientRect().left;
                return (-left) + 'px';
            },
            handleBrowserRefresh: function() {
                if(this.directory) {
                    this.open = false;
                }
            }
        },
        mounted() {
            GlobalEvent.$on('browserRefresh', this.handleBrowserRefresh);
        },
        beforeDestroy() {
            GlobalEvent.$off('browserRefresh', this.handleBrowserRefresh);
        }
    }
</script>