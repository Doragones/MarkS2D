const gameState = {
  x: -1, z: 0, // Aの部屋からスタート
  toggleCount: 0,
  rooms: []
};

// 迷路内の25部屋は B から Z
const gridLetters = "BCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- 迷路データの生成 ---
for (let i = 0; i < 25; i++) {
  let px = i % 5;
  let pz = Math.floor(i / 5);
  gameState.rooms.push({
    id: i + 1,
    letter: gridLetters[i],
    x: px, z: pz,
    isSwitchOn: false, isVisited: false, isSeen: false,
    walls: { n: pz === 0, s: pz === 4, e: px === 4, w: px === 0 }
  });
}

// Aの部屋（Answer / スタート地点）
gameState.rooms.push({
  id: 0, letter: 'A', x: -1, z: 0,
  isSwitchOn: false, isVisited: false, isSeen: false,
  walls: { n: true, s: true, e: false, w: true }
});

// Bの部屋（x:0, z:0）の西（左）の壁を壊してAと繋げる
const roomB = gameState.rooms.find(r => r.x === 0 && r.z === 0);
if (roomB) roomB.walls.w = false;

// 内部の壁生成
function addWall(x, z, dir) {
  const r1 = gameState.rooms.find(r => r.x === x && r.z === z);
  if (dir === 'e') {
    const r2 = gameState.rooms.find(r => r.x === x + 1 && r.z === z);
    if(r1 && r2) { r1.walls.e = true; r2.walls.w = true; }
  }
  if (dir === 's') {
    const r2 = gameState.rooms.find(r => r.x === x && r.z === z + 1);
    if(r1 && r2) { r1.walls.s = true; r2.walls.n = true; }
  }
}
addWall(1, 0, 's'); addWall(3, 0, 's'); addWall(1, 1, 'e'); addWall(2, 1, 'e');
addWall(0, 2, 'e'); addWall(3, 2, 'e'); addWall(1, 2, 's'); addWall(3, 2, 's');
addWall(1, 3, 'e'); addWall(2, 3, 's');

// --- 描画更新 ---
function updateView() {
  const currentRoom = gameState.rooms.find(r => r.x === gameState.x && r.z === gameState.z);
  if (!currentRoom) return;

  const roomLetter = document.getElementById('room-letter');
  const roomOverlay = document.getElementById('room-overlay');
  const terminalView = document.getElementById('terminal-view');
  const actionBtn = document.getElementById('action-btn');

  if (currentRoom.letter === 'A') {
    roomLetter.style.display = 'none';
    roomOverlay.style.backgroundColor = 'transparent';
    terminalView.style.display = 'flex';
    actionBtn.textContent = 'SEND';
  } else {
    terminalView.style.display = 'none';
    roomLetter.style.display = 'block';
    roomLetter.textContent = currentRoom.letter;
    actionBtn.textContent = 'SWITCH';
    
    if (currentRoom.isSwitchOn) {
      roomLetter.style.color = '#000';
      roomOverlay.style.backgroundColor = '#00ffcc';
      const isCircle = "VWXYZ".includes(currentRoom.letter);
      roomOverlay.className = isCircle ? 'switch-on-circle' : 'switch-on-slash';
    } else {
      roomLetter.style.color = '#fff';
      roomOverlay.style.backgroundColor = 'transparent';
      roomOverlay.className = '';
    }
  }

  currentRoom.isVisited = true;
  currentRoom.isSeen = true;
  gameState.rooms.forEach(r => {
    if (Math.abs(r.x - gameState.x) <= 1 && Math.abs(r.z - gameState.z) <= 1) r.isSeen = true;
  });

  const mapContainer = document.getElementById('map-container');
  mapContainer.innerHTML = '';
  
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const targetX = gameState.x + dx;
      const targetZ = gameState.z + dz;
      const room = gameState.rooms.find(r => r.x === targetX && r.z === targetZ);
      const cell = document.createElement('div');
      cell.className = 'map-cell';

      if (room) {
        if (room.isVisited) {
          cell.classList.add('visited');
          cell.style.borderTop = room.walls.n ? '2px solid #00ffcc' : '1px dashed #333';
          cell.style.borderBottom = room.walls.s ? '2px solid #00ffcc' : '1px dashed #333';
          cell.style.borderLeft = room.walls.w ? '2px solid #00ffcc' : '1px dashed #333';
          cell.style.borderRight = room.walls.e ? '2px solid #00ffcc' : '1px dashed #333';

          if (room.isSwitchOn && room.letter !== 'A') {
            const isCircle = "VWXYZ".includes(room.letter);
            cell.classList.add(isCircle ? 'switch-on-circle' : 'switch-on-slash');
          }
        } else if (room.isSeen) {
          cell.classList.add('seen');
          cell.textContent = '?';
        }
        
        if (dx === 0 && dz === 0) {
          cell.classList.add('current');
          const marker = document.createElement('div');
          marker.className = 'player-marker';
          cell.appendChild(marker);
        }
      }
      mapContainer.appendChild(cell);
    }
  }
}

// --- 移動ロジック ---
function move(dir) {
  const currentRoom = gameState.rooms.find(r => r.x === gameState.x && r.z === gameState.z);
  if (!currentRoom) return;

  let nextX = gameState.x;
  let nextY = gameState.z;
  let canMove = true;

  if (dir === 'n') { if (currentRoom.walls.n) { canMove = false; } else { nextY--; } }
  if (dir === 's') { if (currentRoom.walls.s) { canMove = false; } else { nextY++; } }
  if (dir === 'e') { if (currentRoom.walls.e) { canMove = false; } else { nextX++; } }
  if (dir === 'w') { if (currentRoom.walls.w) { canMove = false; } else { nextX--; } }

  if (canMove) {
    gameState.x = nextX;
    gameState.z = nextY;
    updateView();
  }
}

// --- アクション（スイッチ＆送信） ---
function handleAction() {
  const currentRoom = gameState.rooms.find(r => r.x === gameState.x && r.z === gameState.z);
  
  if (currentRoom.letter === 'A') {
    const onRoomLetters = gameState.rooms.filter(r => r.isSwitchOn).map(r => r.letter);
    const correctLetters = ['E', 'G', 'P'];
    
    const isCorrect = (correctLetters.length === onRoomLetters.length) && 
                      correctLetters.every(l => onRoomLetters.includes(l));
                      
    const msgElement = document.getElementById('terminal-msg');

    if (isCorrect) {
      msgElement.style.color = '#00ffcc';
      msgElement.textContent = 'ACCESS GRANTED.';
      setTimeout(() => {
        document.getElementById('result-stats').innerHTML = `🕹️ トグル操作回数：${gameState.toggleCount} 回`;
        document.getElementById('clear-ui').style.display = 'flex';
      }, 1000);
    } else {
      msgElement.style.color = '#ff0000';
      msgElement.textContent = 'ERROR: INVALID INPUT.';
    }
  } else {
    currentRoom.isSwitchOn = !currentRoom.isSwitchOn;
    gameState.toggleCount++;
    updateView();
  }
}

// PC用キーボード操作
document.addEventListener('keydown', (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  
  if (e.key === 'ArrowUp' || e.key === 'w') move('n');
  if (e.key === 'ArrowDown' || e.key === 's') move('s');
  if (e.key === 'ArrowLeft' || e.key === 'a') move('w');
  if (e.key === 'ArrowRight' || e.key === 'd') move('e');
  if (e.code === 'Space') { handleAction(); }
}, { passive: false });

// シェアボタン
document.getElementById('share-button').addEventListener('click', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const customUrl = urlParams.get('shareUrl');
  const gameUrl = customUrl || (document.referrer ? document.referrer : window.location.href);
  
  const tweetText = `『MarkS』をクリアしました！\n🕹️ トグル操作回数：${gameState.toggleCount} 回\n\n${gameUrl}\n\n#Web謎 #謎解き #MarkS謎`;
  
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
});

// 初期描画
updateView();
