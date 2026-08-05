const GAME_TABLE_FALLBACK = 'lietome_rooms';
const QUESTIONS_PER_GAME = 3;
const PATCH_RETRY_LIMIT = 6;

let currentRoomId = null;
let hostId = null;
let questions = [];
let latestRoom = null;
let roomChannel = null;

document.addEventListener('DOMContentLoaded', () => {
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    loadQuestions();
});

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

function loadQuestions() {
    return fetch('questions.json')
        .then((response) => response.json())
        .then((data) => {
            questions = data.questions || [];
        })
        .catch((error) => {
            console.error('Could not load Lie To Me questions:', error);
            questions = [];
        });
}

async function createRoom() {
    if (!requireSupabase()) return;

    const roomData = {
        hostId,
        status: 'waiting',
        phase: 'waiting',
        currentQuestionIndex: 0,
        createdAt: new Date().toISOString(),
        players: {},
        rounds: {}
    };

    for (let attempt = 0; attempt < PATCH_RETRY_LIMIT; attempt += 1) {
        const candidateRoomId = 'ROOM_' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const now = new Date().toISOString();

        const { error } = await window.supabaseClient
            .from(getGameTableName())
            .insert({
                room_id: candidateRoomId,
                state: roomData,
                created_at: now,
                updated_at: now
            });

        if (!error) {
            currentRoomId = candidateRoomId;
            latestRoom = roomData;
            document.getElementById('creationSection').style.display = 'none';
            document.getElementById('roomInfo').style.display = 'block';
            document.getElementById('playersSection').style.display = 'block';
            document.getElementById('roomIdDisplay').textContent = currentRoomId;
            await listenForRoomUpdates();
            return;
        }

        if (error.code !== '23505') {
            console.error('Error creating room:', error);
            alert('Could not create the room. Please try again.');
            return;
        }
    }

    alert('Could not create a unique room ID. Please try again.');
}

function handleRoomSnapshot(roomState) {
    latestRoom = roomState;
    if (!latestRoom) return;

    const hasSelectedIds = Array.isArray(latestRoom.selectedQuestionIds) && latestRoom.selectedQuestionIds.length > 0;
    if (latestRoom.status === 'started' && !hasSelectedIds && latestRoom.hostId === hostId && questions.length > 0) {
        const selectedQuestionIds = shuffle(questions)
            .slice(0, Math.min(QUESTIONS_PER_GAME, questions.length))
            .map((question) => question.id);
        patchRoomState({ selectedQuestionIds }).catch((error) => {
            console.error('Error assigning selected questions:', error);
        });
        return;
    }

    const players = latestRoom.players || {};
    renderPlayers(players);

    if (latestRoom.status === 'started') {
        document.getElementById('liveSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        renderRound(latestRoom, players);
    } else if (latestRoom.status === 'ended') {
        document.getElementById('liveSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        renderScores(players);
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
        .channel(`lietome-host-${currentRoomId}`)
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
    if (popup) {
        popup.style.display = 'grid';
        popup.classList.add('visible');
    }
}

function hideSupportPopup() {
    const popup = document.getElementById('supportPopup');
    if (popup) {
        popup.style.display = 'none';
        popup.classList.remove('visible');
    }
}

function renderPlayers(players) {
    const playerIds = Object.keys(players);
    const list = document.getElementById('playersList');
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');

    if (playerIds.length === 0) {
        list.innerHTML = '<div class="muted">Waiting for players to join...</div>';
        startButton.disabled = true;
    } else {
        const phase = latestRoom?.phase || 'waiting';
        list.innerHTML = playerIds.map((playerId) => {
            const player = players[playerId] || {};
            const done = getPlayerDoneState(player, phase);
            const score = player.score || 0;
            return `
                <div class="player-row">
                    <span><span class="status-dot ${done ? 'done' : ''}"></span>${escapeHtml(player.name || 'PLAYER')}</span>
                    <strong>${score} pts</strong>
                </div>
            `;
        }).join('');
        startButton.disabled = latestRoom?.status !== 'waiting';
    }

    endButton.disabled = !currentRoomId || latestRoom?.status === 'ended';
}

function getPlayerDoneState(player, phase) {
    if (phase === 'answer') return Boolean(player.hasSubmitted);
    if (phase === 'voting') return Boolean(player.hasVoted);
    return false;
}

function renderRound(room, players) {
    const index = room.currentQuestionIndex || 0;
    const activeQuestions = getActiveQuestions(room);
    const question = activeQuestions[index];
    const phase = room.phase || 'answer';
    const round = getCurrentRound(room);
    const playerIds = Object.keys(players);

    if (!question) {
        document.getElementById('questionText').textContent = 'No more questions.';
        return;
    }

    document.getElementById('questionCount').textContent = `Question ${index + 1} of ${activeQuestions.length}`;
    document.getElementById('progressFill').style.width = `${((index + 1) / activeQuestions.length) * 100}%`;
    document.getElementById('questionText').textContent = question.question;
    const hostStatus = document.getElementById('hostStatus');

    const allAnswered = playerIds.length > 0 && playerIds.every((id) => players[id]?.hasSubmitted);
    const allVoted = playerIds.length > 0 && playerIds.every((id) => players[id]?.hasVoted);

    document.getElementById('showAnswersButton').disabled = !(phase === 'answer' && allAnswered);
    document.getElementById('showVotesButton').disabled = !(phase === 'voting' && allVoted);
    document.getElementById('revealButton').disabled = phase !== 'votes';
    document.getElementById('nextButton').disabled = phase !== 'revealed';
    document.getElementById('nextButton').textContent = index >= activeQuestions.length - 1 ? 'Finish Game' : 'Next Question';

    if (phase === 'answer') {
        const submitted = playerIds.filter((id) => players[id]?.hasSubmitted).length;
        hostStatus.classList.toggle('all-submitted', allAnswered);
        hostStatus.textContent = allAnswered
            ? 'All players have submitted their answers. Show Answers when you are ready.'
            : `Waiting for answers: ${submitted}/${playerIds.length} submitted.`;
        document.getElementById('answersGrid').innerHTML = '';
        return;
    }

    hostStatus.classList.remove('all-submitted');
    if (phase === 'voting') {
        const voted = playerIds.filter((id) => players[id]?.hasVoted).length;
        hostStatus.textContent = `Players are guessing the truth: ${voted}/${playerIds.length} voted.`;
    } else if (phase === 'votes') {
        hostStatus.textContent = 'Votes are in. Reveal the real answer when ready.';
    } else if (phase === 'revealed') {
        hostStatus.textContent = 'Real answer revealed. Scores have been recorded.';
    }

    renderAnswers(round, players, phase);
}

function getCurrentRound(room = latestRoom) {
    const index = room?.currentQuestionIndex || 0;
    return room?.rounds?.[index] || {};
}

function getActiveQuestions(room = latestRoom) {
    const selectedIds = room?.selectedQuestionIds || [];
    if (!selectedIds.length) return questions;

    const questionsById = new Map(questions.map((question) => [String(question.id), question]));
    return selectedIds
        .map((id) => questionsById.get(String(id)))
        .filter(Boolean);
}

async function startGame() {
    if (!currentRoomId) return;

    await loadQuestions();
    if (questions.length === 0) {
        alert('No questions found.');
        return;
    }

    try {
        const room = await fetchRoomState(currentRoomId);
        const selectedQuestionIds = shuffle(questions)
            .slice(0, Math.min(QUESTIONS_PER_GAME, questions.length))
            .map((question) => question.id);
        const updates = {
            status: 'started',
            phase: 'answer',
            startedAt: new Date().toISOString(),
            currentQuestionIndex: 0,
            selectedQuestionIds
        };
        Object.keys(room?.players || {}).forEach((playerId) => {
            updates[`players/${playerId}/hasSubmitted`] = false;
            updates[`players/${playerId}/hasVoted`] = false;
            updates[`players/${playerId}/currentLie`] = null;
            updates[`players/${playerId}/currentVote`] = null;
            updates[`players/${playerId}/score`] = room.players[playerId].score || 0;
        });
        await patchRoomState(updates);
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

async function showAnswers() {
    if (!latestRoom) return;
    const index = latestRoom.currentQuestionIndex || 0;
    const question = getActiveQuestions()[index];
    const players = latestRoom.players || {};
    const answerBank = buildAnswerBank(question, players);
    const updates = {
        phase: 'voting',
        [`rounds/${index}/question`]: question.question,
        [`rounds/${index}/realAnswer`]: question.answer,
        [`rounds/${index}/note`]: question.note || '',
        [`rounds/${index}/answers`]: answerBank,
        [`rounds/${index}/shownAt`]: new Date().toISOString()
    };

    Object.keys(players).forEach((playerId) => {
        updates[`players/${playerId}/hasVoted`] = false;
        updates[`players/${playerId}/currentVote`] = null;
    });

    try {
        await patchRoomState(updates);
    } catch (error) {
        console.error('Error showing answers:', error);
    }
}

function buildAnswerBank(question, players) {
    const answers = [{
        id: 'truth',
        text: question.answer,
        type: 'truth',
        authorId: 'truth',
        authorName: 'Real Answer'
    }];

    Object.keys(players).forEach((playerId) => {
        const player = players[playerId] || {};
        const text = String(player.currentLie || '').trim();
        if (!text) return;
        answers.push({
            id: `lie_${playerId}`,
            text,
            type: 'lie',
            authorId: playerId,
            authorName: player.name || 'PLAYER'
        });
    });

    return shuffle(answers);
}

async function showVotes() {
    if (!currentRoomId) return;
    try {
        await patchRoomState({
        phase: 'votes',
        votesShownAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error showing votes:', error);
    }
}

async function revealAnswer() {
    if (!latestRoom) return;

    const index = latestRoom.currentQuestionIndex || 0;
    const round = getCurrentRound();
    const players = latestRoom.players || {};
    const answers = round.answers || [];
    const updates = {
        phase: 'revealed',
        revealedAt: new Date().toISOString()
    };

    Object.keys(players).forEach((playerId) => {
        const player = players[playerId] || {};
        const voteId = player.currentVote;
        const votedAnswer = answers.find((answer) => answer.id === voteId);
        let points = 0;

        if (voteId === 'truth') {
            points += 2;
        }

        if (votedAnswer?.type === 'lie' && votedAnswer.authorId !== playerId) {
            points += 1;
        }

        const fooledCount = Object.values(players).filter((other) => other.currentVote === `lie_${playerId}`).length;
        points += fooledCount;

        updates[`players/${playerId}/roundScores/${index}`] = points;
        updates[`players/${playerId}/score`] = (player.score || 0) + points;
    });

    try {
        await patchRoomState(updates);
    } catch (error) {
        console.error('Error revealing answer:', error);
    }
}

async function nextQuestion() {
    if (!latestRoom) return;

    const activeQuestions = getActiveQuestions();
    const nextIndex = (latestRoom.currentQuestionIndex || 0) + 1;
    if (nextIndex >= activeQuestions.length) {
        endGame();
        return;
    }

    const players = latestRoom.players || {};
    const updates = {
        currentQuestionIndex: nextIndex,
        phase: 'answer'
    };

    Object.keys(players).forEach((playerId) => {
        updates[`players/${playerId}/hasSubmitted`] = false;
        updates[`players/${playerId}/hasVoted`] = false;
        updates[`players/${playerId}/currentLie`] = null;
        updates[`players/${playerId}/currentVote`] = null;
    });

    try {
        await patchRoomState(updates);
    } catch (error) {
        console.error('Error moving to next question:', error);
    }
}

function renderAnswers(round, players, phase) {
    const answers = round.answers || [];
    const grid = document.getElementById('answersGrid');
    const showVotesNow = phase === 'votes' || phase === 'revealed';
    const showAuthors = phase === 'revealed';

    grid.innerHTML = answers.map((answer) => {
        const voters = Object.values(players).filter((player) => player.currentVote === answer.id);
        const classes = ['answer-card'];
        if (phase === 'revealed' && answer.type === 'truth') classes.push('correct');
        const author = answer.type === 'truth' ? 'Real answer' : `Written by ${answer.authorName}`;
        return `
            <article class="${classes.join(' ')}">
                <div class="answer-text">${escapeHtml(answer.text)}</div>
                ${showVotesNow ? `<div class="vote-pile">${voters.map((player) => `<span class="chip">${escapeHtml(player.name || 'PLAYER')}</span>`).join('') || '<span class="muted">No votes</span>'}</div>` : ''}
                ${showAuthors ? `<div class="answer-meta">${escapeHtml(author)}</div>` : ''}
            </article>
        `;
    }).join('');
}

function renderScores(players) {
    const entries = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    document.getElementById('scoreList').innerHTML = entries.map((player, index) => `
        <div class="score-row">
            <span>${index + 1}. ${escapeHtml(player.name || 'PLAYER')}</span>
            <strong>${player.score || 0} pts</strong>
        </div>
    `).join('') || '<p class="muted">No players joined.</p>';
}

async function endGame() {
    if (!currentRoomId) return;
    try {
        await patchRoomState({
        status: 'ended',
        phase: 'ended',
        endedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error ending game:', error);
    }
}

async function resetRoom() {
    if (currentRoomId && requireSupabase()) {
        await window.supabaseClient
            .from(getGameTableName())
            .delete()
            .eq('room_id', currentRoomId);
    }

    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }

    currentRoomId = null;
    latestRoom = null;
    window.location.reload();
}

function goBack() {
    if (roomChannel) {
        roomChannel.unsubscribe();
        roomChannel = null;
    }
    window.location.href = 'index.html';
}

function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
