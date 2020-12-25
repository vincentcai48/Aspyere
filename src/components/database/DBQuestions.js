import React, { version } from "react";
import {
  fbFieldValue,
  pAuth,
  pFirestore,
  pStorageRef,
} from "../../services/config";
import ProgressBar from "../ProgressBar";
import { uuid } from "uuidv4";
import Auth from "../Auth";
import { Link } from "react-router-dom";
import imageCompression from "browser-image-compression";

//PROPS: Object() parentState, Function() changeParentState
class DBQuestions extends React.Component {
  constructor() {
    super();
    this.state = {
      //For adding a Question:
      // dbId: null,
      // accessLevel: 0, //0 for no access, 1 can view, 2 can edit, 3 is admin
      uploadProgress: -1,
      isUploading: false,
      tags: [],
      tagInput: "",
      answers: [],
      answerInput: "",
      imageURLs: [],
      questionText: "",
      difficultyInput: "",
      limitInput: 0,

      //popups:
      isAddPopup: false,
      questionEditing: null, //the question id, if null, then you're adding a question.
      questionToDelete: null,
      showLimitPopup: false,
      //the all questions query popup
      showAllQuestionsPopup: false,
      sortField: null,
      inputSortField: "lastUpdated",
      isAsc: false,
      lastDocAllQuestions: -1,
      queryQuestions: [],
    };
  }

  componentDidMount() {
    this.setLimit();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.parentState.limit != this.props.parentState.limit) {
      this.setLimit();
    }
  }

  setLimit() {
    this.setState({ limitInput: this.props.parentState.limit });
  }

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  uploadFile = async (e) => {
    //Step 1: get the file and set isUploading to true
    console.log(e.target.files[0]);
    var file = e.target.files[0];
    this.setState({ isUploading: true });
    var parentThis = this; //need to use "this" in a nested function
    // console.log("originalFile instanceof Blob", file instanceof Blob); // true
    // console.log(`originalFile size ${file.size / 1024 / 1024} MB`);

    //Step 2: set options for file resize, and then try the file resize.
    const options = {
      maxSizeMB: 0.06,
      maxWidthOrHeight: 600,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      // console.log(
      //   "compressedFile instanceof Blob",
      //   compressedFile instanceof Blob
      // ); // true
      // console.log(
      //   `compressedFile size ${compressedFile.size / 1024 / 1024} MB`
      // ); // smaller than maxSizeMB

      //Step 3: put into storage bucket.
      var dbId = parentThis.props.parentState.dbId || "databaseNotFound";
      pStorageRef
        .child("dbfiles/" + dbId + "/" + uuid())
        .put(compressedFile)
        .then((result) => {
          var arr = [...this.state.imageURLs];
          result.ref.getDownloadURL().then((url) => {
            arr.push(url);
            console.log(url);
            console.log(arr);
            this.setState({ imageURLs: arr });
          });
          this.setState({ isUploading: false });
          console.log(result.bytesTransferred / result.totalBytes);
        });
    } catch (e) {
      console.log(e);
      this.setState({ isUploading: false });
    }
  };

  addTag = () => {
    if (!this.state.tagInput) return;
    var arr = this.state.tags;
    arr.push(this.state.tagInput);
    this.setState({ tags: arr, tagInput: "" });
    console.log(this.props.parentState.dbQuestions);
  };

  deleteTag = (e) => {
    var arr = this.state.tags;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == e.target.name) arr.splice(i, 1);
    }
    this.setState({ tags: arr });
  };

  addAnswer = (e) => {
    if (!this.state.answerInput) return;
    var arr = this.state.answers;
    arr.push(this.state.answerInput);
    this.setState({ answers: arr, answerInput: "" });
  };

  deleteAnswer = (e) => {
    var arr = this.state.answers;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == e.target.name) arr.splice(i, 1);
    }
    this.setState({ answers: arr });
  };

  deleteImage = (e) => {
    var arr = this.state.imageURLs;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == e.target.name) arr.splice(i, 1);
    }
    this.setState({ imageURLs: arr });
  };

  addQuestion = (questionId) => {
    pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .collection("questions")
      .add({
        difficulty: Number(this.state.difficultyInput),
        text: this.state.questionText.replaceAll("\n", "[&&linebreak]"),
        answers: this.state.answers,
        imageURLs: this.state.imageURLs,
        tags: this.state.tags,
        lastUpdated: fbFieldValue.serverTimestamp(),
        creator: pAuth.currentUser.displayName,
        lastEditor: pAuth.currentUser.displayName,
      });
    this.clearEditFields();
  };

  updateQuestion = (questionId) => {
    pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .collection("questions")
      .doc(questionId)
      .update({
        difficulty: Number(this.state.difficultyInput),
        text: this.state.questionText.replaceAll("\n", "[&&linebreak]"),
        answers: this.state.answers,
        imageURLs: this.state.imageURLs,
        tags: this.state.tags,
        lastUpdated: fbFieldValue.serverTimestamp(),
        lastEditor: pAuth.currentUser.displayName,
      });
    this.clearEditFields();
  };

  //IMPORTANT: MUST MAKE A COPY OF THE ARRAYS, OR ELSE WILL PASS BY REFERENCE. Therefore, the original question object will change if state changes, and you DON'T WANT THAT.
  prepareEdit = (questionObj) => {
    this.setState({
      questionText: questionObj.text,
      difficultyInput: questionObj.difficulty,
      answers: [...questionObj.answers],
      imageURLs: [...questionObj.imageURLs],
      tags: [...questionObj.tags],
      isAddPopup: true,
      questionEditing: questionObj.id,
    });
  };

  deleteQuestion = () => {
    pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .collection("questions")
      .doc(this.state.questionToDelete)
      .delete()
      .then(() => {
        console.log("Deleted");
        this.setState({
          questionToDelete: null,
          questionEditing: null,
          isAddPopup: false,
        });
      })
      .catch((e) => {
        this.setState({ questionToDelete: null });
      });
  };

  //the sequence "[&&linebreak]" anywhere in the text is replaced with a <br/> tag
  renderWithLinebreaks = (text) => {
    var texts = text.split("[&&linebreak]");
    var arr = [];
    texts.forEach((e) => {
      arr.push(<span>{e}</span>);
      arr.push(<br></br>);
    });
    return arr;
  };

  clearEditFields = () => {
    this.setState({
      questionText: "",
      difficultyInput: "",
      answers: [],
      imageURLs: [],
      tags: [],
      isAddPopup: false,
      questionEditing: null,
    });
  };
  //call this once, when you submit the query
  getQueryQuestions = () => {
    this.setState({ sortField: this.state.inputSortField });
    this.getNextQuestions();
  };

  getNextQuestions = async (isRefresh) => {
    var sortField = this.state.sortField || this.state.inputSortField;
    var query = pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .collection("questions")
      .orderBy(sortField, this.state.isAsc ? "asc" : "desc");
    if (!this.state.lastDocAllQuestions) return;
    if (this.state.lastDocAllQuestions === -1 || isRefresh) {
      query = query.limit(Math.round(this.props.parentState.limit / 2));
    } else {
      query = query
        .startAfter(this.state.lastDocAllQuestions)
        .limit(Math.round(this.props.parentState.limit / 2));
    }
    var questions = await query.get();
    var arr = isRefresh ? [] : [...this.state.queryQuestions];
    questions.docs.forEach((q) => {
      arr.push({ ...q.data(), id: q.id });
    });
    this.setState({
      queryQuestions: arr,
      lastDocAllQuestions: questions.docs[questions.docs.length - 1],
    });
  };

  render() {
    if (!pAuth.currentUser) return <Auth />;
    return (
      <div id="dbquestions-container">
        {/* <div id="first-row">
          <div id="limit">Limit: {this.props.parentState.limit}</div>
        </div> */}
        <div id="first-row">
          <div className="groupAdmin-header">
            <h3>Recent Questions Workspace</h3>
            <p>Live updates to 20 most recent questions</p>
          </div>
          <button
            className="query-questions-button"
            onClick={() => this.setState({ showAllQuestionsPopup: true })}
          >
            Query All Questions
          </button>
        </div>
        {this.props.parentState.accessLevel >= 2 && (
          <button
            onClick={() => this.setState({ isAddPopup: true })}
            className="create-button"
          >
            Add a Question<div className="plus fas fa-plus-circle"></div>
          </button>
        )}

        {/**LIST OF QUESTIONS*/}
        <section id="dbquestions-list">
          <ul id="ul-dbquestions">
            {this.props.parentState.dbQuestions.map((q) => {
              console.log(q);
              return (
                <li className="single-question" key={q.id}>
                  <hr></hr>
                  <div className="id-q">ID: {q.id}</div>
                  <div className="first-line-q">
                    <h6>{this.renderWithLinebreaks(q.text)}</h6>
                    <div>
                      <button
                        className="edit-button"
                        onClick={() => this.prepareEdit(q)}
                      >
                        Edit <i class="fas fa-edit"></i>
                      </button>
                    </div>
                  </div>
                  <div className="difficulty-q">Difficulty: {q.difficulty}</div>
                  <ul className="images-q">
                    {q.imageURLs &&
                      q.imageURLs.map((img) => {
                        return (
                          <li>
                            <img src={img}></img>
                          </li>
                        );
                      })}
                  </ul>
                  <ul className="tags-q">
                    {q.tags &&
                      q.tags.map((tag) => {
                        return <li>{tag}</li>;
                      })}
                  </ul>
                  <div className="answers-q">
                    Answer{q.answers && q.answers.length != 1 && "s"}:{" "}
                    {q.answers && q.answers.toString().replaceAll(",", ", ")}
                  </div>
                  <p>
                    Last Edit was at{" "}
                    {q.lastUpdated && q.lastUpdated.toDate().toString()} by{" "}
                    {q.lastEditor}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/***POPUP FOR ADDING/EDITING A QUESTION*/}
        {this.state.isAddPopup && (
          <div className="grayed-out-background add-q-gob">
            {this.props.parentState.accessLevel > 1 ? (
              <div id="add-to-database" className="popup">
                <h5>
                  {this.state.questionEditing
                    ? `Edit Question ID: ${this.state.questionEditing}`
                    : "Add a Question to the Database"}
                </h5>

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

                <div id="difficulty-edit">
                  Difficulty:{" "}
                  <input
                    id="difficultyInput"
                    name="difficultyInput"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="(0 to 100)"
                    value={this.state.difficultyInput}
                    onChange={this.changeState}
                  ></input>
                </div>

                <h3>Images: </h3>
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
                </div>

                <div>
                  Upload an Image:
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={this.uploadFile}
                  ></input>
                </div>

                {this.state.isUploading && <div>Uploading ... </div>}

                <div id="add-q-tags">
                  <h4>Tags:</h4>
                  <ul id="add-q-tags-list">
                    {this.state.tags.map((t) => (
                      <li>
                        {t}
                        <button
                          className="x-out"
                          onClick={this.deleteTag}
                          name={t}
                        >
                          X
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div>
                    <input
                      type="text"
                      autoComplete="off"
                      onChange={this.changeState}
                      placeholder="Write a tag name"
                      name="tagInput"
                      value={this.state.tagInput}
                    ></input>
                    <button onClick={this.addTag} className="sb">
                      Add this tag
                    </button>
                  </div>
                </div>

                <div id="add-q-answers">
                  <h4>Answers:</h4>
                  <ul id="add-q-answers-list">
                    {this.state.answers.map((a) => (
                      <li>
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

                <button
                  className="submit-button"
                  onClick={
                    this.state.questionEditing
                      ? () => this.updateQuestion(this.state.questionEditing)
                      : () => this.addQuestion(uuid())
                  }
                >
                  Submit
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    this.clearEditFields();
                  }}
                >
                  Cancel
                </button>
                {this.state.questionEditing && (
                  <div>
                    <hr></hr>
                    <button
                      className="cancel-button"
                      onClick={() => {
                        this.setState({
                          questionToDelete: this.state.questionEditing,
                        });
                      }}
                    >
                      Delete This Question
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="popup nsp">
                <h3>No Editing Access</h3>
                <button
                  onClick={() => {
                    this.setState({ isAddPopup: false });
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        {this.state.questionToDelete && (
          <div className="grayed-out-background question-delete">
            <div className="popup nsp">
              <h3>
                Are you sure you want to delete this question? This action
                cannot be undone.
              </h3>
              <button className="submit-button" onClick={this.deleteQuestion}>
                Yes, Delete
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  this.setState({ questionToDelete: null });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {this.state.showLimitPopup && (
          <div className="grayed-out-background">
            <div className="popup">
              <p>Limit: </p>
              <input
                value={this.state.limitInput}
                onChange={this.changeState}
                name="limitInput"
              ></input>
              <button
                className="sb"
                onClick={() => {
                  this.props.changeParentState({
                    limit: this.state.limitInput,
                  });
                  this.setState({ showLimitPopup: false });
                }}
              >
                Update
              </button>
            </div>
          </div>
        )}

        {this.state.showAllQuestionsPopup && (
          <div className="grayed-out-background">
            <div className="popup allQs">
              <button
                onClick={() => this.setState({ showAllQuestionsPopup: false })}
                className="cancel-button"
              >
                Close
              </button>
              {this.state.sortField ? (
                <div id="query-container">
                  <div className="query-header">
                    <h3>
                      Query:{" "}
                      {this.state.sortField == "lastUpdated"
                        ? "Last Updated"
                        : "Difficulty"}{" "}
                      -{this.state.isAsc ? "Ascending" : "Descending"}
                    </h3>
                    <button
                      className="sb"
                      onClick={() =>
                        this.setState({ sortField: null, queryQuestions: [] })
                      }
                    >
                      New Query
                    </button>
                  </div>

                  <ul id="ul-dbqueryquestions">
                    {this.state.queryQuestions.map((q) => {
                      console.log(q);
                      return (
                        <li className="single-question" key={"query" + q.id}>
                          <hr></hr>
                          <div className="id-q">ID: {q.id}</div>
                          <div className="first-line-q">
                            <h6>{this.renderWithLinebreaks(q.text)}</h6>
                            <div>
                              <button
                                className="edit-button"
                                onClick={() => this.prepareEdit(q)}
                              >
                                Edit <i class="fas fa-edit"></i>
                              </button>
                            </div>
                          </div>
                          <div className="difficulty-q">
                            Difficulty: {q.difficulty}
                          </div>
                          <ul className="images-q">
                            {q.imageURLs &&
                              q.imageURLs.map((img) => {
                                return (
                                  <li>
                                    <img src={img}></img>
                                  </li>
                                );
                              })}
                          </ul>
                          <ul className="tags-q">
                            {q.tags &&
                              q.tags.map((tag) => {
                                return <li>{tag}</li>;
                              })}
                          </ul>
                          <div className="answers-q">
                            Answer{q.answers && q.answers.length != 1 && "s"}:{" "}
                            {q.answers &&
                              q.answers.toString().replaceAll(",", ", ")}
                          </div>
                          <p>
                            Last Edit was at{" "}
                            {q.lastUpdated && q.lastUpdated.toDate().toString()}{" "}
                            by {q.lastEditor}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    className="more-events"
                    onClick={this.getNextQuestions}
                    style={{ margin: "5vh 0px" }}
                  >
                    <i className="fas fa-plus-circle"></i>
                    <span>Load More Questions</span>
                  </button>
                </div>
              ) : (
                <div>
                  <h4>Select How to Sort By</h4>
                  <select
                    value={this.state.inputSortField}
                    onChange={this.changeState}
                    name="inputSortField"
                  >
                    <option value="lastUpdated">Last Updated</option>

                    <option value="difficulty">Difficulty</option>
                  </select>
                  <select
                    value={this.state.isAsc}
                    onChange={this.changeState}
                    name="isAsc"
                  >
                    <option value={true}>Ascending</option>
                    <option value={false}>Descending</option>
                  </select>
                  <button className="sb" onClick={this.getQueryQuestions}>
                    Get Questions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default DBQuestions;
