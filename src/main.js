import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import App from './App.vue'

Vue.use(BootstrapVue)

require('./sass/app.scss');

Vue.config.productionTip = false
window.Event = new Vue;

const Web3 = require('web3');
window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

window.$ = require('jquery');

import AccountManager from './js/AccountManager.js';
window.accountManager = new AccountManager();

var isCtrl = false;
document.onkeyup=function(e){
    if(e.keyCode == 17) isCtrl = false;
}

document.onkeydown=function(e){
    if(e.keyCode == 17) isCtrl = true;
    if(e.keyCode == 83 && isCtrl == true) {
        Event.$emit('compile');
        return false;
    }
}

new Vue({
    render: h => h(App),
}).$mount('#app')

