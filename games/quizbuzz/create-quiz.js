import { validateQuizCsv, generateCategoryId } from './create-quiz-utils.js';

const form = document.getElementById('createQuizForm');
const topicInput = document.getElementById('topic');
const authorInput = document.getElementById('author');
const csvInput = document.getElementById('csvFile');
const fileNameDisplay = document.getElementById('fileName');
const statusMessage = document.getElementById('statusMessage');
const submitButton = form.querySelector('button[type="submit"]');
const downloadTemplateButton = document.getElementById('downloadTemplateButton');

let parsedQuestions = [];
let csvValidationError = '';

function setStatus(message, isError = false) {
  statusMessage.textContent = message || '';
  statusMessage.className = 'status-message';
  if (message) {
    statusMessage.classList.add(isError ? 'error' : 'success');
  }
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Creating…' : 'Create Quiz';
}

if (downloadTemplateButton) {
  downloadTemplateButton.addEventListener('click', () => {
    const headers = 'question,option_a,option_b,option_c,option_d,correct_answer\n';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz_questions_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

csvInput.addEventListener('change', async (event) => {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) {
    fileNameDisplay.textContent = 'No file selected';
    parsedQuestions = [];
    csvValidationError = 'Please select a CSV file.';
    return;
  }

  fileNameDisplay.textContent = `Selected file: ${selectedFile.name}`;
  setStatus('Parsing CSV…');

  try {
    const csvText = await selectedFile.text();
    const validation = validateQuizCsv(csvText);

    if (!validation.valid) {
      parsedQuestions = [];
      csvValidationError = validation.errors[0];
      setStatus(csvValidationError, true);
      return;
    }

    parsedQuestions = validation.rows;
    csvValidationError = '';
    setStatus(`CSV ready: ${parsedQuestions.length} question(s) loaded.`);
  } catch (error) {
    parsedQuestions = [];
    csvValidationError = error.message || 'Unable to read the selected CSV file.';
    setStatus(csvValidationError, true);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();
  const author = authorInput.value.trim();

  if (!topic) {
    setStatus('Topic is required.', true);
    return;
  }

  if (!author) {
    setStatus('Author is required.', true);
    return;
  }

  if (!csvInput.files?.length) {
    setStatus('Please select a CSV file.', true);
    return;
  }

  if (!parsedQuestions.length || csvValidationError) {
    setStatus(csvValidationError || 'Please upload a valid CSV file.', true);
    return;
  }

  const client = window.supabaseClient;
  if (!client) {
    setStatus('Supabase is not configured. Please check your config.local.js file.', true);
    return;
  }

  setSubmitting(true);
  setStatus('Creating quiz category…');

  try {
    const categoryId = generateCategoryId();
    const quizbuzzClient = client.schema('quizbuzz');

    const { error: categoryError } = await quizbuzzClient
      .from('quiz_categories')
      .insert([{ category_id: categoryId, topic, author }]);

    if (categoryError) {
      throw categoryError;
    }

    const questionsToInsert = parsedQuestions.map((question) => ({
      category_id: categoryId,
      question: question.question,
      option_1: question.option_1,
      option_2: question.option_2,
      option_3: question.option_3,
      option_4: question.option_4,
      correct_answer: question.correct_answer
    }));

    const { error: questionsError } = await quizbuzzClient
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      throw questionsError;
    }

    setStatus(`Quiz created successfully with ID ${categoryId}.`);
    form.reset();
    fileNameDisplay.textContent = 'No file selected';
    parsedQuestions = [];
    csvValidationError = '';
  } catch (error) {
    const message = error?.message || 'Unable to create the quiz right now.';
    setStatus(message, true);
  } finally {
    setSubmitting(false);
  }
});
