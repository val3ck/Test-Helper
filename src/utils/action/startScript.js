
// interval check every timeout_interval seconds for change in Paragraphs, {observe func can be better}

function getP(answers,questions,multi) { // getting paragraph
    // converting node to array to use methods as map(), then joining to make complete version
    let answer = Array.from(answers).map(n => n.innerHTML).join(',');
    let question = Array.from(questions).map(n => n.innerHTML).join(',');
    browser.runtime.sendMessage({type:'aiAsk',data:{answers:answer,quest:question,multi:multi}})
    return 0;
}
// Checking and remembering p's 
function parse(callback,screenshot){ // callback calls func when it's ready
    let node = document.querySelectorAll('p')
    let arr = Array.from(node); // getting array to compare the last node and new (OBJS/NODES ALWAYS NEW, THEY CANNOT BE REPEATED)
    let screenshoto = arr.map(n => n.outerHTML).join('')
    let answers = document.querySelector(".test-question-options").querySelectorAll('p')
    let questions = document.querySelector(".test-content-text").querySelectorAll('p')
    // let images = document.querySelector(".test-content-image")
    if (arr.length<=1 || screenshot == screenshoto){
        return screenshoto;
    }
    let multiTest = multi_test();
    callback(answers,questions,multiTest)
    return screenshoto;
    
}
// starting => doing with intervals // Can be also done with mutationobserver, which is probb better
function start(timeout_interval=2000,values_screensh=null) {
    setInterval(()=>{
        let res = parse(getP,values_screensh);
        values_screensh = res;
    },timeout_interval)
}
function multi_test() {
    document.querySelectorAll('p').forEach(element => {
        if (result) return;
        //just looking for thing that exists only with multiple answer
        let multiple = element.parentElement.parentElement.querySelectorAll("div[class='question-checkbox-state']")
        multiple.forEach(obj => {if(obj) result = true; return 0;})
        
        });
    return result;
}

// ig extension scripts starting before other sites would start, that's why we are adding this 
//stolen from cheith's CS tho
function check_ready(){        
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => start()); // 1arg repeat interval, 2arg save values
    } else {
        start()
    }
}
async function check_status(){ // checking 
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring
    // copied declaration below from chat gpt, this is nice thing to remember // object unpacking Destructuring 
    let {['start-checkbox']: ready} = await browser.storage.local.get('start-checkbox');
    if (ready) return check_ready();// make it less space
    browser.storage.onChanged.addListener((changes,area)=>{ 
    // adding event listener to watch when our value change itself
        // ?. preventing error which could be if .newValue is undefined
        if (changes['start-checkbox']?.newValue && area == 'local') check_ready()
    })
}
let result = false
check_status()

