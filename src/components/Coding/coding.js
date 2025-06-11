import { useState, useEffect } from "react";
import Navbar from "../Navbar/navbar";
import "./coding.css";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";

const decodeBase64 = (str) => {
    try {
        return atob(str);
    } catch {
        return "";
    }
};

const encodeBase64 = (str) => {
    try {
        return btoa(str);
    } catch {
        return "";
    }
};

const Coding = () => {
    const navigate = useNavigate();
    const [jsonData, setJsonData] = useState(null);
    const [jsonText, setJsonText] = useState("");
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [error, setError] = useState(null);

    const [jsonResponse, setJsonResponse] = useState({});
    const [selectedQuestionKey, setSelectedQuestionKey] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    useEffect(() => {
        if (apiError) {
            const timer = setTimeout(() => {
                setApiError(null);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [apiError]);

    useEffect(() => {
        setCurrentQuestionIndex(0);
    }, [selectedQuestionKey]);

    const handleFileUpload = (e) => {
        setError(null);
        try {
            const file = e.target.files[0];
            if (!file) return;

            if (
                !file.name.toLowerCase().endsWith(".json") &&
                !file.type.toLowerCase().includes("json")
            ) {
                setError("Please upload a JSON file with .json extension.");
                return;
            }

            const reader = new FileReader();
            reader.onload = ({ target }) => {
                try {
                    const parsed = JSON.parse(target.result);

                    if (typeof parsed !== "object" || parsed === null) {
                        setError("Invalid JSON structure: expected an object or array.");
                        setJsonData(null);
                        setJsonResponse({});
                        setSelectedQuestionKey(null);
                        return;
                    }

                    setJsonData(parsed);
                    setJsonText(JSON.stringify(parsed, null, 2));

                    setJsonResponse({
                        Given_JSON: Array.isArray(parsed) ? parsed : [parsed],
                    });
                    setSelectedQuestionKey("Given_JSON");
                } catch {
                    setError("Invalid JSON in file.");
                    setJsonData(null);
                    setJsonResponse({});
                    setSelectedQuestionKey(null);
                }
            };
            reader.readAsText(file);
        } catch {
            setError("Error reading file.");
        }
    };

    const handleTextChange = (e) => {
        const text = e.target.value;
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setJsonData(parsed);

            setJsonResponse({
                Given_JSON: Array.isArray(parsed) ? parsed : [parsed],
            });
            setSelectedQuestionKey("Given_JSON");
            setError(null);
        } catch {
            setError("Invalid JSON text.");
            setJsonData(null);
            setJsonResponse({});
            setSelectedQuestionKey(null);
        }
    };

    const handleGenerate = async () => {
        setApiError(null);
        setError(null);

        if (!jsonData || !Array.isArray(jsonData)) {
            setError("No valid JSON array data to generate.");
            return;
        }

        setLoading(true);

        try {
            let updatedQuestionsObj = { ...jsonResponse };
            const totalQuestions = jsonData.length;

            for (let i = 0; i < totalQuestions; i++) {
                const question = jsonData[i];

                const response = await authFetch(
                    "https://ravik00111110.pythonanywhere.com/api/content-gen/replicate/",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ data: [question] }),
                    },
                    navigate,
                    900000,
                    true
                );

                if (!response.ok) {
                    throw new Error(`API error on question ${i + 1}: ${response.statusText}`);
                }

                const data = await response.json();

                const questionData = data.message.question1;

                updatedQuestionsObj[`Question${i + 1}`] = Array.isArray(questionData)
                    ? questionData
                    : [questionData];

                setJsonResponse({ ...updatedQuestionsObj });
                setJsonText(JSON.stringify(updatedQuestionsObj, null, 2));
                setSelectedQuestionKey((prev) => prev || "Question1");
                setApiError(`Generated ${i + 1} / ${totalQuestions} questions`);
            }

            setApiError(null);
            setCurrentQuestionIndex(0);
        } catch (err) {
            setApiError(err.message || "API call failed.");
        } finally {
            setLoading(false);
        }
    };

    const updateQuestionField = (key, index, field, value) => {
        setJsonResponse((prev) => {
            const updated = { ...prev };
            updated[key] = [...updated[key]];
            updated[key][index] = { ...updated[key][index], [field]: value };
            return updated;
        });
    };

    const updateInputOutputField = (key, qIndex, ioIndex, field, value) => {
        setJsonResponse((prev) => {
            const updated = { ...prev };
            const questions = [...updated[key]];
            const question = { ...questions[qIndex] };

            if (
                !question.input_output ||
                question.input_output.length === 0 ||
                !question.input_output[0].input
            )
                return prev;

            const ioList = [...question.input_output[0].input];
            ioList[ioIndex] = { ...ioList[ioIndex], [field]: value };

            const newInputOutput0 = { ...question.input_output[0], input: ioList };
            question.input_output = [newInputOutput0];

            questions[qIndex] = question;
            updated[key] = questions;
            return updated;
        });
    };

    const updateCodeMetadataField = (key, qIndex, metaIndex, field, value) => {
        setJsonResponse((prev) => {
            const updated = { ...prev };
            const questions = [...updated[key]];
            const question = { ...questions[qIndex] };

            const codeMeta = question.code_metadata ? [...question.code_metadata] : [];
            if (codeMeta.length <= metaIndex) return prev;

            codeMeta[metaIndex] = { ...codeMeta[metaIndex], [field]: value };
            question.code_metadata = codeMeta;

            questions[qIndex] = question;
            updated[key] = questions;
            return updated;
        });
    };

    const updateCodeRepoField = (
        key,
        qIndex,
        metaIndex,
        fileIndex,
        field,
        value
    ) => {
        setJsonResponse((prev) => {
            const updated = { ...prev };
            const questions = [...updated[key]];
            const question = { ...questions[qIndex] };

            const repoDetails = question.language_code_repository_details
                ? [...question.language_code_repository_details]
                : [];
            if (repoDetails.length <= metaIndex) return prev;

            const repoMeta = { ...repoDetails[metaIndex] };
            const codeRepo = repoMeta.code_repository ? [...repoMeta.code_repository] : [];
            if (codeRepo.length <= fileIndex) return prev;

            let updatedFile = { ...codeRepo[fileIndex] };

            if (field === "file_content") {
                updatedFile.file_content = encodeBase64(value);
            } else {
                updatedFile[field] = value;
            }

            codeRepo[fileIndex] = updatedFile;
            repoMeta.code_repository = codeRepo;
            repoDetails[metaIndex] = repoMeta;

            question.language_code_repository_details = repoDetails;
            questions[qIndex] = question;
            updated[key] = questions;
            return updated;
        });
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const folder = zip.folder("Coding Questions");

        if (!folder) {
            setError("Failed to create ZIP folder.");
            return;
        }

        Object.entries(jsonResponse).forEach(([key, questions]) => {
            const fileName = `${key}.json`;
            const content = JSON.stringify(questions, null, 2);
            folder.file(fileName, content);
        });

        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "Coding_Questions.zip");
        } catch {
            setError("Failed to generate ZIP file.");
        }
    };

    const questionsForKey = selectedQuestionKey
        ? jsonResponse[selectedQuestionKey] || []
        : [];

    const currentQuestion =
        questionsForKey.length > 0 ? questionsForKey[currentQuestionIndex] : null;

    const updateCodeDetailsField = (key, qIndex, detailIndex, field, value) => {
        setJsonResponse((prev) => {
            const updated = { ...prev };
            const questions = [...updated[key]];
            const question = { ...questions[qIndex] };

            const codeDetails =
                question.solutions && question.solutions[0]?.code_details
                    ? [...question.solutions[0].code_details]
                    : [];

            if (codeDetails.length <= detailIndex) return prev;

            codeDetails[detailIndex] = { ...codeDetails[detailIndex], [field]: value };

            if (question.solutions && question.solutions[0]) {
                question.solutions[0].code_details = codeDetails;
            }

            questions[qIndex] = question;
            updated[key] = questions;
            return updated;
        });
    };


    return (
        <>
            <Navbar />

            <div className="container">
                <div className="input-container">
                    <div className="json-upload-section">
                        <h2 className="section-title">JSON Upload</h2>
                        <div className="input-area">
                            <div className="file-upload-container">
                                <label htmlFor="fileInput" className="label">
                                    Upload a JSON file
                                </label>
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileUpload}
                                    className="file-input"
                                />
                            </div>
                            <div className="textarea-container">
                                <label htmlFor="jsonTextarea" className="label">
                                    Or paste your JSON here
                                </label>
                                <textarea
                                    rows={24}
                                    id="jsonTextarea"
                                    value={jsonText}
                                    onChange={handleTextChange}
                                    placeholder="Paste JSON here..."
                                    className="json-textarea"
                                />
                            </div>
                            <button
                                className="generate-button"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? "Generating..." : "Generate"}
                            </button>

                            {apiError && <p className="error-message">{apiError}</p>}
                        </div>
                        {error && <p className="error-message">{error}</p>}
                    </div>
                </div>

                <div className="output-container">
                    <div className="question-keys-section">
                        <h2 className="section-title">Question Keys</h2>
                        <div className="question-key-buttons">
                            {Object.keys(jsonResponse).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedQuestionKey(key)}
                                    className={`question-key-btn ${selectedQuestionKey === key ? "active" : ""
                                        }`}
                                >
                                    {key === "Given_JSON" ? "Given JSON" : key}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {currentQuestion && (
                <div className="questions-editor">
                    <h3 className="question-editor-title">
                        {selectedQuestionKey} — Question {currentQuestionIndex + 1} of{" "}
                        {questionsForKey.length}
                    </h3>

                    <div className="nav-buttons">
                        <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                            className="nav-btn"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentQuestionIndex === questionsForKey.length - 1}
                            onClick={() =>
                                setCurrentQuestionIndex((i) =>
                                    Math.min(questionsForKey.length - 1, i + 1)
                                )
                            }
                            className="nav-btn"
                        >
                            Next
                        </button>
                    </div>

                    <label className="field-label">
                        <b>Short Text:</b>
                        <input
                            type="text"
                            value={currentQuestion.short_text || ""}
                            onChange={(e) =>
                                updateQuestionField(
                                    selectedQuestionKey,
                                    currentQuestionIndex,
                                    "short_text",
                                    e.target.value
                                )
                            }
                            className="text-input"
                        />
                    </label>

                    <label className="field-label">
                        <b>Question Text (Markdown):</b>
                        <textarea
                            style={{
                                resize: "none",
                                overflowY: "auto",
                                width: "100%",
                                fontFamily: "monospace",
                            }}
                            rows={10}
                            value={currentQuestion.question_text || ""}
                            onChange={(e) =>
                                updateQuestionField(
                                    selectedQuestionKey,
                                    currentQuestionIndex,
                                    "question_text",
                                    e.target.value
                                )
                            }
                            className="textarea-input"
                        />
                    </label>

                    <div className="input-output-section">
                        <b>Input/Output Testcases:</b>
                        {currentQuestion.input_output &&
                            currentQuestion.input_output[0] &&
                            currentQuestion.input_output[0].input.map((ioItem, idx) => (
                                <div key={ioItem.t_id || idx} className="io-testcase">
                                    <label className="field-label">
                                        Input:
                                        <textarea
                                            rows={2}
                                            value={ioItem.input}
                                            onChange={(e) =>
                                                updateInputOutputField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "input",
                                                    e.target.value
                                                )
                                            }
                                            className="textarea-input"
                                        />
                                    </label>
                                    <label className="field-label">
                                        Output:
                                        <textarea
                                            rows={2}
                                            value={ioItem.output}
                                            onChange={(e) =>
                                                updateInputOutputField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "output",
                                                    e.target.value
                                                )
                                            }
                                            className="textarea-input"
                                        />
                                    </label>
                                </div>
                            ))}
                    </div>

                    <b>Solution Code Details:</b>
                    <div className="section code-details-section">
                        {currentQuestion.solutions &&
                            currentQuestion.solutions[0]?.code_details?.map((detail, idx) => (
                                <div key={idx} className="code-detail-item">
                                    <label>
                                        Language:
                                        <input
                                            type="text"
                                            value={detail.language || ""}
                                            onChange={(e) =>
                                                updateCodeDetailsField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "language",
                                                    e.target.value
                                                )
                                            }
                                            className="input-field"
                                        />
                                    </label>
                                    <label>
                                        Code Data:
                                        <textarea
                                            rows={6}
                                            value={detail.code_content || detail.code_data || ""}
                                            onChange={(e) =>
                                                updateCodeDetailsField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "code_content",
                                                    e.target.value
                                                )
                                            }
                                            className="textarea-field"
                                        />
                                    </label>
                                </div>
                            ))}
                    </div>

                    <div className="code-metadata-section">
                        <b>Code Metadata:</b>
                        {currentQuestion.code_metadata &&
                            currentQuestion.code_metadata.map((meta, idx) => (
                                <div key={idx} className="metadata-item">
                                    <label className="field-label">
                                        Language:
                                        <input
                                            type="text"
                                            value={meta.language}
                                            onChange={(e) =>
                                                updateCodeMetadataField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "language",
                                                    e.target.value
                                                )
                                            }
                                            className="text-input"
                                        />
                                    </label>
                                    <label className="field-label">
                                        Code Data:
                                        <textarea
                                            rows={6}
                                            value={meta.code_data}
                                            onChange={(e) =>
                                                updateCodeMetadataField(
                                                    selectedQuestionKey,
                                                    currentQuestionIndex,
                                                    idx,
                                                    "code_data",
                                                    e.target.value
                                                )
                                            }
                                            className="textarea-input"
                                        />
                                    </label>
                                </div>
                            ))}
                    </div>

                    {currentQuestion.language_code_repository_details &&
                        currentQuestion.language_code_repository_details.length > 0 ? (
                        <div className="code-repo-section">
                            <b>Language Code Repository Details:</b>
                            {currentQuestion.language_code_repository_details.map(
                                (repoMeta, metaIdx) => (
                                    <div key={metaIdx} className="repo-meta-item">
                                        <label className="field-label">
                                            Language:
                                            <input
                                                type="text"
                                                value={repoMeta.language}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setJsonResponse((prev) => {
                                                        const updated = { ...prev };
                                                        const questions = [...updated[selectedQuestionKey]];
                                                        const q = { ...questions[currentQuestionIndex] };
                                                        const repoDetails = [
                                                            ...(q.language_code_repository_details || []),
                                                        ];
                                                        const metaItem = { ...repoDetails[metaIdx] };
                                                        metaItem.language = val;
                                                        repoDetails[metaIdx] = metaItem;
                                                        q.language_code_repository_details = repoDetails;
                                                        questions[currentQuestionIndex] = q;
                                                        updated[selectedQuestionKey] = questions;
                                                        return updated;
                                                    });
                                                }}
                                                className="text-input"
                                            />
                                        </label>
                                        <div className="repo-files-container">
                                            {repoMeta.code_repository &&
                                                repoMeta.code_repository.map((file, fileIdx) => (
                                                    <div key={fileIdx} className="repo-file-item">
                                                        <label className="field-label">
                                                            File Name: <b>{file.file_name}</b>
                                                        </label>
                                                        <textarea
                                                            rows={6}
                                                            value={decodeBase64(file.file_content || "")}
                                                            onChange={(e) =>
                                                                updateCodeRepoField(
                                                                    selectedQuestionKey,
                                                                    currentQuestionIndex,
                                                                    metaIdx,
                                                                    fileIdx,
                                                                    "file_content",
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="textarea-input monospace-textarea"
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            <div className="btn-container">
                <button className="download-btn" onClick={handleDownloadZip}>
                    Download ZIP
                </button>
            </div>
        </>
    );
};

export default Coding;
