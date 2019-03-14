process.versions = {
    node: '' // Patch for process.versions is undefined
}

import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import App from './App.vue'

window.Vue = Vue;
Vue.use(BootstrapVue)

require('./sass/app.scss');

Vue.config.productionTip = false
window.GlobalEvent = new Vue;

const Web3 = require('web3');
window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

window.axios = require('axios');

import AccountManager from './js/AccountManager.js';
window.accountManager = new AccountManager();

require('./js/keylistener');

new Vue({
    render: h => h(App),
}).$mount('#app')

