import React from "react"
import { pAuth } from "../services/config";
import { PContext } from "../services/context";
import Auth from "./Auth"
import DBList from "./database/DBList";
import Platform from "./platform/Platform";
import PlatformList from "./platform/PlatformList";


class Home extends React.Component{
    constructor(){
        super();
        this.state = {
            displayOrganizations: false,
            defaultOrganization: null
        }
    }


    render(){
        console.log(this.context.platform)
        return(
            <div>
                {this.context.platform?<div><Platform/></div>:<PlatformList/>}
            </div>
        )
    }
}
Home.contextType = PContext

export default Home;