let auto_nameToChange = "" // GET FROM OPTIONS MENU / default -None 
let auto_click = false; // GET FROM OPTIONS MENU ,not allowed without name-to-change/ default -off
let timeout = 0 // set if needed (only after multiple tests)
function AutochangeName(name,click){
    document.getElementById("sessionform-firstname").value = name;
    if (!click){
        return 0;
    }
    setTimeout(()=>{document.querySelector(['button']).click()},500)
    
} 
window.onload = function()  {setTimeout(() => AutochangeName(auto_nameToChange,auto_click),timeout)}