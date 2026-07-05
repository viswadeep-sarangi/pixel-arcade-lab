// Player Logic

let currentRoomId = null;
let playerId = null;
let playerName = null;
let currentQuestionIndex = 0;
let selectedAnswer = null;
let quizQuestions = [];
let quizStarted = false;
let currentRoomData = null;
let currentPlayers = {};
let roomSubscription = null;

function getSupabaseClient() {
    return window.supabaseClient || null;
}

function getQuizbuzzClient() {
    const client = getSupabaseClient();
    return client ? client.schema('quizbuzz') : null;
}

function ensureSupabaseReady() {
    const client = getSupabaseClient();
    if (!client) {
        alert('Player: Supabase is not configured. Please add your Supabase URL and anon key to config.local.js.');
        return false;
    }
    return true;
}

function normalizeRoomData(roomData) {
    if (!roomData) return null;
    return {
        roomId: roomData.room_id || roomData.roomId || null,
        hostId: roomData.host_id || roomData.hostId || null,
        category: roomData.category || '',
        status: roomData.status || 'waiting',
        currentQuestionIndex: roomData.current_question_index ?? roomData.currentQuestionIndex ?? 0,
        questionPhase: roomData.question_phase || roomData.questionPhase || 'waiting',
        createdAt: roomData.created_at || roomData.createdAt || null,
        startedAt: roomData.started_at || roomData.startedAt || null,
        endedAt: roomData.ended_at || roomData.endedAt || null
    };
}

function normalizePlayerRow(row) {
    return {
        playerId: row.player_id,
        roomId: row.room_id,
        name: row.name,
        joinedAt: row.joined_at || null,
        score: Number(row.score || 0),
        completedQuestions: Number(row.completed_questions || 0),
        hasSubmitted: Boolean(row.has_submitted),
        currentAnswer: row.current_answer !== null && row.current_answer !== undefined ? Number(row.current_answer) : null
    };
}

function mapPlayerRows(rows) {
    const players = {};
    (rows || []).forEach((row) => {
        if (!row || !row.player_id) return;
        players[row.player_id] = normalizePlayerRow(row);
    });
    return players;
}

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

    if (!ensureSupabaseReady()){
        console.log('player.js > joinRoom(): Supabase client is not ready. Cannot join room.');
        return;
    }

    currentRoomId = roomId;
    playerName = name;
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const client = getQuizbuzzClient();
    if (!client) return;

    console.log('player.js > joinRoom(): Attempting to join room with ID:', currentRoomId, 'as player:', playerName, 'with player ID:', playerId);

    const { data: roomRow, error } = await client.from('quiz_rooms').select('*').eq('room_id', roomId).maybeSingle();
    if (error || !roomRow) {
        console.error('Error joining room:', error);
        console.log('player.js > joinRoom(): Room not found for ID:', roomId,'\n', roomRow);
        alert('Room not found. Please check the Room ID.');
        return;
    }

    console.log('player.js > joinRoom(): Found room for ID:', roomId, '\n', roomRow);

    const playerData = {
        player_id: playerId,
        room_id: roomId,
        name: playerName,
        joined_at: new Date().toISOString(),
        score: 0,
        completed_questions: 0,
        has_submitted: false,
        current_answer: null
    };

    console.log('player.js > joinRoom(): Attempting to upsert player data:', playerData);

    const { error: playerError } = await client.from('quiz_players').upsert(playerData, { onConflict: 'player_id, room_id' });
    if (playerError) {
        console.error('Error joining room:', playerError);
        alert('Error joining room. Please try again.');
        return;
    }

    console.log('player.js > joinRoom(): Successfully joined room with ID:', currentRoomId, 'as player:', playerName, 'with player ID:', playerId);

    showWaitingScreen();
    await listenForRoomUpdates();
}

function showWaitingScreen() {
    document.getElementById('joinScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomId;
    document.getElementById('displayPlayerName').textContent = playerName;
}

async function listenForRoomUpdates() {
    if (!currentRoomId) return;

    const client = getSupabaseClient();
    if (!client) return;

    if (roomSubscription) {
        client.removeChannel(roomSubscription);
        roomSubscription = null;
    }

    roomSubscription = client.channel(`room:${currentRoomId}`);

    roomSubscription.on('postgres_changes', {
        event: '*',
        schema: 'quizbuzz',
        table: 'quiz_rooms',
        filter: `room_id=eq.${currentRoomId}`
    }, async () => {
        await refreshRoomState();
    });

    roomSubscription.on('postgres_changes', {
        event: '*',
        schema: 'quizbuzz',
        table: 'quiz_players',
        filter: `room_id=eq.${currentRoomId}`
    }, async () => {
        await refreshRoomState();
    });

    roomSubscription.subscribe();
    await refreshRoomState();
}

async function refreshRoomState() {
    const client = getQuizbuzzClient();
    if (!client) return;

    const [{ data: roomRow, error: roomError }, { data: playerRows, error: playerError }] = await Promise.all([
        client.from('quiz_rooms').select('*').eq('room_id', currentRoomId).maybeSingle(),
        client.from('quiz_players').select('*').eq('room_id', currentRoomId)
    ]);

    if (roomError) {
        console.error('Error loading room data:', roomError,'\n', roomRow);
        return;
    }
    if (playerError) {
        console.error('Error loading player data:', playerError,'\n', playerRows);
        return;
    }

    currentRoomData = normalizeRoomData(roomRow);
    currentPlayers = mapPlayerRows(playerRows || []);

    if (currentRoomData.status === 'started' && !quizStarted) {
        quizStarted = true;
        await loadQuizQuestions(currentRoomData.category);
        currentQuestionIndex = currentRoomData.currentQuestionIndex || 0;
        showQuizScreen();
        return;
    }

    if (currentRoomData.status === 'started') {
        const newIndex = currentRoomData.currentQuestionIndex || 0;
        if (newIndex !== currentQuestionIndex) {
            selectedAnswer = null;
            currentQuestionIndex = newIndex;
        }
        if (quizStarted) {
            displayCurrentQuestion();
        }
        return;
    }

    if (currentRoomData.status === 'ended') {
        showEndScreen();
        return;
    }
}

function loadQuizQuestions(category = null) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const selectedCategory = category || 'Geography';
            const categoryData = data.categories.find(cat => cat.topic === selectedCategory);
            quizQuestions = categoryData ? categoryData.questions : [];
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            quizQuestions = [];
        });
}

function showQuizScreen() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    if (!currentRoomData || currentRoomData.status !== 'started') {
        return;
    }

    const question = quizQuestions[currentQuestionIndex];
    const submitButton = document.getElementById('submitButton');
    const playerData = currentPlayers[playerId] || {};
    const hasSubmitted = playerData.hasSubmitted;
    const currentAnswer = typeof playerData.currentAnswer === 'number' ? playerData.currentAnswer : null;
    selectedAnswer = currentAnswer;

    if (!question) {
        document.getElementById('questionNumber').textContent = '';
        document.getElementById('questionText').textContent = 'Waiting for the host to continue...';
        document.getElementById('optionsContainer').innerHTML = '';
        submitButton.disabled = true;
        document.getElementById('playerStatusText').style.display = 'block';
        document.getElementById('playerStatusText').textContent = 'No active question yet.';
        return;
    }

    const phase = currentRoomData.questionPhase || 'open';
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = String.fromCharCode(65 + index) + '. ' + option;

        const isSelected = index === currentAnswer;
        if (isSelected) button.classList.add('selected');

        if (phase !== 'open' || hasSubmitted) {
            button.disabled = true;
        } else {
            button.onclick = () => selectAnswer(index);
        }

        optionsContainer.appendChild(button);
    });

    if (phase === 'open') {
        submitButton.disabled = hasSubmitted || selectedAnswer === null;
        submitButton.textContent = hasSubmitted ? 'Submitted – waiting for host' : 'Submit Answer';
        document.getElementById('playerStatusText').textContent = hasSubmitted ? 'Answer submitted. Waiting for host.' : 'Select an answer and submit.';
    } else if (phase === 'complete') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for reveal';
        document.getElementById('playerStatusText').textContent = 'Answers are locked. Waiting for the host to reveal.';
    } else if (phase === 'revealed') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for next question';
        document.getElementById('playerStatusText').textContent = 'Correct answer revealed. Waiting for next question.';
    }
}

function selectAnswer(optionIndex) {
    const playerData = currentPlayers[playerId] || {};
    if (playerData.hasSubmitted || currentRoomData.questionPhase !== 'open') {
        return;
    }

    selectedAnswer = optionIndex;
    currentQuestionIndex = currentRoomData.currentQuestionIndex || 0;

    const options = document.querySelectorAll('.option-button');
    options.forEach((btn, index) => {
        btn.classList.toggle('selected', index === optionIndex);
    });

    document.getElementById('submitButton').disabled = false;
}

async function submitAnswer() {
    if (selectedAnswer === null) {
        alert('Please select an answer');
        return;
    }

    const playerUpdate = {
        player_id: playerId,
        room_id: currentRoomId,
        has_submitted: true,
        current_answer: selectedAnswer,
        completed_questions: currentQuestionIndex + 1
    };

    const client = getQuizbuzzClient();
    if (!client) return;

    const { error } = await client.from('quiz_players').upsert(playerUpdate, { onConflict: 'player_id, room_id' });
    if (error) {
        console.error('Error submitting answer:', error);
        return;
    }

    selectedAnswer = null;
    displayCurrentQuestion();
}

function showEndScreen() {
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    document.getElementById('resultsMessage').textContent = 'Quiz completed! Waiting for host review...';
}

async function goBack() {
    if (currentRoomId && playerId) {
        const client = getQuizbuzzClient();
        if (client) {
            await client.from('quiz_players').delete().eq('player_id', playerId);
        }
    }
    window.location.href = 'index.html';
}
