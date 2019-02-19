var isCtrl = false;
var isF5 = false;
var isR = false;
document.onkeyup = function(e){
    if(e.keyCode == 17) isCtrl = false;
    else if(e.code == 'F5') isF5 = false;
    else if(e.code == 'r') isR = false;
}

document.onkeydown = function(e){
    if(e.keyCode == 17) isCtrl = true;
    else if(e.code == 'F5') isF5 = true;
    else if(e.code == 'r') isR = true;
    if(e.keyCode == 83 && isCtrl == true) {
        GlobalEvent.$emit('compile');
        return false;
    }
}

document.onwheel = function(e) {
    if(e.ctrlKey) {
        e.preventDefault();
        Event.$emit('fontSize', e.deltaY < 0);
    }
}

window.onbeforeunload = function() {
    // Shutdown server if tab closed
    if(!isF5 && !isCtrl && !isR) {
        axios.get('http://localhost:8081/shutdown');
    }
}
