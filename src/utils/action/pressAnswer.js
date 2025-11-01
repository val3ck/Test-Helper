
browser.runtime.onMessage.addListener(async (msg)=> {
    if (msg.type == 'button-autoclick'){// lf a clickbutton msg type
        let answer = msg.msg
        let typeclick = msg.add_type // looking at type of click(auto manual etc)
        const opt = {
            default:{
                el: ".test-content-text",
                qselector: ".test-options-grid p",
                savebutt: ".test-multiquiz-save-button"
            },
            "vseosvita.ua":{
                el: ".v-test-questions-title",
                qselector: ".flex-row-test p",
                savebutt: ".n-go-body-btn-col"
            }
            //more sites
        } 
        const selectors = opt[window.location.host] || opt.default
        let el = document.querySelector(selectors.el)
        let qselector = document.querySelectorAll(selectors.qselector)
        let savebutt = document.querySelector(selectors.savebutt)

        console.log('Button is ready to click!')
        //CHANGED LOGIC TO MORE OPTIMIZED VERSION
        const listOfAnswers = Array.from(qselector).filter(
            p=>answer.includes(
                p.outerHTML.replace(/\&nbsp;/g, '')
            )
        )
        if (typeclick=='manual'){ // if type click is on manual setting
            el.addEventListener('click',function clickEven(){
                listOfAnswers.some(p=> // Holy yea, that worse 5k grn per year!
                {
                    p.click() 
                    listOfAnswers.splice(0,1)
                    return true
                }

                )
            })
        }
        else if (typeclick=='auto'){
            listOfAnswers.forEach(p=> // Holy yea, that worse 5k grn per year!
                {
                    p.click()
                }
            )
            savebutt.click()
        }
    }  
})