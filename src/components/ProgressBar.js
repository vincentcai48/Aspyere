import React from "react"

function ProgressBar(props){
    if(!props.progress||props.progress<-1) return <span></span>;
    return(
        <div id="progressBar"><div id="inside-pbar" style={{width: props.progress+"%"}}></div></div>
    )
}

export default ProgressBar;