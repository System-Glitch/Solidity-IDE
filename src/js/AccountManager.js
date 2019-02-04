class AccountManager {
    
    constructor() {
        this.accounts = [];
        this.selectedAccount = -1;
    }

    accounts() {
        return this.accounts;
    }

    selectedAccount() {
        return this.selectedAccount;
    }

    getActiveAccount() {
        return this.accounts[this.selectedAccount];
    }

    find(address) {
        for(let key in this.accounts) {
            if(this.accounts[key].address == address)
                return this.accounts[key];
        }
        return null;
    }
}

export default AccountManager;