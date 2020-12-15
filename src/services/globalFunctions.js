//takes in a Date() Object
const displayTime = (time) => {
  var hour = time.getHours();
  var minutes = time.getMinutes();
  if (minutes < 10) minutes = "0" + minutes;
  var clocktime = "";
  if (hour > 12) clocktime = `${Number(hour) - 12}:${minutes}PM`;
  else if (hour == 0) clocktime = `12:${minutes}AM`;
  else clocktime = `${hour}:${minutes}AM`;
  return `${clocktime} on ${
    time.getMonth() + 1
  }/${time.getDate()}/${time.getFullYear()}`;
};

//default generate id;
const generateId = () => {
  const num = new Date().getTime() + Math.random() * new Date().getTime();
  return num.toString(36);
};

//generate id with another param, usually user id. Also truncate to character amount;
const generateId2 = (param) => {
  const num =
    new Date().getTime() +
    Math.random() * new Date().getTime() +
    parseInt(param, 36);
  return num.toString(36);
};

const generateUid = (param, othersArray) => {
  const id = generateId2(param);
  if (othersArray.includes(id)) return generateUid(param, othersArray);
  return id;
};

export { displayTime };
