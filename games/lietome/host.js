const GAME_ROOT = 'lietome/rooms';
const QUESTIONS_PER_GAME = 3;

let currentRoomId = null;
let hostId = null;
let questions = [];
let latestRoom = null;

document.addEventListener('DOMContentLoaded', () => {
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    loadQuestions();
});

function roomRef(path = '') {
    return window.database.ref(`${GAME_ROOT}/${currentRoomId}${path}`);
}

function requireDatabase() {
    if (!window.database) {
        alert('Firebase is not configured. Add games/lietome/config.local.js first.');
        return false;
    }
    return true;
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

function createRoom() {
    if (!requireDatabase()) return;

    currentRoomId = 'ROOM_' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const roomData = {
        hostId,
        status: 'waiting',
        phase: 'waiting',
        currentQuestionIndex: 0,
        createdAt: new Date().toISOString(),
        players: {},
        rounds: {}
    };

    roomRef().set(roomData)
        .then(() => {
            document.getElementById('creationSection').style.display = 'none';
            document.getElementById('roomInfo').style.display = 'block';
            document.getElementById('playersSection').style.display = 'block';
            document.getElementById('roomIdDisplay').textContent = currentRoomId;
            listenForRoomUpdates();
        })
        .catch((error) => {
            console.error('Error creating room:', error);
            alert('Could not create the room. Please try again.');
        });
}

function listenForRoomUpdates() {
    roomRef().on('value', (snapshot) => {
        latestRoom = snapshot.val();
        if (!latestRoom) return;

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
        }
    });
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

    const allAnswered = playerIds.length > 0 && playerIds.every((id) => players[id]?.hasSubmitted);
    const allVoted = playerIds.length > 0 && playerIds.every((id) => players[id]?.hasVoted);

    document.getElementById('showAnswersButton').disabled = !(phase === 'answer' && allAnswered);
    document.getElementById('showVotesButton').disabled = !(phase === 'voting' && allVoted);
    document.getElementById('revealButton').disabled = phase !== 'votes';
    document.getElementById('nextButton').disabled = phase !== 'revealed';
    document.getElementById('nextButton').textContent = index >= activeQuestions.length - 1 ? 'Finish Game' : 'Next Question';

    if (phase === 'answer') {
        const submitted = playerIds.filter((id) => players[id]?.hasSubmitted).length;
        document.getElementById('hostStatus').textContent = `Waiting for answers: ${submitted}/${playerIds.length} submitted.`;
        document.getElementById('answersGrid').innerHTML = '';
        return;
    }

    if (phase === 'voting') {
        const voted = playerIds.filter((id) => players[id]?.hasVoted).length;
        document.getElementById('hostStatus').textContent = `Players are guessing the truth: ${voted}/${playerIds.length} voted.`;
    } else if (phase === 'votes') {
        document.getElementById('hostStatus').textContent = 'Votes are in. Reveal the real answer when ready.';
    } else if (phase === 'revealed') {
        document.getElementById('hostStatus').textContent = 'Real answer revealed. Scores have been recorded.';
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

function startGame() {
    if (!currentRoomId) return;

    loadQuestions().then(() => {
        if (questions.length === 0) {
            alert('No questions found.');
            return;
        }

        roomRef().once('value').then((snapshot) => {
            const room = snapshot.val() || {};
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
            Object.keys(room.players || {}).forEach((playerId) => {
                updates[`players/${playerId}/hasSubmitted`] = false;
                updates[`players/${playerId}/hasVoted`] = false;
                updates[`players/${playerId}/currentLie`] = null;
                updates[`players/${playerId}/currentVote`] = null;
                updates[`players/${playerId}/score`] = room.players[playerId].score || 0;
            });
            roomRef().update(updates);
        });
    });
}

function showAnswers() {
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

    roomRef().update(updates).catch((error) => console.error('Error showing answers:', error));
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

function showVotes() {
    if (!currentRoomId) return;
    roomRef().update({
        phase: 'votes',
        votesShownAt: new Date().toISOString()
    }).catch((error) => console.error('Error showing votes:', error));
}

function revealAnswer() {
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

    roomRef().update(updates).catch((error) => console.error('Error revealing answer:', error));
}

function nextQuestion() {
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

    roomRef().update(updates).catch((error) => console.error('Error moving to next question:', error));
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

function endGame() {
    if (!currentRoomId) return;
    roomRef().update({
        status: 'ended',
        phase: 'ended',
        endedAt: new Date().toISOString()
    }).catch((error) => console.error('Error ending game:', error));
}

function resetRoom() {
    if (currentRoomId) {
        roomRef().remove();
    }
    currentRoomId = null;
    latestRoom = null;
    window.location.reload();
}

function goBack() {
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
