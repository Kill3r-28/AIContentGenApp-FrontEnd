import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import { useAuthGuard } from "../../utils/useAuthGuard";
import Navbar from "../Navbar/navbar";
import "./codeAnalysis.css";
import { TextField } from "@mui/material";
import DownloadCSVButton from "../DownloadCSV/downloadCSV";

const CodeAnalysis = () => {
  useAuthGuard();
  const navigate = useNavigate();

  const [technology, setTechnology] = useState("");
  const [topic, setTopic] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topicTag, setTopicTag] = useState("");
  const [subTopicTag, setSubTopicTag] = useState("SUB_TOPIC_");
  const [syllabus, setSyllabus] = useState("");
  const [message, setMessage] = useState("");
  const [rawPrompt, setRawPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsJson, setQuestionsJson] = useState([]);
  const [isPromptEdited, setEditPromptStatus] = useState(false);
  const [processName, setProcessName] = useState("");
  const [unitTag, setUnitTag] = useState("UNIT_");
  const [moduleTag, setModuleTag] = useState("MODULE_");
  const [courseTag, setCourseTag] = useState("COURSE_");

  const techToProcessName = {
    CPP: "ca_mcq_cpp",
    Python: "ca_mcq_python",
    Java: "",
    C: "",
    Javascript: "ca_mcq_javascript",
    Sql: "ca_mcq_sql",
    HTML_CSS: "ca_mcq_html_css",
  };

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

  // Request questions from the API
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
            is_updated: isPromptEdited,
            process_name: processName,
          }),
        },
        navigate,
        200000,
        true
      );

      const data = await response.json();

      // Clean the response message
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
      } catch (parseError) {
        console.error("Failed to parse questions:", parseError);
        parsedQuestions = [];
      }

      if (!Array.isArray(parsedQuestions)) {
        parsedQuestions = [];
      }

      parsedQuestions = parsedQuestions.map((questionObj) => {
        return {
          ...questionObj,
          tags: [
            unitTag,
            moduleTag,
            courseTag,
            topicTag.toUpperCase(),
            subTopicTag.toUpperCase(),
          ],
        };
      });

      // Process options
      const processedQuestions = parsedQuestions.map((q) => {
        if (
          q.options &&
          typeof q.options === "object" &&
          !Array.isArray(q.options)
        ) {
          const optionsArray = Object.entries(q.options).map(
            ([text, correctness]) => ({
              text,
              correctness,
            })
          );
          return { ...q, options: optionsArray };
        }
        return q;
      });

      const stringifiedQuestions = processedQuestions.map((q) =>
        JSON.stringify(q, null, 2)
      );
      setQuestionsJson((prev) => [...prev, ...stringifiedQuestions]);
    } catch (error) {
      console.error("Error generating questions:", error);
      // Add user notification here
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = (e) => {
    setTopicTag(e.target.value);
  };

  const handleTechnologyChange = async (value) => {
    setTechnology(value);
    const mappedProcessName = techToProcessName[value];
    setProcessName(mappedProcessName);

    if (!mappedProcessName) return;

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
      updateMessage(data.prompt, { technology: value });
    }
  };

  const updateMessage = (template, overrides = {}) => {
    const replacements = {
      "{{technology}}": overrides.technology ?? technology,
      "{{topic}}": overrides.topic ?? topic,
      "{{no_of_questions}}": overrides.number_of_questions ?? numberOfQuestions,
      "{{difficulty_level}}": overrides.difficulty ?? difficulty,
      "{{topic_tag}}": overrides.topic_tag ?? topicTag,
      "{{sub_topic_tag}}": overrides.sub_topic_tag ?? subTopicTag,
      "{{syllabus_details}}": overrides.syllabus ?? syllabus,
      "{{unit_tag}}": overrides.unitTag ?? unitTag,
      "{{module_tag}}": overrides.moduleTag ?? moduleTag,
      "{{course_tag}}": overrides.courseTag ?? courseTag,
    };

    let updated = template;
    Object.entries(replacements).forEach(([key, val]) => {
      const regex = new RegExp(key, "g");
      updated = updated.replace(regex, val || key);
    });

    setMessage(updated);
    return updated;
  };

  return (
    <div>
      <Navbar />
      <div className="containerCA">
        <fieldset className="codeAnalysis">
          <legend className="codeAnalysisLegand">Code Analysis Question</legend>

          <div className="details-text-prompt">
            <h3>----- Details for Prompt -----</h3>
          </div>

          <div className="itemsCA">
            <select
              className="itemCA1"
              value={technology}
              onChange={(e) => {
                const newTech = e.target.value;
                handleTechnologyChange(newTech);
              }}
            >
              <option value="default">Technology</option>
              <option value="CPP">CPP</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C">C</option>
              <option value="Javascript">Javascript</option>
              <option value="Sql">Sql</option>
              <option value="HTML_CSS">HTML_CSS</option>
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
              <option value="TOPIC_CPP_CODING_ANALYSIS">
                TOPIC_CPP_CODING_ANALYSIS
              </option>
              <option value="TOPIC_PYTHON_CODING_ANALYSIS">
                TOPIC_PYTHON_CODING_ANALYSIS
              </option>
              <option value="TOPIC_JAVA_CODING_ANALYSIS">
                TOPIC_JAVA_CODING_ANALYSIS
              </option>
              <option value="TOPIC_C_CODING_ANALYSIS">
                TOPIC_C_CODING_ANALYSIS
              </option>
              <option value="TOPIC_JS_CODING_ANALYSIS">
                TOPIC_JS_CODING_ANALYSIS
              </option>
              <option value="TOPIC_HTML_CSS_CODING_ANALYSIS">
                TOPIC_HTML_CSS_CODING_ANALYSIS
              </option>
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
              className="clearButton"
              onClick={() => setQuestionsJson([])}
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
              let questionObj;
              try {
                questionObj = JSON.parse(qStr);
              } catch {
                return <p key={index}>Invalid JSON</p>;
              }

              const handleFieldChange = (field, value) => {
                const updated = { ...questionObj, [field]: value };
                const updatedString = JSON.stringify(updated, null, 2);
                setQuestionsJson((prev) => {
                  const copy = [...prev];
                  copy[index] = updatedString;
                  return copy;
                });
              };

              const handleDelete = (i) => {
                const newQuestions = questionsJson.filter(
                  (_, idx) => idx !== i
                );
                setQuestionsJson(newQuestions);
              };

              // Handle option changes while preserving order
              const handleOptionTextChange = (optionIndex, newText) => {
                const newOptions = [...questionObj.options];
                newOptions[optionIndex] = {
                  ...newOptions[optionIndex],
                  text: newText,
                };
                handleFieldChange("options", newOptions);
              };

              const handleOptionCorrectnessChange = (
                optionIndex,
                newCorrectness
              ) => {
                const newOptions = [...questionObj.options];
                newOptions[optionIndex] = {
                  ...newOptions[optionIndex],
                  correctness: newCorrectness,
                };
                handleFieldChange("options", newOptions);
              };

              return (
                <div key={index} className="questionBox">
                  <div className="delete">
                    <select
                      value={questionObj.difficulty_level}
                      onChange={(e) =>
                        handleFieldChange("difficulty_level", e.target.value)
                      }
                      className="difficulty"
                    >
                      <option value="">Select Difficulty</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                    <h4>QUESTION {index + 1}</h4>

                    <button onClick={() => handleDelete(index)}>
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
                      handleFieldChange("question_text", e.target.value)
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
                    label="Code"
                    multiline
                    fullWidth
                    value={String(questionObj.code_data).trim()}
                    onChange={(e) =>
                      handleFieldChange("code_data", e.target.value)
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
                    }}
                    variant="outlined"
                  />

                  <TextField
                    label="Explanation"
                    multiline
                    fullWidth
                    value={String(
                      questionObj.answer_explanation_content
                    ).trim()}
                    onChange={(e) =>
                      handleFieldChange(
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
                  {questionObj.options &&
                    Array.isArray(questionObj.options) &&
                    questionObj.options.map((option, optIdx) => (
                      <div key={optIdx} className="optionRow">
                        <textarea
                          value={option.text.replace(/\\n/g, "\n")}
                          onChange={(e) =>
                            handleOptionTextChange(optIdx, e.target.value)
                          }
                          className="editableInput optionKey"
                          style={{
                            minHeight: "60px",
                            resize: "vertical",
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                          }}
                        />
                        <select
                          value={option.correctness}
                          onChange={(e) =>
                            handleOptionCorrectnessChange(
                              optIdx,
                              e.target.value
                            )
                          }
                          className="optionSelect"
                          style={{
                            backgroundColor:
                              option.correctness === "TRUE"
                                ? "#d4edda"
                                : "#f8d7da",
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
            })}
          </div>
        )}

        <div style={{ padding: "20px" }}>
          <DownloadCSVButton
            questionJSONs={questionsJson}
            technology={technology}
            topicTag={topicTag}
            disabled={questionsJson.length <= 0}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeAnalysis;
