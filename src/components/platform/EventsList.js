import React from "react";
import { Redirect } from "react-router-dom";
import { fbTimestamp, pFirestore } from "../../services/config";
import { PContext } from "../../services/context";
import EditEvent from "./EditEvent";

//PROPS: Boolean isAdmin, Object dbMapping
class EventsList extends React.Component {
  constructor() {
    super();
    this.state = {
      allEvents: [],
      allCountdowns: [], //matches the index of the event in "allEvents". Shows how many seconds until countdown, 0 if happening right now, and negative if already over.
      showAdd: false,
      eventToEdit: null, //null if adding event
      editEventData: null, //null if adding event
      isPast: false,
      limit: 5,
      redirect: null,
    };
  }

  componentDidMount() {
    //since this is asynchronous, update the countdowns right after they are fetched from firestore.
    this.renderEvents(this.state.isPast);

    //Update countdowns every second.
    setInterval(this.updateCountdowns, 1000);
  }

  updateCountdowns = () => {
    var now = new Date().getTime();
    var arr = [];
    for (var i = 0; i < this.state.allEvents.length; i++) {
      arr[i] = this.state.allEvents[i].startTime.getTime() - now;
    }
    this.setState({ allCountdowns: arr });
  };

  //will render upcoming/past based on this.state.isViewingPastEvents
  renderEvents = (isPast) => {
    var nowTime = fbTimestamp.fromDate(new Date());
    var comparison = isPast ? "<" : ">=";
    var asDs = isPast ? "desc" : "asc";
    console.log(comparison);
    pFirestore
      .collection("platforms")
      .doc(this.context.platform)
      .collection("events")
      .where("endTime", comparison, nowTime)
      .orderBy("endTime", asDs)
      .limit(this.state.limit)
      .onSnapshot((events) => {
        var arr = [];
        events.forEach((e) => {
          var newData = { ...e.data() };
          newData.startTime = newData.startTime.toDate();
          newData.endTime = newData.endTime.toDate();
          arr.push({ ...newData, id: e.id });
        });
        this.setState({ allEvents: arr, isPast: isPast });
        this.updateCountdowns();
      });
  };

  addEventProxy = () => {
    this.setState({ showAdd: true, eventToEdit: null, editEventData: null });
  };

  editEventProxy = (eventId) => {
    var eventData = this.state.allEvents.filter((e) => e.id == eventId)[0];
    this.setState({
      showAdd: true,
      eventToEdit: eventId,
      editEventData: eventData,
    });
  };

  beginEventProxy = (eventId) => {
    const url = `/questions?event=${eventId}&platform=${this.context.platform}`;
    this.setState({ redirect: url });
  };

  switchPastPresent = () => {
    this.renderEvents(!this.state.isPast);
  };

  render() {
    var num = -1; //used to count array indices in the "map" method for all events, to match it with the proper countdown.
    if (this.state.redirect) return <Redirect to={this.state.redirect} />;
    return (
      <div id="eventsList-container">
        {this.state.isPast ? <h2>Past Events</h2> : <h2>Upcoming Events</h2>}
        <button className="past-events-button" onClick={this.switchPastPresent}>
          {this.state.isPast ? "Back to Events" : "View Past Events"}
        </button>

        {this.props.isAdmin && !this.state.isPast && (
          <button onClick={this.addEventProxy} className="create-button">
            Add Event<div className="plus fas fa-plus-circle"></div>
          </button>
        )}

        <ul
          id="eventsList"
          className={this.state.isPast ? "past-events-ul" : ""}
        >
          {this.state.allEvents.map((e) => {
            num++;
            //Get the Start Time Formatted
            //already converted in renderEvents() the startime from a server timestamp to a date.
            var time = e.startTime;
            var hour = time.getHours();
            var minutes = time.getMinutes();
            if (minutes < 10) minutes = "0" + minutes;
            var clocktime = "";
            if (hour > 12) clocktime = `${Number(hour) - 12}:${minutes}PM`;
            else if (hour == 0) clocktime = `12:${minutes}AM`;
            else clocktime = `${hour}:${minutes}AM`;
            //Get Duration
            var duration = e.endTime.getTime() - e.startTime.getTime(); //in milliseconds
            duration = Math.round(duration / 1000); //in SECONDS

            //Check if it is live yet:
            var isLive =
              this.state.allCountdowns[num] &&
              this.state.allCountdowns[num] < 1;
            var isOver =
              this.state.allCountdowns[num] &&
              this.state.allCountdowns[num] < duration * -1000;
            if (isOver && !this.state.isPast) return;
            return (
              <li
                key={e.id}
                className={
                  isLive && !this.state.isPast
                    ? "single-event live-event"
                    : "single-event"
                }
              >
                {this.props.isAdmin && (
                  <button
                    className="sb edit-event-button"
                    onClick={() => this.editEventProxy(e.id)}
                  >
                    Admin Edit
                  </button>
                )}
                <h3>{e.name}</h3>
                <p className="event-description">{e.description}</p>

                <div className="event-starting-time">
                  Start{isLive ? "ed" : "s"} at{" "}
                  {`${clocktime} on ${
                    time.getMonth() + 1
                  }/${time.getDate()}/${time.getFullYear()}`}
                </div>
                <br></br>
                <div className="event-duration">
                  {duration >= 3600 && `${Math.floor(duration / 3600)} Hrs `}
                  {`${Math.floor((duration % 3600) / 60)} Mins `}
                  {Math.floor((duration % 3600) % 60) != 0 &&
                    `${Math.floor((duration % 3600) % 60)} Secs`}
                </div>

                <ul className="event-topics">
                  {e.topics && e.topics.map((t) => <li>{t}</li>)}
                </ul>
                {this.state.allCountdowns[num] &&
                  this.state.allCountdowns[num] < 60000 &&
                  this.state.allCountdowns[num] > 0 && (
                    <div className="sixty-sec-countdown">
                      {Math.round(this.state.allCountdowns[num] / 1000)} Seconds
                      Until Start
                    </div>
                  )}
                {isLive && !this.state.isPast ? (
                  <button
                    className="begin-button"
                    onClick={() => this.beginEventProxy(e.id)}
                  >
                    Begin
                  </button>
                ) : (
                  <div></div>
                )}
              </li>
            );
          })}
        </ul>

        {this.state.showAdd && (
          <div>
            <EditEvent
              eventId={this.state.eventToEdit}
              eventData={this.state.editEventData}
              dbMapping={this.props.dbMapping}
              closeFunction={() =>
                this.setState({
                  showAdd: false,
                  eventToEdit: null,
                  editEventData: null,
                })
              }
            ></EditEvent>
          </div>
        )}
      </div>
    );
  }
}
EventsList.contextType = PContext;

export default EventsList;
