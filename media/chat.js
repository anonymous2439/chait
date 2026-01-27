const vscode = acquireVsCodeApi();
const textbox = document.getElementById('textbox');
const msgContainer = document.getElementById('msg-users');
const msgContent = document.getElementById('msg-content');
const wsSelect = document.getElementById('ws-select');
const gameContainer = document.getElementById('game-con');
const startBtn = document.getElementById('karirs-start');
const stopBtn = document.getElementById('karirs-stop');
const changeBtn = document.getElementById('karirs-change');
const countdownEl = document.getElementById('countdown');
const msgEl = document.getElementById('msg');

// Receive messages from extension
window.addEventListener('message', event => {
    const msg = event.data;
    // console.log("msg:",msg)
    if (msg.type === 'wsMessage') {
        const p = document.createElement('p');
        const messageData = JSON.parse(msg.data);
        p.innerHTML = `<span class="user-label">${messageData.user}</span>: ${messageData.message}`;
        msgContent.appendChild(p);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
    else if(msg.type === 'karirs') {
        const gameData = JSON.parse(msg.data)
        const spectators = gameData?.spectators ?? 0
        const players = gameData?.players ?? []
        const hasStarted = gameData?.started ?? false
        let winnerIndex = null

        if(hasStarted) {
            startBtn.style.display = 'none'
            changeBtn.style.display = 'none'
        }
        else if(!hasStarted) {
            startBtn.style.display = 'block'
            changeBtn.style.display = 'block'

            if(players.length) {
                winnerIndex = players.reduce(
                    (max_idx, player, idx, arr) =>
                        player.position > arr[max_idx].position ? idx : max_idx,
                    0
                );
            }
        }
        
        gameContainer.innerHTML = '';

        players.forEach((player, index) => {
            const li = document.createElement('li')
            li.innerHTML = player.name
            li.style.marginLeft = player.position + 'px'
            if(winnerIndex != null && index === winnerIndex && player.position > 0) {
                li.style.background = '#0080BAc4'
            }
            gameContainer.appendChild(li)
        });
    }
});

// Send message on Enter key
textbox.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const message = textbox.value.trim();
        if (!message) return;

        vscode.postMessage({
            type: 'chat',
            data: {
                user: "anonymous",
                message: message
            }
        });
        textbox.value = '';
    }
});

// Change WebSocket URL dynamically
wsSelect.addEventListener('change', () => {
    const url = wsSelect.value;
    if (!url) return;

    msgContent.innerHTML = '';
    vscode.postMessage({
        type: 'switchSession',
        url
    });
});


window.addEventListener('click', (e) => {
    if (e.target.id === 'karirs-start') {
        startCountdown(10, () => {
            vscode.postMessage({
                type: 'karirs',
                data: {
                    action: "start"
                }
            });
            countdownEl.innerHTML = '';
        })
        
    }
    else if (e.target.id === 'karirs-stop') {
        vscode.postMessage({
            type: 'karirs',
            data: {
                action: "stop"
            }
        });
    }
    else if (e.target.id === 'karirs-change') {
        vscode.postMessage({
            type: 'karirs',
            data: {
                action: "change"
            }
        });
    }
    else if(e.target.id === 'game-drawer-lock') {
        const isUnlocked = msgEl.classList.contains('unlocked');

        if (isUnlocked) {
            msgEl.classList.remove('unlocked');
        } else {
            msgEl.classList.add('unlocked');
        }
    }
});


function startCountdown(duration, callback) {
    let remaining = duration;

    const timer = setInterval(() => {
        countdownEl.innerHTML = `Race will start at '${remaining}s'`
        remaining--;

        if (remaining < 0) {
            clearInterval(timer);
            callback();
        }
    }, 1000);
}