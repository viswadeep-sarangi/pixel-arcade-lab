// Player Logic

let currentRoomId = null;
let playerId = null;
let playerName = null;
let currentQuestionIndex = 0;
let selectedAnswer = null;
let playerAnswers = {};
let quizQuestions = [];
let quizStarted = false;
let currentRoomData = null;
let roomSubscription = null;

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
 * Join a quiz room
 */
async function joinRoom() {
    const roomId = document.getElementById('roomId').value.trim().toUpperCase();
    const name = document.getElementById('playerName').value.trim();

    if (!roomId || !name) {
        alert('Please enter both Room ID and your name');
        return;
    }

    if (!/^[A-Z]+$/.test(name)) {
        alert('Name must contain only uppercase letters A-Z (no numbers or lowercase)');
        return;
    }

    if (!ensureSupabaseReady()) return;

    currentRoomId = roomId;
    playerName = name;
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const client = getSupabaseClient();
    const { data: roomRow, error } = await client.from('quiz_rooms').select('*').eq('id', roomId).maybeSingle();
    if (error || !roomRow) {
        console.error('Error joining room:', error);
        alert('Room not found. Please check the Room ID.');
        return;
    }

    const playerData = {
        name: playerName,
        joinedAt: new Date().toISOString(),
        completedQuestions: 0,
        currentAnswer: null,
        hasSubmitted: false,
        answers: {},
        score: 0,
        scores: {}
    };

    const players = getPlayersFromRoom(roomRow);
    const nextPlayers = {
        ...players,
        [playerId]: playerData
    };

    const { updateError } = await client.from('quiz_rooms').update({ players: nextPlayers }).eq('id', roomId);
    if (updateError) {
        console.error('Error joining room:', updateError);
        alert('Error joining room. Please try again.');
        return;
    }

    showWaitingScreen();
    listenForRoomUpdates();
}

/**
 * Show waiting screen
 */
function showWaitingScreen() {
    document.getElementById('joinScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomId;
    document.getElementById('displayPlayerName').textContent = playerName;
}

/**
 * Listen for room updates from host
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
        if (!roomData) return;
        handleRoomUpdate(roomData);
    });

    roomSubscription.subscribe();

    const { data, error } = await client.from('quiz_rooms').select('*').eq('id', currentRoomId).maybeSingle();
    if (error || !data) {
        console.error('Error loading room data:', error);
        return;
    }

    handleRoomUpdate(normalizeRoomData(data));
}

function handleRoomUpdate(roomData) {
    if (!roomData) return;

    const previousPhase = currentRoomData?.questionPhase;
    currentRoomData = roomData;

    if (roomData.status === 'started') {
        if (!quizStarted) {
            quizStarted = true;
            loadQuizQuestions(roomData.category).then(() => {
                currentQuestionIndex = roomData.currentQuestionIndex || 0;
                showQuizScreen();
            });
        } else {
            const newIndex = roomData.currentQuestionIndex || 0;
            const newPhase = roomData.questionPhase || 'open';
            const indexChanged = newIndex !== currentQuestionIndex;
            const phaseChanged = newPhase !== previousPhase;
            if (indexChanged) {
                selectedAnswer = null;
            }
            currentQuestionIndex = newIndex;
            if (indexChanged || phaseChanged) {
                displayCurrentQuestion();
            }
        }
    }

    if (roomData.status === 'ended') {
        showEndScreen();
    }
}

/**
 * Load quiz questions for the category
 */
function loadQuizQuestions(category = null) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const selectedCategory = category || 'Geography';
            const categoryData = data.categories.find(cat => cat.topic === selectedCategory);
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
 * Show quiz screen
 */
function showQuizScreen() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    displayCurrentQuestion();
}

/**
 * Display current question and submission state
 */
function displayCurrentQuestion() {
    if (!currentRoomData || currentRoomData.status !== 'started') {
        return;
    }

    const question = quizQuestions[currentQuestionIndex];
    if (!question) {
        document.getElementById('questionNumber').textContent = '';
        document.getElementById('questionText').textContent = 'Waiting for the host to continue...';
        document.getElementById('optionsContainer').innerHTML = '';
        document.getElementById('submitButton').disabled = true;
        document.getElementById('playerStatusText').style.display = 'block';
        document.getElementById('playerStatusText').textContent = 'No active question yet.';
        return;
    }

    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    const playerData = currentRoomData.players?.[playerId] || {};
    const hasSubmitted = playerData.hasSubmitted;
    const currentAnswer = typeof playerData.currentAnswer === 'number' ? playerData.currentAnswer : null;
    selectedAnswer = currentAnswer;

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = String.fromCharCode(65 + index) + '. ' + option;

        const phase = currentRoomData.questionPhase || 'open';
        const isSelected = index === currentAnswer;
        const shouldShowSelection = !hasSubmitted && phase === 'open' && isSelected;
        if (shouldShowSelection) button.classList.add('selected');

        if (phase !== 'open' || hasSubmitted) {
            button.disabled = true;
        } else {
            button.onclick = () => selectAnswer(index);
        }

        if (phase === 'revealed' && question.correctAnswer === index) {
            button.style.background = '#d4edda';
            button.style.borderColor = '#28a745';
            button.style.color = '#1f3d2d';
        }

        optionsContainer.appendChild(button);
    });

    const submitButton = document.getElementById('submitButton');
    const statusText = document.getElementById('playerStatusText');
    const phase = currentRoomData.questionPhase || 'open';

    if (phase === 'open') {
        if (hasSubmitted) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitted – waiting for host';
            statusText.textContent = 'Answer submitted. Please wait for the host to complete the question.';
        } else {
            submitButton.disabled = selectedAnswer === null;
            submitButton.textContent = 'Submit Answer';
            statusText.textContent = selectedAnswer === null ? 'Choose an option to submit.' : 'Ready to submit your answer.';
        }
    } else if (phase === 'complete') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for reveal';
        statusText.textContent = 'The host is moving answers to options. Please wait.';
    } else if (phase === 'revealed') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for next question';
        statusText.textContent = 'Correct answer revealed. The next question will begin soon.';
    }

    statusText.style.display = 'block';
}

/**
 * Select an answer option
 */
function selectAnswer(optionIndex) {
    const playerData = currentRoomData.players?.[playerId] || {};
    if (playerData.hasSubmitted || currentRoomData.questionPhase !== 'open') {
        return;
    }

    selectedAnswer = optionIndex;
    playerAnswers[currentQuestionIndex] = optionIndex;

    const options = document.querySelectorAll('.option-button');
    options.forEach((btn, index) => {
        btn.classList.toggle('selected', index === optionIndex);
    });

    document.getElementById('submitButton').disabled = false;
}

/**
 * Submit answer to Supabase
 */
async function submitAnswer() {
    if (selectedAnswer === null) {
        alert('Please select an answer');
        return;
    }

    const nextPlayers = { ...(currentRoomData?.players || {}) };
    const currentPlayer = nextPlayers[playerId] || {};

    nextPlayers[playerId] = {
        ...currentPlayer,
        currentAnswer: selectedAnswer,
        hasSubmitted: true,
        answers: {
            ...(currentPlayer.answers || {}),
            [currentQuestionIndex]: selectedAnswer
        },
        completedQuestions: currentQuestionIndex + 1
    };

    const { error } = await getSupabaseClient().from('quiz_rooms').update({ players: nextPlayers }).eq('id', currentRoomId);
    if (error) {
        console.error('Error submitting answer:', error);
        return;
    }

    const submittedAnswer = selectedAnswer;
    selectedAnswer = null;
    playerAnswers[currentQuestionIndex] = submittedAnswer;
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach((btn) => btn.classList.remove('selected'));
    displayCurrentQuestion();
}

/**
 * Show end screen when quiz is finished
 */
function showEndScreen() {
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    document.getElementById('resultsMessage').textContent = 'Quiz completed! Waiting for host review...';
}

/**
 * Go back to main page
 */
async function goBack() {
    if (currentRoomId && playerId) {
        const nextPlayers = { ...(currentRoomData?.players || {}) };
        delete nextPlayers[playerId];
        await getSupabaseClient().from('quiz_rooms').update({ players: nextPlayers }).eq('id', currentRoomId);
    }

    window.location.href = 'index.html';
}
