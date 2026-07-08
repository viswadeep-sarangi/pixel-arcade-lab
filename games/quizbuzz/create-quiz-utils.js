const REQUIRED_COLUMNS = ['question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_answer'];

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
    const option1 = String(row[columnIndexes.option_1] || '').trim();
    const option2 = String(row[columnIndexes.option_2] || '').trim();
    const option3 = String(row[columnIndexes.option_3] || '').trim();
    const option4 = String(row[columnIndexes.option_4] || '').trim();
    const correctAnswerText = String(row[columnIndexes.correct_answer] || '').trim();

    if (!question) {
      errors.push(`Row ${index + 2}: question text is required.`);
    }
    if (!option1) {
      errors.push(`Row ${index + 2}: option_1 is required.`);
    }
    if (!option2) {
      errors.push(`Row ${index + 2}: option_2 is required.`);
    }
    if (!option3) {
      errors.push(`Row ${index + 2}: option_3 is required.`);
    }
    if (!option4) {
      errors.push(`Row ${index + 2}: option_4 is required.`);
    }

    const correctAnswerNumber = Number(correctAnswerText);
    if (!Number.isInteger(correctAnswerNumber) || correctAnswerNumber < 0 || correctAnswerNumber > 3) {
      errors.push(`Row ${index + 2}: correct_answer must be an integer between 0 and 3.`);
    }

    if (!errors.length || errors[errors.length - 1].includes(`Row ${index + 2}`) === false) {
      normalizedRows.push({
        question,
        option_1: option1,
        option_2: option2,
        option_3: option3,
        option_4: option4,
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
    generateCategoryId
  };
}

export { REQUIRED_COLUMNS, parseCsvText, validateQuizCsv, generateCategoryId };
