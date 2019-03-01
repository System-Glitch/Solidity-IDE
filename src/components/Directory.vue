<template>
    <b-list-group-item :title="name" class="d-flex flex-column">
        <span v-on:click="toggleOpen" class="pl-0 py-1 pr-2 text-nowrap" v-if="name != ''">
            <span class="icon" :class="open ? 'directory-open' : 'directory'"></span>
            {{ name }}
        </span>
        <b-list-group :class="open ? '' : 'd-none'">
            <directory v-for="subdirectory in directories" v-bind:key="subdirectory.path" v-bind:files="subdirectory.childs" v-bind:name="subdirectory.name" v-on:select="select" v-on:delete="onDelete"  v-bind:selected="selected" :ref="'directory_' + subdirectory.path"/>
            <b-list-group-item
            v-for="file in childFiles" v-bind:key="file.name"
            class="pl-0 py-1 pr-2 d-flex file" v-bind:class="selected == file ? 'active' : ''"
            :title="file.name"
            v-on:click="select(file)">
                <span class="text-nowrap text-truncate pr-1">
                    <span class="ace_gutter-cell ace_error" v-if="file.state == 2"></span>
                    <span class="ace_gutter-cell ace_warning" v-if="file.state == 1"></span>
                    <span class="icon file" v-if="file.state == 0"></span>
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
            name: {
                type: String,
                required: false,
                default: function() {
                    return '';
                }
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
            onDelete: function(file) {
                this.$emit('delete', file);
            },
            clickDelete: function(file, event) {
                this.onDelete(file);

                if(event != undefined)
                    event.stopPropagation();
            },
            toggleOpen: function() {
                if(this.files.indexOf(this.selected) == -1) {
                    this.open = !this.open;
                    if(this.open) {
                        this.updateSelectedIndicator();
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
            }
        }
    }
</script>