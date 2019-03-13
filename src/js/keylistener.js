var isCtrl = false;
var isF5 = false;
var isR = false;

document.onkeyup = function(e) {
    if(e.ctrlKey) isCtrl = false;
    else if(e.key == 'F5') isF5 = false;
    else if(e.key == 'r') isR = false;
}

document.onkeydown = function(e) {
    if(e.ctrlKey) isCtrl = true;
    else if(e.key == 'F5') isF5 = true;
    else if(e.key == 'r') isR = true;

    if(e.key == 's' && e.ctrlKey) {
        GlobalEvent.$emit('compile');
        return false;
    }
}

document.onwheel = function(e) {
    if(e.ctrlKey) {
        e.preventDefault();
        GlobalEvent.$emit('fontSize', e.deltaY < 0);
    }
}

window.onbeforeunload = function() {
    // Shutdown server if tab closed
    if(!isF5 && !isCtrl && !isR) {
        axios.get('http://localhost:8081/shutdown');
    }
}
