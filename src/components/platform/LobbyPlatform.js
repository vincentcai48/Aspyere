import React from "react"
import { pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";

class LobbyPlatform extends React.Component{
    constructor(){
        super();
        this.state = {
            groupsList: [],
            accessCodeTry: "",
            groupToJoin: null,//group id
            showAccessError: false,
            isLoading: false,
        }
    }

    componentDidMount(){
        pFirestore.collection("platforms").doc(this.context.platform).collection("groups").onSnapshot(snap=>{
            var arr = [];
            snap.forEach((doc)=>{
                arr.push({...doc.data(), id: doc.id});
            })
            this.setState({groupsList: arr})
        }) 
        console.log(this.context.usersMapping) 
    }

    joinGroupProxy = (groupId,isPublic) => {
        if(isPublic) this.joinGroup(groupId);
        else{
            this.setState({groupToJoin: groupId})
        }
    }

    joinGroup = async (groupId) => {
        this.setState({isLoading: true});
        var cloudJoinGroup = pFunctions.httpsCallable("joinGroup");
        try{
            var isValid = await cloudJoinGroup({
                groupId: groupId, 
                accessCodeTry: this.state.accessCodeTry, 
                platformId: this.context.platform
            })
            isValid = isValid.data
            console.log(isValid)
            this.setState({isLoading: false, showAccessError: !isValid})
            if(isValid){
                this.props.checkJoinedStatus(this.props.requireGroup);
            }
        }catch(e){
            this.setState({isLoading: false, showAccessError: true})
        }
        
    }

    changeState = (e) => {
        const {name,value} = e.target;
        this.setState({[name]: value, showAccessError: false})
    }

    render(){
        return(<div>
            <div>
                <h2>Join a {this.props.groupName}</h2>
                {!this.props.requireGroup&&<button id="individual-join">Or Join Individually</button>}
                <ul id="groups-list">
                    {this.state.groupsList.map(g=>{
                        return(<li key={g.id} className="single-group">
                            <h3>{g.name}</h3>
                            <p>{g.description}</p>
                            <ul>
                                {g.admins.map(admin=><li>{this.context.usersMapping[admin]}</li>)}
                            </ul>
                            <button onClick={()=>{this.joinGroupProxy(g.id,g.isPublic)}} className="join-button">Join</button>
                        </li>)
                    })}
                </ul>

                {this.state.groupToJoin&&<div className="grayed-out-background">
                    <div className="popup">
                        <h3>Join with Code</h3>
                        <input value={this.state.accessCodeTry} onChange={this.changeState} placeholder="Join Code" name="accessCodeTry"></input>
                        <button className="sb" onClick={()=>this.joinGroup(this.state.groupToJoin)}>Join</button>
                        <br></br>
                        {this.state.isLoading&&<div>Loading ...</div>}
                        {this.state.showAccessError&&<div className="access-error-text">Access Error</div>}
                        <button className="cancel-button" onClick={()=>this.setState({groupToJoin: null})}>Cancel</button>
                    </div>
                </div>}
            </div>
        </div>)
    }
}
LobbyPlatform.contextType = PContext;

export default LobbyPlatform;