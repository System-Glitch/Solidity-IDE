<template>
    <b-list-group-item :title="name" class="d-flex flex-column">
        <span v-on:click="toggleOpen" class="pl-0 py-1 pr-2 text-nowrap" v-if="name != ''">
            <span class="icon" :class="open ? 'directory-open' : 'directory'"></span>
            {{ name }}
        </span>
        <b-list-group :class="open ? '' : 'd-none'">
            <directory v-for="(subdirectory, name) in directory.directories" v-bind:key="name" v-bind:directory="subdirectory" v-bind:name="name" v-on:select="select" v-on:delete="onDelete"  v-bind:selected="selected" :ref="'directory_' + name"/>
            <b-list-group-item
            v-for="file in directory.files" v-bind:key="file.name"
            class="pl-0 py-1 pr-2 d-flex file" v-bind:class="selected == file ? 'active' : ''"
            :title="lastSegment(file.name)"
            v-on:click="select(file)">
                <span class="text-nowrap text-truncate pr-1">
                    <span class="ace_gutter-cell ace_error" v-if="file.state == 2"></span>
                    <span class="ace_gutter-cell ace_warning" v-if="file.state == 1"></span>
                    <span class="icon file" v-if="file.state == 0"></span>
                    <span v-if="!file.saved">*&nbsp;</span>
                    {{ lastSegment(file.name) }}
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
            directory: {
                type: Object,
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
            directory: function() {
                setTimeout(() => {
                    this.updateSelectedIndicator();
                }, 0);
            },
            selected: function() {
                setTimeout(() => {
                    this.updateSelectedIndicator();
                }, 0);
            },
            open: function() {
                setTimeout(() => {
                    this.updateSelectedIndicator();
                }, 0);
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
                if(this.directory.files.indexOf(this.selected) == -1) {
                    this.open = !this.open;
                    if(this.open) {
                        this.updateSelectedIndicator();
                    }
                }
            },
            lastSegment: function(path) {
                return path.substring(path.lastIndexOf('/') + 1);
            },
            updateSelectedIndicator: function() {
                if(this.directory.files.length > 0) {
                    const elements = this.$refs[this.directory.files[0].name + '_select'];
                    if(elements != undefined && elements[0] != undefined) {
                        const element = elements[0];
                        const height = element.parentElement.clientHeight;

                        for(let i = 0 ; i < this.directory.files.length ; i++) {
                            const element = this.$refs[this.directory.files[i].name + '_select'][0];
                            if(element.style.height == '') {
                                element.style.height = height + 'px';
                                element.style.transform = 'translateY(' + (-height) + 'px)';
                            }
                        }
                    }
                }

                this.updateSelectedOpen();
            },
            updateSelectedOpen: function() {
                for(let key in this.directory.directories) {
                    const directory = this.$refs['directory_' + key][0];
                    if(directory != undefined && directory.updateSelectedOpen()) {
                        this.open = true;
                        return true;
                    }
                }

                if(this.directory.files.indexOf(this.selected) != -1) {
                    this.open = true;
                    return true;
                }
            }
        }
    }
</script>