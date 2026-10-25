/*// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyCdNAeQyUHsOuevZOb29r7Ok2zEkv276BU",
authDomain: "my-simple-games.firebaseapp.com",
projectId: "my-simple-games",
storageBucket: "my-simple-games.firebasestorage.app",
messagingSenderId: "148777694804",
appId: "1:148777694804:web:e57cc24cdd958dcb3d9fc1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);*/
  
  
// 1. นำเข้าโมดูล Firebase SDK จากออนไลน์ (ไม่ต้องติดตั้งลงเครื่อง)
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com";

// ระบบเสียงออนไลน์
const sndCorrect = new Audio("correct.mp3");
const sndWrong = new Audio("incorrect.mp3");
const sndWin = new Audio("game-over.mp3");

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => {});
}

// 2. ใส่ข้อมูลโปรเจกต์ Firebase ของคุณตรงนี้ (ก๊อปปี้มาจากหน้าเว็บ Firebase Console)
const firebaseConfig = {
	apiKey: "AIzaSyCdNAeQyUHsOuevZOb29r7Ok2zEkv276BU",
	authDomain: "my-simple-games.firebaseapp.com",
	projectId: "my-simple-games",
	storageBucket: "my-simple-games.firebasestorage.app",
	messagingSenderId: "148777694804",
	appId: "1:148777694804:web:e57cc24cdd958dcb3d9fc1"
};

// เริ่มต้นเปิดระบบเชื่อมต่อฐานข้อมูล Google
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ชุดพิกัดด่าน 1-5
const diffsData = [
    [ [{x:110,y:54}, {x:302,y:55}], [{x:189,y:173}], [{x:337,y:203}] ],
    [ [{x:200,y:200}], [{x:300,y:120}], [{x:100,y:320}] ],
    [ [{x:150,y:80}], [{x:250,y:250}], [{x:70,y:190}] ],
    [ [{x:120,y:150}], [{x:280,y:280}], [{x:200,y:50}] ],
    [ [{x:220,y:180}], [{x:110,y:90}], [{x:320,y:310}] ]
];

let curStg = 0, lives = 3, foundInStage = 0, isOver = false, mode = "NEXT", activeDiffs = [];
let totalScore = 0, playerName = "Guest";

// ดึงคะแนนออนไลน์มาแสดงหน้าแรกทันทีที่เข้าเว็บ
displayHighScores();

// ฟังก์ชันปุ่มกดเริ่มเกม
window.initStartGame = function() {
    const inputName = document.getElementById("playerNameInput").value.trim();
    if (inputName === "") {
        alert("กรุณากรอกชื่อผู้เล่นก่อนเริ่มเกมนะครับ!");
        return;
    }
    playerName = inputName;
    totalScore = 0; lives = 3; curStg = 0;

    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("gameHeader").style.display = "block";
    document.getElementById("gameArea").style.display = "flex";
    document.getElementById("displayPlayerName").innerText = playerName;

    loadStage(curStg);
}

function loadStage(idx) {
    isOver = false; foundInStage = 0;
    document.getElementById("stg").innerText = idx + 1;
    document.getElementById("gameScore").innerText = totalScore;
    document.getElementById("lives").innerText = "❤".repeat(lives) + "💔".repeat(3 - lives);
    
    document.getElementById("srcL").src = `image${idx + 1}L.jpg`;
    document.getElementById("srcR").src = `image${idx + 1}R.jpg`;
    
    document.querySelectorAll(".marker").forEach(el => el.remove());
    activeDiffs = diffsData[idx].map(d => ({ positions: d, found: false }));
    document.getElementById("overlay").style.display = "none";
}

// ผูกฟังก์ชันคลิกตรวจจับไว้กับ Window
window.checkClick = function(e) {
    if (isOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    let hit = false;

    for (let d of activeDiffs) {
        if (!d.found) {
            const match = d.positions.find(pos => Math.sqrt((cx - pos.x)**2 + (cy - pos.y)**2) <= 30);
            if (match) {
                d.found = true; hit = true; foundInStage++;
                totalScore += 10;
                document.getElementById("gameScore").innerText = totalScore;
                
                playSound(sndCorrect);
                d.positions.forEach(pos => createMarker(pos.x, pos.y));
                if (foundInStage === 3) showOverlay(curStg === 4 ? "WIN_ALL" : "NEXT");
                break;
            }
        }
    }
    if (!hit) {
        lives--;
        document.getElementById("lives").innerText = "❤".repeat(lives) + "💔".repeat(3 - lives);
        playSound(sndWrong);
        if (lives <= 0) showOverlay("GAME_OVER");
    }
}

function createMarker(x, y) {
    ["imgL", "imgR"].forEach(id => {
        const m = document.createElement("div"); m.className = "marker";
        m.style.left = x + "px"; m.style.top = y + "px";
        document.getElementById(id).appendChild(m);
    });
}

function showOverlay(type) {
    isOver = true;
    playSound(sndWin);
    const txt = document.getElementById("overText"), btn = document.getElementById("overBtn");
    
    if (type === "NEXT") { 
        txt.innerText = `ผ่านด่านที่ ${curStg+1} แล้ว!\nคะแนนตอนนี้: ${totalScore}`; 
        btn.innerText = "ลุยด่านถัดไป"; mode = "NEXT"; 
    } else {
        // เมื่อจบเกม ยิงคะแนนขึ้น Google Firebase ทันที
        checkAndSaveHighScore(playerName, totalScore);
        if (type === "WIN_ALL") { 
            txt.innerHTML = `🎉 สุดยอด! เคลียร์ครบ 5 ด่าน! 🎉<br>คะแนนรวม: ${totalScore} คะแนน`; 
            txt.style.color = "#2ecc71";
        } else { 
            txt.innerHTML = `💥 เกมโอเวอร์ พลังชีวิตหมด! 💥<br>คะแนนทำได้รวม: ${totalScore} คะแนน`; 
            txt.style.color = "#e74c3c";
        }
        btn.innerText = "กลับหน้าหลัก"; mode = "MAIN_MENU";
    }
    document.getElementById("overlay").style.display = "flex";
}

window.overlayAction = function() {
    if (mode === "NEXT") { 
        curStg++; loadStage(curStg);
    } else if (mode === "MAIN_MENU") {
        document.getElementById("overlay").style.display = "none";
        document.getElementById("gameHeader").style.display = "none";
        document.getElementById("gameArea").style.display = "none";
        document.getElementById("mainMenu").style.display = "block";
        document.getElementById("playerNameInput").value = "";
        displayHighScores();
    }
}

// 3. ฟังก์ชันบันทึกคะแนนขึ้นระบบออนไลน์ของ Firebase
function checkAndSaveHighScore(name, score) {
    const dbRef = ref(db);
    // เข้าไปเช็คข้อมูลคะแนนเดิมบน Cloud ของ Google ก่อน
    get(child(dbRef, `highscores/${name}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const oldScore = snapshot.val().score;
            // ถ้าชื่อซ้ำ แต่รอบใหม่ทำคะแนนได้ดีกว่าเดิม ให้เขียนทับคะแนนสูงสุดใหม่ลง Firebase
            if (score > oldScore) {
                set(ref(db, 'highscores/' + name), { name: name, score: score });
            }
        } else {
            // ถ้าเป็นผู้เล่นชื่อใหม่ บันทึกคะแนนใหม่ขึ้นออนไลน์ทันที
            set(ref(db, 'highscores/' + name), { name: name, score: score });
        }
    }).catch((error) => { console.error(error); });
}

// 4. ฟังก์ชันดึงค่า High Score ออนไลน์มาเรนเดอร์จัดอันดับ Top 10 บนหน้าแรก
function displayHighScores() {
    const dbRef = ref(db);
    get(child(dbRef, 'highscores')).then((snapshot) => {
        const scoreListUl = document.getElementById("scoreList");
        scoreListUl.innerHTML = "";
        
        if (!snapshot.exists()) {
            scoreListUl.innerHTML = `<li class="score-item" style="color:#aaa; justify-content:center;">ยังไม่มีบันทึกคะแนนสูงสุดบนเซิร์ฟเวอร์</li>`;
            return;
        }

        // แปลงข้อมูลอ็อบเจกต์จาก Firebase ให้ออกมาเป็น Array เพื่อเรียงลำดับ
        const data = snapshot.val();
        const scoresArray = Object.keys(data).map(key => data[key]);
        
        // เรียงคะแนนสูงสุดจากมากไปน้อย และตัดเก็บไว้โชว์แค่ 10 อันดับแรก
        scoresArray.sort((a, b) => b.score - a.score);
        const top10 = scoresArray.slice(0, 10);

        top10.forEach((item, index) => {
            const li = document.createElement("li");
            li.className = "score-item";
            li.innerHTML = `<span>อันดับ ${index + 1}. <b>${item.name}</b></span> <span>${item.score} แต้ม</span>`;
            scoreListUl.appendChild(li);
        });
    }).catch((error) => { console.error(error); });
}
