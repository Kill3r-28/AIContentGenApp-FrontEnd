import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";
import { useAuthGuard } from "../../utils/useAuthGuard";
import Navbar from "../Navbar/navbar";
import './theoretical.css';
import { TextField } from "@mui/material";

const Theoretical = () => {
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

    const techToProcessName = {
        CPP: "ca_mcq_cpp",
        Python: "ca_mcq_python",
        Java: "ca_mcq_java",
        C: "ca_mcq_c",
        Javascript: "ca_mcq_javascript",
        Sql: "ca_mcq_sql",
        HTML_CSS: "theory_mcq_html_css"
    };

    const getDifficultyCounts = () => {
        const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
        questionsJson.forEach(qStr => {
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
            technology && technology !== "default" &&
            difficulty && difficulty !== "default" &&
            topic && numberOfQuestions &&
            topicTag && subTopicTag &&
            syllabus
        );
    };

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
                        number_of_question: numberOfQuestions
                    }),
                },
                navigate,
                200000,
                true
            );

            const data = await response.json();

            let parsedQuestions;
            try {
                parsedQuestions = JSON.parse(data.message.trim());
            } catch {
                parsedQuestions = [];
            }

            if (!Array.isArray(parsedQuestions)) {
                parsedQuestions = [];
            }

            const stringifiedQuestions = parsedQuestions.map(q => JSON.stringify(q, null, 2));
            setQuestionsJson(prev => [...prev, ...stringifiedQuestions]);
        } catch {
            // handle fetch error silently or add notification as needed
        } finally {
            setLoading(false);
        }
    };

    const handleTopicChange = (e) => {
        setTopicTag(e.target.value);
    };

    const handleTechnologyChange = async (e) => {
        const value = e.target.value;
        setTechnology(value);

        const mappedProcessName = techToProcessName[value];
        console.log("Selected technology:", value);
        console.log("Mapped process name:", mappedProcessName);

        if (!mappedProcessName) {
            console.error("No mapping found for technology:", value);
            return;
        }
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
            updateMessage(data.prompt);
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
        };

        let updated = template;
        Object.entries(replacements).forEach(([key, val]) => {
            const regex = new RegExp(key, "g");
            updated = updated.replace(regex, val || key);
        });

        setMessage(updated);
        return updated;
    };


    // New CSV download functionality
    const downloadCSV = () => {
        if (questionsJson.length === 0) {
            alert("No questions available to download");
            return;
        }

        // CSV headers
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
            "Sub_topic"
        ];

        // Convert questions to CSV format
        const csvData = questionsJson.map(qStr => {
            let questionObj;
            try {
                questionObj = JSON.parse(qStr);
            } catch {
                return new Array(headers.length).fill("");
            }

            // Extract options in order (A, B, C, D)
            const options = questionObj.options || {};
            const optionKeys = Object.keys(options);
            const sortedOptions = optionKeys.sort();

            // Get the options A, B, C, D
            const optionA = sortedOptions[0] || "";
            const optionB = sortedOptions[1] || "";
            const optionC = sortedOptions[2] || "";
            const optionD = sortedOptions[3] || "";

            // Find the correct answer (the option with TRUE value)
            let correctAnswer = "";
            for (const [optionText, isCorrect] of Object.entries(options)) {
                if (isCorrect === "TRUE" || isCorrect === true) {
                    // Find which option (A, B, C, D) this corresponds to
                    const optionIndex = sortedOptions.indexOf(optionText);
                    if (optionIndex === 0) correctAnswer = "A";
                    else if (optionIndex === 1) correctAnswer = "B";
                    else if (optionIndex === 2) correctAnswer = "C";
                    else if (optionIndex === 3) correctAnswer = "D";
                    break;
                }
            }

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
                topicTag || "",
                subTopicTag || ""
            ];
        });

        // Create CSV content
        const csvContent = [
            headers.join(","),
            ...csvData.map(row =>
                row.map(cell => {
                    // Escape quotes and wrap in quotes if cell contains comma, quote, or newline
                    const cellStr = String(cell || "");
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(",")
            )
        ].join("\n");

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        // Generate filename with current date and technology
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `${technology || 'questions'}_${currentDate}_mcq.csv`;
        link.setAttribute("download", filename);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <Navbar/>
            <div className="containerCA">
                <fieldset className="codeAnalysis">
                    <legend className="codeAnalysisLegand">Theoretical MCQ Question</legend>

                    <div className="details-text-prompt">
                        <h3>-----  Details for Prompt  -----</h3>
                    </div>

                    <div className="itemsCA">
                        <select className="itemCA1" value={technology} onChange={handleTechnologyChange}>
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
                                const newValue = e.target.value.replace(/[^0-9]/g, '');
                                setNumberOfQuestions(newValue);
                                updateMessage(rawPrompt, { number_of_questions: newValue });
                            }}
                            onKeyDown={(e) => {
                                if (
                                    !/[0-9]/.test(e.key) &&
                                    e.key !== 'Backspace' &&
                                    e.key !== 'ArrowLeft' &&
                                    e.key !== 'ArrowRight' &&
                                    e.key !== 'Delete' &&
                                    e.key !== 'Tab'
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
                        <select className="itemCA1" value={topicTag} onChange={handleTopicChange}>
                            <option value="default">Choose Topic Tag</option>

                            <option value="TOPIC_HTML_CSS_MCQ">TOPIC_HTML_CSS_MCQ
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

                    <textarea
                        className="caTextArea"
                        placeholder="Fetched prompt"
                        value={message}
                        onChange={(e) => {
                            const newTemplate = e.target.value;
                            setRawPrompt(newTemplate);
                            updateMessage(newTemplate);
                        }}
                    />

                    <div className="btnWrapperCentered">
                        <button
                            className={`itemCA fetchBtn ${!allFieldsFilled() || loading ? "disabledBtn" : ""}`}
                            onClick={requestQuestions}
                            disabled={!allFieldsFilled() || loading}
                        >
                            {loading ? "Generating..." : "Generate Questions"}
                        </button>
                        <button className="clearButton" onClick={() => setQuestionsJson([])}>
                            Clear Questions
                        </button>
                    </div>
                </fieldset>

                {questionsJson.length > 0 && (
                    <div className="jsonDisplaySection">
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                            flexWrap: "wrap"
                        }}>
                            <h2 style={{ margin: 0 }}>Edit Generated Questions</h2>

                            <div style={{
                                backgroundColor: "#f1f3f5",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                fontSize: "0.9rem",
                                display: "flex",
                                gap: "12px",
                                whiteSpace: "nowrap"
                            }}>
                                {(() => {
                                    const counts = getDifficultyCounts();
                                    return (
                                        <>
                                            <span style={{ color: "#28a745", fontWeight: "600" }}>Easy: {counts.EASY}</span>
                                            <span style={{ color: "#ffc107", fontWeight: "600" }}>Medium: {counts.MEDIUM}</span>
                                            <span style={{ color: "#dc3545", fontWeight: "600" }}>Hard: {counts.HARD}</span>
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
                                setQuestionsJson(prev => {
                                    const copy = [...prev];
                                    copy[index] = updatedString;
                                    return copy;
                                });
                            };
                            const handleDelete = (i) => {
                                const newQuestions = questionsJson.filter((_, idx) => idx !== i);
                                setQuestionsJson(newQuestions);
                            };

                            return (
                                <div key={index} className="questionBox">
                                    <div className="delete">
                                        <select
                                            value={questionObj.difficulty_level}
                                            onChange={(e) => handleFieldChange("difficulty_level", e.target.value)}
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
                                                width="30" height="20"
                                                fill="red"
                                                viewBox="0 0 16 16"
                                            >
                                                <path d="M5.5 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6z" />
                                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1h-1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4h-1a1 1 0 0 1 0-2h3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3a1 1 0 0 1 1 1zM5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4H5z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <TextField
                                        label="Question Text"
                                        variant="outlined"
                                        fullWidth
                                        value={questionObj.question_text}
                                        onChange={(e) => handleFieldChange("question_text", e.target.value)}
                                        InputLabelProps={{
                                            shrink: false,
                                            sx: {
                                                left: '50%',
                                                transform: 'translateX(-50%) translateY(-50%)',
                                                pointerEvents: 'none',
                                                fontWeight: 'bold',
                                                width: '100%',
                                                textAlign: 'center',
                                            },
                                        }}
                                        inputProps={{
                                            style: {
                                                textAlign: 'center',
                                                border: 'none',
                                            },
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    border: 'none',
                                                },
                                            },
                                        }}
                                    />

                                    <TextField
                                        label="Explanation"
                                        multiline
                                        fullWidth
                                        value={String(questionObj.answer_explanation_content).trim()}
                                        onChange={(e) => handleFieldChange("answer_explanation_content", e.target.value)}
                                        InputLabelProps={{
                                            shrink: true,
                                            sx: {
                                                textAlign: 'center',
                                                width: '100%',
                                                transform: 'translateX(-50%) translateY(-50%)',
                                                left: '50%',
                                                fontWeight: 'bold',
                                                bgcolor: 'white',
                                                padding: '0 8px',
                                            },
                                        }}
                                        inputProps={{
                                            style: {
                                                overflow: 'hidden',
                                                width: '100%',
                                                padding: 0,
                                                minHeight: '100px',
                                                textAlign: 'left',
                                            },
                                            onInput: (e) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            },
                                        }}
                                        sx={{
                                            marginTop: '20px',
                                            marginBottom: '20px',
                                        }}
                                        variant="outlined"
                                    />

                                    <b>Options:</b>
                                    {Object.entries(questionObj.options).map(([optionText, correctness], optIdx) => (
                                        <div key={optIdx} className="optionRow">
                                            <input
                                                type="text"
                                                value={optionText}
                                                onChange={(e) => {
                                                    const newKey = e.target.value;
                                                    const newOptions = { ...questionObj.options };
                                                    const value = newOptions[optionText];
                                                    delete newOptions[optionText];
                                                    newOptions[newKey] = value;
                                                    handleFieldChange("options", newOptions);
                                                }}
                                                className="editableInput optionKey"
                                            />
                                            <select
                                                value={correctness}
                                                onChange={(e) => {
                                                    const newOptions = { ...questionObj.options };
                                                    newOptions[optionText] = e.target.value;
                                                    handleFieldChange("options", newOptions);
                                                }}
                                                className="optionSelect"
                                                style={{
                                                    backgroundColor: correctness === "TRUE" ? "#d4edda" : "#f8d7da",
                                                    border: "1px solid #ccc",
                                                    borderRadius: "4px",
                                                    margin: "8px 0 16px",
                                                    height: "auto",
                                                    padding: "5px 5px 0px 5px"
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

                {/* Updated Download Section */}
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <button
                        onClick={downloadCSV}
                        disabled={questionsJson.length === 0}
                        style={{
                            backgroundColor: questionsJson.length === 0 ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '5px',
                            cursor: questionsJson.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        Download CSV ({questionsJson.length} questions)
                    </button>
                    {questionsJson.length === 0 && (
                        <p style={{ color: '#666', marginTop: '8px' }}>
                            Generate questions first to enable download
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Theoretical;