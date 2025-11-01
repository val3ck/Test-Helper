    // Interval check every timeout_interval 
    // seconds for change in Paragraphs, {observe func can be better}
    // Also, vseosvita got the same  

function getP(answers,questions,type) { // getting paragraph
    // converting node to array to use methods as map(), then joining to make complete version
    console.log(type)
    let answer = Array.from(answers).map(n => n.outerHTML.replace(/\&nbsp;/g, '')).join(',');
    let question = Array.from(questions).map(n => n.outerHTML.replace(/\&nbsp;/g, '')).join(',');
    browser.runtime.sendMessage({type:'aiAsk',data:{answers:answer,quest:question,testType:type}})
    return 0;
}
// Checking and remembering p's 
function parse(callback,screenshot){ // callback calls func when it's ready
    let node = document?.querySelectorAll('p')
    let arr = Array.from(node) // getting array to compare the last node and new (OBJS/NODES ALWAYS NEW, THEY CANNOT BE REPEATED)
        .filter((word)=>!word?.classList.contains("in-header"))
    let screenshoto = arr.map(n => n.outerHTML).join('')
    // let images = document.querySelector(".test-content-image")
    if (arr.length<=1 || screenshot == screenshoto ){
        return screenshoto;
    }
    if (window.location.host != 'vseosvita.ua'){
        let answers = document.querySelector(".test-question-options")?.querySelectorAll('p')
        let questions = document.querySelector(".test-content-text")?.querySelectorAll('p')
        let multiTest = multi_test();
        let testType = "checkbox";
        if (multiTest == true) testType = "idle" 
        callback(answers,questions,testType)
        return screenshoto;
    }
    
    
    
    let answer = document.querySelector(".flex-row-test").querySelectorAll('p')
    let question = document.querySelector(".content-box").querySelectorAll('p')
    let testType = test_type()
    if (testType == undefined) {
        console.log('error')
        return screenshoto
    }
    console.log(answer,question)
    callback(answer,question,testType)
    return screenshoto
    
}
// starting => doing with intervals // Can be also done with mutationobserver, which is probb better
function start(timeout_interval=1000,values_screensh=null) {
    setInterval(()=>{
        browser.storage.local.get('start-checkbox').then(el=>{
            
            if (document.fullscreenElement) { 
                // removing FULLSCREEN wall
                document.exitFullscreen()
                setTimeout(()=>{
                    document.querySelector('.vo-block-white')?.remove()
                    document.querySelectorAll('div[style]')?.forEach(p=>{
                        if (getComputedStyle(p).display == 'none'){
                            p.style.display = 'block';
                        }
                    })
                },1000)
                
            }

            let res = parse(getP,values_screensh);
            values_screensh = res;
            
        })
    },timeout_interval)
}
function multi_test(result = false,multiple=null) { // Specific to naurok , cause got only 2 types
    document.querySelectorAll('p').forEach(element => {
        if (result) return;
        //just looking for thing that exists only with multiple answer
          multiple = element.parentElement.parentElement.querySelectorAll(".question-checkbox-state")
          multiple.forEach(obj => {if(obj) result = true; return 0;})
    });
    return result; 
}
function test_type(){
    const available_types = 
    {
        "radioblock": "v-test-questions-radio-block",
        "checkbox": "v-test-questions-checkbox-block",
        // here more actions that can answer
    } 
    let type = undefined
    document.querySelector(".flex-row-test")?.querySelectorAll('p').forEach((el)=>{
        type = Object.values(available_types).find(elem=>{
                return el.offsetParent.classList.contains(elem)}
        )
        if (type) return;
    })
    return Object.entries(available_types).find(([k,v]) => v == type)[0]
    // learning how OBJECT works and his methods <:
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
    // object unpacking Destructuring 
    let {['start-checkbox']: ready} = await browser.storage.local.get('start-checkbox');
    if (ready) return check_ready();// make it less space
    // browser.storage.onChanged.addListener((changes,area)=>{ 
    // // adding event listener to watch when our value change itself
    //     // ?. preventing error which could be if .newValue is undefined
    //     console.log(changes['start-checkbox'])
    //     if (changes['start-checkbox']?.newValue && area == 'local') check_ready()
    // }) removed to remove bug
}

check_status()

