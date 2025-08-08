import { v4 as uuidv4 } from 'uuid';

const DownloadCSVButton = ({ questionJSONs, technology, disabled, topicTag }) => {
    const escapeCSV = (value) => {
        if (value === undefined || value === null) return '';
        const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
        return `"${stringVal.replace(/"/g, '""')}"`;
    };

    const downloadCSV = () => {
        const csvRows = [];

        const header = [
            'question_id',
            'question_type',
            'short_text',
            'question_text',
            'question_key',
            'content_type',
            'multimedia_count',
            'multimedia_format',
            'multimedia_url',
            'thumbnail_url',
            'tag_names',
            'c_options',
            'w_options',
            'options_content_type',
            'code_data',
            'code_language',
            'explanation',
            'explanation_content_type',
            'toughness'
        ].join(',');

        csvRows.push(header);

        questionJSONs.forEach((q, index) => {
            const parsed = typeof q === 'string' ? JSON.parse(q) : q;

            const {
                question_text,
                code_data,
                options,
                difficulty_level,
                answer_explanation_content,
                tags
            } = parsed;

            const question_id = uuidv4();
            const question_type = 'CODE_ANALYSIS_MULTIPLE_CHOICE';
            const short_text = '';
            const question_key = index;

            const content_type = 'HTML';
            const multimedia_count = 0;
            const multimedia_format = '';
            const multimedia_url = '';
            const thumbnail_url = '';
            const tag_names = [
                'POOL_1',
                `DIFFICULTY_${(difficulty_level || '').toUpperCase()}`,
                'SOURCE_GPT',
                'IN_OFFLINE_EXAM',
                'NIAT',
                'IS_PUBLIC',
                question_id,
                ...tags
            ].filter(Boolean).join('\n');

            const options_content_type = 'MARKDOWN';
            const explanation_content_type = 'MARKDOWN';
            const code_language = technology;
            const toughness = difficulty_level;

            const c_options = [];
            const w_options = [];

            // Handle both array format (current) and object format (original)
            if (Array.isArray(options)) {
                // Handle array format: [{text: "option1", correctness: "TRUE"}, ...]
                options.forEach((option) => {
                    if (option.correctness === 'TRUE' || option.correctness === true) {
                        c_options.push(`OPTION : ${option.text}`);
                    } else {
                        w_options.push(`OPTION: ${option.text}`);
                    }
                });
            } else if (options && typeof options === 'object') {
                // Handle object format: {"option1": "TRUE", "option2": "FALSE", ...}
                Object.entries(options).forEach(([key, val]) => {
                    if (val === 'TRUE' || val === true) {
                        c_options.push(`OPTION : ${key}`);
                    } else {
                        w_options.push(`OPTION: ${key}`);
                    }
                });
            }

            const row = [
                question_id,
                question_type,
                escapeCSV(short_text),
                escapeCSV(question_text),
                question_key,
                content_type,
                multimedia_count,
                multimedia_format,
                multimedia_url,
                thumbnail_url,
                escapeCSV(tag_names),
                escapeCSV(c_options.join('\n')),
                escapeCSV(w_options.join('\n')),
                options_content_type,
                escapeCSV(code_data),
                escapeCSV(code_language),
                escapeCSV(answer_explanation_content),
                explanation_content_type,
                toughness
            ];

            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${technology}_${topicTag}_questions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <button
            className={`download-csv-btn ${disabled ? 'disabled' : ''}`}
            disabled={disabled}
            onClick={downloadCSV}
            style={{
                padding: '8px 16px',
                background: disabled ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease'
            }}
        >
            Download CSV
        </button>
    );
};

export default DownloadCSVButton;