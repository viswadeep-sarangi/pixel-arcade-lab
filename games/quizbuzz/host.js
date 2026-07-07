// Host Dashboard Logic

let currentRoomId = null;
let currentCategory = null;
let quizStarted = false;
let hostId = null;
let quizQuestions = [];
let categoryAuthors = {};
let roomSubscription = null;
let currentRoomData = null;
let currentPlayers = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('host.js: Host ID generated:', hostId);
    populateCategorySelect();
});

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
        alert('Host: Supabase is not configured. Please add your Supabase URL and anon key to config.local.js.');
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

async function createRoom() {
    if (!ensureSupabaseReady()){
        console.error('host.js > createRoom(): Supabase client is not ready. Cannot create room. Returning early.');
        return;
    } 

    const category = document.getElementById('categorySelect').value;
    if (!category) {
        alert('Please select a category');
        return;
    }

    currentRoomId = 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    currentCategory = category;
    quizStarted = false;
    console.log('host.js > createRoom(): Creating room with ID:', currentRoomId, 'Category:', category, 'Host ID:', hostId);

    const roomData = {
        room_id: currentRoomId,
        host_id: hostId,
        category,
        status: 'waiting',
        current_question_index: 0,
        question_phase: 'waiting',
        created_at: new Date().toISOString()
    };

    const client = getQuizbuzzClient();
    if (!client) {
        console.error('host.js > createRoom(): Quizbuzz client is not available.');
        return;
    }

    const { error } = await client.from('quiz_rooms').upsert(roomData, { onConflict: 'room_id' });
    if (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
        return;
    }
    console.log('host.js > createRoom(): Room created successfully:', roomData);

    showRoomInfo();
    await listenForRoomUpdates();
}

function showRoomInfo() {
    document.getElementById('creationSection').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';
    document.getElementById('playersSection').style.display = 'block';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('roomIdDisplay').textContent = currentRoomId;
    const author = categoryAuthors[currentCategory] || '';
    document.getElementById('categoryDisplay').textContent = author ? `${currentCategory} by ${author}` : currentCategory;
}

async function listenForRoomUpdates() {
    if (!currentRoomId) return;

    const client = getSupabaseClient(); 
    if (!client) return;

    if (roomSubscription) {
        console.log('host.js > listenForRoomUpdates(): Removing existing room subscription for room ID:', currentRoomId);
        client.removeChannel(roomSubscription);
        roomSubscription = null;
    }

    console.log('host.js > listenForRoomUpdates(): Subscribing to room updates for room ID:', currentRoomId);
    roomSubscription = client.channel(`room:${currentRoomId}`);

    console.log('host.js > listenForRoomUpdates(): Setting up listeners for quiz_rooms and quiz_players tables for room ID:', currentRoomId);
    roomSubscription.on('postgres_changes', {
        event: '*',
        schema: 'quizbuzz',
        table: 'quiz_rooms',
        filter: `room_id=eq.${currentRoomId}`
    }, async () => {
        await refreshRoomAndPlayers();
    });

    roomSubscription.on('postgres_changes', {
        event: '*',
        schema: 'quizbuzz',
        table: 'quiz_players',
        filter: `room_id=eq.${currentRoomId}`
    }, async () => {
        await refreshRoomAndPlayers();
    });

    console.log('host.js > listenForRoomUpdates(): Subscribing to the channel for room ID:', currentRoomId);
    roomSubscription.subscribe();
    await refreshRoomAndPlayers();
}

async function refreshRoomAndPlayers() {
    console.log('host.js > refreshRoomAndPlayers(): Refreshing room and player data for room ID:', currentRoomId);
    const client = getQuizbuzzClient();
    if (!client) return;

    console.log('host.js > refreshRoomAndPlayers(): Fetching room and player data from Supabase for room ID:', currentRoomId);
    const [{ data: roomRow, error: roomError }, { data: playerRows, error: playerError }] = await Promise.all([
        client.from('quiz_rooms').select('*').eq('room_id', currentRoomId).maybeSingle(),
        client.from('quiz_players').select('*').eq('room_id', currentRoomId)
    ]);

    if (roomError) {
        console.error('Error loading room data:', roomError);
        return;
    }
    if (playerError) {
        console.error('Error loading player data:', playerError);
        return;
    }

    currentRoomData = normalizeRoomData(roomRow);
    currentPlayers = mapPlayerRows(playerRows || []);

    updatePlayersList(currentPlayers);
    updateRoomUI(currentRoomData, currentPlayers);
}

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
                        ${escapeHtml(player.name)}
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

function loadQuestionsForHost(category) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const categoryData = data.categories.find(cat => cat.topic === category);
            quizQuestions = categoryData ? categoryData.questions : [];
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            quizQuestions = [];
        });
}

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

    const client = getQuizbuzzClient();
    if (!client) return;

    const { error } = await client.from('quiz_rooms').update({
        status: 'started',
        started_at: new Date().toISOString(),
        current_question_index: 0,
        question_phase: 'open'
    }).eq('room_id', currentRoomId);

    if (error) {
        console.error('Error starting quiz:', error);
        return;
    }

    document.getElementById('startButton').disabled = true;
    document.getElementById('endButton').disabled = false;
}

async function completeQuestion() {
    if (!currentRoomId) return;
    const client = getQuizbuzzClient();
    if (!client) return;

    const { error } = await client.from('quiz_rooms').update({
        question_phase: 'complete'
    }).eq('room_id', currentRoomId);
    if (error) console.error('Error completing question:', error);
}

async function revealAnswer() {
    if (!currentRoomId) return;

    const client = getQuizbuzzClient();
    const [{ data: roomRow, error: roomError }, { data: playerRows, error: playerError }] = await Promise.all([
        client.from('quiz_rooms').select('*').eq('room_id', currentRoomId).maybeSingle(),
        client.from('quiz_players').select('*').eq('room_id', currentRoomId)
    ]);

    if (roomError) {
        console.error('Error fetching room data for reveal:', roomError);
        return;
    }
    if (playerError) {
        console.error('Error fetching players for reveal:', playerError);
        return;
    }

    const roomData = normalizeRoomData(roomRow);
    const currentIndex = roomData.currentQuestionIndex || 0;
    const category = roomData.category || currentCategory;

    await loadQuestionsForHost(category);

    const question = quizQuestions[currentIndex];
    const correctAnswerIndex = question ? question.correctAnswer : null;
    const players = mapPlayerRows(playerRows || []);

    const answerUpserts = [];
    const playerScoreUpdates = [];

    Object.values(players).forEach((player) => {
        const alreadyScored = typeof player.score === 'number' && player.score >= 0 && player.currentAnswer !== null;
        const isCorrect = typeof player.currentAnswer === 'number' && player.currentAnswer === correctAnswerIndex;

        answerUpserts.push({
            player_id: player.playerId,
            room_id: currentRoomId,
            question_index: currentIndex,
            answer_option_index: player.currentAnswer,
            score_for_question: isCorrect ? 1 : 0
        });

        if (!alreadyScored) {
            playerScoreUpdates.push({
                player_id: player.playerId,
                score: player.score + (isCorrect ? 1 : 0)
            });
        }
    });

    if (answerUpserts.length) {
        const { error } = await client.from('quiz_player_answers').upsert(answerUpserts, {
            onConflict: ['player_id', 'room_id', 'question_index']
        });
        if (error) console.error('Error saving answer records:', error);
    }

    if (playerScoreUpdates.length) {
        const { error } = await client.from('quiz_players').upsert(playerScoreUpdates, { onConflict: 'player_id' });
        if (error) console.error('Error updating player scores:', error);
    }

    const { error } = await client.from('quiz_rooms').update({
        question_phase: 'revealed'
    }).eq('room_id', currentRoomId);
    if (error) console.error('Error revealing answer:', error);
}

async function nextQuestion() {
    if (!currentRoomId) return;

    const client = getQuizbuzzClient();
    if (!client) return;

    const [{ data: roomRow, error: roomError }, { data: playerRows, error: playerError }] = await Promise.all([
        client.from('quiz_rooms').select('*').eq('room_id', currentRoomId).maybeSingle(),
        client.from('quiz_players').select('*').eq('room_id', currentRoomId)
    ]);

    if (roomError || !roomRow) {
        console.error('Error loading room data for next question:', roomError);
        return;
    }
    if (playerError) {
        console.error('Error loading players for next question:', playerError);
        return;
    }

    const roomData = normalizeRoomData(roomRow);
    const nextIndex = (roomData.currentQuestionIndex || 0) + 1;
    const isLastQuestion = nextIndex >= quizQuestions.length;

    if (isLastQuestion) {
        return endSession();
    }

    const playerUpdates = (playerRows || []).map((row) => ({
        player_id: row.player_id,
        has_submitted: false,
        current_answer: null
    }));

    if (playerUpdates.length) {
        const updateResults = await Promise.all(playerUpdates.map((playerUpdate) =>
            client.from('quiz_players').update(playerUpdate).eq('player_id', playerUpdate.player_id).eq('room_id', currentRoomId)
        ));

        const updateError = updateResults.find((result) => result.error);
        if (updateError) {
            console.error('Error resetting players for next question:', updateError.error);
        }
    }

    const { error: updateError } = await client.from('quiz_rooms').update({
        current_question_index: nextIndex,
        question_phase: 'open'
    }).eq('room_id', currentRoomId);

    if (updateError) console.error('Error advancing question:', updateError);
}

async function endSession() {
    if (!currentRoomId) {
        alert('No room to end');
        return;
    }

    const client = getQuizbuzzClient();
    if (!client) return;

    const { error } = await client.from('quiz_rooms').update({
        status: 'ended',
        ended_at: new Date().toISOString()
    }).eq('room_id', currentRoomId);

    if (error) {
        console.error('Error ending quiz:', error);
        return;
    }

    displayResults();
}

function displayResults() {
    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    loadQuestionsForReview();
}

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

    const client = getQuizbuzzClient();
    if (!client) {
        currentRoomId = null;
        currentCategory = null;
        quizStarted = false;
        quizQuestions = [];
        return;
    }

    await client.from('quiz_player_answers').delete().eq('room_id', currentRoomId);
    await client.from('quiz_players').delete().eq('room_id', currentRoomId);
    const { error } = await client.from('quiz_rooms').delete().eq('room_id', currentRoomId);
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
