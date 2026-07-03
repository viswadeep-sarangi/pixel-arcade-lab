// Host Dashboard Logic

let currentRoomId = null;
let currentCategory = null;
let quizStarted = false;
let hostId = null;
let quizQuestions = [];
let categoryAuthors = {};
let roomSubscription = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    populateCategorySelect();
});

function getSupabaseClient() {
    return window.supabaseClient || null;
}

function ensureSupabaseReady() {
    const client = getSupabaseClient();
    if (!client) {
        alert('Supabase is not configured. Please add your Supabase URL and anon key to config.local.js.');
        return false;
    }
    return true;
}

function normalizeRoomData(roomData) {
    if (!roomData) return null;
    return {
        ...roomData,
        hostId: roomData.host_id || roomData.hostId || null,
        category: roomData.category || '',
        status: roomData.status || 'waiting',
        currentQuestionIndex: roomData.current_question_index ?? roomData.currentQuestionIndex ?? 0,
        questionPhase: roomData.question_phase || roomData.questionPhase || 'waiting',
        createdAt: roomData.created_at || roomData.createdAt || null,
        startedAt: roomData.started_at || roomData.startedAt || null,
        endedAt: roomData.ended_at || roomData.endedAt || null,
        players: roomData.players || {}
    };
}

function getPlayersFromRoom(roomData) {
    const normalized = normalizeRoomData(roomData);
    return normalized ? normalized.players || {} : {};
}

/**
 * Populate category select with topic and author from questions.json
 */
function populateCategorySelect() {
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('categorySelect');
            if (!select) return;
            select.innerHTML = '<option value="">-- Choose a Category --</option>';
            const cats = data.categories || [];
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.topic;
                opt.textContent = `${cat.topic} by ${cat.author || 'Unknown'}`;
                select.appendChild(opt);
                categoryAuthors[cat.topic] = cat.author || '';
            });
        })
        .catch(err => {
            console.error('Error loading categories:', err);
        });
}

/**
 * Create a new quiz room
 */
async function createRoom() {
    if (!ensureSupabaseReady()) return;

    const category = document.getElementById('categorySelect').value;

    if (!category) {
        alert('Please select a category');
        return;
    }

    currentRoomId = 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    currentCategory = category;
    quizStarted = false;

    const roomData = {
        id: currentRoomId,
        host_id: hostId,
        category: category,
        status: 'waiting',
        current_question_index: 0,
        question_phase: 'waiting',
        created_at: new Date().toISOString(),
        players: {}
    };

    const { error } = await getSupabaseClient().from('quiz_rooms').upsert(roomData, { onConflict: 'id' });
    if (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
        return;
    }

    console.log('Room created successfully');
    showRoomInfo();
    listenForRoomUpdates();
}

/**
 * Show room information
 */
function showRoomInfo() {
    document.getElementById('creationSection').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';
    document.getElementById('playersSection').style.display = 'block';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('roomIdDisplay').textContent = currentRoomId;
    const author = categoryAuthors[currentCategory] || '';
    document.getElementById('categoryDisplay').textContent = author ? `${currentCategory} by ${author}` : currentCategory;
}

/**
 * Listen for room updates including players and quiz state
 */
async function listenForRoomUpdates() {
    if (roomSubscription) {
        getSupabaseClient().removeChannel(roomSubscription);
        roomSubscription = null;
    }

    const client = getSupabaseClient();
    if (!client) return;

    roomSubscription = client.channel(`room:${currentRoomId}`);
    roomSubscription.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quiz_rooms',
        filter: `id=eq.${currentRoomId}`
    }, (payload) => {
        const roomData = normalizeRoomData(payload.new || payload.old || {});
        if (!roomData) {
            updatePlayersList({});
            updateRoomUI({ status: 'waiting' }, {});
            return;
        }
        const players = getPlayersFromRoom(roomData);
        updatePlayersList(players);
        updateRoomUI(roomData, players);
    });

    roomSubscription.subscribe();

    const { data, error } = await client.from('quiz_rooms').select('*').eq('id', currentRoomId).maybeSingle();
    if (error) {
        console.error('Error loading room data:', error);
        return;
    }

    const roomData = normalizeRoomData(data);
    if (!roomData) return;
    const players = getPlayersFromRoom(roomData);
    updatePlayersList(players);
    updateRoomUI(roomData, players);
}

/**
 * Update players list in UI
 */
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    const playerIds = Object.keys(players);

    if (playerIds.length === 0) {
        playersList.innerHTML = '<div class="no-players">Waiting for players to join...</div>';
        document.getElementById('startButton').disabled = true;
    } else {
        let html = '';
        playerIds.forEach((playerId) => {
            const player = players[playerId];
            const completedQuestions = player.completedQuestions || 0;
            html += `
                <div class="player-item">
                    <div class="player-name">
                        <span class="status-indicator ${player.hasSubmitted ? 'status-completed' : 'status-waiting'}"></span>
                        ${player.name}
                    </div>
                    <div class="player-progress">
                        Questions Completed: ${completedQuestions}/${quizQuestions.length || 5}
                    </div>
                </div>
            `;
        });
        playersList.innerHTML = html;
        document.getElementById('startButton').disabled = false;
    }
}

/**
 * Update host UI based on room state
 */
function updateRoomUI(roomData, players) {
    const quizSection = document.getElementById('quizSection');
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');

    if (!roomData || roomData.status !== 'started') {
        quizSection.style.display = 'none';
        startButton.disabled = Object.keys(players).length === 0;
        endButton.disabled = true;
        return;
    }

    quizSection.style.display = 'block';
    startButton.disabled = true;
    endButton.disabled = false;

    if (quizQuestions.length === 0) {
        loadQuestionsForHost(roomData.category).then(() => {
            renderHostQuestion(roomData, players);
        });
        return;
    }

    renderHostQuestion(roomData, players);
}

/**
 * Load questions for the host
 */
function loadQuestionsForHost(category) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const categoryData = data.categories.find(cat => cat.topic === category);
            if (categoryData) {
                quizQuestions = categoryData.questions;
            } else {
                quizQuestions = [];
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            quizQuestions = [];
        });
}

/**
 * Render host question and player answer status
 */
function renderHostQuestion(roomData, players) {
    const currentIndex = roomData.currentQuestionIndex || 0;
    const phase = roomData.questionPhase || 'waiting';
    const question = quizQuestions[currentIndex];
    const hostQuestionText = document.getElementById('hostQuestionText');
    const hostOptionsGrid = document.getElementById('hostOptionsGrid');
    const hostPlayersTop = document.getElementById('hostPlayersTop');
    const hostSubmitStatus = document.getElementById('hostSubmitStatus');
    const completeBtn = document.getElementById('completeQuestionButton');
    const revealBtn = document.getElementById('revealAnswerButton');
    const nextBtn = document.getElementById('nextQuestionButton');

    if (!question) {
        hostQuestionText.textContent = 'No questions loaded yet.';
        hostOptionsGrid.innerHTML = '';
        hostPlayersTop.innerHTML = '';
        hostSubmitStatus.textContent = '';
        hostSubmitStatus.classList.remove('all-answered');
        return;
    }

    hostQuestionText.textContent = `Q${currentIndex + 1}: ${question.question}`;

    const optionHtml = question.options.map((option, index) => {
        const isCorrect = roomData.questionPhase === 'revealed' && question.correctAnswer === index;
        const classes = ['host-option-tile'];
        if (isCorrect) classes.push('correct');
        return `
            <div class="${classes.join(' ')}" id="hostOption${index}">
                <div class="host-option-title">${String.fromCharCode(65 + index)}. ${option}</div>
                <div class="host-option-players" id="hostOptionPlayers${index}"></div>
            </div>
        `;
    }).join('');

    hostOptionsGrid.innerHTML = optionHtml;

    const playerIds = Object.keys(players);
    const submittedCount = playerIds.filter((id) => players[id].hasSubmitted).length;
    const allAnswered = playerIds.length > 0 && submittedCount === playerIds.length;

    hostPlayersTop.innerHTML = playerIds.map((playerId) => {
        const player = players[playerId];
        return `<div class="host-player-chip ${player.hasSubmitted ? 'submitted' : ''}"><span class="tick"></span>${escapeHtml(player.name)}</div>`;
    }).join('');

    completeBtn.disabled = !(allAnswered && phase === 'open');
    revealBtn.disabled = phase !== 'complete';

    const lastQuestion = currentIndex >= quizQuestions.length - 1;
    nextBtn.disabled = phase !== 'revealed';
    nextBtn.textContent = lastQuestion ? 'Finish Quiz' : 'Next Question';

    if (phase !== 'open') {
        document.querySelectorAll('.host-option-players').forEach((container) => {
            container.innerHTML = '';
        });
        Object.values(players).forEach((player) => {
            if (typeof player.currentAnswer === 'number') {
                const target = document.getElementById(`hostOptionPlayers${player.currentAnswer}`);
                if (target) {
                    const chip = document.createElement('span');
                    chip.className = 'host-vote-chip';
                    chip.textContent = player.name;
                    target.appendChild(chip);
                }
            }
        });
    }

    hostSubmitStatus.classList.toggle('all-answered', phase === 'open' && allAnswered);
    if (phase === 'open') {
        hostSubmitStatus.textContent = allAnswered
            ? 'All players have answered. Complete the question when you are ready.'
            : `Waiting for players to submit their answers. ${submittedCount}/${playerIds.length} submitted.`;
    } else if (phase === 'complete') {
        hostSubmitStatus.textContent = 'Answers are locked in. Reveal the correct answer when ready.';
    } else if (phase === 'revealed') {
        hostSubmitStatus.textContent = 'Answer revealed. Click Next Question to continue.';
    }
}

/**
 * Start the quiz
 */
async function startQuiz() {
    if (!currentRoomId) {
        alert('No room created');
        return;
    }

    if (!currentCategory) {
        alert('Missing category');
        return;
    }

    await loadQuestionsForHost(currentCategory);
    if (!quizQuestions.length) {
        alert('Could not load questions for this category.');
        return;
    }

    const { error } = await getSupabaseClient().from('quiz_rooms').update({
        status: 'started',
        started_at: new Date().toISOString(),
        current_question_index: 0,
        question_phase: 'open'
    }).eq('id', currentRoomId);

    if (error) {
        console.error('Error starting quiz:', error);
        return;
    }

    console.log('Quiz started');
    document.getElementById('startButton').disabled = true;
    document.getElementById('endButton').disabled = false;
}

/**
 * Complete the current question by moving player cards to options
 */
async function completeQuestion() {
    if (!currentRoomId) return;
    const { error } = await getSupabaseClient().from('quiz_rooms').update({
        question_phase: 'complete'
    }).eq('id', currentRoomId);

    if (error) console.error('Error completing question:', error);
}

/**
 * Reveal the correct answer
 */
async function revealAnswer() {
    if (!currentRoomId) return;

    const client = getSupabaseClient();
    const { data: roomRow, error: readError } = await client.from('quiz_rooms').select('*').eq('id', currentRoomId).maybeSingle();
    if (readError) {
        console.error('Error fetching room data for reveal:', readError);
        return;
    }

    const roomData = normalizeRoomData(roomRow);
    const currentIndex = (roomData && roomData.currentQuestionIndex) || 0;
    const category = (roomData && roomData.category) || currentCategory;

    await loadQuestionsForHost(category);

    const question = quizQuestions[currentIndex];
    const correctAnswerIndex = question ? question.correctAnswer : null;

    const players = getPlayersFromRoom(roomData);
    const nextPlayers = { ...players };

    Object.keys(players).forEach((playerId) => {
        const p = players[playerId] || {};
        const alreadyScored = p.scores && (p.scores[currentIndex] !== undefined);
        if (!alreadyScored) {
            const isCorrect = typeof p.currentAnswer === 'number' && p.currentAnswer === correctAnswerIndex;
            nextPlayers[playerId] = {
                ...p,
                scores: {
                    ...(p.scores || {}),
                    [currentIndex]: isCorrect ? 1 : 0
                },
                score: (p.score || 0) + (isCorrect ? 1 : 0)
            };
        }
    });

    const { error } = await client.from('quiz_rooms').update({
        question_phase: 'revealed',
        players: nextPlayers
    }).eq('id', currentRoomId);

    if (error) console.error('Error revealing answer:', error);
}

/**
 * Advance to the next question or finish quiz
 */
async function nextQuestion() {
    if (!currentRoomId) return;

    const client = getSupabaseClient();
    const { data: roomRow, error } = await client.from('quiz_rooms').select('*').eq('id', currentRoomId).maybeSingle();
    if (error || !roomRow) {
        console.error('Error loading room data for next question:', error);
        return;
    }

    const roomData = normalizeRoomData(roomRow);
    const nextIndex = (roomData.currentQuestionIndex || 0) + 1;
    const isLastQuestion = nextIndex >= quizQuestions.length;

    if (isLastQuestion) {
        endSession();
        return;
    }

    const nextPlayers = { ...(roomData.players || {}) };
    Object.keys(nextPlayers).forEach((playerId) => {
        nextPlayers[playerId] = {
            ...nextPlayers[playerId],
            hasSubmitted: false,
            currentAnswer: null
        };
    });

    const { updateError } = await client.from('quiz_rooms').update({
        current_question_index: nextIndex,
        question_phase: 'open',
        players: nextPlayers
    }).eq('id', currentRoomId);

    if (updateError) console.error('Error advancing question:', updateError);
}

/**
 * End the quiz session
 */
async function endSession() {
    if (!currentRoomId) {
        alert('No room to end');
        return;
    }

    const { error } = await getSupabaseClient().from('quiz_rooms').update({
        status: 'ended',
        ended_at: new Date().toISOString()
    }).eq('id', currentRoomId);

    if (error) {
        console.error('Error ending quiz:', error);
        return;
    }

    console.log('Quiz ended');
    displayResults();
}

/**
 * Display quiz results and answers
 */
function displayResults() {
    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    loadQuestionsForReview();
}

/**
 * Load questions for review
 */
function loadQuestionsForReview() {
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const categoryData = data.categories.find(cat => cat.topic === currentCategory);
            if (categoryData) {
                displayQuestionsReview(categoryData.questions);
            }
        })
        .catch(error => console.error('Error loading questions:', error));
}

/**
 * Display questions review
 */
function displayQuestionsReview(questions) {
    let html = '';

    questions.forEach((question, index) => {
        html += `
            <div class="question-review">
                <div class="question-text">Q${index + 1}: ${question.question}</div>
                <div class="answer-options">
                    ${question.options.map((option, optIndex) => `
                        <div class="answer-option ${optIndex === question.correctAnswer ? 'correct-answer' : ''}">
                            ${String.fromCharCode(65 + optIndex)}. ${option}
                            ${optIndex === question.correctAnswer ? ' ✓ (Correct)' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    document.getElementById('resultsContent').innerHTML = html;
}

/**
 * Reset the room to create a new one
 */
async function resetRoom() {
    if (!currentRoomId) {
        currentRoomId = null;
        currentCategory = null;
        quizStarted = false;
        quizQuestions = [];

        document.getElementById('creationSection').style.display = 'block';
        document.getElementById('roomInfo').style.display = 'none';
        document.getElementById('playersSection').style.display = 'none';
        document.getElementById('quizSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('categorySelect').value = '';
        document.getElementById('playersList').innerHTML = '<div class="no-players">Waiting for players to join...</div>';
        return;
    }

    const { error } = await getSupabaseClient().from('quiz_rooms').delete().eq('id', currentRoomId);
    if (error) console.error('Error resetting room:', error);

    currentRoomId = null;
    currentCategory = null;
    quizStarted = false;
    quizQuestions = [];

    document.getElementById('creationSection').style.display = 'block';
    document.getElementById('roomInfo').style.display = 'none';
    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('categorySelect').value = '';
    document.getElementById('playersList').innerHTML = '<div class="no-players">Waiting for players to join...</div>';
}

/**
 * Go back to main page
 */
function goBack() {
    if (currentRoomId && !confirm('Are you sure you want to leave?')) {
        return;
    }

    window.location.href = 'index.html';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
