
browser.runtime.onMessage.addListener(async (msg)=> {
    if (msg.type == 'button-autoclick'){// lf a clickbutton msg type
        let rightAnswer = null;
        let listOfAnswers = [null] // preparing our values
        let answer = msg.msg
        let multi = msg.multi
        let typeclick = msg.add_type // looking at type of click(auto manual etc)
        console.log('Button is ready to click!')
        document.querySelectorAll('.test-options-grid p').forEach(p=>{
            let text = p.outerHTML.replace(/\&nbsp;/g, '')
            if (text == answer && !multi) {rightAnswer = p.offsetParent;}
            if (answer.includes(text) && multi) listOfAnswers.push(p.offsetParent); 
        })
        let el = document.querySelector('.test-content-text')
        if (typeclick=='manual'){ // if type click is on manual setting
            el.addEventListener('click',function clickEven(){
                if (multi && listOfAnswers.length > 1){
                    rightAnswer = listOfAnswers[listOfAnswers.length-1]
                    listOfAnswers.pop()
                }  
                (rightAnswer) ? rightAnswer.click() : el.removeEventListener('click', clickEven)
                rightAnswer = null
            })
        }
        else if (typeclick=='auto'){
            console.log(listOfAnswers.length)
            if (multi){
                for (let answer=listOfAnswers.length-1; answer>0;answer--){
                    listOfAnswers[answer].click()
                    
                    console.log(listOfAnswers,answer==1,typeof(answer))
                    if (answer == 1){
                        document.querySelector(`.test-multiquiz-save-button`).click()
                    }
                    
                }
            }  
            else rightAnswer.click()
            
        }
    }  
})