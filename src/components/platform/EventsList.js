import React from "react";
import { Link, Redirect } from "react-router-dom";
import { fbTimestamp, pFirestore } from "../../services/config";
import { PContext } from "../../services/context";
import { displayTime } from "../../services/globalFunctions";
import Loading from "../Loading";
import EditEvent from "./EditEvent";

//PROPS: Boolean isAdmin, Object dbMapping, Object userData, Function getAllEvents(), Function getPastEvents(), Array[] allEvents, Array[] pastEvents, Function() refreshAllEvents(), Function refreshPastEvents()
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
      events: [],
      isNeedRefresh: false,
      isLoading: false,
    };
  }

  async componentDidMount() {
    //since this is asynchronous, update the countdowns right after they are fetched from firestore.
    //this.renderEvents(this.state.isPast);

    if (this.state.isPast) {
      if (this.props.pastEvents.length == 0) {
        await this.props.getPastEvents();
        this.updateCountdowns();
      }
    } else {
      if (this.props.allEvents.length == 0) {
        await this.props.getAllEvents();
        this.updateCountdowns();
      }
    }
    //Update countdowns every second.
    setInterval(this.updateCountdowns, 1000);
  }

  updateCountdowns = () => {
    var events = this.state.isPast
      ? this.props.pastEvents
      : this.props.allEvents;
    var now = new Date().getTime();
    var arr = [];
    for (var i = 0; i < events.length; i++) {
      arr[i] = events[i].startTime.getTime() - now;
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
    var events = this.state.isPast
      ? this.props.pastEvents
      : this.props.allEvents;
    var eventData = events.filter((e) => e.id == eventId)[0];
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
    //switched around because you are switching to and from past in this method, so prepare the eventList you are switching to, if you need to.
    if (this.state.isPast) {
      if (this.props.allEvents.length == 0) {
        this.props.getAllEvents();
      }
    } else {
      if (this.props.pastEvents.length == 0) {
        this.props.getPastEvents();
      }
    }

    this.setState((prevState) => {
      return { isPast: !prevState.isPast };
    });
    this.updateCountdowns();
  };

  //get the next batch in the paginated queries.
  loadMoreEvents = async () => {
    if (this.state.isPast) {
      await this.props.getPastEvents();
    } else {
      await this.props.getAllEvents();
    }
  };

  refresh = async () => {
    this.setState({ isLoading: true });
    try {
      await this.props.refreshAllEvents();
      await this.props.refreshPastEvents();
      this.setState({ isLoading: false, isNeedRefresh: false });
    } catch (e) {
      this.setState({ isLoading: false, isNeedRefresh: false });
    }
  };

  render() {
    console.log("ALL EVENTS:", this.props.allEvents);
    var events = this.state.isPast
      ? this.props.pastEvents
      : this.props.allEvents;
    var num = -1; //used to count array indices in the "map" method for all events, to match it with the proper countdown.
    if (this.state.redirect) return <Redirect to={this.state.redirect} />;
    return (
      <div id="eventsList-container">
        {this.state.isNeedRefresh && (
          <div className="top-note red">
            <div>Refresh to see Changes</div>
            <button
              onClick={this.refresh}
              style={{ marginLeft: "auto", fontSize: "20px" }}
            >
              Refresh
            </button>
          </div>
        )}
        <div className="section-header">
          {this.state.isPast ? <h2>Past Events</h2> : <h2>All Events</h2>}
          <p>Upcoming events or live now hosted on this platform</p>
          <button
            className="past-events-button"
            onClick={this.switchPastPresent}
          >
            {this.state.isPast ? "Back to Events" : "View Past Events"}
          </button>
        </div>

        {this.props.isAdmin && !this.state.isPast && (
          <button onClick={this.addEventProxy} className="create-button">
            Add Event<div className="plus fas fa-plus-circle"></div>
          </button>
        )}

        {events.length == 0 && (
          <div className="center-children">
            <div>No Events Yet!</div>
          </div>
        )}
        <ul
          id="eventsList"
          className={this.state.isPast ? "past-events-ul" : ""}
        >
          {events.map((e) => {
            num++;
            var isCompleted =
              this.props.userData &&
              this.props.userData.completedEvents &&
              this.props.userData.completedEvents.includes(e.id);
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
            // if (isCompleted && !this.state.isPast) {
            //   // console.log(e.id + "completed already");
            //   return;
            // }
            return (
              <li
                key={e.id}
                className={
                  isCompleted && !this.state.isPast
                    ? "single-event completed"
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
                <div className="top-row">
                  {isLive && !isCompleted && !this.state.isPast ? (
                    <div className="live-event-row">
                      <div className="live-text">
                        <span></span> Live Now
                      </div>
                      <button
                        className="begin-button arrow-button"
                        onClick={() => this.beginEventProxy(e.id)}
                      >
                        Begin <span>{">>>"}</span>
                      </button>
                    </div>
                  ) : isCompleted ? (
                    <div className="completed-text">Completed Event</div>
                  ) : (
                    <div className="upcoming-text">
                      <i class="fas fa-calendar-day"></i>{" "}
                      {this.state.isPast ? "Past" : "Upcoming"} Event
                    </div>
                  )}
                </div>
                {this.state.allCountdowns[num] &&
                  this.state.allCountdowns[num] < 60000 &&
                  this.state.allCountdowns[num] > 0 && (
                    <div className="sixty-sec-countdown">
                      {Math.round(this.state.allCountdowns[num] / 1000)} Seconds
                      Until Start
                    </div>
                  )}
                <h3>{e.name}</h3>

                <div className="event-starting-time">
                  Start{isLive ? "ed" : "s"} at {displayTime(time)}
                </div>

                <div className="event-duration">
                  {duration >= 3600 && `${Math.floor(duration / 3600)} Hrs `}
                  {`${Math.floor((duration % 3600) / 60)} Mins `}
                  {Math.floor((duration % 3600) % 60) != 0 &&
                    `${Math.floor((duration % 3600) % 60)} Secs`}
                </div>

                <ul className="event-topics">
                  {e.topics && e.topics.map((t) => <li>{t}</li>)}
                </ul>

                <p className="event-description">{e.description}</p>
                {isCompleted && this.state.isPast && (
                  <div>
                    <button
                      className="bb feedback-button"
                      onClick={() => {
                        this.setState({
                          redirect: `questions?event=${e.id}&platform=${this.context.platform}`,
                        });
                      }}
                    >
                      View Feedback
                    </button>
                  </div>
                )}
                <hr className="hr-events"></hr>
              </li>
            );
          })}
          <li className="eventsList-lastLi">
            <button className="more-events" onClick={this.loadMoreEvents}>
              <i className="fas fa-plus-circle"></i>
              <span>More Events</span>
            </button>
          </li>
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
              setIsNeedRefresh={(a) => this.setState({ isNeedRefresh: a })}
            ></EditEvent>
          </div>
        )}

        {this.state.isLoading && <Loading isPopup={true} />}
      </div>
    );
  }
}
EventsList.contextType = PContext;

export default EventsList;
