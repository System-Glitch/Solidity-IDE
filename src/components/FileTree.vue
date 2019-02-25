<template>
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
</template>

<script>
    export default {
        name: "file-tree",
        props: {
            files: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            }
        },
        data: function() {
            return {
                selected: null
            }
        },
        methods: {
            select: function(file) {
                this.selected = file;
                this.$emit('select', this.selected);
            },
            clickDelete: function(file, event) {
                this.$emit('delete', file);

                if(event != undefined)
                    event.stopPropagation();
            },
        },
        mounted() {

        },
        beforeDestroy() {

        }
    }
</script>