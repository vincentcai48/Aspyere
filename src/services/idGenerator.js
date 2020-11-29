
//default generate id;
const generateId = () => {
    const num = (new Date()).getTime()+Math.random()*(new Date()).getTime();
    return num.toString(36);
}

//generate id with another param, usually user id. Also truncate to character amount;
const generateId2 = (param) => {
    const num = (new Date()).getTime()+Math.random()*(new Date()).getTime()+parseInt(param,36);
    return num.toString(36);
} 

const generateUid = (param,othersArray) => {
    const id = generateId2(param);
    if(othersArray.includes(id)) return generateUid(param,othersArray);
    return id;
}

