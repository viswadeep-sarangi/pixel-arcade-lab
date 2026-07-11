const REQUIRED_COLUMNS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsvText(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      if (currentRow.some((cell) => String(cell).trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => String(cell).trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeCorrectAnswer(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'a') return 0;
  if (normalized === 'b') return 1;
  if (normalized === 'c') return 2;
  if (normalized === 'd') return 3;
  return null;
}

function validateQuizCsv(text) {
  const rows = parseCsvText(text);

  if (rows.length < 2) {
    return {
      valid: false,
      errors: ['The CSV file must include a header row and at least one question row.'],
      rows: []
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return {
      valid: false,
      errors: [`The CSV file is missing required columns: ${missingColumns.join(', ')}`],
      rows: []
    };
  }

  const normalizedRows = [];
  const errors = [];
  const columnIndexes = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, headers.indexOf(column)]));

  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => String(cell).trim() === '')) {
      return;
    }

    const question = String(row[columnIndexes.question] || '').trim();
    const optionA = String(row[columnIndexes.option_a] || '').trim();
    const optionB = String(row[columnIndexes.option_b] || '').trim();
    const optionC = String(row[columnIndexes.option_c] || '').trim();
    const optionD = String(row[columnIndexes.option_d] || '').trim();
    const correctAnswerText = String(row[columnIndexes.correct_answer] || '').trim();

    if (!question) {
      errors.push(`Row ${index + 2}: question text is required.`);
    }
    if (!optionA) {
      errors.push(`Row ${index + 2}: option_a is required.`);
    }
    if (!optionB) {
      errors.push(`Row ${index + 2}: option_b is required.`);
    }
    if (!optionC) {
      errors.push(`Row ${index + 2}: option_c is required.`);
    }
    if (!optionD) {
      errors.push(`Row ${index + 2}: option_d is required.`);
    }

    const correctAnswerNumber = normalizeCorrectAnswer(correctAnswerText);
    if (correctAnswerNumber === null) {
      errors.push(`Row ${index + 2}: correct_answer must be a single letter: A, B, C, or D.`);
    }

    if (!errors.length || errors[errors.length - 1].includes(`Row ${index + 2}`) === false) {
      normalizedRows.push({
        question,
        option_1: optionA,
        option_2: optionB,
        option_3: optionC,
        option_4: optionD,
        correct_answer: correctAnswerNumber
      });
    }
  });

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      rows: []
    };
  }

  return {
    valid: true,
    errors: [],
    rows: normalizedRows
  };
}

function generateCategoryId() {
  const randomPart = Math.random().toString(36).slice(2, 18);
  return `cat_${randomPart}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REQUIRED_COLUMNS,
    parseCsvText,
    validateQuizCsv,
    generateCategoryId,
    normalizeCorrectAnswer
  };
}

export { REQUIRED_COLUMNS, parseCsvText, validateQuizCsv, generateCategoryId, normalizeCorrectAnswer };
