<template>
    <div class="d-flex flex-column h-50 bg-dark bottom-separator">
        <div class="p-2 d-flex flex-horizontal justify-content-between align-items-center flex-shrink-0">
            <h5 class="m-0 d-inline-block">Accounts</h5>
            <div>
                <button class="btn btn-success btn-sm" @click="updateAccounts()">Refresh</button>
            </div>
        </div>
        <div class="table-container scrollable h-100">
            <table class="table table-striped table-dark table-fixed table-sm">
                <thead>
                    <tr class="table-header">
                        <th class="table-fit bg-dark"></th>
                        <th class="bg-dark">Account</th>
                        <th class="bg-dark balance-cell">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(account, index) in accountManager.accounts" v-bind:key="account.address">
                        <td class="align-middle text-center table-fit p-0">
                            <div class="custom-control custom-radio">
                                <input type="radio" class="align-middle m-0 custom-control-input" name="active-account"  :id="'account-radio-' + index" :value="index" v-model="accountManager.selectedAccount">
                                <label class="custom-control-label" :for="'account-radio-' + index"></label>
                            </div>
                        </td>
                        <td class="align-middle" :title="account.address">
                            <div class="text-nowrap text-truncate">
                                {{account.address}}
                            </div>
                        </td>
                        <td class="align-middle text-nowrap">
                            {{account.balance}} ETH
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
    export default {
        name: "accounts",
        data: function() {
            return {
                accountManager: window.accountManager
            }
        },
        methods: {
            refreshAccounts: function(accounts, callback) {
                if(accounts == "all") {
                    this.updateAccounts(callback);
                } else {
                    for(let i = 0 ; i < accounts.length ; i++) {
                        this.updateAccount(accounts[i], callback);
                    }
                }
            },
            updateAccounts: function(callback) {
                window.web3.eth.getAccounts().then((accounts) => {
                    const temp = [];
                    for(let key in accounts) {
                        const account = accounts[key];
                        const current = window.accountManager.find(account);
                        temp.push({address: account, balance: current != null ? current.balance : 0});
                        this.updateAccount(account);
                    }
                    if(window.accountManager.accounts.length == 0) {
                        window.accountManager.selectedAccount = 0;
                    }
                    window.accountManager.accounts = temp;

                    if(callback != undefined) {
                        callback();
                    }
                })
                .catch((error) => {
                    GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch accounts: " + error.message});
                });
            },
            updateAccount: function(account, callback) {
                window.web3.eth.getBalance(account).then((balance) => {
                    window.accountManager.find(account).balance = window.web3.utils.fromWei(balance.toString(), "ether").toString();

                    if(callback != undefined) {
                        callback();
                    }
                })
                .catch((error) => {
                    GlobalEvent.$emit('message', {severity: 'error', formattedMessage: "Couldn't fetch account " + account + ": " + error.message});
                });
            }
        },
        mounted() {
            this.updateAccounts();
            GlobalEvent.$on('refreshAccounts', this.refreshAccounts);
        },
        beforeDestroy() {
            GlobalEvent.$off('refreshAccounts', this.refreshAccounts);
        }
    }
</script>
<style scoped>
    .balance-cell {
        width: 125px;
    }
</style>