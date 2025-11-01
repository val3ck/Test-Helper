browser.runtime.onMessage.addListener(async (msg)=> {
    if (msg.type == 'button-highlight'){
        let listOfAnswers = [] // preparing our values
        let allanswers = []
        let answer = msg.msg
        let typehighlight = msg.add_type // looking at type of click(auto manual etc)
        let lastColor = 'black';   
        console.log('highlight->active')
        document.querySelectorAll('.test-options-grid p').forEach(p=>{
            let text = p.outerHTML.replace(/\&nbsp;/g, '')
            if (answer.includes(text)) listOfAnswers.push(p.offsetParent);
            allanswers.push(p.offsetParent);
        })
        if (typehighlight == 'manual-highlight'){
            allanswers.forEach(element=>{
                lastColor = element.style.background
                console.log(element,listOfAnswers.includes(element))
                if (listOfAnswers.includes(element)){
                    console.log(element)
                    element.style.background = 'rgba(0, 255, 0, 0.5)';
                    element.style.animation = 'pulse 1.4s ease-in-out infinite';
                    element.parentElement.classList.add('rightAnswer');
                    document.addEventListener('click',function clickRemEvent(){
                            element.parentElement?.classList.remove('rightAnswer')
                            element.style.animation = 'none';
                            element.style.background = lastColor
                            element.removeEventListener('click',clickRemEvent);
                    })
                }
            })
            // create <style> and adding keyframes
            const style = document.createElement('style')
            style.textContent = `
                @keyframes pulse {
                0% {
                    transform: scale(1);
                    box-shadow: 0 0 6px rgba(0, 255, 0, 0.4);
                    background-color: rgba(0, 255, 0, 0.2);
                    
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 0 20px rgba(0, 255, 0, 0.9);
                    background-color: rgba(0, 255, 0, 0.5);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 6px rgba(0, 255, 0, 0.4);
                    background-color: rgba(0, 255, 0, 0.2);
                }
                }

                .rightAnswer {
                    opacity:80%;
                    color: white;
                    border-radius: 10px;
                    position: relative;
                    z-index: 10;
                    background-color: rgba(0, 255, 0, 0.5);
                }
                
            `
            document.head.appendChild(style)
        }else if (typehighlight == 'hidden-highlight'){
            console.log(listOfAnswers)
            allanswers.forEach(element=>{
                if (listOfAnswers.includes(element)){
                
                    element.parentElement.classList.add('rightAnswer');
                    document.addEventListener('click',function clickSearch(){
                        element.parentElement.classList.remove('rightAnswer')
                        element.removeEventListener('click',clickSearch)
                    })}
            })
            const style = document.createElement('style')
            style.textContent = `
                .rightAnswer p::first-letter {
                    color: #0000009f;
                }
            `
            document.head.appendChild(style)
    }
    } 
})