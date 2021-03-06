import React from "react";
import { PContext } from "../../services/context";
import DatePicker from "react-datepicker";
import { uuidv4 } from "uuidv4";
import { fbTimestamp, pFunctions } from "../../services/config";
import TextDisplay from "../TextDisplay";

//PROPS: String eventId (null if adding event, id of event if editing it), Object eventData (the data of the event, null if adding object), Function closeFunction (to x-out of the popup), Function() setIsNeedRefresh (to show the refresh popup)
class EditEvent extends React.Component {
  constructor() {
    super();
    this.state = {
      isChanged: false,
      isLoading: false,
      isError: false,
      showDeletePopup: false,

      //wil get set in componentDidMount() from the eventData prop if editing an event
      name: "",
      description: "",
      startTime: new Date(),
      endTime: new Date(),
      questions: [],
      topics: [],
      topicInput: "",
      inputHrs: 0,
      inputMins: 10,
      inputSecs: 0,

      //For editing a question
      showQuestionSettings: false, //to add or edit
      questionToEdit: -1, //the index of the question in the array
      databaseId: null,
      dbRandomize: true,
      difficultyOffset: 0,
      difficultyRange: 0,
      questionId: null,
      questionRandomize: true,
      tags: [],
      tagInput: "",
      points: 1,
      qType: 1, //1 is for written, 2 is for generated
      questionText: "",
      imageURLs: [],
      solution: "",
      answers: [],
      answerInput: "",

      //Other settings:
      questionSettingsList: [
        "databaseId",
        "dbRandomize",
        "difficultyOffset",
        "difficultyRange",
        "questionId",
        "questionRandomize",
        "tags",
        "points",
        "qType",
        "answers",
        "questionText",
        "solution",
        "imageURLs",
      ], //list of question settings the purpose of adding/discarding questions Does not change dynamically
    };
  }

  componentDidMount() {
    if (this.props.eventData) {
      var eventData = { ...this.props.eventData };

      //Then calculate duration info for Hrs, Mins, and Secs, before setting the state.
      var duration = Math.round(
        (eventData.endTime.getTime() - eventData.startTime.getTime()) / 1000
      );
      eventData.inputHrs = Math.floor(duration / 3600);
      eventData.inputMins = Math.floor((duration % 3600) / 60);
      eventData.inputSecs = Math.floor((duration % 3600) % 60);
      this.setState({ ...eventData });
    } else {
    }
  }

  saveAll = () => {
    this.setState({ isLoading: true });
    var updateEvent = pFunctions.httpsCallable("updateEvent");
    //duration in seconds.
    var duration =
      Number(this.state.inputHrs) * 3600 +
      Number(this.state.inputMins) * 60 +
      Number(this.state.inputSecs);
    duration = duration * 1000; //in milliseconds
    var endTime = new Date(Number(this.state.startTime.getTime() + duration)); //calculate endTime from duration.
    //The Dates (IN MILLISECONDS) are converted to timestamps on the backend.
    updateEvent({
      platformId: this.context.platform,
      eventId: this.props.eventId,
      updates: {
        name: this.state.name,
        description: this.state.description,
        startTime: this.state.startTime.getTime(),
        endTime: endTime.getTime(),
        questions: this.state.questions,
        topics: this.state.topics,
      },
    })
      .then(() => {
        this.setState({ isLoading: false });
        this.props.setIsNeedRefresh(true);
        this.props.closeFunction();
      })
      .catch((e) => {
        console.error(e);
        this.setState({ isLoading: false, isError: true });
      });
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, isError: false });
  };

  changeCheckboxState = (e) => {
    const { name, checked } = e.target;
    this.setState({ [name]: checked, isError: false });
  };

  addTag = () => {
    this.setState((prevState) => {
      var newTags = [...prevState.tags];
      if (
        !newTags.includes(prevState.tagInput) &&
        prevState.tagInput.length > 0
      )
        newTags.push(prevState.tagInput);
      return {
        tags: newTags,
        tagInput: "",
        isError: false,
      };
    });
  };

  deleteTag = (tagName) => {
    this.setState((prevState) => {
      var newTags = [...prevState.tags].filter((t) => t != tagName);
      return { tags: newTags, isError: false };
    });
  };

  addTopic = () => {
    this.setState((prevState) => {
      var newTopics = [...prevState.topics];
      if (
        !newTopics.includes(prevState.topicInput) &&
        prevState.topicInput.length > 0
      ) {
        newTopics.push(prevState.topicInput);
      }
      return {
        topics: newTopics,
        topicInput: "",
      };
    });
  };

  deleteTopic = (topicName) => {
    this.setState((prevState) => {
      var newTopics = [...prevState.topics].filter((t) => t != topicName);
      return { topics: newTopics };
    });
  };

  //add and edit. If this.state.questionToEdit is a valid index, than edit, otherwise, add.
  submitQuestionSettings = (event) => {
    event.stopPropagation();
    event.preventDefault();

    this.setState((prevState) => {
      var newQuestionsArray = [...prevState.questions];
      var newQuestion = {};
      prevState.questionSettingsList.forEach((setting) => {
        newQuestion[setting] = prevState[setting];
      });
      if (
        prevState.questionToEdit >= 0 &&
        prevState.questionToEdit < newQuestionsArray.length
      ) {
        //if valid index, update
        newQuestionsArray[prevState.questionToEdit] = newQuestion;
      } else {
        //else, add the question
        newQuestionsArray.push(newQuestion);
      }
      console.log(newQuestion);
      return {
        questions: newQuestionsArray,
        showQuestionSettings: false,
        isError: false,
      };
    });
    this.discardQuestionSettings();
  };

  discardQuestionSettings = () => {
    //set everything back to default
    this.setState({
      showQuestionSettings: false,
      questionToEdit: -1,
      questionId: "",
      difficultyOffset: 0,
      difficultyRange: 0,
      databaseId: "",
      tags: [],
      tagInput: "",
      dbRandomize: true,
      questionRandomize: true,
      points: 1,
      qType: 1,
      questionText: "",
      answers: [],
      imageURLs: [],
      solution: "",
    });
  };

  deleteQuestion = () => {
    this.setState((p) => {
      var qs = [...p.questions];

      qs.splice(p.questionToEdit, 1);

      this.discardQuestionSettings();
      return {
        questions: qs,
      };
    });
  };

  //the button has a "name" attribute that is the index in the "questions" array
  editEvent = (e) => {
    var index = Number(e.target.name);
    this.setState((prevState) => {
      var questionData = { ...prevState.questions[index] };

      return {
        showQuestionSettings: true,
        questionToEdit: index,
        databaseId: questionData.databaseId,
        dbRandomize: questionData.dbRandomize,
        difficultyOffset: questionData.difficultyOffset,
        difficultyRange: questionData.difficultyRange,
        questionId: questionData.questionId,
        questionRandomize: questionData.questionRandomize,
        tags: questionData.tags,
        points: questionData.points,
        qType: questionData.qType,
        answers: questionData.answers,
        imageURLs: questionData.imageURLs,
        solution: questionData.solution,
        questionText: questionData.questionText,
        answerInput: "",
        tagInput: "",
      };
    });
  };

  deleteEvent = () => {
    this.setState({ isLoading: true, isError: false });
    var deleteEvent = pFunctions.httpsCallable("deleteEvent");
    deleteEvent({
      platformId: this.context.platform,
      eventId: this.props.eventId,
    })
      .then(() => {
        this.setState({ showDeletePopup: false, isLoading: false });
        this.props.setIsNeedRefresh(true);
        this.props.closeFunction();
      })
      .catch((e) => {
        this.setState({ isError: true });
      });
  };

  addAnswer = () => {
    this.setState((p) => ({
      answers: [...p.answers, this.state.answerInput],
      answerInput: "",
    }));
  };

  deleteAnswer = (e) => {
    this.setState((p) => ({
      answers: p.answers.filter((a) => a !== e.target.name),
    }));
  };

  render() {
    var count = 0;
    return (
      <div className="grayed-out-background">
        <div className="fsp">
          <div className="editEvent-container">
            <h3 className="fsp-header">
              {this.props.eventId ? "Edit" : "Add"} Event
              <div className="side-buttons">
                <button className="submit-button" onClick={this.saveAll}>
                  Save
                </button>
                <button
                  className="cancel-button"
                  onClick={this.props.closeFunction}
                >
                  Cancel
                </button>
              </div>
            </h3>
            <div className="fsp-main">
              {this.state.isLoading && (
                <div className="heading-note">Loading...</div>
              )}
              {this.state.isError && (
                <div className="heading-note">An Error Occurred</div>
              )}
              <div>
                <input
                  className="event-title-edit"
                  onChange={this.changeState}
                  value={this.state.name}
                  name="name"
                  placeholder="Event Name"
                ></input>
                <br></br>
                <textarea
                  className="event-description-edit"
                  onChange={this.changeState}
                  value={this.state.description}
                  name="description"
                  placeholder="Description of Event"
                ></textarea>
                <div>
                  <DatePicker
                    selected={this.state.startTime}
                    onChange={(date) => this.setState({ startTime: date })}
                    showTimeSelect
                    dateFormat="Pp"
                    className="react-datepicker-component"
                  ></DatePicker>
                </div>
                <div id="duration-inputs">
                  <p>Duration: </p>
                  <input
                    type="number"
                    min="0"
                    placeholder="Hrs"
                    onChange={this.changeState}
                    name="inputHrs"
                    value={this.state.inputHrs}
                  ></input>
                  :
                  <input
                    type="number"
                    min="0"
                    placeholder="Mins"
                    onChange={this.changeState}
                    name="inputMins"
                    value={this.state.inputMins}
                  ></input>
                  :
                  <input
                    type="number"
                    min="0"
                    max="60"
                    placeholder="Secs"
                    name="inputSecs"
                    onChange={this.changeState}
                    value={this.state.inputSecs}
                  ></input>
                </div>
                <h4>Topics</h4>
                <input
                  onChange={this.changeState}
                  value={this.state.topicInput}
                  name="topicInput"
                  placeholder="Write a Topic"
                ></input>
                <button className="sb" onClick={this.addTopic}>
                  Add Topic
                </button>
                <ul className="event-topics">
                  {this.state.topics.map((t) => (
                    <li>
                      <div>{t}</div>
                      <button
                        className="x-out"
                        onClick={() => this.deleteTopic(t)}
                      >
                        X
                      </button>
                    </li>
                  ))}
                </ul>

                <h4>Questions</h4>
                <button
                  className="sb"
                  onClick={() =>
                    this.setState({
                      showQuestionSettings: true,
                      questionToEdit: -1,
                    })
                  }
                >
                  Add Question
                </button>

                {this.state.showQuestionSettings && (
                  <section id="question-settings">
                    <h5>
                      {this.state.questionToEdit >= 0
                        ? `Edit Question #${this.state.questionToEdit + 1}`
                        : "Add a Question"}
                    </h5>

                    <div className="single-setting">
                      <div>
                        <h6>Points: </h6>
                        <p>How much is this question worth?</p>
                      </div>

                      <input
                        type="number"
                        min="0"
                        name="points"
                        onChange={this.changeState}
                        value={this.state.points}
                      ></input>
                    </div>

                    <div className="single-setting">
                      <div className="qtype-choose">
                        <button
                          className={`qtype${
                            this.state.qType == 1 ? " selected" : ""
                          }`}
                          onClick={() => this.setState({ qType: 1 })}
                        >
                          Write a Question
                        </button>
                        <button
                          className={`qtype${
                            this.state.qType == 2 ? " selected" : ""
                          }`}
                          onClick={() => this.setState({ qType: 2 })}
                        >
                          Generate from a Database
                        </button>
                      </div>
                    </div>
                    {/* For writing a question */}
                    {this.state.qType == 1 && (
                      <section id="write-q-settings">
                        <div>
                          <div className="db-tex-instructions">
                            <button
                              className="ssb"
                              onClick={() =>
                                this.setState((p) => {
                                  return {
                                    showTeXInstructions: !p.showTeXInstructions,
                                  };
                                })
                              }
                            >
                              Write questions and solutions in{" "}
                              <TextDisplay text={"$\\TeX$"}></TextDisplay>
                            </button>
                            {this.state.showTeXInstructions && (
                              <p>
                                Use the "$" (dollar sign) character to enclose
                                <TextDisplay
                                  text={"$\\TeX$"}
                                ></TextDisplay>{" "}
                                equations
                                <br></br>
                                <br></br>
                                Example: {'"$\\frac{a}{b}$"'}{" "}
                                <i className="fas fa-arrow-alt-circle-right"></i>{" "}
                                <TextDisplay
                                  text={"$\\frac{a}{b}$"}
                                ></TextDisplay>
                                <br></br>
                                <p style={{ fontSize: "12px" }}>
                                  *Please note that multiline equations are not
                                  supported, create a separate equation per
                                  line.
                                </p>
                              </p>
                            )}
                          </div>
                        </div>
                        <textarea
                          id="edit-question-text"
                          name="questionText"
                          value={this.state.questionText.replaceAll(
                            "[&&linebreak]",
                            "\n"
                          )}
                          onChange={this.changeState}
                          placeholder="Question Text"
                        ></textarea>

                        {/* ADD IMAGE UPLOADS LATER */}
                        {/* <div className="single-setting">
                          <div>
                            <h6>Images: </h6>
                            <p>Upload Images for this question</p>
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/png, image/jpeg"
                              onChange={this.uploadFile}
                            ></input>
                          </div>
                        </div>
                        <div>
                          {this.state.imageURLs.map((e) => {
                            return (
                              <div className="add-q-image-container">
                                <button
                                  onClick={this.deleteImage}
                                  className="x-out"
                                  name={e}
                                >
                                  X
                                </button>
                                <img src={e}></img>
                              </div>
                            );
                          })}
                        </div> */}

                        {this.state.isUploading && <div>Uploading ... </div>}

                        <div className="single-setting">
                          <div>
                            <h6>Answers:</h6>
                            <p>Accepted Answers for this Question</p>
                          </div>

                          <div>
                            <input
                              type="text"
                              autoComplete="off"
                              onChange={this.changeState}
                              name="answerInput"
                              placeholder="Write an answer"
                              value={this.state.answerInput}
                            ></input>
                            <button onClick={this.addAnswer} className="sb">
                              Add this Answer
                            </button>
                          </div>
                        </div>
                        <ul id="add-q-answers-list">
                          {this.state.answers.map((a) => (
                            <li t={a}>
                              {a}
                              <button
                                className="x-out"
                                onClick={this.deleteAnswer}
                                name={a}
                              >
                                X
                              </button>
                            </li>
                          ))}
                        </ul>
                        {/* ADD SUPPORT FOR SOLUTIONS LATER */}
                        {/* <div>
                          <h4>Solution:</h4>
                          <textarea
                            placeholder="Write a Solution..."
                            onChange={this.changeState}
                            name="solution"
                            value={
                              this.state.solution
                                ? this.state.solution.replaceAll(
                                    "[&&linebreak]",
                                    "\n"
                                  )
                                : ""
                            }
                            className="solution-text"
                          ></textarea>
                        </div> */}
                      </section>
                    )}
                    {/* For generating a Question */}
                    {this.state.qType == 2 && (
                      <section id="generate-q-settings">
                        <div className="single-setting">
                          <div>
                            <h6>Difficulty Offset: </h6>
                            <p>Make questions easier or harder</p>
                          </div>

                          <input
                            type="number"
                            min="-100"
                            max="100"
                            name="difficultyOffset"
                            onChange={this.changeState}
                            value={this.state.difficultyOffset}
                          ></input>
                        </div>
                        <div className="single-setting">
                          <div>
                            <h6>Difficulty Range: </h6>
                            <p>Plus or minus this amount of difficulty</p>
                          </div>

                          <input
                            type="number"
                            min="0"
                            name="difficultyRange"
                            onChange={this.changeState}
                            value={this.state.difficultyRange}
                          ></input>
                        </div>
                        <div className="single-setting">
                          <div>
                            <h6>Database: </h6>
                            <p>Choose a database to fetch the question from</p>
                          </div>
                          <select
                            id="select-database"
                            value={this.state.databaseId}
                            name="databaseId"
                            onChange={(e) => {
                              this.changeState(e);
                              this.setState({ dbRandomize: false });
                            }}
                          >
                            <option value={null}>--Choose Database--</option>
                            {this.props.dbMapping &&
                              Object.keys(this.props.dbMapping).map((dbId) => {
                                return (
                                  <option value={dbId}>
                                    {this.props.dbMapping[dbId]}
                                  </option>
                                );
                              })}
                          </select>
                          <div className="or-text">OR</div>
                          <div>
                            <input
                              type="checkbox"
                              checked={this.state.dbRandomize}
                              onChange={this.changeCheckboxState}
                              name="dbRandomize"
                            ></input>
                            <label>Any Database</label>
                          </div>
                        </div>
                        <div className="single-setting">
                          <div>
                            <h6>Question Id: </h6>
                            <p>Specific question in the chosen database</p>
                          </div>
                          <input
                            name="questionId"
                            onChange={this.changeState}
                            value={this.state.questionId}
                          ></input>
                          <div className="or-text">OR</div>
                          <div>
                            <input
                              type="checkbox"
                              checked={this.state.questionRandomize}
                              onChange={this.changeCheckboxState}
                              name="questionRandomize"
                            ></input>
                            <label>Randomize</label>
                          </div>
                        </div>
                        <div className="single-setting">
                          <div>
                            <h6>Question Tags</h6>
                            <p>Decide the type of question</p>
                          </div>
                          <input
                            onChange={this.changeState}
                            value={this.state.tagInput}
                            name="tagInput"
                            placeholder="Write a Tag"
                          ></input>
                          <button className="sb" onClick={this.addTag}>
                            Add Tag
                          </button>
                        </div>
                        <ul id="question-tags">
                          {this.state.tags.map((t) => (
                            <li>
                              <div>{t}</div>
                              <button
                                className="x-out"
                                onClick={() => this.deleteTag(t)}
                              >
                                X
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    <button
                      className="submit-button"
                      onClick={this.submitQuestionSettings}
                    >
                      {this.state.questionToEdit >= 0
                        ? "Submit Changes"
                        : "Add this Question"}
                    </button>
                    <button
                      className="cancel-button"
                      onClick={this.discardQuestionSettings}
                    >
                      Discard
                    </button>
                    {this.state.questionToEdit >= 0 && (
                      <div>
                        <hr></hr>
                        <button
                          className="cancel-button"
                          onClick={this.deleteQuestion}
                        >
                          Delete This Question
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {this.showQuestionCreate && (
                  <div className="grayed-out-background"></div>
                )}

                {this.state.questionToEdit && this.state.questionToEdit >= 0 && (
                  <section id="edit-question">
                    <h5>Question #{this.state.questionToEdit + 1}</h5>
                  </section>
                )}
                <ul id="event-questions">
                  {this.state.questions &&
                    (() => {
                      var arr = [];
                      for (var i = 0; i < this.state.questions.length; i++) {
                        var q = this.state.questions[i];

                        arr.push(
                          <li className="single-question">
                            <button
                              className="sb editEvent-button fas fa-edit"
                              name={i}
                              onClick={this.editEvent}
                            ></button>
                            <h6>Question #{i + 1}</h6>
                            <div className="points">
                              {q.points}
                              {q.points == 1 ? " Point" : " Points"}
                            </div>
                            {q.qType !== 1 && (
                              <div className="generated-q-info">
                                {q.tags &&
                                  q.tags
                                    .slice(0, 5)
                                    .map((t) => (
                                      <div className="q-tag">{t}</div>
                                    ))}
                                <div className="q-db">
                                  {q.dbRandomize
                                    ? "Random Database"
                                    : "From " +
                                      this.props.dbMapping[q.databaseId]}
                                </div>
                                <div className="q-info">
                                  {q.questionRandomize
                                    ? " Offset: " +
                                      q.difficultyOffset +
                                      " | Range: " +
                                      q.difficultyRange
                                    : "Question ID: " + q.questionId}
                                </div>
                              </div>
                            )}

                            <div style={{ flexBasis: "100%" }}></div>

                            {q.qType === 1 && (
                              <div className="written-q-info">
                                <h5>
                                  {q.questionText || "Question Text Here"}
                                </h5>
                                <ul className="answers">
                                  <li>Answers: </li>
                                  {q.answers &&
                                    q.answers.map((a) => <li>{a},</li>)}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      }
                      return arr;
                    })()}
                </ul>
              </div>

              {this.props.eventId && (
                <div>
                  <hr></hr>
                  <button
                    className="cancel-button"
                    onClick={() => this.setState({ showDeletePopup: true })}
                  >
                    Delete this Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {this.state.showDeletePopup && (
          <div className="grayed-out-background">
            <div className="popup">
              <h4>Are you sure you want to delete {this.state.name}?</h4>
              {this.state.isLoading && "Loading..."}
              {this.state.isError && "An Error Occurred"}
              <br></br>
              <button onClick={this.deleteEvent} className="cancel-button">
                Yes, Delete
              </button>
              <button
                onClick={() => this.setState({ showDeletePopup: false })}
                className="submit-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
EditEvent.contextType = PContext;

export default EditEvent;
