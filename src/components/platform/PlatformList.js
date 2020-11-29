import React from "react"
import { pFirestore } from "../../services/config";
import { PContext } from "../../services/context";


class PlatformList extends React.Component{
    constructor(props){
        super();
        this.state = {
            allPlatforms: []
        }
    }

    componentDidMount(){
        pFirestore.collection("platforms").onSnapshot(snap=>{
            var arr = [];
            snap.forEach((p)=>{
                arr.push({...p.data(),id: p.id});
            })
            this.setState({allPlatforms: arr})
            console.log(arr);
        })
    }

    joinPlatfrom = (id) => {
        this.context.setPlatform(id);
    }

    render(){
        return(<div id="platformList-container">
            <h2>Plaforms</h2>
            <p>Aspyere Platforms are the best way to host live quiz rounds online. Choose an existing platform or create one yourself</p>
            <div id="platformList-searchBar"></div>
            <button 
                onClick={()=>this.setState({showCreate: true})} 
                className="create-button"
            >
                Create a New Platform
                <i className="plus fas fa-plus-circle"></i>
            </button>
            <ul id="platformList-ul">
                {this.state.allPlatforms.map(p=>{
                    return(
                        <li className="single-platform" key={p.id}>
                            <h3>{p.name}</h3>
                            <p>{p.description}</p>
                            <div className="platform-id">ID: {p.id}</div>
                            <button className="join-button" onClick={()=>{this.joinPlatfrom(p.id)}}>Join</button>
                        </li>
                    )
                })}
            </ul>
        </div>)
    }
}
PlatformList.contextType = PContext;

export default PlatformList