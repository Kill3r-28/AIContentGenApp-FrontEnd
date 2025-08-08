import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import { useAuthGuard } from "../../utils/useAuthGuard";
import Navbar from "../Navbar/navbar";
import "./theoretical.css";
import { TextField } from "@mui/material";

const Theoretical = () => {
  useAuthGuard();
  const navigate = useNavigate();

  // State variables
  const [technology, setTechnology] = useState("");
  const [topic, setTopic] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topicTag, setTopicTag] = useState("");
  const [subTopicTag, setSubTopicTag] = useState("SUB_TOPIC_");
  const [unitTag, setUnitTag] = useState("UNIT_");
  const [moduleTag, setModuleTag] = useState("MODULE_");
  const [courseTag, setCourseTag] = useState("COURSE_");
  const [syllabus, setSyllabus] = useState("");
  const [message, setMessage] = useState("");
  const [rawPrompt, setRawPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsJson, setQuestionsJson] = useState([]);
  const [isPromptEdited, setEditPromptStatus] = useState(false);
  const [processName, setProcessName] = useState("");

  // Technology mapping
  const techToProcessName = {
    CPP: "theory_mcq_cpp",
    Python: "theory_mcq_python",
    Java: "",
    C: "",
    Javascript: "theory_mcq_javascript",
    SQL: "theory_mcq_sql",
    HTML_CSS: "theory_mcq_html_css",
    React_JS: "theory_mcq_react",
    Node_Js: "theory_mcq_node",
  };

  // Get difficulty counts for display
  const getDifficultyCounts = () => {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    questionsJson.forEach((qStr) => {
      try {
        const qObj = JSON.parse(qStr);
        const diff = qObj.difficulty_level?.toUpperCase();
        if (diff && counts.hasOwnProperty(diff)) {
          counts[diff]++;
        }
      } catch {
        // ignore parse errors
      }
    });
    return counts;
  };

  // Check if all required fields are filled
  const allFieldsFilled = () => {
    return (
      technology &&
      technology !== "default" &&
      difficulty &&
      difficulty !== "default" &&
      topic &&
      numberOfQuestions &&
      topicTag &&
      subTopicTag &&
      syllabus
    );
  };

  // Request questions from API
  const requestQuestions = async () => {
    if (!allFieldsFilled()) return;

    setLoading(true);
    const currentPrompt = updateMessage(rawPrompt);

    try {
      const response = await authFetch(
        "https://ravik00111110.pythonanywhere.com/api/content-gen/generate/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: currentPrompt,
            difficulty,
            question_type: "MCQ",
            topic: topicTag.toUpperCase(),
            subtopic: subTopicTag.toUpperCase(),
            number_of_question: numberOfQuestions,
            isUpdated: isPromptEdited,
            process_name: processName,
          }),
        },
        navigate,
        200000,
        true
      );

      const data = await response.json();
      let message = data.message.trim();
      if (message.startsWith("```json")) {
        message = message.substring(7);
      }
      if (message.endsWith("```")) {
        message = message.slice(0, -3);
      }

      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(message);
      } catch {
        parsedQuestions = [];
      }

      if (!Array.isArray(parsedQuestions)) {
        parsedQuestions = [];
      }
      
      parsedQuestions = parsedQuestions.map((questionObj) => {
        return {
          ...questionObj,
          unit_tag: unitTag,
          module_tag: moduleTag,
          course_tag: courseTag,
          subTopic_tag: subTopicTag.toUpperCase(),
          topic_tag: topicTag.toUpperCase(),
        }
      })
      // Helper function to transform options from object to array
      const transformOptionsToArray = (questionObj) => {
        if (
          questionObj &&
          typeof questionObj.options === "object" &&
          !Array.isArray(questionObj.options)
        ) {
          const optionsArray = Object.entries(questionObj.options).map(
            ([text, correct]) => ({
              text: text,
              correct: correct,
            })
          );
          return { ...questionObj, options: optionsArray };
        }
        return questionObj;
      };

      // Transform options to array before stringifying
      const stringifiedQuestions = parsedQuestions.map((q) =>
        JSON.stringify(transformOptionsToArray(q), null, 2)
      );

      setQuestionsJson((prev) => [...prev, ...stringifiedQuestions]);
    } catch {
      // handle fetch error silently or add notification as needed
    } finally {
      setLoading(false);
    }
  };

  // Handle topic change
  const handleTopicChange = (e) => {
    setTopicTag(e.target.value);
  };

  // Handle technology change and fetch prompt
  const handleTechnologyChange = async (e) => {
    const value = e.target.value;
    setTechnology(value);

    const mappedProcessName = techToProcessName[value];
    console.log("Selected technology:", value);
    console.log("Mapped process name:", mappedProcessName);
    setProcessName(mappedProcessName);

    if (!mappedProcessName) {
      console.error("No mapping found for technology:", value);
      return;
    }

    const response = await authFetch(
      "https://ravik00111110.pythonanywhere.com/api/content-gen/prompt/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process_name: mappedProcessName }),
      },
      navigate,
      200000,
      true
    );

    if (response && response.status === 200) {
      const data = await response.json();
      setRawPrompt(data.prompt);
      updateMessage(data.prompt);
    }
  };

  // Update message template with current values
  const updateMessage = (template, overrides = {}) => {
    const replacements = {
      "{{technology}}": overrides.technology ?? technology,
      "{{topic}}": overrides.topic ?? topic,
      "{{no_of_questions}}": overrides.number_of_questions ?? numberOfQuestions,
      "{{difficulty_level}}": overrides.difficulty ?? difficulty,
      "{{topic_tag}}": overrides.topic_tag ?? topicTag,
      "{{sub_topic_tag}}": overrides.subTopicTag ?? subTopicTag,
      "{{unit_tag}}": overrides.unitTag ?? unitTag,
      "{{module_tag}}": overrides.moduleTag ?? moduleTag,
      "{{course_tag}}": overrides.courseTag ?? courseTag,
      "{{syllabus_details}}": overrides.syllabus ?? syllabus,
    };

    let updated = template;
    Object.entries(replacements).forEach(([key, val]) => {
      const regex = new RegExp(key, "g");
      updated = updated.replace(regex, val || key);
    });

    setMessage(updated);
    return updated;
  };

  // Download questions as CSV
  const downloadCSV = () => {
    if (questionsJson.length === 0) {
      alert("No questions available to download");
      return;
    }

    const headers = [
      "Question",
      "OptionA",
      "OptionB",
      "OptionC",
      "OptionD",
      "Answer",
      "explanation",
      "HTML code",
      "CSS code",
      "JS code",
      "toughness",
      "topic",
      "Sub_topic",
      "unit_tag",
      "module_tag",
      "course_tag",
    ];

    const csvData = questionsJson.map((qStr) => {
      let questionObj;
      try {
        questionObj = JSON.parse(qStr);
      } catch {
        return new Array(headers.length).fill("");
      }

      // Ensure options is an array and has at least 4 elements
      const options = questionObj.options || [];
      while (options.length < 4) {
        options.push({ text: "", correct: "FALSE" });
      }

      const optionA = options[0]?.text || "";
      const optionB = options[1]?.text || "";
      const optionC = options[2]?.text || "";
      const optionD = options[3]?.text || "";

      let correctAnswer = "";
      options.forEach((option, index) => {
        if (option.correct === "TRUE" || option.correct === true) {
          if (index === 0) correctAnswer = "A";
          else if (index === 1) correctAnswer = "B";
          else if (index === 2) correctAnswer = "C";
          else if (index === 3) correctAnswer = "D";
        }
      });

      return [
        questionObj.question_text || "",
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        questionObj.answer_explanation_content || "",
        "", // HTML code - empty as per requirement
        "", // CSS code - empty as per requirement
        "", // JS code - empty as per requirement
        questionObj.difficulty_level || "",
        questionObj.topic_tag,
        questionObj.subTopic_tag,
        questionObj.unit_tag,
        questionObj.module_tag,
        questionObj.course_tag,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell || "");
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `${technology || "questions"}_${currentDate}_mcq.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define initial question structure
  /*const initialQuestion = {
        question_text: "",
        answer_explanation_content: "",
        difficulty_level: "",
        options: [
            { text: "", correct: "FALSE" },
            { text: "", correct: "FALSE" },
            { text: "", correct: "FALSE" },
            { text: "", correct: "FALSE" }
        ]
    };*/

  // FIXED: Handle field changes in questions
  const handleFieldChange = (index, field, value, optionIndex = null) => {
    setQuestionsJson((prevQuestions) => {
      const updatedQuestions = [...prevQuestions];
      try {
        const questionObj = JSON.parse(updatedQuestions[index]);

        if (field === "options" && optionIndex !== null) {
          // If options is not an array, convert it to an array
          if (!Array.isArray(questionObj.options)) {
            questionObj.options = Object.entries(questionObj.options).map(
              ([text, correct]) => ({
                text,
                correct,
              })
            );
          }
          // Ensure we have enough options
          while (questionObj.options.length <= optionIndex) {
            questionObj.options.push({ text: "", correct: "FALSE" });
          }
          // Update the specific option property
          questionObj.options[optionIndex] = {
            ...questionObj.options[optionIndex],
            [value]:
              field === "option_text"
                ? value
                : field === "option_correct"
                ? value
                : questionObj.options[optionIndex][value],
          };
        } else {
          // Directly update the field if it's not an option
          questionObj[field] = value;
        }

        // Stringify the updated question object
        updatedQuestions[index] = JSON.stringify(questionObj, null, 2);
      } catch (error) {
        console.error("Error parsing or updating JSON:", error);
      }
      return updatedQuestions;
    });
  };

  // FIXED: Handle option text change
  const handleOptionTextChange = (questionIndex, optionIndex, newText) => {
    setQuestionsJson((prevQuestions) => {
      const updatedQuestions = [...prevQuestions];
      try {
        const questionObj = JSON.parse(updatedQuestions[questionIndex]);

        // Ensure options is an array
        if (!Array.isArray(questionObj.options)) {
          questionObj.options = Object.entries(questionObj.options).map(
            ([text, correct]) => ({
              text,
              correct,
            })
          );
        }

        // Ensure we have enough options
        while (questionObj.options.length <= optionIndex) {
          questionObj.options.push({ text: "", correct: "FALSE" });
        }

        // Update the text of the specific option
        questionObj.options[optionIndex].text = newText;

        updatedQuestions[questionIndex] = JSON.stringify(questionObj, null, 2);
      } catch (error) {
        console.error("Error updating option text:", error);
      }
      return updatedQuestions;
    });
  };

  // FIXED: Handle option correct change
  const handleOptionCorrectChange = (
    questionIndex,
    optionIndex,
    newCorrect
  ) => {
    setQuestionsJson((prevQuestions) => {
      const updatedQuestions = [...prevQuestions];
      try {
        const questionObj = JSON.parse(updatedQuestions[questionIndex]);

        // Ensure options is an array
        if (!Array.isArray(questionObj.options)) {
          questionObj.options = Object.entries(questionObj.options).map(
            ([text, correct]) => ({
              text,
              correct,
            })
          );
        }

        // Ensure we have enough options
        while (questionObj.options.length <= optionIndex) {
          questionObj.options.push({ text: "", correct: "FALSE" });
        }

        // Update the correct property of the specific option
        questionObj.options[optionIndex].correct = newCorrect;

        updatedQuestions[questionIndex] = JSON.stringify(questionObj, null, 2);
      } catch (error) {
        console.error("Error updating option correct:", error);
      }
      return updatedQuestions;
    });
  };

  // Delete a question
  const handleDelete = (i) => {
    const newQuestions = questionsJson.filter((_, idx) => idx !== i);
    setQuestionsJson(newQuestions);
  };

  // Clear questions function
  const handleClearQuestions = () => {
    if (questionsJson.length > 0) {
      const confirmClear = window.confirm(
        "Are you sure you want to clear all questions?"
      );
      if (confirmClear) {
        setQuestionsJson([]);
      }
    }
  };

  return (
    <div>
      <Navbar />
      <div className="containerCA">
        <fieldset className="codeAnalysis">
          <legend className="codeAnalysisLegand">Theoretical Question</legend>

          <div className="details-text-prompt">
            <h3>----- Details for Prompt -----</h3>
          </div>

          <div className="itemsCA">
            <select
              className="itemCA1"
              value={technology}
              onChange={handleTechnologyChange}
            >
              <option value="default">Technology</option>
              <option value="CPP">CPP</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C">C</option>
              <option value="Javascript">Javascript</option>
              <option value="SQL">SQL</option>
              <option value="HTML_CSS">HTML CSS</option>
              <option value="Node_Js">NODE JS</option>
              <option value="React_JS">React JS</option>
            </select>

            <input
              type="text"
              className="caBoxes"
              placeholder="Enter Concept"
              value={topic}
              onChange={(e) => {
                const newValue = e.target.value;
                setTopic(newValue);
                updateMessage(rawPrompt, { topic: newValue });
              }}
            />

            <input
              type="text"
              className="caBoxes"
              placeholder="Enter Number of Questions"
              value={numberOfQuestions}
              onChange={(e) => {
                const newValue = e.target.value.replace(/[^0-9]/g, "");
                setNumberOfQuestions(newValue);
                updateMessage(rawPrompt, { number_of_questions: newValue });
              }}
              onKeyDown={(e) => {
                if (
                  !/[0-9]/.test(e.key) &&
                  e.key !== "Backspace" &&
                  e.key !== "ArrowLeft" &&
                  e.key !== "ArrowRight" &&
                  e.key !== "Delete" &&
                  e.key !== "Tab"
                ) {
                  e.preventDefault();
                }
              }}
            />

            <select
              className="itemCA1"
              value={difficulty}
              onChange={(e) => {
                const newValue = e.target.value;
                setDifficulty(newValue);
                updateMessage(rawPrompt, { difficulty: newValue });
              }}
            >
              <option value="default">Choose Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="details-text">
            <h3>----- Details for topintech -----</h3>
          </div>

          <div className="topin-input">
            <select
              className="itemCA1"
              value={topicTag}
              onChange={handleTopicChange}
            >
              <option value="default">Choose Topic Tag</option>
              <option value="TOPIC_HTML_CSS_MCQ">TOPIC_HTML_CSS_MCQ</option>
              <option value="TOPIC_PYTHON_MCQ">TOPIC_PYTHON_MCQ</option>
              <option value="TOPIC_JS_MCQ">TOPIC_JS_MCQ</option>
              <option value="TOPIC_CPP_MCQ">TOPIC_CPP_MCQ</option>
              <option value="TOPIC_NODE_MCQ">TOPIC_NODE_MCQ</option>
              <option value="TOPIC_REACT_MCQ">TOPIC_REACT_MCQ</option>
              <option value="TOPIC_SQL_MCQ">TOPIC_SQL_MCQ</option>
            </select>

            <input
              type="text"
              className="caBoxes tag"
              placeholder="Enter Subtopic Tag"
              value={subTopicTag}
              onChange={(e) => {
                const newValue = e.target.value;
                setSubTopicTag(newValue);
                updateMessage(rawPrompt);
              }}
            />
          </div>
          <div className="details-text">
            <h3>----- Details for Optional tags -----</h3>
          </div>
          <div className="topin-input">
            <input
              type="text"
              className="caBoxes"
              placeholder="Enter unit Tag"
              value={unitTag}
              onChange={(e) => {
                const newValue = e.target.value;
                setUnitTag(newValue);
                updateMessage(rawPrompt);
              }}
            />
            <input
              type="text"
              className="caBoxes"
              placeholder="Enter Module Tag"
              value={moduleTag}
              onChange={(e) => {
                const newValue = e.target.value;
                setModuleTag(newValue);
                updateMessage(rawPrompt);
              }}
            />
            <input
              type="text"
              className="caBoxes"
              placeholder="Enter Course Tag"
              value={courseTag}
              onChange={(e) => {
                const newValue = e.target.value;
                setCourseTag(newValue);
                updateMessage(rawPrompt);
              }}
            />
          </div>

          <textarea
            className="caTextArea"
            placeholder="Enter Syllabus details"
            value={syllabus}
            onChange={(e) => {
              const newValue = e.target.value;
              setSyllabus(newValue);
              updateMessage(rawPrompt, { syllabus: newValue });
            }}
          />

          {isPromptEdited ? (
            <button className="edit-button" disabled>
              Edit Prompt
            </button>
          ) : (
            <button
              className="edit-button"
              onClick={() => setEditPromptStatus(!isPromptEdited)}
            >
              Edit Prompt
            </button>
          )}

          <textarea
            className="caTextArea"
            placeholder="Fetched prompt"
            disabled={!isPromptEdited}
            value={message}
            onChange={(e) => {
              const newTemplate = e.target.value;
              setRawPrompt(newTemplate);
              updateMessage(newTemplate);
            }}
          />

          <div className="btnWrapperCentered">
            <button
              className={`itemCA fetchBtn ${
                !allFieldsFilled() || loading ? "disabledBtn" : ""
              }`}
              onClick={requestQuestions}
              disabled={!allFieldsFilled() || loading}
            >
              {loading ? "Generating..." : "Generate Questions"}
            </button>

            <button
              className={`clearButton ${
                questionsJson.length === 0 ? "disabledBtn" : ""
              }`}
              onClick={handleClearQuestions}
              disabled={questionsJson.length === 0}
            >
              Clear Questions
            </button>
          </div>
        </fieldset>

        {questionsJson.length > 0 && (
          <div className="jsonDisplaySection">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>Edit Generated Questions</h2>
              <div
                style={{
                  backgroundColor: "#f1f3f5",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  display: "flex",
                  gap: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {(() => {
                  const counts = getDifficultyCounts();
                  return (
                    <>
                      <span style={{ color: "#28a745", fontWeight: "600" }}>
                        Easy: {counts.EASY}
                      </span>
                      <span style={{ color: "#ffc107", fontWeight: "600" }}>
                        Medium: {counts.MEDIUM}
                      </span>
                      <span style={{ color: "#dc3545", fontWeight: "600" }}>
                        Hard: {counts.HARD}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {questionsJson.map((qStr, index) => {
              try {
                const questionObj = JSON.parse(qStr);

                const handleFieldChangeWrapper = (
                  field,
                  value,
                  optionIndex = null
                ) => {
                  handleFieldChange(index, field, value, optionIndex);
                };

                const handleDeleteWrapper = () => {
                  handleDelete(index);
                };

                return (
                  <div key={index} className="questionBox">
                    <div className="delete">
                      <select
                        value={questionObj.difficulty_level}
                        onChange={(e) =>
                          handleFieldChangeWrapper(
                            "difficulty_level",
                            e.target.value
                          )
                        }
                        className="difficulty"
                      >
                        <option value="">Select Difficulty</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>

                      <h4>QUESTION {index + 1}</h4>

                      <button onClick={handleDeleteWrapper}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="30"
                          height="20"
                          fill="red"
                          viewBox="0 0 16 16"
                        >
                          <path d="M5.5 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6z" />
                          <path
                            fillRule="evenodd"
                            d="M14.5 3a1 1 0 0 1-1 1h-1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4h-1a1 1 0 0 1 0-2h3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3a1 1 0 0 1 1 1zM5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4H5z"
                          />
                        </svg>
                      </button>
                    </div>

                    <TextField
                      label="Question Text"
                      variant="outlined"
                      fullWidth
                      value={questionObj.question_text}
                      onChange={(e) =>
                        handleFieldChangeWrapper(
                          "question_text",
                          e.target.value
                        )
                      }
                      InputLabelProps={{
                        shrink: false,
                        sx: {
                          left: "50%",
                          transform: "translateX(-50%) translateY(-50%)",
                          pointerEvents: "none",
                          fontWeight: "bold",
                          width: "100%",
                          textAlign: "center",
                        },
                      }}
                      inputProps={{
                        style: {
                          textAlign: "center",
                          border: "none",
                        },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      }}
                    />

                    <TextField
                      label="Explanation"
                      multiline
                      fullWidth
                      value={String(
                        questionObj.answer_explanation_content
                      ).trim()}
                      onChange={(e) =>
                        handleFieldChangeWrapper(
                          "answer_explanation_content",
                          e.target.value
                        )
                      }
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          textAlign: "center",
                          width: "100%",
                          transform: "translateX(-50%) translateY(-50%)",
                          left: "50%",
                          fontWeight: "bold",
                          bgcolor: "white",
                          padding: "0 8px",
                        },
                      }}
                      inputProps={{
                        style: {
                          overflow: "hidden",
                          width: "100%",
                          padding: 0,
                          minHeight: "100px",
                          textAlign: "left",
                        },
                        onInput: (e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        },
                      }}
                      sx={{
                        marginTop: "20px",
                        marginBottom: "20px",
                      }}
                      variant="outlined"
                    />

                    <b>Options:</b>
                    {questionObj.options.map((option, optIdx) => (
                      <div key={optIdx} className="optionRow">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) =>
                            handleOptionTextChange(
                              index,
                              optIdx,
                              e.target.value
                            )
                          }
                          className="editableInput optionKey"
                        />

                        <select
                          value={option.correct}
                          onChange={(e) =>
                            handleOptionCorrectChange(
                              index,
                              optIdx,
                              e.target.value
                            )
                          }
                          className="optionSelect"
                          style={{
                            backgroundColor:
                              option.correct === "TRUE" ? "#d4edda" : "#f8d7da",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            margin: "8px 0 16px",
                            height: "auto",
                            padding: "5px 5px 0px 5px",
                          }}
                        >
                          <option value="TRUE">TRUE</option>
                          <option value="FALSE">FALSE</option>
                        </select>
                      </div>
                    ))}
                  </div>
                );
              } catch (error) {
                console.error("Error parsing JSON:", error);
                return <p key={index}>Invalid JSON</p>;
              }
            })}
          </div>
        )}

        {/* Download Section */}
        <div style={{ padding: "20px", textAlign: "center" }}>
          <button
            onClick={downloadCSV}
            disabled={questionsJson.length === 0}
            style={{
              backgroundColor: questionsJson.length === 0 ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "5px",
              cursor: questionsJson.length === 0 ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            Download CSV ({questionsJson.length} questions)
          </button>

          {questionsJson.length === 0 && (
            <p style={{ color: "#666", marginTop: "8px" }}>
              Generate questions first to enable download
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Theoretical;
