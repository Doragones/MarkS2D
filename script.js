const gameState = {
  x: -1, z: 0, // Aの部屋（左外）からスタート
  toggleCount: 0,
  rooms: []
};

// 迷路内の25部屋 (B 〜 Z)
const gridLetters = "BCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- 1. 部屋データの生成（外枠だけ壁を作る） ---
for (let i = 0; i < 25; i++) {
  let px = i % 5;
  let pz = Math.floor(i / 5);
  gameState.rooms.push({
    id: i + 1, letter: gridLetters[i], x: px, z: pz,
    isSwitchOn: false, isVisited: false, isSeen: false,
    // ★ 5x5の外周だけを「壁(true)」にし、内部はすべて開通(false)させる
    walls: { n: pz === 0, s: pz === 4, e: px === 4, w: px === 0 }
  });
}
// Aの部屋（スタート＆解答地点）
gameState.rooms.push({
  id: 0, letter: 'A', x: -1, z: 0,
  isSwitchOn: false, isVisited: false, isSeen: false,
  walls: { n: true, s: true, e: false, w: true } // 東（右）だけ開ける
});

// Bの部屋（x:0, z:0）の西（左）の壁を壊してAと繋げる
const roomB = gameState.rooms.find(r => r.letter === 'B');
if (roomB) roomB.walls.w = false;

// --- 2. 描画更新 ---
function updateView() {
  const currentRoom = gameState.rooms.find(r => r.x === gameState.x && r.z === gameState.z);
  if (!currentRoom) return;

  const roomLetter = document.getElementById('room-letter');
  const roomOverlay = document.getElementById('room-overlay');
  const terminalView = document.getElementById('terminal-view');
  const actionBtn = document.getElementById('action-btn');

  if (currentRoom.letter === 'A') {
    roomLetter.style.display = 'none';
    roomOverlay.style.opacity = '0'; 
    terminalView.style.display = 'flex';
    actionBtn.textContent = 'SEND';
    document.getElementById('terminal-msg').innerHTML = ''; 
  } else {
    terminalView.style.display = 'none';
    roomLetter.style.display = 'block';
    roomLetter.textContent = currentRoom.letter;
    actionBtn.textContent = 'SWITCH';
    
    // ★修正：余計な backgroundColor の指定を完全に削除！
    // 模様のクラスだけをシンプルに切り替えます
    const isCircle = "VWXYZ".includes(currentRoom.letter);
    roomOverlay.className = isCircle ? 'switch-on-circle' : 'switch-on-slash';

    if (currentRoom.isSwitchOn) {
      roomLetter.style.color = '#000'; // 黒文字のシルエット
      roomOverlay.style.opacity = '1';  // じわっと表示
    } else {
      roomLetter.style.color = '#fff'; // 白文字
      roomOverlay.style.opacity = '0';  // じわっと消える
    }
  }

  // 視界の更新：現在地を訪問済みにし、十字方向のみ Seen にする
  currentRoom.isVisited = true;
  gameState.rooms.forEach(r => {
    if (r.isVisited) {
      const neighbors = gameState.rooms.filter(n => 
        (Math.abs(n.x - r.x) === 1 && n.z === r.z) || 
        (n.x === r.x && Math.abs(n.z - r.z) === 1)
      );
      neighbors.forEach(n => n.isSeen = true);
    }
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
          
          // ★ 外壁は「太いシアン」、内部のマス目は「暗いグレーの点線」で描画
          cell.style.borderTop = room.walls.n ? '2px solid #00ffcc' : '1px dotted #333';
          cell.style.borderBottom = room.walls.s ? '2px solid #00ffcc' : '1px dotted #333';
          cell.style.borderLeft = room.walls.w ? '2px solid #00ffcc' : '1px dotted #333';
          cell.style.borderRight = room.walls.e ? '2px solid #00ffcc' : '1px dotted #333';

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

// --- 3. 移動ロジック（壁を無視し、座標の限界値だけで判定） ---
function move(dir) {
  let nextX = gameState.x;
  let nextY = gameState.z;
  let canMove = false;

  if (dir === 'n') nextY--;
  if (dir === 's') nextY++;
  if (dir === 'e') nextX++;
  if (dir === 'w') nextX--;

  // メインの5x5グリッド内の移動なら許可
  if (nextX >= 0 && nextX <= 4 && nextY >= 0 && nextY <= 4) {
    canMove = true;
  }
  // Aの部屋 (-1, 0) への移動・退出ロジック
  if (nextX === -1 && nextY === 0) canMove = true;
  if (gameState.x === -1 && gameState.z === 0 && dir !== 'e') canMove = false; // Aからは東にしか行けない

  if (canMove) {
    gameState.x = nextX;
    gameState.z = nextY;
    updateView();
  }
}

// --- 4. アクション（絶妙なヒント出し） ---
function handleAction() {
  const currentRoom = gameState.rooms.find(r => r.x === gameState.x && r.z === gameState.z);
  
  if (currentRoom.letter === 'A') {
    const onRooms = gameState.rooms.filter(r => r.isSwitchOn);
    const onLetters = onRooms.map(r => r.letter);
    const correctLetters = ['E', 'G', 'P'];
    
    const isCorrect = (correctLetters.length === onLetters.length) && 
                      correctLetters.every(l => onLetters.includes(l));
                      
    const msgElement = document.getElementById('terminal-msg');

    if (isCorrect) {
      msgElement.style.color = '#00ffcc';
      msgElement.innerHTML = '<br>ACCESS GRANTED.'; // 中央に寄せるための改行
      setTimeout(() => {
        document.getElementById('result-stats').innerHTML = `🕹️ トグル操作回数：${gameState.toggleCount} 回`;
        document.getElementById('clear-ui').style.display = 'flex';
      }, 1000);
    } else {
      // ★ ここが絶妙なヒント！ 何個のスイッチがONで、どの模様が適用されているかを教える
      const circles = onRooms.filter(r => "VWXYZ".includes(r.letter)).length;
      const slashes = onRooms.length - circles;
      
      msgElement.style.color = '#ff0000';
      msgElement.innerHTML = `INPUT DETECTED: ${onRooms.length}<br>MODIFIER: [//] x${slashes} &nbsp; [〇] x${circles}<br>ERROR: SEQUENCE INVALID.`;
    }
  } else {
    currentRoom.isSwitchOn = !currentRoom.isSwitchOn;
    gameState.toggleCount++;
    updateView();
  }
}

// --- 5. イベントリスナー周り（そのまま） ---
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

document.getElementById('share-button').addEventListener('click', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const customUrl = urlParams.get('shareUrl');
  const gameUrl = customUrl || (document.referrer ? document.referrer : window.location.href);
  const tweetText = `『MarkS』をクリアしました！\n🕹️ トグル操作回数：${gameState.toggleCount} 回\n\n${gameUrl}\n\n#Web謎 #謎解き #MarkS謎`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
});

updateView();
