const GAME_TABLE_FALLBACK = 'lietome_rooms';
const PATCH_RETRY_LIMIT = 6;

let currentRoomId = null;
let playerId = null;
let playerName = null;
let questions = [];
let latestRoom = null;
let roomChannel = null;

function getGameTableName() {
    return window.supabaseTable || GAME_TABLE_FALLBACK;
}

function requireSupabase() {
    if (!window.supabaseClient) {
        alert('Supabase is not configured. Add games/lietome/config.local.js first.');
        return false;
    }
    return true;
}

function cloneObject(value) {
    return JSON.parse(JSON.stringify(value || {}));
}

function setByPath(target, path, value) {
    const parts = String(path).split('/').filter(Boolean);
    if (parts.length === 0) {
        return;
    }

    let cursor = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!cursor[key] || typeof cursor[key] !== 'object') {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }

    cursor[parts[parts.length - 1]] = value;
}

function applyStatePatch(baseState, patch) {
    const nextState = cloneObject(baseState);
    Object.entries(patch).forEach(([key, value]) => {
        if (key.includes('/')) {
            setByPath(nextState, key, value);
        } else {
            nextState[key] = value;
        }
    });
    return nextState;
}

async function fetchRoomRecord(roomId) {
    const { data, error } = await window.supabaseClient
        .from(getGameTableName())
        .select('room_id, state, updated_at')
        .eq('room_id', roomId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function fetchRoomState(roomId) {
    const record = await fetchRoomRecord(roomId);
    return record?.state || null;
}

async function patchRoomState(patch) {
    for (let attempt = 0; attempt < PATCH_RETRY_LIMIT; attempt += 1) {
        const record = await fetchRoomRecord(currentRoomId);
        if (!record) {
            throw new Error('Room not found while applying update.');
        }

        const nextState = applyStatePatch(record.state || {}, patch);
        const { data, error } = await window.supabaseClient
            .from(getGameTableName())
            .update({
                state: nextState,
                updated_at: new Date().toISOString()
            })
            .eq('room_id', currentRoomId)
            .eq('updated_at', record.updated_at)
            .select('state')
            .maybeSingle();

        if (error) throw error;
        if (data) {
            latestRoom = data.state;
            return data.state;
        }
    }

    throw new Error('Could not update room after several retries.');
}

async function removePlayerFromRoom() {
    for (let attempt = 0; attempt < PATCH_RETRY_LIMIT; attempt += 1) {
        const record = await fetchRoomRecord(currentRoomId);
        if (!record) {
            return;
        }

        const nextState = cloneObject(record.state || {});
        if (nextState.players && Object.prototype.hasOwnProperty.call(nextState.players, playerId)) {
            delete nextState.players[playerId];
        }

        const { data, error } = await window.supabaseClient
            .from(getGameTableName())
            .update({
                state: nextState,
                updated_at: new Date().toISOString()
            })
            .eq('room_id', currentRoomId)
            .eq('updated_at', record.updated_at)
            .select('state')
            .maybeSingle();

        if (error) throw error;
        if (data) {
            latestRoom = data.state;
            return;
        }
    }
}

function loadQuestions() {
    return fetch('questions.json')
        .then((response) => response.json())
        .then((data) => {
            questions = data.questions || [];
        })
        .catch((error) => {
            console.error('Could not load questions:', error);
            questions = [];
        });
}

async function joinRoom() {
    if (!requireSupabase()) return;

    const roomId = document.getElementById('roomId').value.trim().toUpperCase();
    const name = document.getElementById('playerName').value.trim().toUpperCase();

    if (!roomId || !name) {
        alert('Please enter both Room ID and your name.');
        return;
    }

    if (!/^[A-Z]+$/.test(name)) {
        alert('Name must contain only A-Z letters.');
        return;
    }

    currentRoomId = roomId;
    playerName = name;
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

    const playerData = {
        name: playerName,
        joinedAt: new Date().toISOString(),
        hasSubmitted: false,
        hasVoted: false,
        currentLie: null,
        currentVote: null,
        score: 0,
        answers: {},
        votes: {},
        roundScores: {}
    };

    try {
        for (let attempt = 0; attempt < PATCH_RETRY_LIMIT; attempt += 1) {
            const record = await fetchRoomRecord(currentRoomId);
            if (!record) {
                alert('Room not found. Please check the Room ID.');
                return;
            }

            const room = record.state || {};
            if (room.status !== 'waiting') {
                alert('That room has already started.');
                return;
            }

            const patch = {
                [`players/${playerId}`]: playerData
            };
            const nextState = applyStatePatch(room, patch);
            const { data, error } = await window.supabaseClient
                .from(getGameTableName())
                .update({
                    state: nextState,
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', currentRoomId)
                .eq('updated_at', record.updated_at)
                .select('state')
                .maybeSingle();

            if (error) throw error;
            if (data) {
                latestRoom = data.state;
                showWaiting();
                await loadQuestions();
                await listenForRoomUpdates();
                return;
            }
        }

        throw new Error('Could not join room after several retries.');
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Could not join the room. Please try again.');
    }
}

function showWaiting() {
    document.getElementById('joinSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomId;
    document.getElementById('displayPlayerName').textContent = playerName;
}

function handleRoomSnapshot(roomState) {
    latestRoom = roomState;
    if (!latestRoom) {
        showStatus('Room closed.');
        return;
    }

    if (latestRoom.status === 'started') {
        document.getElementById('waitingSection').style.display = 'none';
        document.getElementById('liveSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        renderRound();
    } else if (latestRoom.status === 'ended') {
        document.getElementById('waitingSection').style.display = 'none';
        document.getElementById('liveSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        renderScores(latestRoom.players || {});
        showSupportPopup();
    }
}

async function listenForRoomUpdates() {
    if (!currentRoomId || !requireSupabase()) return;

    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }

    try {
        const state = await fetchRoomState(currentRoomId);
        handleRoomSnapshot(state);
    } catch (error) {
        console.error('Error loading room state:', error);
    }

    roomChannel = window.supabaseClient
        .channel(`lietome-player-${currentRoomId}-${playerId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: getGameTableName(),
                filter: `room_id=eq.${currentRoomId}`
            },
            (payload) => {
                if (payload.eventType === 'DELETE') {
                    handleRoomSnapshot(null);
                    return;
                }
                handleRoomSnapshot(payload.new?.state || null);
            }
        )
        .subscribe();
}

function showSupportPopup() {
    const popup = document.getElementById('supportPopup');
    if (popup) popup.classList.add('visible');
}

function hideSupportPopup() {
    const popup = document.getElementById('supportPopup');
    if (popup) popup.classList.remove('visible');
}

function renderRound() {
    const index = latestRoom.currentQuestionIndex || 0;
    const activeQuestions = getActiveQuestions();
    const question = activeQuestions[index];
    const phase = latestRoom.phase || 'answer';
    const player = latestRoom.players?.[playerId] || {};

    if (!question) {
        showStatus('Waiting for the host...');
        return;
    }

    document.getElementById('questionCount').textContent = `Question ${index + 1} of ${activeQuestions.length}`;
    document.getElementById('progressFill').style.width = `${((index + 1) / activeQuestions.length) * 100}%`;
    document.getElementById('questionText').textContent = question.question;

    const answerEntry = document.getElementById('answerEntry');
    const answersGrid = document.getElementById('answersGrid');
    const submitButton = document.getElementById('submitLieButton');

    if (phase === 'answer') {
        answerEntry.style.display = 'block';
        answersGrid.innerHTML = '';
        submitButton.disabled = Boolean(player.hasSubmitted);
        submitButton.textContent = player.hasSubmitted ? 'Submitted' : 'Submit Answer';
        document.getElementById('lieAnswer').disabled = Boolean(player.hasSubmitted);
        showStatus(player.hasSubmitted ? 'Answer submitted. Waiting for everyone else.' : 'Write an answer that sounds suspiciously real.');
        return;
    }

    answerEntry.style.display = 'none';
    document.getElementById('lieAnswer').disabled = false;
    document.getElementById('lieAnswer').value = '';
    renderAnswers(phase, player);
}

function getActiveQuestions() {
    const selectedIds = latestRoom?.selectedQuestionIds || [];
    if (!selectedIds.length) return questions;

    const questionsById = new Map(questions.map((question) => [String(question.id), question]));
    return selectedIds
        .map((id) => questionsById.get(String(id)))
        .filter(Boolean);
}

async function submitLie() {
    if (!latestRoom || latestRoom.phase !== 'answer') return;

    const answer = document.getElementById('lieAnswer').value.trim().replace(/\s+/g, ' ');
    if (answer.length < 2) {
        alert('Please enter an answer.');
        return;
    }

    const index = latestRoom.currentQuestionIndex || 0;
    try {
        await patchRoomState({
            [`players/${playerId}/answers/${index}`]: answer,
            [`players/${playerId}/currentLie`]: answer,
            [`players/${playerId}/hasSubmitted`]: true
        });
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

function renderAnswers(phase, player) {
    const round = latestRoom.rounds?.[latestRoom.currentQuestionIndex || 0] || {};
    const answers = round.answers || [];
    const players = latestRoom.players || {};
    const canVote = phase === 'voting' && !player.hasVoted;
    const showVotesNow = phase === 'votes' || phase === 'revealed';
    const showAuthors = phase === 'revealed';

    document.getElementById('answersGrid').innerHTML = answers.map((answer) => {
        const ownLie = answer.authorId === playerId;
        const selected = player.currentVote === answer.id;
        const voters = Object.values(players).filter((p) => p.currentVote === answer.id);
        const classes = ['answer-card'];
        if (selected) classes.push('selected');
        if (phase === 'revealed' && answer.type === 'truth') classes.push('correct');
        const disabled = !canVote || ownLie;
        const author = answer.type === 'truth' ? 'Real answer' : `Written by ${answer.authorName}`;

        return `
            <article class="${classes.join(' ')}">
                <div class="answer-text">${escapeHtml(answer.text)}</div>
                ${canVote ? `<button ${disabled ? 'disabled' : ''} onclick="submitVote('${answer.id}')">${ownLie ? 'Your Answer' : 'Vote'}</button>` : ''}
                ${showVotesNow ? `<div class="vote-pile">${voters.map((voter) => `<span class="chip">${escapeHtml(voter.name || 'PLAYER')}</span>`).join('') || '<span class="muted">No votes</span>'}</div>` : ''}
                ${showAuthors ? `<div class="answer-meta">${escapeHtml(author)}</div>` : ''}
            </article>
        `;
    }).join('');

    if (phase === 'voting') {
        showStatus(player.hasVoted ? 'Vote locked. Waiting for the host.' : 'Pick the answer you think is real.');
    } else if (phase === 'votes') {
        showStatus('Votes are on the board. The host will reveal the truth.');
    } else if (phase === 'revealed') {
        const note = round.note ? ` ${round.note}` : '';
        showStatus(`Truth revealed.${note}`);
    }
}

async function submitVote(answerId) {
    if (!latestRoom || latestRoom.phase !== 'voting') return;

    const index = latestRoom.currentQuestionIndex || 0;
    const answers = latestRoom.rounds?.[index]?.answers || [];
    const selected = answers.find((answer) => answer.id === answerId);

    if (!selected || selected.authorId === playerId) return;

    try {
        await patchRoomState({
            [`players/${playerId}/currentVote`]: answerId,
            [`players/${playerId}/hasVoted`]: true,
            [`players/${playerId}/votes/${index}`]: answerId
        });
    } catch (error) {
        console.error('Error submitting vote:', error);
    }
}

function showStatus(message) {
    document.getElementById('playerStatus').textContent = message;
}

function renderScores(players) {
    const entries = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    document.getElementById('scoreList').innerHTML = entries.map((player, index) => `
        <div class="score-row">
            <span>${index + 1}. ${escapeHtml(player.name || 'PLAYER')}</span>
            <strong>${player.score || 0} pts</strong>
        </div>
    `).join('') || '<p class="muted">No scores yet.</p>';
}

async function goBack() {
    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }

    if (currentRoomId && playerId && window.supabaseClient) {
        try {
            await removePlayerFromRoom();
        } catch (error) {
            console.error('Error removing player on exit:', error);
        }
    }
    window.location.href = 'index.html';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
