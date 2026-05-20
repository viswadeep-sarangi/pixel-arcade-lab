const GAME_ROOT = 'lietome/rooms';

let currentRoomId = null;
let playerId = null;
let playerName = null;
let questions = [];
let latestRoom = null;

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
            console.error('Could not load questions:', error);
            questions = [];
        });
}

function joinRoom() {
    if (!requireDatabase()) return;

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

    window.database.ref(`${GAME_ROOT}/${currentRoomId}`).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            alert('Room not found. Please check the Room ID.');
            return;
        }

        const room = snapshot.val() || {};
        if (room.status !== 'waiting') {
            alert('That room has already started.');
            return;
        }

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

        window.database.ref(`${GAME_ROOT}/${currentRoomId}/players/${playerId}`).set(playerData)
            .then(() => {
                showWaiting();
                loadQuestions().then(listenForRoomUpdates);
            })
            .catch((error) => {
                console.error('Error joining room:', error);
                alert('Could not join the room. Please try again.');
            });
    });
}

function showWaiting() {
    document.getElementById('joinSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomId;
    document.getElementById('displayPlayerName').textContent = playerName;
}

function listenForRoomUpdates() {
    roomRef().on('value', (snapshot) => {
        latestRoom = snapshot.val();
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
        }
    });
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

function submitLie() {
    if (!latestRoom || latestRoom.phase !== 'answer') return;

    const answer = document.getElementById('lieAnswer').value.trim().replace(/\s+/g, ' ');
    if (answer.length < 2) {
        alert('Please enter an answer.');
        return;
    }

    const index = latestRoom.currentQuestionIndex || 0;
    roomRef(`/players/${playerId}`).update({
        currentLie: answer,
        hasSubmitted: true,
        [`answers/${index}`]: answer
    }).catch((error) => console.error('Error submitting answer:', error));
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

function submitVote(answerId) {
    if (!latestRoom || latestRoom.phase !== 'voting') return;

    const index = latestRoom.currentQuestionIndex || 0;
    const answers = latestRoom.rounds?.[index]?.answers || [];
    const selected = answers.find((answer) => answer.id === answerId);

    if (!selected || selected.authorId === playerId) return;

    roomRef(`/players/${playerId}`).update({
        currentVote: answerId,
        hasVoted: true,
        [`votes/${index}`]: answerId
    }).catch((error) => console.error('Error submitting vote:', error));
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

function goBack() {
    if (currentRoomId && playerId && window.database) {
        window.database.ref(`${GAME_ROOT}/${currentRoomId}/players/${playerId}`).remove();
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
